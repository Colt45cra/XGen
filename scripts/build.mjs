import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
let bundle=await readFile('recovered/index-original.js','utf8');
function replaceOnce(from,to){if(bundle.split(from).length!==2)throw Error('Recovery patch anchor changed: '+from.slice(0,90));bundle=bundle.replace(from,to);}
const start=bundle.indexOf('function Cc(e,t){');const end=bundle.indexOf('var wc=100;',start);if(start<0||end<0)throw Error('Metadata export function not found');
bundle=bundle.slice(0,start)+'function Cc(e,t){return buildMetadata(e,t)}'+bundle.slice(end);
replaceOnce('(0,w.jsx)(N,{details:r,onChange:i,onContinue:v})','(0,w.jsx)(StudioDetails,{details:r,onChange:i,onContinue:v})');
replaceOnce('(0,w.jsx)(Yc,{})','(0,w.jsx)(StudioApp,{})');
replaceOnce('(0,S.createRoot)(document.getElementById(`root`))','const {Details:StudioDetails,App:StudioApp}=createUI(x,zc);(0,S.createRoot)(document.getElementById(`root`))');
replaceOnce('var Lc=[`Details`,`Layers`,`Preview`,`Deploy`]','var Lc=[`Details`,`Artwork`,`Generate`,`Export & mint`]');
replaceOnce('onClick:g,style:','onClick:()=>{if(confirm(`Start a new collection? This clears the current setup and layers in this browser.`))g()},style:');
replaceOnce('Mint directly on Mainnet or Testnet. Real NFTokenMint transactions — sequences pre-calculated, no autofill in loop.','Mint on XRPL after uploading your exported assets and verifying your metadata references.');
await rm('dist',{recursive:true,force:true});await mkdir('dist/assets',{recursive:true});
await cp('src','dist/src',{recursive:true});
await writeFile('dist/assets/index.js',`import {buildMetadata} from '../src/metadata.mjs';\nimport {createUI} from '../src/ui.mjs';\n${bundle}`);
await cp('recovered/generator.worker-JXZ_rGPt.js','dist/assets/generator.worker-JXZ_rGPt.js');
await cp('recovered/favicon.svg','dist/favicon.svg');
await writeFile('dist/index.html','<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Create NFT collections from layered artwork with sample-format metadata exports."><title>XGen — Collection Studio</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/src/studio.css"><script type="module" src="/assets/index.js"></script></head><body><div id="root"></div></body></html>');
console.log('Built XGen recovery release → dist');
