import {buildAppearancePlan, possibleCombinations} from './generation.mjs';

export const MINTED_SCHEMA = 'minted.collection';
export const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
export function validateMintedPackage(p) {
  if (!p || p.schema !== MINTED_SCHEMA || p.version !== 1) throw Error('Choose a Minted collection package (version 1).');
  const id = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
  const name = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 160;
  if (!id(p.collection?.id) || !name(p.collection?.name) || !id(p.artist?.id) || !name(p.artist?.name) || !id(p.character?.id) || !name(p.character?.name)) throw Error('Artist, collection and character IDs and names are required.');
  if (!Number.isInteger(p.canvas?.width) || !Number.isInteger(p.canvas?.height) || p.canvas.width < 1 || p.canvas.height < 1 || p.canvas.width > 3000 || p.canvas.height > 3000) throw Error('Artwork dimensions must be between 1 and 3,000 pixels.');
  if (!Array.isArray(p.layers) || p.layers.length < 1 || p.layers.length > 32) throw Error('Add 1–32 artwork layers.');
  const layerIds = new Set(), assetIds = new Set();
  let fixed = false;
  for (const l of p.layers) {
    if (!id(l.id) || layerIds.has(l.id) || !name(l.name) || !['base','trait','effect'].includes(l.role) || typeof l.colorable !== 'boolean' || !Number.isFinite(l.appearance) || l.appearance < 0 || l.appearance > 100) throw Error('Each layer needs a unique ID, name, role and appearance from 0 to 100.');
    layerIds.add(l.id);
    if (fixed && l.colorable) throw Error('Place fixed effects above all colorable layers.');
    if (!l.colorable) fixed = true;
    if (!Array.isArray(l.traits) || !l.traits.length || l.traits.length > 200) throw Error('Each layer needs 1–200 traits.');
    const names = new Set();
    for (const t of l.traits) {
      if (!id(t.id) || assetIds.has(t.id) || !name(t.name) || t.name === 'None' || names.has(t.name) || !Number.isFinite(t.weight) || t.weight <= 0 || typeof t.image !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(t.image)) throw Error('Traits need unique IDs and names, positive weights and embedded PNG artwork. “None” is reserved.');
      assetIds.add(t.id); names.add(t.name);
    }
  }
  if (p.layers.filter(l => l.role === 'base').length !== 1 || p.layers.find(l => l.role === 'base').appearance !== 100 || !p.layers.find(l => l.role === 'base').colorable) throw Error('Exactly one colorable base layer must appear in every stencil.');
  if (p.stencils !== undefined) {
    if (!Array.isArray(p.stencils) || p.stencils.length > 500) throw Error('A package supports at most 500 generated stencils.');
    const indices = new Set();
    for (const s of p.stencils) {
      if (!Number.isInteger(s.index) || s.index < 1 || indices.has(s.index) || !Array.isArray(s.traits)) throw Error('Generated stencil indices must be unique positive numbers.');
      indices.add(s.index);
      const chosen = new Set();
      for (const selection of s.traits) {
        const layer = p.layers.find(l => l.id === selection.layer_id);
        if (!layer || chosen.has(layer.id) || !layer.traits.some(t => t.id === selection.trait_id)) throw Error('A generated stencil references an unknown or repeated layer or trait.');
        chosen.add(layer.id);
      }
      if (p.layers.some(l => l.appearance === 100 && !chosen.has(l.id))) throw Error('A generated stencil is missing a required layer.');
    }
  }
  if (JSON.stringify(p).length > MAX_PACKAGE_BYTES) throw Error('This package exceeds 50 MB. Use fewer or smaller images.');
  return p;
}

export function buildMintedMetadata(p, selected, index, image) {
  return {name:`${p.character.name} #${index}`, description:p.collection.description || '', image,
    publisher:'ALL THE MONEY Labs', product:'Minted', attribution:'Minted is a product of ALL THE MONEY Labs',
    collection:{name:p.collection.name}, attributes:selected.map(s => ({trait_type:s.layer.name,value:s.trait.name})),
    minted:{schema:MINTED_SCHEMA,version:1,collection_id:p.collection.id,artist_id:p.artist.id,character_id:p.character.id,canvas:p.canvas,
      publisher:'ALL THE MONEY Labs',product:'Minted',layers:selected.map(s=>({layer_id:s.layer.id,trait_id:s.trait.id,role:s.layer.role,colorable:s.layer.colorable})),status:'uncolored'}};
}

export function planMintedCollection(p, supply, random = Math.random) {
  validateMintedPackage(p);
  if (!Number.isInteger(supply) || supply < 1 || supply > 500) throw Error('Generate 1–500 stencils at a time.');
  if (supply > possibleCombinations(p.layers)) throw Error('Add more traits or lower the collection size for unique stencils.');
  const plan = buildAppearancePlan(p.layers,supply,random), seen = new Set(), tokens = [];
  for (let i=0;i<supply;i++) {
    let selected, key, attempts=0;
    do {
      selected=p.layers.flatMap((layer,j)=>{
        if (!plan[j][i]) return [];
        let value=random()*layer.traits.reduce((sum,t)=>sum+t.weight,0);
        const trait=layer.traits.find(t=>(value-=t.weight)<0) || layer.traits.at(-1);
        return [{layer,trait}];
      });
      key=selected.map(s=>s.trait.id).join('|');
      attempts++;
    } while (seen.has(key) && attempts < 2000);
    if (seen.has(key)) throw Error('These appearance and rarity settings cannot produce the requested unique collection. Lower the size or adjust the weights.');
    seen.add(key); tokens.push(selected);
  }
  return tokens;
}
