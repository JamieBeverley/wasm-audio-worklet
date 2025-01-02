class WorkletModuleFactory {
   
    private workletPath:string;

    constructor(workletPath:string){
        this.workletPath = workletPath;
    }
    
    async createInstance<
      T,Args extends [AudioContext,...any[]]
    >(
        ctor: new (...args: Args) => T,
        args:Args
    ): Promise<T> {
        const audioContext = args[0];
        await this.addWorkletModule(audioContext);
        const instance = new ctor(...args);
        return instance
    }

    private async addWorkletModule(audioContext:AudioContext){
        return await audioContext.audioWorklet.addModule(this.workletPath);
    }
}

abstract class WasmNode extends AudioWorkletNode {

    static workletFactory = new WorkletModuleFactory(new URL('./worklets.js', import.meta.url).href)
    // static WORKLET_PATH = new URL('./worklets.js', import.meta.url).href
    // static WORKLET_LOADED = false;
    private wasmTimeoutMs:number;
    abstract WASM_PATH:string;

    constructor(audioContext:AudioContext, wasmTimeoutMs=5000) {
        super(audioContext, "WasmProcessor")
        this.wasmTimeoutMs = wasmTimeoutMs
    }

    static async build(
        ...args:ConstructorParameters<typeof WasmNode>
    ): Promise<WasmNode>{
        const instance = await this.workletFactory.createInstance((...args) => {
            const x = new this(args);
            return x as unknown as typeof WasmNode;
        }, args)
        return instance;
    }

    protected async loadWasm() {
        const response = await window.fetch(WasmNode.WASM_PATH);
        const wasmBytes = await response.arrayBuffer();

        let initCompletePromise = new Promise<void>((res, rej) => {
            const rejTimeout = setTimeout(() => {
                rej("Timeout waiting for wasm to initialize")
            }, this.wasmTimeoutMs);
            this.port.onmessage = ({ data }) => {
                if (data.type === 'init-wasm-complete') {
                    clearInterval(rejTimeout);
                    res();
                }
            };
            this.port.postMessage({ type: 'init-wasm', wasmBytes });
        });

        await initCompletePromise;
        return this;
    }

    static async load(audioContext:AudioContext, ..._args:ConstructorParameters<typeof WasmNode>): Promise<WasmNode>{
        const node = await WasmNode.build(audioContext, ..._args);
        await node.loadWasm();
        return node
    }
}

class BufferLooper extends WasmNode {
    
    WASM_PATH = new URL('./buffer_looper.wasm', import.meta.url).href

    async load(buffer:AudioBuffer){
        await super.load();
        await this.loadBuffer(buffer);
        return this;
    }
    
    async loadBuffer(buffer:AudioBuffer) {
        let initCompletePromise = new Promise<void>((res) => {
            this.port.onmessage = ({ data }) => {
                if (data.type === 'init-buffer-complete') {
                    res();
                }
            }
            this.port.postMessage({
                type: 'init-buffer',
                data: {
                    channelData: buffer.getChannelData(0),
                    length: buffer.length,
                }
            });
        });
        await initCompletePromise;
        return this;
    }
}

class BitResolutionCrusher extends WasmNode {
    WASM_PATH = new URL('./buffer_looper.wasm', import.meta.url).href
}

export {BufferLooper, BitResolutionCrusher};