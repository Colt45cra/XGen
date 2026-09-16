import { buildAppearancePlan } from './generation.mjs';

let cancelled = false;
const DB_NAME = 'xgen';
const STORE_NAME = 'layers';
let databasePromise = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function database() {
  databasePromise ??= openDatabase();
  return databasePromise;
}

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = dataUrl.split(',');
  const type = header.replace('data:', '').replace(';base64', '');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function bitmap(dataUrl) {
  return createImageBitmap(dataUrlToBlob(dataUrl));
}

function weightedTrait(traits) {
  const total = traits.reduce((sum, trait) => sum + trait.rarity, 0);
  let selection = Math.random() * total;
  for (const trait of traits) {
    selection -= trait.rarity;
    if (selection <= 0) return trait;
  }
  return traits[traits.length - 1];
}

function signature(selected) {
  return [...selected]
    .sort((left, right) => left.layer.localeCompare(right.layer))
    .map((item) => `${item.layer}:${item.trait.name || item.trait.fileName}`)
    .join('|');
}

async function generate(layers, supply, requestedSize) {
  let size = requestedSize;
  if (!size) {
    const first = layers.find((layer) => layer.traits.length)?.traits[0];
    if (first) {
      const image = await bitmap(first.dataUrl);
      size = Math.min(Math.max(image.width, image.height, 100), 3000);
      image.close();
    } else size = 1000;
  }
  size = Math.min(Math.max(size, 100), 3000);
  self.postMessage({ type: 'size', size });

  const imageData = new Map();
  for (const layer of layers) {
    for (const trait of layer.traits) imageData.set(`${layer.name}::${trait.fileName}`, trait.dataUrl);
  }

  const appearancePlan = buildAppearancePlan(layers, supply);
  const seen = new Set();
  let pendingImages = [];
  let pendingMetadata = [];

  const flush = async () => {
    if (!pendingImages.length && !pendingMetadata.length) return;
    const db = await database();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const item of pendingImages) store.put(item.dataUrl, item.key);
      const request = store.get('***');
      request.onsuccess = () => store.put([...(request.result ?? []), ...pendingMetadata], '***');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    pendingImages = [];
    pendingMetadata = [];
  };

  for (let tokenIndex = 0; tokenIndex < supply && !cancelled; tokenIndex += 1) {
    let selected = [];
    let selectedSignature = '';
    let attempts = 0;
    do {
      selected = [];
      layers.forEach((layer, layerIndex) => {
        if (layer.traits.length && appearancePlan[layerIndex][tokenIndex]) {
          selected.push({ layer: layer.name, trait: weightedTrait(layer.traits) });
        }
      });
      selectedSignature = signature(selected);
      attempts += 1;
    } while (seen.has(selectedSignature) && attempts < 10);
    seen.add(selectedSignature);

    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, size, size);
    for (const item of selected) {
      const dataUrl = imageData.get(`${item.layer}::${item.trait.fileName}`);
      if (!dataUrl) continue;
      const image = await bitmap(dataUrl);
      context.drawImage(image, 0, 0, size, size);
      image.close();
    }

    const tokenNumber = tokenIndex + 1;
    const dataUrl = await blobToDataUrl(await canvas.convertToBlob({ type: 'image/png' }));
    pendingImages.push({ key: `xgen_img_${tokenNumber}`, dataUrl });
    const thumbnail = new OffscreenCanvas(200, 200);
    thumbnail.getContext('2d').drawImage(canvas, 0, 0, 200, 200);
    const thumbUrl = await blobToDataUrl(await thumbnail.convertToBlob({ type: 'image/jpeg', quality: 0.7 }));
    const traits = selected.map((item) => ({
      layer: item.layer,
      trait: item.trait.name || item.trait.fileName.replace(/\.png$/i, ''),
      rarity: item.trait.rarity,
    }));
    pendingMetadata.push({ index: tokenNumber, traits });
    self.postMessage({ type: 'progress', index: tokenNumber, total: supply, thumbUrl, traits });
    if (tokenNumber % 20 === 0) await flush();
  }
  await flush();
  self.postMessage({ type: 'done' });
}

self.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (message.type === 'start') {
    cancelled = false;
    generate(message.layers, message.supply, message.size).catch((error) => {
      console.error('[generator.worker] fatal:', error);
      self.postMessage({ type: 'done' });
    });
  }
};
