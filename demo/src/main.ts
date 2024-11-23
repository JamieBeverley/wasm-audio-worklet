import './style.css'
import GranularNode from 'wasm-audio-worklet';

async function initButton() {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    osc.frequency.setValueAtTime(440, ac.currentTime);
    osc.start();

    const response = await fetch("sound-file.wav");
    const buffer = await ac.decodeAudioData(await response.arrayBuffer());
    const node = await GranularNode.initAsync(ac, buffer);
    
    osc.connect(node);
    node.connect(ac.destination);
}

const button = document.querySelector<HTMLButtonElement>('#play') as HTMLButtonElement;
button.addEventListener('click', initButton)
