import './style.css'
// @ts-ignore TODO: emit types from wasm-audio-worklet
import initNode, {WASM_PATH} from 'wasm-audio-worklet';

const app = document.querySelector<HTMLDivElement>('#app');

function initButton() {
    const button = document.createElement("button")
    button.innerText = 'init';
    button.addEventListener("click", () => {
        const ac = new AudioContext();
        const osc = ac.createOscillator();
        osc.frequency.setValueAtTime(440,ac.currentTime);
        osc.start();

        // @ts-ignore TODO: emit types from wasm-audio-worklet
        initNode(ac).then(node => {
            // @ts-ignore TODO: emit types from wasm-audio-worklet
            osc.connect(node);
            // @ts-ignore TODO: emit types from wasm-audio-worklet
            node.connect(ac.destination);
        });
    });

    app?.appendChild(button);

}

initButton();
