import {validateMintedPackage,buildMintedMetadata,MAX_PACKAGE_BYTES} from './minted.mjs';

export function createMintedPublisher(React,readStorage) {
 const h=React.createElement;
 const origin='https://nft-color-delta.vercel.app';
 return function MintedPublisher({details,layers,onBack}) {
  const [roles,setRoles]=React.useState({}),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[approval,setApproval]=React.useState(null);
  const [server,setServer]=React.useState({enabled:false,message:'Checking Minted publishing…'});
  React.useEffect(()=>{let active=true;fetch(`${origin}/api/artist/publish/intent`).then(async res=>{const data=await res.json();if(active)setServer({enabled:res.ok&&data.enabled,message:data.error||''});}).catch(()=>{if(active)setServer({enabled:false,message:'Minted publishing is not available yet.'});});return()=>{active=false;};},[]);
  function role(l,i){return roles[l.id]||(i===0?'base':'trait');}
  async function collect() {
   let canvas;
   const output=[];
   for(let i=0;i<layers.length;i++) {
    const l=layers[i],r=role(l,i),traits=[];
    for(const t of l.traits) {
     if(!/^data:image\/png;base64,/.test(t.dataUrl))throw Error('Minted requires PNG layers.');
     const bitmap=await createImageBitmap(await (await fetch(t.dataUrl)).blob());
     const dimensions={width:bitmap.width,height:bitmap.height};bitmap.close();
     canvas??=dimensions;
     if(canvas.width!==dimensions.width||canvas.height!==dimensions.height)throw Error('Minted layers must use the same canvas dimensions.');
     traits.push({id:t.id,name:t.name||t.fileName.replace(/\.png$/i,''),weight:t.rarity,image:t.dataUrl});
    }
    output.push({id:l.id,name:l.name,role:r,colorable:r!=='effect',appearance:l.appearance??100,traits});
   }
   const key=`xgen_minted_collection_${layers[0]?.id}`;
   let id=localStorage.getItem(key);if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}
   const p={schema:'minted.collection',version:1,artist:{id:`artist-${id}`,name:details.mintedArtist||details.creators||'Artist'},collection:{id,name:details.name,description:details.description||''},character:{id:`character-${id}`,name:details.mintedCharacter||details.name},canvas,layers:output,stencils:[]};
   if(new Set(output.map(l=>l.name)).size!==output.length)throw Error('Give each layer a different name so generated traits map correctly.');
   const generated=await readStorage('***')||[];
   if(generated.length>500)throw Error('Minted supports up to 500 generated stencils per character. Lower the supply or publish editable layers only.');
   for(const token of generated) {
    const traits=token.traits.map(t=>{const layer=output.find(l=>l.name===t.layer),trait=layer?.traits.find(item=>item.name===t.trait);if(!trait)throw Error('Regenerate this collection so its stencils match the current artwork.');return {layer_id:layer.id,trait_id:trait.id};});
    p.stencils.push({index:token.index,traits});
   }
   return validateMintedPackage(p);
  }
  async function download() {
   setBusy(true);setMessage('');try{
    const p=await collect();
    const stencils=p.stencils.map(s=>{const selected=s.traits.map(t=>{const layer=p.layers.find(l=>l.id===t.layer_id);return {layer,trait:layer.traits.find(item=>item.id===t.trait_id)};});return {...s,metadata:buildMintedMetadata(p,selected,s.index,`stencils/${s.index}.png`)};});
    const json=JSON.stringify({...p,stencils});if(new Blob([json]).size>MAX_PACKAGE_BYTES)throw Error('Collection package exceeds 50 MB.');
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${details.name.replace(/[^a-z0-9_-]/gi,'-')}.minted.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Minted package downloaded.');
   }catch(e){setMessage(e.message);}finally{setBusy(false);}
  }
  async function begin() {
   setBusy(true);setMessage('');setApproval(null);
   try {
    const collection=await collect();if(new Blob([JSON.stringify(collection)]).size>3*1024*1024)throw Error('Direct publishing supports 3 MB of artwork per character. Reduce PNG size or export the collection.');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(collection))))].map(b=>b.toString(16).padStart(2,'0')).join('');
    const res=await fetch(`${origin}/api/artist/publish/intent`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hash,name:collection.collection.name})});
    const result=await res.json();if(!res.ok)throw Error(result.error||'Could not start publication.');
    setApproval({...result,collection});setMessage('Sign the publishing request in Xaman, then confirm below.');
   }catch(e){setMessage(e.message);}finally{setBusy(false);}
  }
  async function finish() {
   if(!approval)return;setBusy(true);
   try {const res=await fetch(`${origin}/api/artist/publish`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:approval.token,collection:approval.collection})});const result=await res.json();if(!res.ok)throw Error(result.error||'Publication failed.');if(result.pending){setMessage('The Xaman request is still waiting for your signature.');return;}setMessage('Published to Minted. Your character is now in the shared catalog.');setApproval(null);}catch(e){setMessage(e.message);}finally{setBusy(false);}
  }
  return h('section',{className:'minted-studio'},h('div',{className:'page-heading'},h('p',{className:'eyebrow'},'MINTED / PUBLISH'),h('h1',null,'Publish your coloring collection.'),h('p',null,'Minted is a product of ALL THE MONEY Labs. Only wallets holding a Minted Approved Artist NFT can publish.')),
   h('div',{className:'details-layout'},h('div',{className:'panel'},h('h2',null,'Map your layers'),h('p',null,'Choose one required base character. Keep colorable layers below fixed effects. Overlays need transparent backgrounds.'),...layers.map((l,i)=>h('label',{key:l.id,className:'field'},h('span',null,`${i+1}. ${l.name} · ${l.traits.length} traits`),h('select',{value:role(l,i),disabled:busy,onChange:e=>{setRoles(old=>({...old,[l.id]:e.target.value}));setApproval(null);}},h('option',{value:'base'},'Base character'),h('option',{value:'trait'},'Colorable trait group'),h('option',{value:'effect'},'Fixed effect'))))),
   h('aside',{className:'preview-panel'},h('h2',null,'Ready for Minted'),h('p',null,'The artist, character, traits, layer order and generated combinations travel together.'),h('button',{className:'primary',disabled:busy||!server.enabled,onClick:begin},busy?'Working…':'Publish to Minted'),!server.enabled&&h('p',null,server.message),approval&&h('div',null,approval.qr&&h('img',{className:'minted-preview',src:approval.qr,alt:'Scan with Xaman to approve publication'}),h('a',{href:approval.signUrl,target:'_blank',rel:'noreferrer'},'Open Xaman approval'),h('button',{className:'primary',disabled:busy,onClick:finish},'I signed — verify badge & publish')),h('button',{className:'minted-secondary',disabled:busy,onClick:download},'Download Minted package'),h('p',null,'Building and downloading do not require an artist badge.'),message&&h('div',{className:'notice',role:'status'},message))),h('button',{className:'minted-secondary',disabled:busy,onClick:onBack},'Back to generation'));
 };
}
