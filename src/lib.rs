mod utils;
mod dependent_module;

use web_sys::AudioContext;
use wasm_bindgen_futures::JsFuture;
use wasm_bindgen::prelude::*;
use web_sys::console;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("!");
}

#[wasm_bindgen]
pub fn prepare_wasm_audio(ctx: &AudioContext) -> Result<u16, JsValue> {
    console::log_1(&"hello".into());
    Ok(0)
}


// #[wasm_bindgen]
// pub async fn prepare_wasm_audio(ctx: &AudioContext) -> Result<(), JsValue> {
//     println!("jhere?");
//     let mod_url = dependent_module!("worklet.js")?;
//     JsFuture::from(ctx.audio_worklet()?.add_module(&mod_url)?).await.expect("somethign fucked up here");
//     Ok(())
// }
