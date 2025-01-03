const BLOCK_SIZE = 128;

class WasmBuffer {
    constructor(size, wasm) {
        this.ptr = wasm.alloc(size);
        this.buffer = new Float32Array(
            wasm.memory.buffer,
            this.ptr,
            size
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

        this.inBuffer = null;
        this.outBuffer = null;

        this.port.onmessage = event => this.onmessage(event.data);
    }

    alloc_memory() {
        this.inBuffer = new WasmBuffer(BLOCK_SIZE, this._wasm);
        this.outBuffer = new WasmBuffer(BLOCK_SIZE, this._wasm);
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
        this.alloc_memory();
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
            (inputs[0][0] === undefined)
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

    alloc_memory(bufferLength) {
        // TODO a bit ugly, but changing alloc_memory to a no-op so that it can
        // be done in initBuffer (because we need the sample buffer to alloc
        // memory)
        // Can probably be undone after figuring out proper memory management of
        // buffers (why does the order matter?)
        // Hypothesis: usually when we allocate the sample buffer the wasm
        // memory needs to grow. When wasm memory grows, the previous buffers
        // are transfered and become un-usable.
        // SO: any time we (re)set the sample buffer, check if memory needs to
        // grow, if it does, re-allocate the in/out buffers as well.
    }

    _alloc_memory(bufferLength){
        this.sampleBuffer = new WasmBuffer(bufferLength, this._wasm);
        this.inBuffer = new WasmBuffer(BLOCK_SIZE, this._wasm);
        this.outBuffer = new WasmBuffer(BLOCK_SIZE, this._wasm);
    }

    initBuffer(data){
        const { length, channelData } = data.data;
        this._alloc_memory(length);

        this.sampleBuffer.buffer.set(channelData);
        this._wasm.synth_set_buffer(this.sampleBuffer.ptr, length)
        this.port.postMessage({ type: "init-buffer-complete" });
    }

    messageHandlers = {
        "init-wasm": this.initWasm,
        "init-buffer": this.initBuffer,
    }

    process(inputs, outputs, parameters) {
        if(this.sampleBuffer === null) return true
        return super.process(inputs, outputs, parameters)
    }

}

registerProcessor('BufferLooper', BufferLooper);
registerProcessor('BitCrush', WasmProcessor);

