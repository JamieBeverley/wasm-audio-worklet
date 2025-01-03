const BLOCK_SIZE = 128;

////////////////////////////////////////////////////////////////////////////////
// Wasm Memory utils                                                          //
////////////////////////////////////////////////////////////////////////////////
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

class WasmMemory {
    constructor(wasm) {
        this.wasm = wasm
        this.buffers = {}; // {str: WasmBuffer}
    }

    getWasmBufferLength() {
        return this.wasm.memory.buffer.byteLength;
    }

    getAllocatedLength() {
        return Object
            .values(this.buffers)
            .reduce((acc, wasmBuffer) => acc + wasmBuffer.buffer.byteLength, 0)
    }

    grow(bytes) {
        const BYTES_PER_PAGE = 65536;
        const pagesToGrow = Math.ceil(bytes / BYTES_PER_PAGE);
        this.wasm.memory.grow(pagesToGrow)

        // When we grow all prior buffers will be transfered and readonly.
        // So we need to re-create views on the regrown wasm memory.
        // (grow sparingly!)
        Object.keys(this.buffers).forEach(bufferName => {
            this.buffers[bufferName] = new WasmBuffer(
                this.buffers[bufferName].buffer.bufferLength,
                this.wasm
            )
        });
    }

    alloc(name, size) {
        const beforeSize = this.getWasmBufferLength();
        this.buffers[name] = new WasmBuffer(size, this.wasm);
        const afterSize = this.getWasmBufferLength();
        if (beforeSize !== afterSize) {
            // When we grow all prior buffers will be transfered and readonly.
            // So we need to re-create views on the regrown wasm memory.
            // (grow sparingly!)
            Object
                .keys(this.buffers)
                // Don't re-create the one we just created.
                .filter(bufferName => name !== bufferName)
                .forEach(bufferName => {
                    this.buffers[bufferName] = new WasmBuffer(
                        this.buffers[bufferName].buffer.bufferLength,
                        this.wasm
                    )
                });
        }
    }

    alloc2(name, size) {
        const currentSize = this.getWasmBufferLength();
        const allocated = this.getAllocatedLength();
        const remainingSize = currentSize - allocated;
        const diff = size - remainingSize;
        console.log("______________________")
        console.log("current size:", currentSize, "allocated:", allocated, "remaining:", remainingSize, 'requested:', size)
        console.log("deficit:", diff)
        if (diff > 0) {
            console.log('growing...')
            this.grow(diff);
        }
        else console.log("not growing...")

        this.buffers[name] = new WasmBuffer(size, this.wasm)
    }
}

////////////////////////////////////////////////////////////////////////////////
// WasmProcessor (default/base class)                                         //
////////////////////////////////////////////////////////////////////////////////
class WasmProcessor extends AudioWorkletProcessor {

    static get parameterDescriptors() {
        return []
    }

    constructor() {
        super();
        this._wasm = undefined;
        this._wasmMemory = undefined

        this.port.onmessage = event => this.onmessage(event.data);
    }

    alloc_memory() {
        this._wasmMemory = new WasmMemory(this._wasm);
        this._wasmMemory.alloc("inBuffer", BLOCK_SIZE)
        this._wasmMemory.alloc("outBuffer", BLOCK_SIZE)
    }

    async initWasm(data) {
        const memory = new WebAssembly.Memory({
            // TODO totally arbitrary, perhaps parametrize in post
            // message or consider a reasonable default.
            initial: 1
        });
        memory.buffer.byteLength

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
            this._wasm === undefined ||
            (inputs[0][0] === undefined)
        ) {
            return true;
        }
        this._wasmMemory.buffers.inBuffer.buffer.set(inputs[0][0]) // array index may not be correct
        this._wasm.process(
            this._wasmMemory.buffers.inBuffer.ptr,
            this._wasmMemory.buffers.outBuffer.ptr,
            BLOCK_SIZE,
        );
        outputs[0][0].set(this._wasmMemory.buffers.outBuffer.buffer)
        return true;
    }
}

////////////////////////////////////////////////////////////////////////////////
// BufferLooper                                                               //
////////////////////////////////////////////////////////////////////////////////
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

    _alloc_memory(bufferLength) {
        this._wasmMemory = new WasmMemory(this._wasm);
        // TODO: check, if we move these around do things still work? a test of 
        // whether the memory alloc hypothesis is correct...
        this._wasmMemory.alloc('inBuffer', BLOCK_SIZE);
        this._wasmMemory.alloc('outBuffer', BLOCK_SIZE);
        this._wasmMemory.alloc('sampleBuffer', bufferLength);
    }

    initBuffer(data) {
        const { length, channelData } = data.data;
        this._alloc_memory(length);

        this._wasmMemory.buffers.sampleBuffer.buffer.set(channelData);
        this._wasm.synth_set_buffer(this._wasmMemory.buffers.sampleBuffer.ptr, length)
        this.port.postMessage({ type: "init-buffer-complete" });
    }

    messageHandlers = {
        "init-wasm": this.initWasm,
        "init-buffer": this.initBuffer,
    }

    process(inputs, outputs, parameters) {
        if (this._wasmMemory?.buffers.sampleBuffer === undefined) return true
        return super.process(inputs, outputs, parameters)
    }

}

////////////////////////////////////////////////////////////////////////////////
// Registering Worklets                                                       //
////////////////////////////////////////////////////////////////////////////////
registerProcessor('BufferLooper', BufferLooper);
registerProcessor('BitCrush', WasmProcessor);
