import test from 'node:test';
import assert from 'node:assert/strict';
import {createMintedPublisher} from '../src/minted-ui.mjs';
import {exportCompletedArtwork} from '../src/completed-export.mjs';
const png='data:image/png;base64,aGVsbG8=';
test('Minted attribute download never reads or includes completed generated artwork',async()=>{
 const original={localStorage:globalThis.localStorage,document:globalThis.document,bitmap:globalThis.createImageBitmap,url:URL.createObjectURL,revoke:URL.revokeObjectURL,timer:globalThis.setTimeout};
 let downloaded,filename;
 try{
  globalThis.localStorage={getItem:()=> 'collection-1'};
  globalThis.createImageBitmap=async()=>({width:100,height:100,close(){}});
  globalThis.document={createElement:()=>({set download(value){filename=value;},click(){}})};
  URL.createObjectURL=blob=>{downloaded=blob;return 'blob:test';};URL.revokeObjectURL=()=>{};globalThis.setTimeout=()=>0;
  const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:initial=>[initial,()=>{}],useEffect:()=>{}};
  const Publisher=createMintedPublisher(React,()=>{throw Error('Completed storage must not be read for Minted assets');});
  const tree=Publisher({details:{name:'Owls'},layers:[{id:'body',name:'Body',traits:[{id:'basic',name:'Basic',rarity:1,dataUrl:png}]}]});
  function find(node){if(node?.type==='button'&&node.children[0]==='Download attribute package')return node;for(const child of node?.children||[]){const result=find(child);if(result)return result;}}
  await find(tree).props.onClick();assert.ok(downloaded,'Attribute package downloaded');
  const output=JSON.parse(await downloaded.text());assert.equal(filename,'Owls.minted.json');assert.equal(output.layers[0].traits[0].image,png);assert.deepEqual(output.stencils,[]);assert.equal(output.image,undefined);
 }finally{
  globalThis.localStorage=original.localStorage;globalThis.document=original.document;globalThis.createImageBitmap=original.bitmap;URL.createObjectURL=original.url;URL.revokeObjectURL=original.revoke;globalThis.setTimeout=original.timer;
 }
});
test('completed export retains composed PNGs and their trait metadata separately',async()=>{
 const tokens=[{index:1,traits:[{layer:'Body',trait:'Basic'}]}],files={},saved=[];
 class Zip{folder(name){return {file:(path,value)=>{files[`${name}/${path}`]=value;}};}}
 const keys=[];await exportCompletedArtwork({name:'Owls'},async key=>{keys.push(key);return key==='***'?tokens:png;},Zip,async(zip,name)=>saved.push(name));
 assert.deepEqual(keys,['***','xgen_img_1']);assert.equal(new TextDecoder().decode(files['images/1.png']),'hello');assert.deepEqual(JSON.parse(files['metadata/1.json']).attributes,[{trait_type:'Body',value:'Basic'}]);assert.deepEqual(saved,['Owls-completed-1-1.zip']);
});
test('completed export fails rather than silently exporting a missing image',async()=>{
 class Zip{folder(){return {file(){}};}}
 let saved=false;await assert.rejects(exportCompletedArtwork({name:'Owls'},async key=>key==='***'?[{index:1}]:null,Zip,async()=>{saved=true;}),/missing/);assert.equal(saved,false);
});
