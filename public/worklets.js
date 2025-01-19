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
        this.buffers = {}; // {[k:string]: WasmBuffer}
    }

    getWasmBufferLength() {
        return this.wasm.memory.buffer.byteLength;
    }

    getAllocatedLength() {
        return Object
            .values(this.buffers)
            .reduce((acc, wasmBuffer) => acc + wasmBuffer.buffer.byteLength, 0)
    }

    getBufferLengths() {
        return Object
            .keys(this.buffers)
            .reduce((acc, bufferName) => (
                {
                    ...acc,
                    [bufferName]: this.buffers[bufferName].buffer.length
                }
            ), {});
    }

    alloc(name, size) {
        const beforeSize = this.getWasmBufferLength();

        // If wasm memory grows, we need to re-create old views on the memory.
        // We need to store the size of that memory before grow happens because
        // if a grow does occur, these buffers will have 0 length.
        const bufferLengths = this.getBufferLengths();

        this.buffers[name] = new WasmBuffer(size, this.wasm);
        const afterSize = this.getWasmBufferLength();
        if (beforeSize !== afterSize) {
            // When we grow all prior buffers will be transfered and readonly.
            // So we need to re-create views on the regrown wasm memory.
            // (grow sparingly!)
            const rebuildBufferNames = Object
                .keys(this.buffers)
                .filter(bufferName => name !== bufferName)

            rebuildBufferNames
                .forEach(bufferName => {
                    this.buffers[bufferName] = new WasmBuffer(
                        bufferLengths[bufferName],
                        this.wasm,
                    )
                });
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// WasmProcessor (default/base class)                                         //
////////////////////////////////////////////////////////////////////////////////
class WasmProcessor extends AudioWorkletProcessor {

    // TODO parametrize
    inChannels = 1;
    outChannels = 1;

    static get parameterDescriptors() {
        return []
    }

    constructor(options) {
        super();
        this._wasm = undefined;
        this._wasmMemory = undefined;
        this.port.onmessage = event => this.onmessage(event.data);
        this.profile = options?.processorOptions.profile ?? false;
    }

    logBuffers(where = "") {
        try {
            console.group("logBuffers", where)
            if (this._wasmMemory === undefined) {
                console.log("wasmMemory === undefined");
                return
            } else {
                Object.keys(this._wasmMemory.buffers).forEach(bufferName => {
                    const buffer = this._wasmMemory.buffers[bufferName];
                    console.log(
                        bufferName,
                        " - length:",
                        buffer.buffer.length,
                        "byteLength:",
                        buffer.buffer.byteLength
                    );
                })
            }
        } finally {
            console.groupEnd();
        }
    }

    alloc_memory() {
        this._wasmMemory = new WasmMemory(this._wasm);
        // TODO multiply by channel counts eventually
        this._wasmMemory.alloc("inBuffer", BLOCK_SIZE)
        this._wasmMemory.alloc("outBuffer", BLOCK_SIZE)

        // alloc a BLOCK_SIZE buffer for each parameter
        const parameters = this.constructor.parameterDescriptors ?? [];
        parameters.forEach(({ name }) => {
            const bufferName = this.getParamBufferName(name);
            this._wasmMemory.alloc(bufferName, BLOCK_SIZE);
        })
    }

    async initWasm(data) {
        // TODO: consider increasing if pages resizes pretty much always happen
        const memory = new WebAssembly.Memory({ initial: 1 });
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

    getParamBufferName(paramName) {
        // to reduce likelihood of possible naming collision
        return `__param__${paramName}`
    }

    process(inputs, outputs, parameters) {
        // TODO how to use a better clock here (`performance` api not
        // available...)
        const start = Date.now()
        if (
            this._wasm === undefined ||
            (inputs[0][0] === undefined)
        ) {
            return true;
        }

        // TODO handle k-rate separately? it feels yucky doing a 128 buffer copy
        // when only 1 value changes
        const parameterPtrs = Object.keys(parameters).map(paramName => {
            const bufferName = this.getParamBufferName(paramName);
            const wasmBuffer = this._wasmMemory.buffers[bufferName];
            wasmBuffer.buffer.set(parameters[paramName]);
            return wasmBuffer.ptr;
        })

        this._wasmMemory.buffers.inBuffer.buffer.set(inputs[0][0]) // array index may not be correct
        // wasm should define a `process` fn that has a type signature:
        // block_size: number
        // in_channels: number
        // out_channels: number
        // in_ptr: *mut f32 (pointer to begining of in channel buffer)
        // out_ptr: *mut f32 (pointer to begining of in channel buffer)
        // ...parameterPtrs: *mut f32[] - all other parameters.
        this._wasm.process(
            BLOCK_SIZE,
            this.inChannels,
            this.outChannels,
            this._wasmMemory.buffers.inBuffer.ptr,
            this._wasmMemory.buffers.outBuffer.ptr,
            ...parameterPtrs,
        );
        outputs[0][0].set(this._wasmMemory.buffers.outBuffer.buffer)

        if (this.profile) {
            const end = Date.now();
            this.port.postMessage({
                'type': 'profile',
                data: {
                    block_duration: end - start
                }
            })
        }

        return true;
    }
}

////////////////////////////////////////////////////////////////////////////////
// Implemented Processors                                                     //
////////////////////////////////////////////////////////////////////////////////
class BufferLooper extends WasmProcessor {

    initBuffer(data) {
        const { length, channelData } = data.data;
        this._wasmMemory.alloc('sampleBuffer', length);
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

class BitCrushProcessor extends WasmProcessor {

    static get parameterDescriptors() {
        return [
            {
                name: 'crush',
                automationRate: 'a-rate',
                minValue: 0,
                // following some precedence of WAAPI - usage of f32s for audio
                // buffers and other things
                // 0 = no bit reduction 
                // 32 = 32 bits of reduction
                maxValue: 32,
                defaultValue: 0,
            }
        ];
    }
}


////////////////////////////////////////////////////////////////////////////////
// Registering Worklets                                                       //
////////////////////////////////////////////////////////////////////////////////
registerProcessor('BufferLooper', BufferLooper);
registerProcessor('BitCrush', BitCrushProcessor);
