import './style.css'
// @ts-ignore
import initNode, {WASM_PATH} from 'mynode';

const app = document.querySelector<HTMLDivElement>('#app');

function initButton() {
    const button = document.createElement("button")
    button.innerText = 'init';
    button.addEventListener("click", () => {
        const ac = new AudioContext();
        const osc = ac.createOscillator();
        osc.frequency.setValueAtTime(440,ac.currentTime);
        osc.start();

        // @ts-ignore
        initNode(ac).then(node => {
            // @ts-ignore
            osc.connect(node);
            // @ts-ignore
            node.connect(ac.destination);
        });
    });

    app?.appendChild(button);

}

initButton();

async function test(){
    const response = await fetch(WASM_PATH);
    const ab = await response.arrayBuffer();
    const memory = new WebAssembly.Memory({ initial: 1 }); // `initial` is the number of 64KiB pages
    const mod = (await WebAssembly.instantiate(ab, {env:{memory}}));
    
    mod.instance.exports.memory;
    
    // const mod = (await WebAssembly.instantiate(ab, {}));
    const thing = mod.instance.exports;
// pub extern "C" fn process(inputs: *mut f32, outputs:*mut f32, block_size:usize) -> bool {
    
    const array = new Float32Array(memory.buffer, 0, 128);
    array.fill(0);
    // @ts-ignore
    thing.transform_array(0, array.length);
    console.log(thing)
}
console.log(test)

async function transformArrayInWasm() {
    // Step 1: Load the WebAssembly module
    const response = await fetch(WASM_PATH); // Update with actual path
    const bytes = await response.arrayBuffer();
    const memory = new WebAssembly.Memory({ initial: 10, maximum:100, shared:true }); // 1 page = 64KiB
    
    // Step 2: Instantiate the WebAssembly module with shared memory
    const { instance } = await WebAssembly.instantiate(bytes, {
        env: { memory: memory }
    });
    
    // Step 3: Create a view of the memory for the array
    // const wasmArray = new Float32Array(memory.buffer, 0, array.length);

    const wasmArray = new DataView(memory.buffer);
    for (let i = 0; i < 10; i++) {
        wasmArray.setFloat32(i*4, i, true)
    }

    // Step 4: Call the WebAssembly function
    // @ts-ignore
    instance.exports.transform_array(0, wasmArray.byteLength); // Offset = 0 if array starts at beginning

    // Step 5: Copy the transformed data back to the original array
    // array.set(wasmArray.buffer);
    console.log(wasmArray)

    // Now `array` in JavaScript has been transformed by WebAssembly
    // return array;
}
console.log(transformArrayInWasm)

// test();