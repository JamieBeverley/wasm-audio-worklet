use std::usize;

use simple_random::SimpleRNG;
use std::sync::{Mutex,LazyLock};

mod simple_random;

static mut  RNG :SimpleRNG= SimpleRNG::new(5);

const BLOCK_SIZE:usize = 128;

#[repr(C)]
pub struct Looper {
    // Playback
    index: f32,
    block: [f32; BLOCK_SIZE],
    // Params
    buffer: Vec<f32>,
    pub paused: bool,
    pub playback_rate: f32,
}

impl Looper{

    #[no_mangle]
    pub fn new() -> Self{
        Looper{
            index:0.0,
            buffer:vec![0.0; 0],
            block:[0.0; BLOCK_SIZE],
            paused: false,
            playback_rate:1.0,
        }
    }

    #[no_mangle]
    pub fn set_buffer(&mut self, buffer: *mut f32, size:usize){
        self.buffer = unsafe {Vec::from_raw_parts(buffer, size, size)};
        self.index = ((self.index.floor() as usize)%self.buffer.len()) as f32;
    }

    #[no_mangle]
    pub fn get_block(&mut self) -> [f32; BLOCK_SIZE]{
        for i in 0..self.block.len(){
            self.block[i] = self.buffer[self.index.floor() as usize];
            if !self.paused{
                self.index += self.playback_rate;

                let buf_len = self.buffer.len() as f32;
                if self.index >= buf_len || self.index < 0.0{
                    if self.playback_rate<0.0{
                        self.index = buf_len - 1.0;
                    } else if self.playback_rate > 0.0{
                        self.index = 0.0
                    }
                }
            }
        }
        return self.block;
    }
}


static LOOPER: LazyLock<Mutex<Looper>> = LazyLock::new(|| {
    Mutex::new(Looper::new())
});


// #[no_mangle]
// pub extern "C" fn alloc_looper() -> *mut Looper {
//     Box::into_raw(Box::new(Looper::new())) as *mut Looper
// }

#[no_mangle]
pub extern "C" fn looper_set_buffer(buffer:*mut f32, size:usize) {
    let mut looper = LOOPER.lock().unwrap();
    looper.set_buffer(buffer, size);
}

#[no_mangle]
pub extern "C" fn alloc(size:usize) -> *mut f32{
    // initialize a vec32
    let vec: Vec<f32> = vec![0.0; size];
    // convert heap-allocated array to just the pointer of the beginning of that
    // array on the heap
    Box::into_raw(
        // convert vec 32 to a heap-allocated array of f32 values
        vec.into_boxed_slice()
    ) as *mut f32
}

#[no_mangle]
pub extern "C" fn alloc_block() -> *mut f32 {
    alloc(BLOCK_SIZE)
}

#[no_mangle]
pub extern "C" fn get_sample() -> f32 {
    unsafe { RNG.next_f32() }
}

#[no_mangle]
pub extern "C" fn process(in_ptr: *mut f32, out_ptr:*mut f32) -> bool {
    let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, BLOCK_SIZE)};
    let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, BLOCK_SIZE)};

    let mut looper = LOOPER.lock().unwrap();
    let block = looper.get_block();
    
    for i in 0..BLOCK_SIZE {
        out_buf[i] = block[i];
        // out_buf[i] = in_buf[i] + (get_sample() * 0.25);
    }
    return true;
}
