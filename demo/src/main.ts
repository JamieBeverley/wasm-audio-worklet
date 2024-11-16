import './style.css'
// @ts-ignore TODO: emit types from wasm-audio-worklet
import GranularNode from 'wasm-audio-worklet';
import WebMidiController from "./midi"

const app = document.querySelector<HTMLDivElement>('#app') as HTMLDivElement;

function createInteractive3DSVG(
    container: HTMLElement,
    width: number,
    height: number,
    callback: (xPortion: number, yPortion: number, zPortion: number) => void
): void {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());
    svg.style.border = "1px solid black";
    svg.style.cursor = "pointer";

    const minZ = 0.0005;
    const maxZ = 1.0;
    let zPortion = 0.5;
    let xPortion = 0;
    let yPortion = 0;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", (zPortion*width).toString());
    circle.setAttribute("fill", "blue");
    svg.appendChild(circle);

    const verticalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    verticalLine.setAttribute("stroke", "black");
    verticalLine.setAttribute("stroke-width", "2");
    svg.appendChild(verticalLine);

    const horizontalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    horizontalLine.setAttribute("stroke", "black");
    horizontalLine.setAttribute("stroke-width", "2");
    svg.appendChild(horizontalLine);


    const updeateSvg = (x:number, y:number, z:number) => {
        const mouseX = x*width;
        const mouseY = (1-y)*height;
        const radius = z * width;
        
        verticalLine.setAttribute("x1", mouseX.toString());
        verticalLine.setAttribute("x2", mouseX.toString());
        verticalLine.setAttribute("y1", "0");
        verticalLine.setAttribute("y2", height.toString());

        horizontalLine.setAttribute("x1", "0");
        horizontalLine.setAttribute("x2", width.toString());
        horizontalLine.setAttribute("y1", mouseY.toString());
        horizontalLine.setAttribute("y2", mouseY.toString());
        
        circle.setAttribute("cx", mouseX.toString());
        circle.setAttribute("cy", mouseY.toString());
        circle.setAttribute("r", radius.toString());
    }

    svg.addEventListener("mousemove", (event: MouseEvent) => {
        const rect = svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        xPortion = mouseX / width;
        yPortion = 1 - mouseY / height;
        updeateSvg(xPortion, yPortion, zPortion);
        callback(xPortion, yPortion, zPortion**2);
    });

    svg.addEventListener("wheel", (event: WheelEvent) => {
        event.preventDefault();
        zPortion = zPortion + event.deltaY * 0.00003;
        zPortion = Math.min(maxZ, Math.max(minZ, zPortion)); 
        updeateSvg(xPortion,yPortion,zPortion);
        callback(xPortion, yPortion, zPortion**2);
    });

    
    container.appendChild(svg);
    new WebMidiController("midi-in-device", 3,app, (index, value) =>{
        if(index===0){
            xPortion = value/127;
        } else if(index===1){
            zPortion = value/127;
        } else if(index===2){
            yPortion = value/127
        } else{
            return
        }
        updeateSvg(xPortion,yPortion,zPortion);
        callback(xPortion, yPortion, zPortion**2);
    })

}


function initButton() {
    const button = document.createElement("button")
    button.innerText = 'init';
    button.addEventListener("click", async () => {
        const ac = new AudioContext();
        const osc = ac.createOscillator();
        osc.frequency.setValueAtTime(440, ac.currentTime);
        osc.start();

        const response = await fetch("sound-file.wav");
        // @ts-ignore
        const buffer = await ac.decodeAudioData(await response.arrayBuffer());
        const node = await GranularNode.initAsync(ac, buffer);

        osc.connect(node);
        // @ts-ignore TODO: emit types from wasm-audio-worklet
        node.connect(ac.destination);

        createInteractive3DSVG(app, 300, 300, (x, y, z) => {
            node.parameters.get('start').setValueAtTime(x, ac.currentTime);
            node.parameters.get('range').setValueAtTime(y**3, ac.currentTime);
            node.parameters.get('grainDuration').setValueAtTime(z, ac.currentTime);
        });
    });

    app.appendChild(button);
}

initButton();
