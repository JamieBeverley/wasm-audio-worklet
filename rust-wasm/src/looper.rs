use std::cmp::{max, min};

use crate::constant::BLOCK_SIZE;
use crate::simple_random::SimpleRNG;

pub struct LooperParam {
    playhead: f32,
    playback_rate: f32,
    start: usize,
    end: usize,
}

impl LooperParam {
    fn new_rand(upper_bound: usize, mut rng: SimpleRNG) -> Self {
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
        if (start > upper_bound) || (start > end) {
            start = 0;
        }

        LooperParam {
            playhead: start as f32,
            playback_rate,
            start,
            end,
        }
    }

    fn get_sample(&mut self, buffer: &Vec<f32>, paused: bool) -> f32 {
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
        return sample;
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
            params: vec![],
        }
    }

    #[no_mangle]
    pub fn set_buffer(&mut self, buffer: *mut f32, size: usize) {
        self.buffer = unsafe { Vec::from_raw_parts(buffer, size, size) };
        self.index = ((self.index.floor() as usize) % self.buffer.len()) as f32;
        self.params.push(LooperParam {
            end: self.buffer.len() - 1,
            start: 0,
            playback_rate: 1.0,
            playhead: 0.0,
        });
    }

    #[no_mangle]
    pub fn get_block(&mut self) -> [f32; BLOCK_SIZE] {
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
