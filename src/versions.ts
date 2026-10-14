// Release order and Cubiomes generation families. Hotfixes share a generator.
export const RELEASES = [
  ['1.18.2', 'MC_1_18_2'],
  ['1.19', 'MC_1_19_2'], ['1.19.1', 'MC_1_19_2'], ['1.19.2', 'MC_1_19_2'],
  ['1.19.3', 'MC_1_19_4'], ['1.19.4', 'MC_1_19_4'],
  ['1.20', 'MC_1_20_6'], ['1.20.1', 'MC_1_20_6'], ['1.20.2', 'MC_1_20_6'],
  ['1.20.3', 'MC_1_20_6'], ['1.20.4', 'MC_1_20_6'], ['1.20.5', 'MC_1_20_6'], ['1.20.6', 'MC_1_20_6'],
  ['1.21', 'MC_1_21_1'], ['1.21.1', 'MC_1_21_1'], ['1.21.2', 'MC_1_21_3'], ['1.21.3', 'MC_1_21_3'],
  ['1.21.4', 'MC_1_21_4'], ['1.21.5', 'MC_1_21_5'], ['1.21.6', 'MC_1_21_6'],
  ['1.21.7', 'MC_1_21_7'], ['1.21.8', 'MC_1_21_8'], ['1.21.9', 'MC_1_21_9'],
  ['1.21.10', 'MC_1_21_10'], ['1.21.11', 'MC_1_21_11'],
  ['26.1', 'MC_26_1'], ['26.1.1', 'MC_26_1_1'], ['26.1.2', 'MC_26_1_2'],
  ['26.2', 'MC_26_2'], ['26.3', 'MC_26_3'],
] as const;
export const VERSIONS = RELEASES.map(([version]) => version);
export type Version = typeof RELEASES[number][0];

// All other displayed Overworld biomes already generate in 1.18.2.
const BIOME_INTRODUCED = new Map<number, Version>([
  [183, '1.19'], [184, '1.19'], [185, '1.20'], [186, '1.21.4'],
  [187, '26.2'], [188, '26.3'],
]);
export function biomeAvailable(id: number, version: Version): boolean {
  const introduced = BIOME_INTRODUCED.get(id);
  return !introduced || VERSIONS.indexOf(version) >= VERSIONS.indexOf(introduced);
}
