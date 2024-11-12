use std::usize;

use simple_random::SimpleRNG;
use std::sync::{LazyLock, Mutex};
use std::cmp::{min, max};
mod simple_random;

static RNG: LazyLock<Mutex<SimpleRNG>> = LazyLock::new(|| Mutex::new(SimpleRNG::new(5)));

const BLOCK_SIZE: usize = 128;

pub struct LooperParam {
    playhead: f32,
    playback_rate: f32,
    start: usize,
    end: usize,
}

impl LooperParam {

    fn new_rand(upper_bound:usize) -> Self{
        let mut rng = RNG.lock().unwrap();
        let dur = max(10000, (rng.next_f32() * 30000.0) as usize);
        let rn = rng.next_f32();
        let rn2 = rng.next_f32();

        let mut playback_rate = 1.0;
        if rn2 > 0.5 {
            playback_rate = -1.0;
        }
        
        let end: usize = (rn * (upper_bound as f32)).trunc() as usize;
        let minimum = min(dur, end);
        let mut start: usize = end - minimum;
        if (start > upper_bound) || (start > end){
            start = 0;
        }

        LooperParam{
            playhead: start as f32,
            playback_rate,
            start,
            end,
        }
    }

    fn get_sample(&mut self, buffer: &Vec<f32>, paused:bool) -> f32 {
        let index = self.playhead.floor() as usize;
        let sample = buffer[index];
        if !paused {
            self.playhead += self.playback_rate;
            if (self.playhead >= self.end as f32) || (self.playhead < self.start as f32) {
                if self.playback_rate < 0.0 {
                    self.playhead = self.end as f32;
                } else if self.playback_rate > 0.0 {
                    self.playhead = self.start as f32
                }
            }
        }
        return sample
    }
}

#[repr(C)]
pub struct Looper {
    // Playback
    index: f32,
    block: [f32; BLOCK_SIZE],
    // Params
    buffer: Vec<f32>,
    paused: bool,
    pub params: Vec<LooperParam>,
}

impl Looper {
    #[no_mangle]
    pub fn new() -> Self {
        Looper {
            index: 0.0,
            buffer: vec![0.0; 0],
            block: [0.0; BLOCK_SIZE],
            paused: false,
            params: vec![
                LooperParam::new_rand(1058400),
                LooperParam::new_rand(1058400),
                LooperParam::new_rand(1058400),
                LooperParam::new_rand(1058400),
            ]
        }
    }

    #[no_mangle]
    pub fn set_buffer(&mut self, buffer: *mut f32, size: usize) {
        self.buffer = unsafe { Vec::from_raw_parts(buffer, size, size) };
        self.index = ((self.index.floor() as usize) % self.buffer.len()) as f32;
    }

    #[no_mangle]
    pub fn get_block(&mut self) -> [f32; BLOCK_SIZE] {
        let len = self.params.len() as f32;
        let params = &mut self.params;

        for i in 0..self.block.len() {
            let mut sample:f32 = 0.0;

            for param in params.iter_mut() {
                sample += param.get_sample(&self.buffer, self.paused);
            }
            
            sample = sample/len;
            self.block[i] = sample;
        }
        return self.block;
    }
}

static LOOPER: LazyLock<Mutex<Looper>> = LazyLock::new(|| Mutex::new(Looper::new()));

#[no_mangle]
pub extern "C" fn looper_set_buffer(buffer: *mut f32, size: usize) {
    let mut looper = LOOPER.lock().unwrap();
    looper.set_buffer(buffer, size);
}

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
    let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, BLOCK_SIZE) };

    let mut looper = LOOPER.lock().unwrap();
    let block = looper.get_block();

    for i in 0..BLOCK_SIZE {
        out_buf[i] = block[i];
        // out_buf[i] = in_buf[i] + (get_sample() * 0.25);
    }
    return true;
}
