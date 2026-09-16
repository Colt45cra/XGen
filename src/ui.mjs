import {buildMetadata,validateDetails} from './metadata.mjs';
export function createUI(React, Wizard) {
 const h=React.createElement;
 function Details({details:d,onChange,onContinue}) {
  const [submitted,setSubmitted]=React.useState(false);
  const errors=validateDetails(d);
  const set=(key,value)=>onChange({...d,[key]:value});
  const field=(label,key,options={})=>h('label',{className:'field',key},h('span',null,label),h(options.multiline?'textarea':'input',{value:d[key]??options.fallback??'',onChange:e=>set(key,options.number?Number(e.target.value):e.target.value),type:options.number?'number':'text',min:options.min,max:options.max,placeholder:options.placeholder,rows:options.multiline?3:undefined,required:options.required}),options.hint&&h('small',null,options.hint));
  const metadata=buildMetadata({...d,name:d.name||'Your collection'}, {index:1,traits:[{layer:'Background',trait:'Your trait'}]});
  return h('section',null,
   h('div',{className:'page-heading'},h('p',{className:'eyebrow'},'01 / COLLECTION'),h('h1',null,'Make it yours.'),h('p',null,'Set the details that travel with every NFT.')),
   h('div',{className:'details-layout'},h('form',{className:'panel',onSubmit:e=>{e.preventDefault();setSubmitted(true);if(!errors.length)onContinue();}},
    field('Collection name','name',{required:true,placeholder:'You Are ATM'}),
    field('NFT description','description',{multiline:true,placeholder:'A short description for each NFT.'}),
    field('Collection description','collectionDescription',{multiline:true,fallback:d.description||'',hint:'The collection story. Exported separately from the NFT description.'}),
    h('div',{className:'field-grid'},field('Supply','supply',{number:true,min:1,max:10000}),field('Symbol','symbol',{placeholder:'ATM'})),
    h('div',{className:'field-grid'},field('Creator','creators',{fallback:'ATM'}),field('Compiler','compiler',{fallback:'ATM',hint:'The creator or tool credited in the metadata.'})),
    field('Project website','externalUrl',{placeholder:'https://yourproject.com',hint:'Optional. An empty value is still included in the JSON.'}),
    field('Image base URL','imageBaseUrl',{placeholder:'ipfs://YOUR_IMAGE_FOLDER_CID',hint:'Optional. Leave blank for 1.png, 2.png, and so on.'}),
    h('label',{className:'field'},h('span',null,`Royalty: ${d.royalty??5}%`),h('input',{type:'range',min:0,max:50,step:1,value:d.royalty??5,onChange:e=>set('royalty',Number(e.target.value))}),h('small',null,'Used by the existing minting flow; not added to this JSON format.')),
    submitted&&errors.length>0&&h('div',{role:'alert',className:'error'},errors.join(' ')),
    h('button',{className:'primary',type:'submit'},'Continue to artwork →')),
   h('aside',{className:'preview-panel'},h('div',{className:'preview-heading'},h('strong',null,'Metadata preview'),h('span',{className:'badge'},'Sample format')),h('p',null,'Token #1 · updates as you type'),h('pre',{'aria-label':'Metadata preview'},JSON.stringify(metadata,null,2)),h('p',{className:'preview-note'},'Preview traits are examples. Exports use the traits from each generated image.'))));
 }
 function App() {
  return h('div',{className:'studio'},h('header',{className:'studio-header'},h('a',{className:'brand',href:'#'},'X',h('span',null,'Gen')),h('span',{className:'studio-label'},'COLLECTION STUDIO'),h('a',{href:'https://xgen-iota.vercel.app',target:'_blank',rel:'noreferrer',className:'legacy-link'},'Original release ↗')),
   h('main',{className:'studio-main'},h(Wizard)),h('footer',{className:'studio-footer'},'All The Money Labs',h('span',null,'Artwork and progress stay in this browser.')));
 }
 return {Details,App};
}
