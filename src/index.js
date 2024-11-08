
// import DUCK from './duck.jpeg';
const DUCK = new URL('./duck.jpeg', import.meta.url).href
const WORKLET_PATH = new URL('./worklet.js', import.meta.url).href
export const WASM_PATH = new URL('./rust_wasm_bg.wasm', import.meta.url).href


// const WORKLET_PATH = ''// from '../public/worklet.static';
// const WASM_PATH = new URL('./pkg/rust_wasm_bg.wasm', import.meta.url).href;
// const WASM_PATH = 'asdf';

class EntryNode extends AudioWorkletNode {

    constructor(wasmBytes) {
        super();
        this.port.onmessage = (event) => this.onmessage(event.data);
        this.port.postMessage({ type: "send-wasm-module", wasmBytes });
    }

    // Handle an uncaught exception thrown in the PitchProcessor.
    onprocessorerror(err) {
        console.log(
            `An error from AudioWorkletProcessor.process() occurred: ${err}`
        );
    };

    onmessage(event) {
        if (event.type === 'wasm-module-loaded') {
            this.port.postMessage({
                type: "init-detector",
                sampleRate: this.context.sampleRate,
                numAudioSamplesPerAnalysis: this.numAudioSamplesPerAnalysis
            });
        }
    }
}

const _initNode = async (thing) => {
    const img = document.createElement("img");
    img.setAttribute('src', DUCK);
    document.body.appendChild(img);
    return {connect:(x)=>{}}
}

const initNode = async (context) => {
    const response = await window.fetch(WASM_PATH);
    const wasmBytes = await response.arrayBuffer();

    // Add our audio processor worklet to the context.
    try {
        console.log(WORKLET_PATH);
        const result = await context.audioWorklet.addModule(WORKLET_PATH);
        console.log(result);
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