const BLOCK_SIZE = 128;

class WasmBuffer {
    constructor(size) {
        this.ptr = null;
        this.buffer = null;
        this.size = size;
    }

    alloc(wasm) {
        this.ptr = wasm.alloc(this.size);
        this.buffer = new Float32Array(
            wasm.memory.buffer,
            this.ptr,
            this.size
        );
    }
}

class WasmProcessor extends AudioWorkletProcessor {

    static get parameterDescriptors() {
        return []
    }

    constructor() {
        super();
        this._wasm = null;

        // TODO channels. parameterize BLOCK_SIZE
        this.inBuffer = new WasmBuffer(BLOCK_SIZE);
        this.outBuffer = new WasmBuffer(BLOCK_SIZE);

        this.port.onmessage = event => this.onmessage(event.data);
    }

    alloc_memory() {
        this.inBuffer.alloc(this._wasm);
        this.outBuffer.alloc(this._wasm);
    }

    async initWasm(data) {
        const memory = new WebAssembly.Memory({
            // TODO totally arbitrary, perhaps parametrize in post
            // message or consider a reasonable default.
            initial: 3
        });

        const imports = { env: { memory: memory } };

        this._wasm = (await WebAssembly.instantiate(
            data.wasmBytes, imports
        )).instance.exports;
        this.port.postMessage({ type: "init-wasm-complete" });
    }

    messageHandlers = {
        "init-wasm": this.initWasm
    }

    onmessage(data) {
        const handler = this.messageHandlers[data.type];
        if (handler === undefined) {
            throw `Unexpected message ${data.type}`;
        } else if (handler === null) {
            return;
        } else {
            handler.call(this, data)
        }
    }

    process(inputs, outputs, parameters) {
        if (
            this._wasm === null ||
            (inputs[0][0] === undefined) ||
            this.sampleBuffer == null
        ) {
            return true;
        }
        this.inBuffer.buffer.set(inputs[0][0]) // array index may not be correct
        this._wasm.process(this.inBuffer.ptr, this.outBuffer.ptr, BLOCK_SIZE);
        outputs[0][0].set(this.outBuffer.buffer)
        return true;
    }
}

class BufferLooper extends WasmProcessor {

    static get parameterDescriptors() {
        return []
    }

    alloc_memory(bufferLength) {
        // Alloc memory here is a bit different: we need to alloc for the sample
        // buffer too.
        this.sampleBuffer = new WasmBuffer(bufferLength);
        this.sampleBuffer.alloc(this._wasm);
        this.inBuffer.alloc(this._wasm);
        this.outBuffer.alloc(this._wasm);
    }

    initBuffer(data){
        const { length, channelData } = data.data;
        this.alloc_memory(length);

        this.sampleBuffer.buffer.set(channelData);
        this._wasm.synth_set_buffer(this.sampleBuffer.ptr, length)
        this.port.postMessage({ type: "init-buffer-complete" });
    }

    messageHandlers = {
        "init-wasm": this.initWasm,
        "init-buffer": this.initBuffer,
    }
}

registerProcessor('BufferLooper', BufferLooper);

// TODO dedupe/refactor/clean/figure out correct abstraction here

class BitCrush extends AudioWorkletProcessor {

    static get parameterDescriptors() {
        return []
    }

    constructor() {
        super();
        this._wasm = null;

        this._inPtr = null;
        this._outPtr = null;

        this._inBuf = null;
        this._outBuf = null;

        // this is default for WAPI - it will probably be variable some day and
        // need to be accepted from a post-message?
        this._block_size = 128;

        this.port.onmessage = event => this.onmessage(event.data);
    }

    alloc_memory() {
        // allocates the heap memory for rust, returns a pointer to it.
        // NOTE: we may need/want to do this multiple times, once per
        //      channel per in/out?
        //      mem allocation  = n_channels * 2 * this._block_size.
        //      Possibly useful to have a class for this (both the ptr 
        //      and the Float32Array instead of having these separated).
        this._inPtr = this._wasm.alloc_block();
        this._outPtr = this._wasm.alloc_block();

        this._inBuf = new Float32Array(
            // but `memory` isn't exported from rust, where does it come from?
            // ChatGPT says when you allocate dynamic memory in wasm, this 
            // `memory` object gets defined on `exports`. (TODO validate? read?)
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
        if (data.type === 'init-wasm') {
            const instance = async () => {
                const memory = new WebAssembly.Memory({
                    // TODO totally arbitrary, perhaps parametrize in post
                    // message or consider a reasonable default.
                    initial: 3
                });

                const imports = {
                    env: {
                        memory: memory,
                    }
                };

                this._wasm = (await WebAssembly.instantiate(
                    data.wasmBytes, imports
                )).instance.exports;

                this.port.postMessage({ type: "init-wasm-complete" });
            }
            instance().then(() => this.alloc_memory());
        }
    }

    process(inputs, outputs, parameters) {
        if (
            this._wasm === null || (inputs[0][0] === undefined) || this._inBuf === null
        ) {
            return true;
        }

        // 1. Copy input data to t`this._inPtr`
        this._inBuf.set(inputs[0][0]) // array index may not be correct

        // 2. call wasm process, passing pointers to the input/output and how many
        // bytes to read/process
        this._wasm.process(this._inPtr, this._outPtr, this._block_size);
        // 3. copy the processed values back over to the worklet output array
        // NOTE: unfortunately a `set` here (which copies values, not
        // references) is unavoidable. Still probably faster than iterating over
        // every sample.
        outputs[0][0].set(this._outBuf)

        return true;
    }

}

registerProcessor('BitCrush', BitCrush);

