import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;

/** Calls the unmodified, unobfuscated release jar; never starts a game/server. */
public class VanillaOracle {
    static Class<?> cls(String name) throws Exception { return Class.forName("net.minecraft." + name); }
    static Object field(String owner, String name) throws Exception { return cls(owner).getField(name).get(null); }
    static Object call(Object target, String name, Object... args) throws Exception {
        Class<?> owner = target instanceof Class<?> c ? c : target.getClass();
        for (Method method : owner.getMethods()) {
            if (!method.getName().equals(name) || method.getParameterCount() != args.length) continue;
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
    public static void main(String[] args) throws Exception {
        call(cls("SharedConstants"), "tryDetectVersion");
        call(cls("server.Bootstrap"), "bootStrap");
        Object lookup;
        try { lookup = call(cls("data.registries.VanillaRegistries"), "createWorldLookup"); }
        catch (NoSuchMethodException old) { lookup = call(cls("data.registries.VanillaRegistries"), "createLookup"); }
        Object noiseRegistry = call(lookup, "lookupOrThrow", field("core.registries.Registries", "NOISE"));
        Object settingsRegistry = call(lookup, "lookupOrThrow", field("core.registries.Registries", "NOISE_SETTINGS"));
        Object parametersRegistry = call(lookup, "lookupOrThrow", field("core.registries.Registries", "MULTI_NOISE_BIOME_SOURCE_PARAMETER_LIST"));
        Object parameters = call(parametersRegistry, "getOrThrow", field("world.level.biome.MultiNoiseBiomeSourceParameterLists", "OVERWORLD"));
        Object source = call(cls("world.level.biome.MultiNoiseBiomeSource"), "createFromPreset", parameters);
        Class<?> managerClass = cls("world.level.biome.BiomeManager");
        Constructor<?> constructor = managerClass.getConstructors()[0];
        Class<?> resolverInterface = constructor.getParameterTypes()[0];
        Object manager = null; String previous = "";
        List<String> results = new ArrayList<>();
        for (String line : Files.readAllLines(Path.of(args[0]))) {
            String[] parts = line.split(","); long seed = Long.parseLong(parts[0]); boolean large = parts[1].equals("1");
            String key = parts[0] + "," + parts[1];
            if (!key.equals(previous)) {
                Object settings = call(call(settingsRegistry, "getOrThrow", field("world.level.levelgen.NoiseGeneratorSettings", large ? "LARGE_BIOMES" : "OVERWORLD")), "value");
                Object random;
                Object sampler;
                Object resolver;
                try {
                    random = call(cls("world.level.levelgen.RandomState"), "create", noiseRegistry, seed, settings);
                    sampler = call(random, "createClimateSampler", field("world.level.levelgen.densityfunction.SamplerContext", "EMPTY_UNCACHED"));
                    resolver = call(source, "createResolver", sampler);
                } catch (NoSuchMethodException old) {
                    random = call(cls("world.level.levelgen.RandomState"), "create", settings, noiseRegistry, seed);
                    sampler = call(random, "sampler");
                    Object finalSampler = sampler;
                    resolver = Proxy.newProxyInstance(resolverInterface.getClassLoader(), new Class<?>[]{resolverInterface}, (proxy, method, values) -> call(source, "getNoiseBiome", values[0], values[1], values[2], finalSampler));
                }
                manager = constructor.newInstance(resolver, call(managerClass, "obfuscateSeed", seed));
                previous = key;
            }
            int x = Integer.parseInt(parts[2]), z = Integer.parseInt(parts[3]);
            Object position = cls("core.BlockPos").getConstructor(int.class, int.class, int.class).newInstance(x, 64, z);
            Object holder = call(manager, "getBiome", position);
            Object resourceKey = ((Optional<?>)call(holder, "unwrapKey")).orElseThrow();
            String biome = call(resourceKey, "identifier").toString();
            results.add(line + "," + biome);
        }
        Files.write(Path.of(args[1]), results);
        System.err.println("Oracle samples: " + results.size());
    }
}
