import './style.css'
// @ts-ignore TODO: emit types from wasm-audio-worklet
import GranularNode from 'wasm-audio-worklet';

const app = document.querySelector<HTMLDivElement>('#app') as HTMLDivElement;

function createInteractiveSVG(
    container: HTMLElement,
    width: number,
    height: number,
    cb: (x: number, y: number) => void,
): void {

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());
    svg.style.border = "1px solid black";
    svg.style.cursor = "pointer";

    const verticalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    verticalLine.setAttribute("x1", "0");
    verticalLine.setAttribute("y1", "0");
    verticalLine.setAttribute("x2", "0");
    verticalLine.setAttribute("y2", height.toString());
    verticalLine.setAttribute("stroke", "black");
    verticalLine.setAttribute("stroke-width", "2");
    svg.appendChild(verticalLine);

    const horizontalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    horizontalLine.setAttribute("x1", "0");
    horizontalLine.setAttribute("y1", "0");
    horizontalLine.setAttribute("x2", width.toString());
    horizontalLine.setAttribute("y2", "0");
    horizontalLine.setAttribute("stroke", "black");
    horizontalLine.setAttribute("stroke-width", "2");
    svg.appendChild(horizontalLine);

    svg.addEventListener("mousemove", (event: MouseEvent) => {
        const rect = svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        verticalLine.setAttribute("x1", mouseX.toString());
        verticalLine.setAttribute("x2", mouseX.toString());
        horizontalLine.setAttribute("y1", mouseY.toString());
        horizontalLine.setAttribute("y2", mouseY.toString());
        const x = mouseX/width;
        const y = mouseY/height;
        cb(x,1-y);
    });

    container.appendChild(svg);
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

        createInteractiveSVG(app, 300, 300, (x, y) => {
            node.parameters.get('start').setValueAtTime(x, ac.currentTime);
            node.parameters.get('range').setValueAtTime(y*y*y, ac.currentTime);
        });
    });

    app.appendChild(button);

}

initButton();
