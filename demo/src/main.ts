import './style.css'
// import {BufferLooper} from 'wasm-audio-worklet';
import {BufferLooper, BitCrusher} from 'wasm-audio-worklet';

const getLfo = (ac:AudioContext, low:number, high:number, frequency:number) => {
    const lfo = ac.createGain();
    const amplitude = (high-low)/2;
    lfo.gain.setValueAtTime(low + amplitude, ac.currentTime);
    
    const _lfoModulator = ac.createOscillator();
    _lfoModulator.frequency.setValueAtTime(frequency, ac.currentTime);
    const _lfoModulatorGain = ac.createGain();
    _lfoModulatorGain.gain.setValueAtTime(amplitude, ac.currentTime);
    
    _lfoModulator.connect(_lfoModulatorGain);
    _lfoModulatorGain.connect(lfo);

    _lfoModulator.start();
    return lfo;
}

async function initButton() {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    osc.frequency.setValueAtTime(440, ac.currentTime);
    osc.start();

    const response = await fetch("sound-file.wav");
    const buffer = await ac.decodeAudioData(await response.arrayBuffer());
    const bufferNode = await BufferLooper.build(ac);
    bufferNode.loadBuffer(buffer);
    const bitCrusher = await BitCrusher.build(ac);
    const crushParam = bitCrusher.parameters.get('crush');
    crushParam?.setValueAtTime(0, ac.currentTime);
    // const lfo = getLfo(ac, 0, 8, 0.5);
    

    if (crushParam){
        // lfo.connect(crushParam)
        crushParam.linearRampToValueAtTime(32, ac.currentTime + 5)
    } else {
        console.log("crush param not found")
    }

    // TODO: remind myself why this is required (we're not actually processing 
    // this but the `.start` seems to do something?)
    osc.connect(bufferNode)

    // bufferNode.connect(ac.destination);
    bufferNode.connect(bitCrusher);
    bitCrusher.connect(ac.destination);
}

const button = document.querySelector<HTMLButtonElement>('#play') as HTMLButtonElement;
button.addEventListener('click', initButton)
