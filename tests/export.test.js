import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { exportRegion, exportFilename } from '../src/explorer-export-core.js';
import { runExport, selectSmallest } from '../src/export-worker.js';
import createEngine from '../public/wasm/biomes.js';
import { BIOMES } from '../src/biome-palette.js';
import { seedWords } from '../src/explorer-core.js';

const config = { seed: '-123456789', version: '26.3', large: false };
test('export regions use world-aligned grids, bounds and original sample resolution', () => {
  for (const scale of [1, 4, 16, 64]) {
    const r = exportRegion({ x: -23, z: -39, bpp: 1 }, 127, 91, scale);
    assert.equal(r.x, Math.floor(-86.5 / scale));
    assert.equal(r.width, Math.ceil(40.5 / scale) - r.x);
    assert.match(exportFilename(config, r), /^seed--123456789_26\.3_standard_x-87-z-85-to-x41-z7_\d+bpp\.webp$/);
    assert.match(exportFilename(config, r, 'jpg'), /\.jpg$/);
    assert.throws(() => exportFilename(config, r, 'png'));
  }
  const clipped = exportRegion({ x: 9999, z: -9999, bpp: 4 }, 100, 100, 4);
  assert.equal(clipped.maxX, 10000); assert.equal(clipped.minZ, -10000);
});

test('optimized visible-area dimensions and colours match exact biome samples at all scales', async () => {
  const engine = await createEngine(); engine._atlas_init(4, 0, ...seedWords(config.seed));
  for (const scale of [1, 4, 16, 64]) {
    const region = { x: -129, z: -67, width: 137, height: 131, scale };
    const messages = [], chunks = [];
    await runExport({ config, region, generation: 7, id: 12 }, message => { messages.push(message); if (message.type === 'chunk') chunks.push(message.chunk); });
    assert(!messages.some(m => m.type === 'error'), JSON.stringify(messages.at(-1)));
    const done = messages.at(-1); assert.equal(done.type, 'done'); assert.equal(done.generation, 7); assert.equal(done.id, 12);
    assert.equal(done.bandBytes, 137 * 128 * 3);
    assert.equal(messages.filter(m => m.type === 'progress').at(-1).value, 1);
    const file = messages.find(m => m.type === 'file'); assert(file); assert.equal(file.blob.type, done.mime);
    const image = await loadImage(Buffer.from(await file.blob.arrayBuffer())); assert.equal(image.width, 137); assert.equal(image.height, 131);
    const canvas = createCanvas(137, 131), context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const rgb = context.getImageData(0, 0, 137, 131).data;
    // Generate the same arbitrary-origin grid in <=128-sample rectangles.
    let totalError = 0, count = 0;
    for (let z = 0; z < 131; z += 128) for (let x = 0; x < 137; x += 128) {
      const w = Math.min(128,137-x), h = Math.min(128,131-z);
      const pointer = engine._atlas_tile(scale, region.x+x, region.z+z, w,h);
      const ids = engine.HEAP32.slice(pointer/4,pointer/4+w*h);
      for (let j=0;j<h;j++) for (let i=0;i<w;i++) {
        const colour = Number.parseInt(BIOMES.get(ids[j*w+i]).color.slice(1),16), index=((z+j)*137+x+i)*4;
        for (const [channel, expected] of [[0,colour>>>16],[1,(colour>>>8)&255],[2,colour&255]]) { totalError+=Math.abs(rgb[index+channel]-expected);count++; }
      }
    }
    assert(totalError/count < (done.format === 'webp' ? .001 : 4), `Compressed image average colour error ${totalError/count}`);
  }
});

test('visible JPEG fallback stays bounded in memory and real worker can be cancelled', { timeout: 30000 }, async () => {
  const region = exportRegion({ x: 0, z: 0, bpp: 4096/1200 }, 1200, 600, 4), start = performance.now(); let done, bytes=0;
  await runExport({ config, region, generation: 1, id: 1 }, data => { if(data.type==='file')bytes=data.blob.size; if(data.type==='done')done=data; assert.notEqual(data.type,'error'); }, undefined, async () => { throw new Error('WebP unavailable'); });
  assert(done); assert.equal(done.width,1024); assert.equal(done.height,512); assert.equal(done.format,'jpg'); assert(done.rasterBytes <= 16*1024*1024);
  mkdirSync('.cache',{recursive:true}); writeFileSync('.cache/export-performance.json',JSON.stringify({environment:'Node.js + real WASM; no browser/images',scale:64,width:done.width,height:done.height,timeMs:performance.now()-start,jpegBytes:bytes,bandBytes:done.bandBytes,wasmBytes:done.wasmBytes},null,2));
  const worker = new Worker(new URL('./node-export-worker.js',import.meta.url));
  let completed=false;
  try {
    const started = new Promise((resolve,reject)=>{worker.on('error',reject);worker.on('message',data=>{if(data.type==='progress')resolve();if(data.type==='done')completed=true;});});
    worker.postMessage({config,region:exportRegion({x:0,z:0,bpp:1.9},1200,600,1),generation:2,id:2});
    await started; await worker.terminate(); assert.equal(completed,false);
  } finally { await worker.terminate(); }
});


test('codec selection chooses the smallest supported file', () => {
  for (const [webpSize, jpegSize, expected] of [[10,20,'webp'],[30,20,'jpg']]) {
    const result = selectSmallest([
      {blob:new Blob([new Uint8Array(webpSize)],{type:'image/webp'}),mime:'image/webp',format:'webp'},
      {blob:new Blob([new Uint8Array(jpegSize)],{type:'image/jpeg'}),mime:'image/jpeg',format:'jpg'},
    ]);
    assert.equal(result.format,expected);
  }
  assert.throws(()=>selectSmallest([{blob:new Blob(['data'],{type:'image/png'}),mime:'image/png',format:'png'}]));
});

test('WebP codec failure recovers through JPEG', async () => {
  const messages=[];
  await runExport({config,region:{x:0,z:0,width:16,height:16,scale:4},generation:3,id:4}, message=>messages.push(message),undefined,async()=>{throw new Error('Codec failed');});
  assert.equal(messages.at(-1).format,'jpg'); assert(messages.some(m=>m.type==='file')); assert(!messages.some(m=>m.type==='error'));
});
