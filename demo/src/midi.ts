class WebMidiController {
    private midiAccess: WebMidi.MIDIAccess | null = null;
    private currentInput: WebMidi.MIDIInput | null = null;
    private inputDropdown: HTMLSelectElement;
    private nParams: number;
    onChange: (index:number, value:number) => void;

    constructor(
        dropdownId: string,
        nParams:number,
        container:HTMLElement,
        onChange:typeof this.onChange
    ) {
        this.inputDropdown = document.createElement("select");
        this.inputDropdown.id = dropdownId;
        container.appendChild(this.inputDropdown);
        this.nParams = nParams;
        this.onChange = onChange;
        this.initialize();
    }

    private async initialize(): Promise<void> {
        if (!navigator.requestMIDIAccess) {
            console.error("Web MIDI API is not supported in this browser.");
            return;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.updateDeviceList();
            this.midiAccess.onstatechange = this.updateDeviceList.bind(this);
            this.inputDropdown.addEventListener("change", this.handleDeviceSelection.bind(this));
        } catch (error) {
            console.error("Failed to access MIDI devices:", error);
        }
    }

    private updateDeviceList(): void {
        if (!this.midiAccess) return;

        this.inputDropdown.innerHTML = ""; // Clear current options

        const placeholder = document.createElement("option");
        placeholder.textContent = "Select MIDI Device";
        placeholder.disabled = true;
        placeholder.selected = true;
        this.inputDropdown.appendChild(placeholder);

        for (const input of this.midiAccess.inputs.values()) {
            const option = document.createElement("option");
            option.value = input.id;
            option.textContent = input.name || `Device ${input.id}`;
            this.inputDropdown.appendChild(option);
        }
    }

    // Handles device selection changes
    private handleDeviceSelection(): void {
        if (this.currentInput) {
            this.currentInput.onmidimessage = null; // Disconnect previous device
            console.log(`Disconnected from MIDI device: ${this.currentInput.name}`);
            this.currentInput = null;
        }

        const selectedId = this.inputDropdown.value;
        if (this.midiAccess) {
            const selectedInput = this.midiAccess.inputs.get(selectedId);
            if (selectedInput) {
                this.currentInput = selectedInput;
                this.currentInput.onmidimessage = this.handleMIDIMessage.bind(this);
                console.log(`Connected to MIDI device: ${selectedInput.name}`);
            }
        }
    }

    // Handles incoming MIDI messages
    private handleMIDIMessage(event: WebMidi.MIDIMessageEvent): void {
        const [status, number, value] = event.data;
        const isCCMessage = (status & 0xf0) === 0xb0; // Control Change messages
        if (isCCMessage) {
            this.onChange(number % this.nParams, value);
        }
    }
}

export default WebMidiController