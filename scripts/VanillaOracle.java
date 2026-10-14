import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;

/** Calls the unmodified release jar, using official mappings when needed; never starts a game/server. */
public class VanillaOracle {
    static Map<String, String> classes = new HashMap<>(), members = new HashMap<>();
    static void mappings(Path path) throws Exception {
        String owner = "";
        List<String[]> methods = new ArrayList<>();
        for (String line : Files.readAllLines(path)) {
            if (line.isBlank() || line.startsWith("#")) continue;
            String[] pair = line.trim().split(" -> ");
            if (pair.length != 2) continue;
            if (!line.startsWith(" ")) {
                owner = pair[1].replace(":", ""); classes.put(pair[0], owner); continue;
            }
            String signature = pair[0].replaceFirst("^\\d+:\\d+:", "");
            if (signature.contains("(")) methods.add(new String[]{owner, signature, pair[1]});
            else members.put(owner + "/" + pair[1], signature.substring(signature.lastIndexOf(' ') + 1));
        }
        for (String[] entry : methods) {
            String signature = entry[1]; int open = signature.indexOf('('), close = signature.indexOf(')');
            String name = signature.substring(0, open); name = name.substring(name.lastIndexOf(' ') + 1);
            StringJoiner parameters = new StringJoiner(",");
            if (close > open + 1) for (String type : signature.substring(open + 1, close).split(",")) {
                int array = type.indexOf('['); String base = array < 0 ? type : type.substring(0, array);
                parameters.add(classes.getOrDefault(base, base) + (array < 0 ? "" : type.substring(array)));
            }
            members.put(entry[0] + "/" + entry[2] + "(" + parameters + ")", name);
        }
    }
    static Class<?> cls(String name) throws Exception { String full = "net.minecraft." + name; return Class.forName(classes.getOrDefault(full, full)); }
    static Object field(String owner, String name) throws Exception {
        for (Field field : cls(owner).getFields()) if (members.getOrDefault(field.getDeclaringClass().getName() + "/" + field.getName(), field.getName()).equals(name)) return field.get(null);
        throw new NoSuchFieldException(owner + "." + name);
    }
    static Object call(Object target, String name, Object... args) throws Exception {
        Class<?> owner = target instanceof Class<?> c ? c : target.getClass();
        for (Method method : owner.getMethods()) {
            StringJoiner parameters = new StringJoiner(",");
            for (Class<?> type : method.getParameterTypes()) parameters.add(type.getTypeName());
            String original = members.getOrDefault(method.getDeclaringClass().getName() + "/" + method.getName() + "(" + parameters + ")", method.getName());
            if (!original.equals(name) || method.getParameterCount() != args.length) continue;
            Class<?>[] types = method.getParameterTypes(); boolean match = true;
            for (int i = 0; i < args.length; i++) {
                Class<?> type = types[i];
                if (type == long.class) type = Long.class;
                if (type == int.class) type = Integer.class;
                if (!type.isInstance(args[i])) { match = false; break; }
            }
            if (!match) continue;
            method.setAccessible(true);
            return method.invoke(target instanceof Class<?> ? null : target, args);
        }
        throw new NoSuchMethodException(owner.getName() + "." + name);
    }
    static Object registry(Object lookup, String name) throws Exception {
        Object key = field("core.registries.Registries", name);
        try { return call(lookup, "lookupOrThrow", key); }
        catch (NoSuchMethodException old) { return ((Optional<?>)call(lookup, "lookup", key)).orElseThrow(); }
    }
    static Object member(Object target, String name) throws Exception {
        for (Class<?> owner = target.getClass(); owner != null; owner = owner.getSuperclass()) for (Field field : owner.getDeclaredFields()) {
            if (!members.getOrDefault(owner.getName() + "/" + field.getName(), field.getName()).equals(name)) continue;
            field.setAccessible(true); return field.get(target);
        }
        throw new NoSuchFieldException(target.getClass().getName() + "." + name);
    }
    static Object resolver(Object source, Object sampler, Class<?> resolverInterface) throws Exception {
        ThreadLocal<?> historicalCache = null;
        // Pre-1.19.3 RTree tie-breaking can depend on the previous query (MC-241546).
        // Compare independent point queries, matching our deterministic map contract.
        if (!"1".equals(System.getenv("ATLAS_VANILLA_KEEP_CACHE")) && classes.containsKey("net.minecraft.world.level.biome.MultiNoiseBiomeSource$Preset") && !classes.containsKey("net.minecraft.core.registries.Registries")) {
            historicalCache = (ThreadLocal<?>)member(member(member(source, "parameters"), "index"), "lastResult");
        }
        final ThreadLocal<?> cache = historicalCache;
        return Proxy.newProxyInstance(resolverInterface.getClassLoader(), new Class<?>[]{resolverInterface}, (proxy, method, values) -> {
            if (cache != null) cache.remove();
            return call(source, "getNoiseBiome", values[0], values[1], values[2], sampler);
        });
    }
    public static void main(String[] args) throws Exception {
        if (args.length > 2) mappings(Path.of(args[2]));
        call(cls("SharedConstants"), "tryDetectVersion");
        call(cls("server.Bootstrap"), "bootStrap");
        Object noiseRegistry, settingsRegistry, biomeRegistry, source;
        boolean builtin = false;
        try {
            Object lookup;
            try { lookup = call(cls("data.registries.VanillaRegistries"), "createWorldLookup"); }
            catch (NoSuchMethodException old) { lookup = call(cls("data.registries.VanillaRegistries"), "createLookup"); }
            noiseRegistry = registry(lookup, "NOISE"); settingsRegistry = registry(lookup, "NOISE_SETTINGS");
            biomeRegistry = registry(lookup, "BIOME");
            try {
                Object parametersRegistry = registry(lookup, "MULTI_NOISE_BIOME_SOURCE_PARAMETER_LIST");
                Object parameters = call(parametersRegistry, "getOrThrow", field("world.level.biome.MultiNoiseBiomeSourceParameterLists", "OVERWORLD"));
                source = call(cls("world.level.biome.MultiNoiseBiomeSource"), "createFromPreset", parameters);
            } catch (NoSuchFieldException old) {
                source = call(field("world.level.biome.MultiNoiseBiomeSource$Preset", "OVERWORLD"), "biomeSource", biomeRegistry);
            }
        } catch (ClassNotFoundException old) {
            builtin = true;
            noiseRegistry = field("data.BuiltinRegistries", "NOISE");
            settingsRegistry = field("data.BuiltinRegistries", "NOISE_GENERATOR_SETTINGS");
            biomeRegistry = field("data.BuiltinRegistries", "BIOME");
            source = call(field("world.level.biome.MultiNoiseBiomeSource$Preset", "OVERWORLD"), "biomeSource", biomeRegistry);
        }
        final Object biomeSource = source;
        Class<?> managerClass = cls("world.level.biome.BiomeManager");
        Constructor<?> constructor = managerClass.getConstructors()[0];
        Class<?> resolverInterface = constructor.getParameterTypes()[0];
        Object manager = null; String previous = "";
        List<String> results = new ArrayList<>();
        for (String line : Files.readAllLines(Path.of(args[0]))) {
            String[] parts = line.split(","); long seed = Long.parseLong(parts[0]); boolean large = parts[1].equals("1");
            String key = parts[0] + "," + parts[1];
            if (!key.equals(previous)) {
                Object settingsKey = field("world.level.levelgen.NoiseGeneratorSettings", large ? "LARGE_BIOMES" : "OVERWORLD");
                Object settings = builtin ? call(settingsRegistry, "getOrThrow", settingsKey) : call(call(settingsRegistry, "getOrThrow", settingsKey), "value");
                Object random;
                Object sampler;
                Object resolver;
                if (!classes.isEmpty() && !classes.containsKey("net.minecraft.world.level.levelgen.RandomState")) {
                    Object router = call(settings, "createNoiseRouter", noiseRegistry, seed);
                    sampler = cls("world.level.biome.Climate$Sampler").getConstructors()[0].newInstance(call(router, "temperature"), call(router, "humidity"), call(router, "continents"), call(router, "erosion"), call(router, "depth"), call(router, "ridges"), call(router, "spawnTarget"));
                    resolver = resolver(biomeSource, sampler, resolverInterface);
                } else {
                    try {
                        random = call(cls("world.level.levelgen.RandomState"), "create", noiseRegistry, seed, settings);
                        sampler = call(random, "createClimateSampler", field("world.level.levelgen.densityfunction.SamplerContext", "EMPTY_UNCACHED"));
                        resolver = call(biomeSource, "createResolver", sampler);
                    } catch (NoSuchMethodException old) {
                        random = call(cls("world.level.levelgen.RandomState"), "create", settings, noiseRegistry, seed);
                        sampler = call(random, "sampler");
                        resolver = resolver(biomeSource, sampler, resolverInterface);
                    }
                }
                manager = constructor.newInstance(resolver, call(managerClass, "obfuscateSeed", seed));
                previous = key;
            }
            int x = Integer.parseInt(parts[2]), z = Integer.parseInt(parts[3]);
            Object position = cls("core.BlockPos").getConstructor(int.class, int.class, int.class).newInstance(x, 64, z);
            Object holder = call(manager, "getBiome", position);
            Object resourceKey = ((Optional<?>)call(holder, "unwrapKey")).orElseThrow();
            Object location;
            try { location = call(resourceKey, "identifier"); }
            catch (NoSuchMethodException old) { location = call(resourceKey, "location"); }
            String biome = location.toString();
            results.add(line + "," + biome);
        }
        Files.write(Path.of(args[1]), results);
        System.err.println("Oracle samples: " + results.size());
    }
}
