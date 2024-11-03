
class WebSynthProcessor extends AudioWorkletProcessor {

    constructor() {
        super();
        this._wasm = null;
        this.port.onmessage = event => this.onmessage(event.data);
    }

    onmessage(data) {
        if (data.type === 'init-wasm') {
            const instance = async () => {
                try {
                    let mod = await WebAssembly.instantiate(data.wasmBytes, {});
                    this._wasm = mod;
                } catch(e) {
                    console.log("Caught error in instantiating wasm", e);
                }
            }
            // Call the setup function            
            instance();
        }
    }

    process(inputs, outputs, parameters) {
        if (this._wasm === null) return true;
        let output = outputs[0];
        output.forEach(channel => {
            for (let i = 0; i < channel.length; i++) {
                let sample = this._wasm.exports.get_sample();
                channel[i] = sample;
            }
        });
        return true;
    }

} 

registerProcessor('WasmProcessorr', WebSynthProcessor);
