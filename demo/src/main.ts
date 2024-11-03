import './style.css'
// @ts-ignore
import initNode from 'mynode';

const app = document.querySelector<HTMLDivElement>('#app');

const button = document.createElement("button")
button.innerText = 'init';
button.addEventListener("click", () => {
    const ac = new AudioContext();

        // @ts-ignore
        initNode(ac).then(node => {
        // @ts-ignore
        node.connect(ac.destination);
    });
});

app?.appendChild(button);
