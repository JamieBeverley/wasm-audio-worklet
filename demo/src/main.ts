import './style.css'
// @ts-ignore TODO: emit types from wasm-audio-worklet
import GranularNode from 'wasm-audio-worklet';

const app = document.querySelector<HTMLDivElement>('#app');



function initButton() {
    const button = document.createElement("button")
    button.innerText = 'init';
    button.addEventListener("click", async () => {
        const ac = new AudioContext();
        const osc = ac.createOscillator();
        osc.frequency.setValueAtTime(440,ac.currentTime);
        osc.start();

        const response = await fetch("sound-file.wav");
        // @ts-ignore
        const buffer = await ac.decodeAudioData(await response.arrayBuffer());
        const node = await GranularNode.initAsync(ac, buffer);
        
        osc.connect(node);
        // @ts-ignore TODO: emit types from wasm-audio-worklet
        node.connect(ac.destination);
    });

    app?.appendChild(button);

}

initButton();
