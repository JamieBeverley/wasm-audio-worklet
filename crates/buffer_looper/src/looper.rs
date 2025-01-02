use common::BLOCK_SIZE;
mod play_head;
use play_head::{PlayHead, SimplePlayHead};

pub trait SamplePlayer {
    fn new() -> Self;
    fn set_buffer(&mut self, buffer: *mut f32, size: usize);
    fn get_block(&mut self) -> [f32; BLOCK_SIZE];
}

////////////////////////////////////////////////////////////////////////////////
/// Looper
/// A simple thing that will loop a sample indefinitely
////////////////////////////////////////////////////////////////////////////////
#[repr(C)]
pub struct Looper {
    // Playback
    index: f32,
    block: [f32; BLOCK_SIZE],
    // Params
    buffer: Vec<f32>,
    paused: bool,
    params: Vec<Box<dyn PlayHead>>,
}

impl SamplePlayer for Looper {
    fn new() -> Self {
        Looper {
            index: 0.0,
            buffer: vec![0.0; 0],
            block: [0.0; BLOCK_SIZE],
            paused: false,
            params: vec![],
        }
    }

    fn set_buffer(&mut self, buffer: *mut f32, size: usize) {
        self.buffer = unsafe { Vec::from_raw_parts(buffer, size, size) };
        self.index = ((self.index.floor() as usize) % self.buffer.len()) as f32;
        self.params.push(Box::new(SimplePlayHead::new(
            0.0,
            1.0,
            0,
            self.buffer.len(),
        )));
    }

    fn get_block(&mut self) -> [f32; BLOCK_SIZE] {
        let len = self.params.len() as f32;
        let params = &mut self.params;

        for i in 0..self.block.len() {
            let mut sample: f32 = 0.0;

            for param in params.iter_mut() {
                sample += param.get_sample(&self.buffer, self.paused);
            }

            sample = sample / len;
            self.block[i] = sample;
        }
        return self.block;
    }
}
