class WasmProcessor extends AudioWorkletProcessor {

    constructor() {
        super();
        this._wasm = null;

        this._inPtr = null;
        this._outPtr = null;
        this._sampleBufferPtr = null;

        this._inBuf = null;
        this._outBuf = null;

        // this is default for WAPI - it will probably be variable some day and
        // need to be accepted from a post-message?
        this._block_size = 128;

        this.port.onmessage = event => this.onmessage(event.data);
    }

    alloc_memory(bufferLength) {
        // allocates the heap memory for rust, returns a pointer to it.
        // NOTE: we may need/want to do this multiple times, once per
        //      channel per in/out?
        //      mem allocation  = n_channels * 2 * this._block_size.
        //      Possibly useful to have a class for this (both the ptr 
        //      and the Float32Array instead of having these separated).
        this._inPtr = this._wasm.alloc_block();
        this._outPtr = this._wasm.alloc_block();


        // TODO remove soon...
        // const length = 1152000;
        this._sampleBufferPtr = this._wasm.alloc(bufferLength);
        this._sampleArray = new Float32Array(
            this._wasm.memory.buffer,
            this._sampleBufferPtr,
            bufferLength,
        )


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
        );
    }

    onmessage(data) {
        console.log('worklet received:', data.type);
        if (data.type === 'init-wasm') {
            const instance = async () => {
                const memory = new WebAssembly.Memory({
                    initial: 20,    // 3 pages of 64KB each (3 * 64KB = 192KB initial memory)
                    maximum: 20     // Limit memory growth to 3 pages
                });

                // Create an import object to pass to the WebAssembly module
                const imports = {
                    env: {
                        memory: memory,
                        // Add any other necessary imports
                    }
                };

                this._wasm = (await WebAssembly.instantiate(data.wasmBytes, imports)).instance.exports;
                this.port.postMessage({ type: "init-wasm-complete" });
            }
            instance();
        } else if (data.type === 'init-buffer') {
            const { length, channelData } = data.data;
            console.log('buffer len:', length);
            this.alloc_memory(length);

            this._sampleArray.set(channelData);
            this._wasm.looper_set_buffer(this._sampleBufferPtr, length)
            this.port.postMessage({ type: "init-buffer-complete" });
        }
    }

    process(inputs, outputs, parameters) {
        if (
            this._wasm === null ||
            (inputs[0][0] === undefined) ||
            this._sampleBufferPtr == null
        ) {
            return true;
        }

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
