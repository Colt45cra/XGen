import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {buildMetadata,validateDetails} from '../src/metadata.mjs';
const sample=JSON.parse(await readFile(new URL('../reference/Sample.json',import.meta.url)));
const details={name:sample.collection.name,description:sample.description,collectionDescription:sample.collection.description,externalUrl:'',imageBaseUrl:'',creators:'ATM',compiler:'ATM',supply:1};
const token={index:1,traits:sample.attributes.map(t=>({layer:t.trait_type,trait:t.value}))};
test('reproduces complete uploaded sample including field order',()=>{assert.equal(JSON.stringify(buildMetadata(details,token)),JSON.stringify(sample));});
test('hosted images and properties uri stay aligned',()=>{for(const base of ['ipfs://abc/','https://example.com/images///']){const result=buildMetadata({...details,imageBaseUrl:base},token);assert.equal(result.image,base.replace(/\/+$/,'')+'/1.png');assert.equal(result.properties.files[0].uri,result.image);}});
test('old saved details migrate with description fallback',()=>{const old={name:'Legacy',description:'Story'};assert.equal(buildMetadata(old,{index:2,traits:[]}).collection.description,'Story');assert.equal(buildMetadata(old,{index:2,traits:[]}).properties.creators,'ATM');});
test('validation rejects bad supply, blank name and unsafe URI scheme',()=>{assert.equal(validateDetails(details).length,0);assert.equal(validateDetails({...details,supply:0,name:' ',imageBaseUrl:'javascript:alert(1)'}).length,3);});
