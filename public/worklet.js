class WasmProcessor extends AudioWorkletProcessor {

    constructor() {
        super();
        this._wasm = null;

        this._inPtr = null;
        this._outPtr = null;
        this._sampleBufferPtr = null;

        this._inBuf = null;
        this._outBuf = null;
        this._sampleBuffer = null;

        // this is default for WAPI - it will probably be variable some day and
        // need to be accepted from a post-message?
        this._block_size = 128;

        this.port.onmessage = event => this.onmessage(event.data);
    }

    onmessage(data) {
        if (data.type === 'init-wasm') {
            const instance = async () => {
                this._wasm = (await WebAssembly.instantiate(data.wasmBytes)).instance.exports;

                // allocates the heap memory for rust, returns a pointer to it.
                // NOTE: we may need/want to do this multiple times, once per
                //      channel per in/out?
                //      mem allocation  = n_channels * 2 * this._block_size.
                //      Possibly useful to have a class for this (both the ptr 
                //      and the Float32Array instead of having these separated).
                this._inPtr = this._wasm.alloc(this._block_size);
                this._outPtr = this._wasm.alloc(this._block_size);
                this._sampleBufferPtr = this._wasm.alloc(this._block_size);

                this._sampleBuffer = this._wasm.alloc_buffer_128();

                this._inBuf = new Float32Array(
                    // but `memory` isn't exported from rust, where does it come from?
                    // ChatGPT says when you allocate dynamic memory in wasm, this `memory`
                    // object gets defined on `exports`. (TODO validate? read?)
                    this._wasm.memory.buffer,
                    this._inPtr,
                    this._block_size
                )
                this._outBuf = new Float32Array(
                    this._wasm.memory.buffer,
                    this._outPtr,
                    this._block_size
                )
            }
            instance();
        } else if (data.type === 'init-buffer') {
            if (this._sampleBuffer === null) {
                throw Error("cannot init sample buffer before wasm has loaded")
            }
            const sampleArray = new Float32Array(
                this._wasm.memory.buffer,
                this._sampleBufferPtr,
                data.buffer.length,
            )
            this._sampleBuffer.set_buffer(sampleArray, sampleArray.length);
        }
    }

    process(inputs, outputs, parameters) {
        if (this._wasm === null) return true;

        // 1. Copy input data to t`this._inPtr`
        this._inBuf.set(inputs[0][0]) // array index may not be correct

        // 2. call wasm process, passing pointers to the input/output and how many
        // bytes to read/process
        this._wasm.process(this._inPtr, this._outPtr, this._block_size);
        // 3. copy the processed values back over to the worklet output array
        // NOTE: unfortunately a `set` here (which copies values, not references) is
        // unavoidable. Still probably faster than iterating over every sample.
        outputs[0][0].set(this._outBuf)

        return true;
    }

}

registerProcessor('WasmProcessor', WasmProcessor);
