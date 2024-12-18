class GranularNode extends AudioWorkletNode {

    private wasmTimeoutMs:number;

    static WORKLET_PATH = new URL('./worklet.js', import.meta.url).href
    static WASM_PATH = new URL('./rust_wasm.wasm', import.meta.url).href

    constructor(audioContext:AudioContext, wasmTimeoutMs=5000) {
        super(audioContext, "WasmProcessor")
        this.wasmTimeoutMs = wasmTimeoutMs
    }

    static async initAsync(audioContext:AudioContext, buffer:AudioBuffer){
        await audioContext.audioWorklet.addModule(GranularNode.WORKLET_PATH);
        const node = new GranularNode(audioContext);
        await node.load(buffer);
        return node
    }

    async loadWasm() {
        const response = await window.fetch(GranularNode.WASM_PATH);
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

    async load(buffer:AudioBuffer){
        await this.loadWasm();
        await this.loadBuffer(buffer);
        return this;
    }
}

export default GranularNode;
