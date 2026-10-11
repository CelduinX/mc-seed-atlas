import type { Language } from './types.ts';
// Stable Cubiomes IDs, display names and high-contrast map colours.
const entries: [number, string, string, string, string][] = [
  [0,'ocean','Ozean','Ocean','#24569c'],[1,'plains','Ebene','Plains','#8db360'],[2,'desert','Wüste','Desert','#ead28b'],
  [3,'windswept_hills','Windige Hügel','Windswept Hills','#82876f'],[4,'forest','Wald','Forest','#427b38'],[5,'taiga','Taiga','Taiga','#39776d'],
  [6,'swamp','Sumpf','Swamp','#657344'],[7,'river','Fluss','River','#4389d2'],[10,'frozen_ocean','Vereister Ozean','Frozen Ocean','#91b8d9'],
  [11,'frozen_river','Vereister Fluss','Frozen River','#b2d7e8'],[12,'snowy_plains','Verschneite Ebene','Snowy Plains','#e7eeee'],
  [14,'mushroom_fields','Pilzland','Mushroom Fields','#b66cae'],[16,'beach','Strand','Beach','#ecdca1'],[21,'jungle','Dschungel','Jungle','#398724'],
  [23,'sparse_jungle','Lichter Dschungel','Sparse Jungle','#71a54b'],[24,'deep_ocean','Tiefsee','Deep Ocean','#183a71'],[25,'stony_shore','Steinige Küste','Stony Shore','#a5a7a3'],
  [26,'snowy_beach','Verschneiter Strand','Snowy Beach','#d8e1cf'],[27,'birch_forest','Birkenwald','Birch Forest','#76a451'],[29,'dark_forest','Dunkler Wald','Dark Forest','#33482a'],
  [30,'snowy_taiga','Verschneite Taiga','Snowy Taiga','#9bbaab'],[32,'old_growth_pine_taiga','Kiefern-Urtaiga','Old Growth Pine Taiga','#6b8154'],
  [34,'windswept_forest','Windiger Wald','Windswept Forest','#688b64'],[35,'savanna','Savanne','Savanna','#b8b65c'],[36,'savanna_plateau','Savannenhochebene','Savanna Plateau','#a69b4c'],
  [37,'badlands','Tafelberge','Badlands','#c77845'],[38,'wooded_badlands','Bewaldete Tafelberge','Wooded Badlands','#9a7843'],
  [44,'warm_ocean','Warmer Ozean','Warm Ocean','#39a6ae'],[45,'lukewarm_ocean','Lauwarmer Ozean','Lukewarm Ocean','#347ca8'],[46,'cold_ocean','Kalter Ozean','Cold Ocean','#3d6197'],
  [48,'deep_lukewarm_ocean','Lauwarme Tiefsee','Deep Lukewarm Ocean','#255478'],[49,'deep_cold_ocean','Kalte Tiefsee','Deep Cold Ocean','#293e72'],[50,'deep_frozen_ocean','Vereiste Tiefsee','Deep Frozen Ocean','#647da6'],
  [129,'sunflower_plains','Sonnenblumenebene','Sunflower Plains','#b3c763'],[131,'windswept_gravelly_hills','Windige Geröllhügel','Windswept Gravelly Hills','#96958c'],
  [132,'flower_forest','Blumenwald','Flower Forest','#70a969'],[140,'ice_spikes','Eiszapfen','Ice Spikes','#b4dce4'],[155,'old_growth_birch_forest','Birken-Urwald','Old Growth Birch Forest','#90b36a'],
  [160,'old_growth_spruce_taiga','Fichten-Urtaiga','Old Growth Spruce Taiga','#54816a'],[163,'windswept_savanna','Windige Savanne','Windswept Savanna','#a8ad7a'],
  [165,'eroded_badlands','Abgetragene Tafelberge','Eroded Badlands','#df9454'],[168,'bamboo_jungle','Bambusdschungel','Bamboo Jungle','#72a52e'],
  [174,'dripstone_caves','Tropfsteinhöhlen','Dripstone Caves','#8e7865'],[175,'lush_caves','Üppige Höhlen','Lush Caves','#4db57b'],
  [177,'meadow','Bergwiese','Meadow','#9fba78'],[178,'grove','Berghain','Grove','#a7c4b4'],[179,'snowy_slopes','Verschneite Hänge','Snowy Slopes','#d9e6e4'],
  [180,'jagged_peaks','Zerklüftete Gipfel','Jagged Peaks','#abbabf'],[181,'frozen_peaks','Vereiste Gipfel','Frozen Peaks','#c6e3ed'],[182,'stony_peaks','Steinige Gipfel','Stony Peaks','#989b8d'],
  [183,'deep_dark','Tiefes Dunkel','Deep Dark','#174c55'],[184,'mangrove_swamp','Mangrovensumpf','Mangrove Swamp','#547a3e'],
  [185,'cherry_grove','Kirschhain','Cherry Grove','#efb6cf'],[186,'pale_garden','Blasser Garten','Pale Garden','#c0c4ad'],
  [187,'sulfur_caves','Schwefelhöhlen','Sulfur Caves','#d9cb50'],[188,'dappled_forest','Gesprenkelter Wald','Dappled Forest','#cba45b'],
];
export const BIOMES = new Map(entries.map(([id, key, de, en, color]) => [id, { id, key, de, en, color }]));
export function biomeName(id: number, language: Language) { return BIOMES.get(id)?.[language] ?? `Biome ${id}`; }
export function colourize(ids: Uint16Array) {
  const pixels = new Uint8ClampedArray(ids.length * 4);
  for (let i = 0; i < ids.length; i++) {
    const hex = BIOMES.get(ids[i]!)?.color ?? '#ff00ff';
    const rgb = Number.parseInt(hex.slice(1), 16);
    pixels[i * 4] = rgb >> 16; pixels[i * 4 + 1] = (rgb >> 8) & 255; pixels[i * 4 + 2] = rgb & 255; pixels[i * 4 + 3] = 255;
  }
  return pixels;
}
