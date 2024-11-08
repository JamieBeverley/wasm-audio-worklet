# wasm-audio-worklet

Proof-of-concept (to-be-made-template) for creating Web Audio Worklets that run
DSP from WASM generated by Rust.
Rust -> WASM -> Audio Worklet -> threaded realtime audio in the browser

(with hopes that there may also be some performance gain in using WASM instead
of JS AudioWorklets but we'll see?)

- `./rust-wasm` contains a crate that defines a very basic audio `process` function
    - presently just adds some noise to whatever the input signal is.
- `./` exports an async `initNode` function to set up an `AudioWorkletNode`:
    - loads the `wasm` binary
    - pipes it over to an AudioWorklet via a post message
    - creates an `AudioWorkletNode` and returns it
- `./demo` contains a `vanilla-ts` vite app for demonstration which:
    - imports `./`
    - sets up a button (user-interaction required to start audio context)
    - when that button clicks, plays an oscillator and connects it to the
      Wasm-based AudioWorkletNode
      (so it plays a sin osc w/ some noise added... `tadaa`)

## Things tried + resources

- Started here:
    - https://dev.to/speratus/i-built-this-despite-a-flaw-in-rusts-webassembly-toolchain-38p2
        - this repo is more akin to part 2 of this blog
        - I chose to avoid wasm-pack/wasm-bindgen (part 3) because:
            - it either involves mutating some of the JS bindings generated by
            wasm-pack (prone to breaking, this is not a public interface)
            - or poly-filling some things in the AudioWorklet environment/context
            so wasm-pack bindings don't error-out when `init`/`initSync` is called
            (I'm not sure what would be involved in polyfilling all this but it
            felt like potentially a lot or possibly infeasible. e.g. fetch API is
            not accessible to AudioWorklets)
        - This blog didn't get me the full way however: example here uses a wasm
        function call _per-sample_ but I wanted/needed rust/wasm processing full
        audio blocks.
        - This requires some more convoluted memory management (so we can pass
        references to Float32Arrays between WASM and JS)
- This was also helpful: https://www.toptal.com/webassembly/webassembly-rust-tutorial-web-audio
    - However, this particular example doesn't produce audio from the wasm 
      process fn (its doing pitch detection).
    - Wanted something that was mutating the `output` (so we can generate/modify
      the signal)
- This example from the `wasm-bindgen` book examples was helpful too: https://rustwasm.github.io/wasm-bindgen/examples/wasm-audio-worklet.html
  - but [it depends on unstable cargo features](https://github.com/rustwasm/wasm-bindgen/blob/main/examples/wasm-audio-worklet/build.py#L10-L11)
- Ultimately found: https://github.com/the-drunk-coder/wasm-loop-player/tree/master
  - which was exactly what I needed (and does more cool stuff - sample playback
    from wasm)
  - A more full example from the same person: https://github.com/the-drunk-coder/ruffbox
  - Both insipred by: [this repo](https://github.com/reprimande/wasm-audioworklet-synth) and [this blog](https://qiita.com/reprimande/items/5c078e5a7f9f52d2091c)
