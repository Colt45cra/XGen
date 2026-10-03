export function buildMetadata(details, token) {
  const image = details.imageBaseUrl ? `${details.imageBaseUrl.replace(/\/+$/, '')}/${token.index}.png` : `${token.index}.png`;
  const brand=details.destination==='minted'?{publisher:'ALL THE MONEY Labs',product:'Minted',attribution:'Minted is a product of ALL THE MONEY Labs'}:{};
  return {
    ...brand,
    name: `${details.name} #${token.index}`,
    description: details.description || '',
    external_url: details.externalUrl || '',
    image,
    collection: { name: details.name, description: details.collectionDescription ?? details.description ?? '' },
    attributes: token.traits.map(t => ({trait_type:t.layer, value:t.trait})),
    properties: {files:[{uri:image,type:'image/png'}],category:'image',creators:details.creators ?? 'ATM'},
    compiler: details.compiler ?? 'ATM'
  };
}
export function validateDetails(d) {
 const errors = [];
 if(d.destination==='minted'&&(!d.mintedArtist?.trim()||!d.mintedCharacter?.trim())) errors.push('Enter artist and character names for Minted.');
 if (!d.name?.trim()) errors.push('Enter a collection name.');
 if (!Number.isInteger(Number(d.supply)) || Number(d.supply)<1 || Number(d.supply)>10000) errors.push('Supply must be a whole number from 1 to 10,000.');
 for (const [key,label] of [['externalUrl','Website'],['imageBaseUrl','Image base URL']]) {
  if(d[key]) { try {const u=new URL(d[key]);if(!['https:','http:','ipfs:','ar:'].includes(u.protocol)) throw Error();} catch {errors.push(`${label} must use https://, http://, ipfs:// or ar://.`);} }
 }
 return errors;
}
