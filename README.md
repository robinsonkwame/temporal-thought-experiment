# temporal-thought-experiment
Supporting a research paper, as an instantiation of the traceability protocol

The workbench for the temporal thought experiment, specified in [docs/BRIEF.md](docs/BRIEF.md).
The files in `src/content/` and `tests/fixtures/` are provided research instruments and data; they are never edited.

## Develop

Node 20.

```
npm install
npm test          # unit tests, including the manifest check of the provided files
npm run dev       # Vite; /api is served from the function handlers over an in-memory store
netlify dev       # the same app with the real Netlify Functions and Blobs
npm run build     # tests, type check, then the Vite build into dist/
```

`npm run build` fails if any provided file differs from `src/content/MANIFEST.sha256.json`.
