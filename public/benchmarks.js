
// borrowed from:
// https://github.com/dktr0/WebDirt/blob/main/dist/AudioWorklets.js
class CrushProcessor extends AudioWorkletProcessor {

    static get parameterDescriptors() {
      return [{name: 'crush',defaultValue: 0}];
    }
  
    constructor() { super(); this.notStarted = true; }
  
    process(inputs,outputs,parameters) {
      const input = inputs[0];
      const output = outputs[0];
      const crush = parameters.crush;
      const blockSize = 128;
      const hasInput = !(input[0] === undefined);
      if(hasInput){
        this.notStarted = false;
        if(crush.length === 1) {
          const x = Math.pow(2,crush[0]-1);
          for(let n = 0; n<blockSize;n++)output[0][n]=Math.round(input[0][n]*x)/x;
        }
        else {
          for(let n = 0; n<blockSize;n++) {
            let x = Math.pow(2,crush[n]-1);
            output[0][n]=Math.round(input[0][n]*x)/x;
          }
        }
      }
      return (this.notStarted || hasInput);
    }
  
}
registerProcessor('crush-processor',CrushProcessor);