import {buildMetadata} from './metadata.mjs';

// Local export only: never publishes assets or signs blockchain transactions.
export async function exportCompletedArtwork(details,readStorage,Zip,saveArchive,onProgress=()=>{}) {
 const tokens=await readStorage('***')||[];
 if(!tokens.length)throw Error('Generate completed artwork first.');
 const name=(details.name||'collection').replace(/[^a-z0-9_-]/gi,'-');
 for(let start=0;start<tokens.length;start+=100) {
  const zip=new Zip(),batch=tokens.slice(start,start+100);
  for(const [offset,token] of batch.entries()) {
   const image=await readStorage(`xgen_img_${token.index}`);
   if(!image)throw Error(`Completed artwork #${token.index} is missing. Regenerate before exporting.`);
   zip.folder('images').file(`${token.index}.png`,new Uint8Array(await(await fetch(image)).arrayBuffer()));
   zip.folder('metadata').file(`${token.index}.json`,JSON.stringify(buildMetadata(details,{...token,dataUrl:image}),null,2));
   onProgress(Math.round((start+offset+1)/tokens.length*100));
  }
  await saveArchive(zip,`${name}-completed-${start+1}-${start+batch.length}.zip`);
 }
}
