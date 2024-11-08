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
                const thing = await WebAssembly.instantiate(data.wasmBytes, {});
                console.log(JSON.stringify(thing.instance));
                this._wasm = thing.instance.exports;
            }
            instance();
        }
    }

    process(inputs, outputs, parameters) {
        if (this._wasm === null) return true;
        console.log(outputs[0][0].length)

        return this._wasm.process(
            Array.from([1,2,3]),
            Array.from(outputs[0][0]),
            outputs[0][0].length
        );
        // return this._wasm.process(inputs, outputs[0][0], outputs[0][0].length/2);
        // let output = outputs[0];
        // output.forEach(channel => {
            // for (let i = 0; i < channel.length; i++) {
                // let sample = this._wasm.get_sample();
                // channel[i] = sample;
            // }
        // });
        // return true;
    }

} 

registerProcessor('WasmProcessor', WasmProcessor);
