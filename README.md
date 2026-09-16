# XGen recovery release 1.2.1

Recovered from the owner's public Vercel deployment dpl_FoeW4d3Pu5QDjjE3nv7wApyreshG. Original TypeScript source was not available through the connected tools. `recovered/` preserves the original production JavaScript; this is a recovery release, not a reconstruction of original source files.

## Run

Requires Node 20+ and Python 3 for local preview. No npm dependencies.

```
npm test
npm run build
npm run preview
```

## Editable modules

- `src/metadata.mjs`: exact Sample.json export shape and validation.
- `src/generation.mjs`: exact layer-appearance planning and combination counts.
- `src/generator.worker.js`: collection renderer with layer appearance support.
- `src/ui.mjs`: accessible collection setup with live metadata preview and studio shell.
- `src/studio.css`: responsive styles.
- `scripts/build.mjs`: bounded, fail-closed patches to the preserved bundle.
- `reference/Sample.json`: user's authoritative metadata example.

Both descriptions, empty external_url, matching image/file URI, creators string, category and compiler are exported. Creators and compiler default to ATM and are editable. No collection.family is exported. Existing browser keys and IndexedDB name are preserved. Recovery release retains original generation and minting logic; weighted rarity is probabilistic, and the inherited generator can emit duplicates after ten retries. The inherited minting flow requires separate auditing before being represented as production-ready; no blockchain transactions were performed during this work.

Each layer has an appearance percentage from 0–100. XGen converts that percentage into an exact whole-token count for the chosen supply, randomly distributes those appearances, and then applies the layer's existing trait weights. Previously saved layers have no appearance field, so they migrate safely to 100% without losing names, images, weights, or generated progress.

## GitHub and Vercel

Create a private repository named xgen under the owner's account, commit this directory excluding dist, and connect it to the existing Vercel project `prj_gQg4GAN1H4QEmPhlaPouO55udanJ` in team `team_HPzz2V3JlobWKcQFJiPLeVdb`. vercel.json defines the build. Do not upload credentials, .vercel, .env, or browser artwork.

The full original source should replace the recovery bundle if later obtained. Keep metadata tests as the compatibility gate.
