mod utils;
// mod dependent_module;

// use web_sys::AudioContext;
// use wasm_bindgen_futures::JsFuture;
use wasm_bindgen::prelude::*;
// use web_sys::console;
use rand::random;


#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

// #[wasm_bindgen]
// pub fn greet() {
    // alert("!");
// }

#[wasm_bindgen]
pub fn get_sample() -> f32 {
    random()
}

pub trait Processor {
    fn process(input: &Vec<f64>, output: &mut Vec<f64>) -> bool;
}

#[wasm_bindgen]
struct Noise {}


// #[wasm_bindgen]
// impl Noise {

//     #[wasm_bindgen(constructor)]
//     pub fn new() -> Self {
//         Noise {}
//     }

//     #[wasm_bindgen]
//     pub fn process(&mut self, input: &mut [f32], output: &mut [f32]) -> bool {
//         for i in 0..output.len() {
//         // for (let i = 0; i<input.len(); i++;){
//             let rnd :f32= random();
//             output[i] = rnd;
//         } 
//         return true;
//     }
// }


// #[wasm_bindgen]
// pub fn prepare_wasm_audio(ctx: &AudioContext) -> Result<u16, JsValue> {
    // console::log_1(&"hello".into());
    // Ok(0)
// }


// #[wasm_bindgen]
// pub async fn prepare_wasm_audio(ctx: &AudioContext) -> Result<(), JsValue> {
//     println!("jhere?");
//     let mod_url = dependent_module!("worklet.js")?;
//     JsFuture::from(ctx.audio_worklet()?.add_module(&mod_url)?).await.expect("somethign fucked up here");
//     Ok(())
// }
