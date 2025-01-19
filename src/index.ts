
type ProcessorName = string;
type AudioWorkletConstructor<NodeType extends AudioWorkletNode> = new (...args: ConstructorParameters<typeof AudioWorkletNode>) => NodeType;


class WorkletModuleFactory<Node extends AudioWorkletNode> {

    private workletPath: string;
    private processorName: ProcessorName
    private wasmPath: string;
    private wasmTimeoutMs: number;
    private builder: AudioWorkletConstructor<Node>;

    constructor(
        workletPath: string,
        processorName: ProcessorName,
        wasmPath: string,
        wasmTimeoutMs: number,
        builder: AudioWorkletConstructor<Node>
    ) {
        this.workletPath = workletPath;
        this.processorName = processorName;
        this.wasmPath = wasmPath;
        this.wasmTimeoutMs = wasmTimeoutMs;
        this.builder = builder;
    }

    async build(
        audioContext: AudioContext, options: AudioWorkletNodeOptions = {}
    ): Promise<Node> {
        await this.addWorkletModule(audioContext);
        const instance = new this.builder(
            audioContext, this.processorName, options
        );
        await this.loadWasm(instance);
        return instance
    }

    private async addWorkletModule(audioContext: AudioContext) {
        return await audioContext.audioWorklet.addModule(this.workletPath);
    }

    private async loadWasm(instance: AudioWorkletNode) {
        const response = await window.fetch(this.wasmPath);
        const wasmBytes = await response.arrayBuffer();

        let initCompletePromise = new Promise<void>((res, rej) => {
            const rejTimeout = setTimeout(() => {
                rej("Timeout waiting for wasm to initialize")
            }, this.wasmTimeoutMs);

            instance.port.onmessage = ({data}) => {
                if (data.type === 'init-wasm-complete') {
                    clearInterval(rejTimeout);
                    res();
                }
            };
            instance.port.postMessage({type: 'init-wasm', wasmBytes});
        });

        await initCompletePromise;
        return this;
    }

}

class BufferNode extends AudioWorkletNode {

    async loadBuffer(buffer: AudioBuffer) {
        let initCompletePromise = new Promise<void>((res) => {
            this.port.onmessage = ({data}) => {
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


const BufferLooper = new WorkletModuleFactory(
    new URL('./worklets.js', import.meta.url).href,
    "BufferLooper",
    new URL('./buffer_looper.wasm', import.meta.url).href,
    1000,
    BufferNode,
)

const BitCrusher = new WorkletModuleFactory(
    new URL('./worklets.js', import.meta.url).href,
    "BitCrush",
    new URL('./reduce_resolution.wasm', import.meta.url).href,
    1000,
    AudioWorkletNode,
)


const BenchmarkWorkletPath = new URL('./benchmark.js', import.meta.url).href;

export {BufferLooper, BitCrusher, BenchmarkWorkletPath};
