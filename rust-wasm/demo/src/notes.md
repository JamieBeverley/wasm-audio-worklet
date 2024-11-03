- I want this installable as an npm package
- but it really requires a MyAudioWorklet.js file



# buidl:

- build wasm:
    - wasm-pack build --target web
    or
    - ...?


copy worklet.js file to `pkg`
edit pkg/package.json to include that file in exports(?)