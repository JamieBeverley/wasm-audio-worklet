import './style.css'
// @ts-ignore TODO: emit types from wasm-audio-worklet
import GranularNode from 'wasm-audio-worklet';

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

    const minZ = 0.001; // Minimum z value (to avoid size being zero)
    const maxZ = 1.0; // Maximum z value
    let zPortion = 0.5; // Default z value

    const verticalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    verticalLine.setAttribute("stroke", "black");
    verticalLine.setAttribute("stroke-width", "2");
    svg.appendChild(verticalLine);

    const horizontalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    horizontalLine.setAttribute("stroke", "black");
    horizontalLine.setAttribute("stroke-width", "2");
    svg.appendChild(horizontalLine);

    const positionCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    positionCircle.setAttribute("r", (zPortion * 50).toString());
    positionCircle.setAttribute("fill", "red");
    svg.appendChild(positionCircle);

    svg.addEventListener("mousemove", (event: MouseEvent) => {
        const rect = svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const xPortion = mouseX / width;
        const yPortion = mouseY / height;

        verticalLine.setAttribute("x1", mouseX.toString());
        verticalLine.setAttribute("x2", mouseX.toString());
        verticalLine.setAttribute("y1", "0");
        verticalLine.setAttribute("y2", height.toString());

        horizontalLine.setAttribute("x1", "0");
        horizontalLine.setAttribute("x2", width.toString());
        horizontalLine.setAttribute("y1", mouseY.toString());
        horizontalLine.setAttribute("y2", mouseY.toString());

        positionCircle.setAttribute("cx", mouseX.toString());
        positionCircle.setAttribute("cy", mouseY.toString());

        callback(xPortion, yPortion, zPortion);
    });

    svg.addEventListener("wheel", (event: WheelEvent) => {
        event.preventDefault();
        zPortion = Math.min(maxZ, Math.max(minZ, zPortion - event.deltaY * 0.001));
        positionCircle.setAttribute("r", (zPortion * 50).toString());
        callback(0, 0, zPortion); // Provide updated z value in the callback
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

        createInteractive3DSVG(app, 300, 300, (x, y, z) => {
            node.parameters.get('start').setValueAtTime(x, ac.currentTime);
            node.parameters.get('range').setValueAtTime(y*y*y, ac.currentTime);
            node.parameters.get('grainDuration').setValueAtTime(z*z*z, ac.currentTime);
        });
    });

    app.appendChild(button);

}

initButton();
