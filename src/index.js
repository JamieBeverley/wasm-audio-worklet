const WORKLET_PATH = new URL('./worklet.js', import.meta.url).href
export const WASM_PATH = new URL('./rust_wasm_bg.wasm', import.meta.url).href

const initNode = async (context) => {
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
    node.port.postMessage({type:'init-wasm', wasmBytes})
    return node
}

export default initNode;