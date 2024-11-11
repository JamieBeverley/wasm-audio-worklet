import './style.css'
// @ts-ignore TODO: emit types from wasm-audio-worklet
import {WASM_PATH, initNode, initBuffer} from 'wasm-audio-worklet';

const app = document.querySelector<HTMLDivElement>('#app');

function initButton() {
    const button = document.createElement("button")
    button.innerText = 'init';
    button.addEventListener("click", async () => {
        const ac = new AudioContext();
        const osc = ac.createOscillator();
        osc.frequency.setValueAtTime(440,ac.currentTime);
        osc.start();


        const node = await initNode(ac);

        const response = await fetch("sound-file.wav");
        // @ts-ignore
        const buffer = await ac.decodeAudioData(await response.arrayBuffer());
        await initBuffer(node, buffer);
        console.log('done...')
        osc.connect(node);
        // @ts-ignore TODO: emit types from wasm-audio-worklet
        node.connect(ac.destination);
    });

    app?.appendChild(button);

}

initButton();
