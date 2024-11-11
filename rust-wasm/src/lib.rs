use std::usize;

use simple_random::SimpleRNG;

mod simple_random;

static mut  RNG :SimpleRNG= SimpleRNG::new(5);

#[repr(C)]
pub struct Looper<const BLOCK_SIZE:usize> {
    // Playback
    index: f32,
    block: [f32; BLOCK_SIZE],
    // Params
    buffer: Vec<f32>,
    pub paused: bool,
    pub playback_rate: f32,
}

impl <const BLOCK_SIZE:usize>Looper<BLOCK_SIZE>{

    pub fn new() -> Self{
        Looper{
            index:0.0,
            buffer:vec![0.0; 0],
            block:[0.0; BLOCK_SIZE],
            paused: false,
            playback_rate:1.0,
        }
    }

    pub fn set_buffer(&mut self, buffer: *mut f32, size:usize){
        self.buffer = unsafe {Vec::from_raw_parts(buffer, size, size)};
        self.index = ((self.index.round() as usize)%self.buffer.len()) as f32;
    }

    pub fn get_block(&mut self) -> [f32; BLOCK_SIZE]{
        for i in 0..self.block.len(){
            self.block[i] = self.buffer[self.index.round() as usize];
            if !self.paused{
                self.index += self.playback_rate;
                if self.index > (self.buffer.len() as f32){
                    self.index = 0.0;
                }
            }
        }
        return self.block;
    }
}


#[no_mangle]
pub extern "C" fn alloc_buffer_128() -> *mut Looper<128> {
    Box::into_raw(Box::new(Looper::<128>::new()))
}

#[no_mangle]
pub extern "C" fn alloc(block_size: usize) -> *mut f32 {
    // initialize a vec32
    let vec: Vec<f32> = vec![0.0; block_size];
    // convert heap-allocated array to just the pointer of the beginning of that
    // array on the heap
    Box::into_raw(
        // convert vec 32 to a heap-allocated array of f32 values
        vec.into_boxed_slice()
    ) as *mut f32
    //^ as *mute f32 -> just retuning the pointer = getting outside of rusts
    // memory safety/guarantees. this will not be cleaned up around scopes
    // and will need manual dealloc
}

#[no_mangle]
pub extern "C" fn get_sample() -> f32 {
    unsafe { RNG.next_f32() }
}

#[no_mangle]
pub extern "C" fn process(in_ptr: *mut f32, out_ptr:*mut f32, block_size:usize) -> bool {
    let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, block_size)};
    let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, block_size)};
    
    for i in 0..block_size {
        out_buf[i] = in_buf[i] + (get_sample() * 0.25);
    }
    return true;
}
