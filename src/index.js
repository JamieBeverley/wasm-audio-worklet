const WORKLET_PATH = new URL('./worklet.js', import.meta.url).href
export const WASM_PATH = new URL('./rust_wasm.wasm', import.meta.url).href

export const initNode = async (context) => {
    const response = await window.fetch(WASM_PATH);
    const wasmBytes = await response.arrayBuffer();

    try {
        await context.audioWorklet.addModule(WORKLET_PATH);
    } catch (e) {
        throw new Error(
            `Failed to load audio analyzer worklet at url: ${WORKLET_PATH}. Further info: ${e.message}`
        );
    }
    const node = new AudioWorkletNode(context, 'WasmProcessor');

    let initCompletePromise = new Promise((res, rej) => {
        node.port.onmessage = ({ data }) => {
            console.log('js received: ', data.type)
            if (data.type === 'init-wasm-complete') {
                node.port.onmessage = undefined;
                res();
            }
        };
        node.port.postMessage({ type: 'init-wasm', wasmBytes });
    });

    await initCompletePromise;

    return node
}

export const initBuffer = async (node, buffer) => {
    let initCompletePromise = new Promise((res, rej) => {
        node.port.onmessage = ({ data }) => {
            if (data.type === 'init-buffer-complete') {
                node.port.onmessage = undefined;
                res();
            }
        }
        node.port.postMessage({
            type: 'init-buffer',
            data: {
                channelData: buffer.getChannelData(0),
                length: buffer.length,
            }
        });
    });
    await initCompletePromise;
}
