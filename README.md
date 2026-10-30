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

## Debug mode for screenshots

Add `?debug=1` to any address (for example `/example/utaut2/0?debug=1`); `?debug=0` turns it off. It lasts for the browser tab.
A panel in the corner fills each reply box with the expected reply, and in step 10 fills the paper's choice of setting and its reason.
You still press Copy prompt, Use this reply, Confirm and the other buttons yourself. Alt+Shift+D hides or shows the panel; Alt+Shift+P runs its first fill.
The expected replies are the real replies of the paper's run (prompts v2.4). No real v2.5 replies exist: a v2.5 run is offered the v2.4 replies, and in step 9 the reference slot block for v2.5.
