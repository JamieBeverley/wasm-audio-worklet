import './style.css'
// import {BufferLooper} from 'wasm-audio-worklet';
import {BufferLooper, BitCrusher,BenchmarkWorkletPath, BenchmarkWorkletName} from 'wasm-audio-worklet';

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
        crushParam.linearRampToValueAtTime(0, ac.currentTime + 20)
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

const globalButton = document.querySelector<HTMLButtonElement>('#play') as HTMLButtonElement;
globalButton.addEventListener('click', initButton)


class ProfileNode {

    private ac:AudioContext;
    private nodes:AudioNode[] = [];
    private makeNode: () => Promise<AudioWorkletNode>;
    public n:number;

    constructor(
        ac:AudioContext,
        n:number,
        makeNode: () => Promise<AudioWorkletNode>
    ){
        this.ac = ac;
        this.n = n
        this.makeNode = makeNode;
    }

    async start(){
        const osc = this.ac.createOscillator();
        osc.frequency.setValueAtTime(440, this.ac.currentTime);

        const bcNodes = await Promise.all(Array(this.n).fill(null).map(this.makeNode));
            // async ()=>{
            //     const node = await BitCrusher.build(this.ac)
            //     const crushParam = node.parameters.get('crush')
            //     crushParam?.setValueAtTime(28, this.ac.currentTime);
            //     return node
            // })
        // );
        
        const gain = this.ac.createGain();
        gain.gain.setValueAtTime(0.5, this.ac.currentTime);

        const endNode = bcNodes.reduce((prevNode:AudioNode, node:AudioNode) =>{
            prevNode.connect(node);
            return node;
        }, osc)

        endNode.connect(gain);
        gain.connect(this.ac.destination);
        this.nodes = this.nodes.concat([osc,gain]).concat(bcNodes);
        
        osc.start();
    }
    
    stop(){
        this.nodes.forEach(node=>{
            node.disconnect();
        })
        this.nodes = [];
    }
}

class ProfilePage {

    private _ac?:AudioContext = undefined;

    get ac (){
        if (this._ac === undefined){
            this._ac = new AudioContext();
        }
        return this._ac
    }

    renderStressTestProfilingUI(
        root:HTMLElement,
        name:string,
        makeNode: () => Promise<AudioWorkletNode>,
    ){
        const button = document.createElement('button');
        button.innerText= `Profile WASM (${name})`;

        const stopButton = document.createElement('button');
        stopButton.innerText= "Stop Profiling";
        stopButton.setAttribute("disabled","true")

        const numberInput = document.createElement('input');
        numberInput.setAttribute("value", "500");
        numberInput.setAttribute("type", "number");
        root.appendChild(button);
        root.appendChild(stopButton);
        root.appendChild(numberInput);

        button.addEventListener('click', async () => {
            const nNodes = parseInt(numberInput.value);
            const profileNode = new ProfileNode(this.ac, nNodes, makeNode)
            await profileNode.start()
            console.log("playing...");
            stopButton.removeAttribute("disabled");
            const stopFn = () => {
                profileNode.stop();
                stopButton.setAttribute("disabled", "true");
                stopButton.removeEventListener("click", stopFn);
            }
            stopButton.addEventListener("click", stopFn);
        });

    }
}

const profilingUi = new ProfilePage();
profilingUi.renderStressTestProfilingUI(
    document.getElementById("profile-wasm") as HTMLDivElement,
    "WASM",
    async () => {
        const node = await BitCrusher.build(profilingUi.ac)
        const crushParam = node.parameters.get('crush')
        crushParam?.setValueAtTime(28, profilingUi.ac.currentTime);
        return node
    }
);

profilingUi.renderStressTestProfilingUI(
    document.getElementById("profile-js") as HTMLDivElement,
    "JavaScript",
    async () => {

        await profilingUi.ac.audioWorklet.addModule(BenchmarkWorkletPath);
        const node = new AudioWorkletNode(
            profilingUi.ac, BenchmarkWorkletName
        );
        const crushParam = node.parameters.get('crush')
        crushParam?.setValueAtTime(6, profilingUi.ac.currentTime);
        return node
    }
);
