class GranularNode extends AudioWorkletNode {


    static WORKLET_PATH = new URL('./worklet.js', import.meta.url).href
    static WASM_PATH = new URL('./rust_wasm.wasm', import.meta.url).href

    constructor(audioContext, wasmTimeoutMs=5000) {
        super(audioContext, "WasmProcessor")
        this.wasmTimeoutMs = wasmTimeoutMs
    }

    static async initAsync(audioContext, buffer){
        await audioContext.audioWorklet.addModule(GranularNode.WORKLET_PATH);
        const node = new GranularNode(audioContext);
        await node.load(buffer);
        return node
    }

    async loadWasm() {
        const response = await window.fetch(GranularNode.WASM_PATH);
        const wasmBytes = await response.arrayBuffer();

        let initCompletePromise = new Promise((res, rej) => {
            const rejTimeout = setTimeout(() => {
                rej("Timeout waiting for wasm to initialize")
            }, this.wasmTimeoutMs);
            this.port.onmessage = ({ data }) => {
                console.log('js received: ', data.type)
                if (data.type === 'init-wasm-complete') {
                    clearInterval(rejTimeout);
                    this.port.onmessage = undefined;
                    res();
                }
            };
            this.port.postMessage({ type: 'init-wasm', wasmBytes });
        });

        await initCompletePromise;
        return this;
    }

    async loadBuffer(buffer) {
        let initCompletePromise = new Promise((res, rej) => {
            this.port.onmessage = ({ data }) => {
                if (data.type === 'init-buffer-complete') {
                    this.port.onmessage = undefined;
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

    async load(buffer){
        await this.loadWasm();
        await this.loadBuffer(buffer);
        return this;
    }
}

export default GranularNode;
