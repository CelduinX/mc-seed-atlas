import { mkdirSync, writeFileSync } from 'node:fs';
const seeds = ['0', '123456789', '-123456789', '9223372036854775807', '-9223372036854775808', '3000000007807634720'];
const points: [number, number][] = [[0,0],[-10000,-10000],[10000,10000],[-1,-1],[127,128],[-128,-129]];
let rng = 42;
for (let i = 0; i < 400; i++) { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; const x = rng % 20001 - 10000; rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; points.push([x, rng % 20001 - 10000]); }
// Dense adjacent samples cross biome edges and the negative-origin tile seam.
for (let x = -512; x <= 512; x++) points.push([x, -129], [x, 127]);
mkdirSync('.cache/vanilla', { recursive: true });
writeFileSync('.cache/vanilla/samples.csv', seeds.flatMap(seed => [0, 1].flatMap(large => points.map(([x,z]) => `${seed},${large},${x},${z}`))).join('\n'));
