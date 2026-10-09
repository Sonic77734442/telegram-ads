import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const result=await build({entryPoints:['src/utils/mediaDisplayUrl.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {mediaDisplayUrl}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const base='https://eoybnbhpqsqxeygsikkz.supabase.co/storage/v1/object/public/media/ads/';
test('new and legacy media use first-party URLs without an ads path',()=>{
 assert.equal(mediaDisplayUrl(base+'client/photo.jpg'),'/creative-media/client/photo.jpg');
 assert.equal(mediaDisplayUrl(base+'old%20photo.jpg'),'/creative-media/old%20photo.jpg');
 assert.equal(mediaDisplayUrl(base+'client/video.mp4'),'/creative-media/client/video.mp4');
});
test('empty, local and unrelated image URLs are preserved',()=>{
 for(const value of [undefined,'','blob:local','/creative-media/photo.jpg','https://example.com/image.jpg']) assert.equal(mediaDisplayUrl(value),value);
});
test('media delivery rewrite precedes the SPA fallback and preserves storage paths',async()=>{
 const config=JSON.parse((await readFile('vercel.json','utf8')).replace(/^\uFEFF/,''));
 const rule=config.rewrites[0];
 assert.equal(rule.source,'/creative-media/:path*');
 assert.equal(rule.destination,base+':path*');
});
