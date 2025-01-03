use std::usize;

use std::sync::{LazyLock, Mutex};
mod looper;
use common::BLOCK_SIZE;
use looper::{Looper, SamplePlayer};

static SYNTH: LazyLock<Mutex<Looper>> = LazyLock::new(|| Mutex::new(Looper::new()));


pub use common::alloc;

#[no_mangle]
pub extern "C" fn process(in_ptr: *mut f32, out_ptr: *mut f32) -> bool {
    let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, BLOCK_SIZE) };
    let _in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, BLOCK_SIZE) };

    let mut synth = SYNTH.lock().unwrap();
    let block = synth.get_block();

    for i in 0..BLOCK_SIZE {
        out_buf[i] = block[i];
    }
    return true;
}

#[no_mangle]
pub extern "C" fn synth_set_buffer(buffer: *mut f32, size: usize) {
    let mut synth = SYNTH.lock().unwrap();
    synth.set_buffer(buffer, size);
}
