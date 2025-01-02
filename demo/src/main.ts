import './style.css'
import {BufferLooper} from 'wasm-audio-worklet';
// import {BufferLooper, BitResolutionCrusher} from 'wasm-audio-worklet';

async function initButton() {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    osc.frequency.setValueAtTime(440, ac.currentTime);
    osc.start();

    const response = await fetch("sound-file.wav");
    const buffer = await ac.decodeAudioData(await response.arrayBuffer());
    const bufferNode = await BufferLooper.build(ac);
    bufferNode.loadBuffer(buffer);
    // const crushNode = new BitResolutionCrusher(ac);
    // crushNode.load();
    
    osc.connect(bufferNode);
    bufferNode.connect(ac.destination);
}

const button = document.querySelector<HTMLButtonElement>('#play') as HTMLButtonElement;
button.addEventListener('click', initButton)
