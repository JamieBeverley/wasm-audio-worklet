use std::usize;

use simple_random::SimpleRNG;
use std::sync::{LazyLock, Mutex};
mod constant;
mod looper;
mod simple_random;
use constant::BLOCK_SIZE;
use looper::{GranularSynthesizer, SamplePlayer};

static RNG: LazyLock<Mutex<SimpleRNG>> = LazyLock::new(|| Mutex::new(SimpleRNG::new(5)));
static SYNTH: LazyLock<Mutex<GranularSynthesizer>> = LazyLock::new(|| Mutex::new(GranularSynthesizer::new()));

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut f32 {
    // initialize a vec32
    let vec: Vec<f32> = vec![0.0; size];
    // convert heap-allocated array to just the pointer of the beginning of that
    // array on the heap
    Box::into_raw(
        // convert vec 32 to a heap-allocated array of f32 values
        vec.into_boxed_slice(),
    ) as *mut f32
}

#[no_mangle]
pub extern "C" fn alloc_block() -> *mut f32 {
    alloc(BLOCK_SIZE)
}

#[no_mangle]
pub extern "C" fn get_sample() -> f32 {
    let mut rng = RNG.lock().unwrap();
    let item = rng.next_f32();
    item
}

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

#[no_mangle]
pub extern "C" fn synth_set_k_rate_params(
    start: Option<f32>, 
    grainDuration:Option<f32>,
    grainJitter:Option<f32>,
) {
    let mut synth = SYNTH.lock().unwrap();
    synth.set_start(start);
}
