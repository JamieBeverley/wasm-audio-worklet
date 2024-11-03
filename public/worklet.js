class WasmProcessor extends AudioWorkletProcessor {

    constructor() {
        console.log("wtf")
        super();
        this._wasm = null;
        this.port.onmessage = event => this.onmessage.bind(this)(event.data);
    }

    onmessage(data) {
        console.log("message", data);
        if (data.type === 'init-wasm') {
            const instance = async () => {
                try {
                    this._wasm = await WebAssembly.instantiate(data.wasmBytes, {});
                    console.log(this._wasm);
                } catch(e) {
                    console.log("Caught error in instantiating wasm", e);
                }
            }
            instance();
        }
    }

    process(inputs, outputs, parameters) {
        if (this._wasm === null) return true;
        let output = outputs[0];
        output.forEach(channel => {
            for (let i = 0; i < channel.length; i++) {
                let sample = this._wasm.get_sample();
                channel[i] = sample;
            }
        });
        return true;
    }

} 

registerProcessor('WasmProcessor', WasmProcessor);
