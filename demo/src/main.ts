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
    const bufferNode = await BufferLooper.build(ac, {processorOptions:{profile:true}});
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


class ProfilePage {

    renderRuntimeProfilingUI(root:HTMLElement){
        document.createElement('button');
        button.innerText= "Profile WASM";
        button.addEventListener('click', async () => {
            const ac = new AudioContext();
            // const osc = ac.createOscillator();
            // osc.frequency.setValueAtTime(440, ac.currentTime);
            // osc.start();
            const bitCrusher = await BitCrusher.build(
                ac, {processorOptions:{profile:true}}
            );

            // const gain = ac.createGain();
            // gain.gain.setValueAtTime(0.5, ac.currentTime);

            // osc.connect(bitCrusher);
            // bitCrusher.connect(gain);
            // gain.connect(ac.destination);
            // const size = 100
            // const items:number[] = new Array(size).fill(0);
            // let iter = 0;
            
            bitCrusher.port.addEventListener("message", event =>{
                if(event.data.type === "profile"){
                    console.log("profile data:", event.data.data.duration)
                    // items.push(event.data.data.duration);
                    // items.splice(0, 1)
                    // if(iter >= size){
                        // iter = 0;
                        // let min = Infinity;
                        // let max = -Infinity
                        // const avg = items.reduce((acc,x)=>{
                            // if (x>max) max = x;
                            // if (x<min) min = x;
                            // return acc+x
                        // },0)/size;

                        // console.log("avg:", avg, "min:", min,"max:", max, "head:", items.slice(0,10))
                    // }
                    // iter += 1;
                }
            });
            bitCrusher.port.postMessage({"type":"profile",data:{iters:500000}})
        })
        root.appendChild(button);
    }

    async renderWasmProfile(root:HTMLElement){
        // STARTUP PROFILING
        // init identical audio context
        // <time stamp>
        // wire up each graph
        //   - create identical osc
        //   - wire it to the processor
        //   - pass it to a gain
        //   - pass it to ac destination
        // <time stamp> -> log startup time (how important is this? do I care
        //   about startup time? its kind of negligible)
        // UI: one button click for wasm version one button for non-wasm one.
        
        
        // RUNTIME PROFILING
        // Play for X frames/seconds/etc...
        // Average or distribution over performance timestamps
        this.renderRuntimeProfilingUI(root);

        // STRESS TEST
        // UI where we can set how many nodes are added:
        //   - int number input to set how many
        //   - button which entirely rebuilds the graph. for(i in number)[ apply crush ]
        // Empirically, see at what number either one starts to fail
    }

    async render(root:HTMLElement){
        await this.renderWasmProfile(root);
    }

}

const profilingUi = new ProfilePage();
profilingUi.renderRuntimeProfilingUI(
    document.getElementById("profile") as HTMLTableSectionElement
);
