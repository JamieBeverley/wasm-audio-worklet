# Demo
A demo app for testing/demonstrating/experimenting w/ the parent npm module.

Usage:

## Installation:
```bash
npm install
```

You may also want to npm link if you'd like changes to the wasm worklet
package to update the demo without requiring calling `npm install` again:

In the parent (the root of `wasm-audio-worklet`):
```bash
cd ..
npm link
```

In this directory:
```
npm link wasm-audio-worklet
```

### Install a sound file
- Save a sound file in `./public/sound-file.wav`

## Running the demo:
```
npm run build
cd dist
# http server of your choice... eg:
python -m http.server
```

You can probably also run the vite dev server `npm run dev` but the rest of this
repo isn't yet setup for live-reloading.
