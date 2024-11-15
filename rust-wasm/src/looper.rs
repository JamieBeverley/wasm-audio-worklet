mod play_head;

use crate::constant::BLOCK_SIZE;
use play_head::{GrainEnv, GrainPlayhead, PlayHead, SimplePlayHead};

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

////////////////////////////////////////////////////////////////////////////////
/// Granular Synthesizer
/// A simple thing that will loop a sample indefinitely
////////////////////////////////////////////////////////////////////////////////
#[repr(C)]
pub struct GranularSynthesizer {
    // Playback
    index: f32,
    block: [f32; BLOCK_SIZE],
    // Params
    buffer: Vec<f32>,
    paused: bool,
    params: Vec<Box<GrainPlayhead>>,
}

impl GranularSynthesizer {

    fn to_sample_index(&self, x:f32) -> usize {
        let index = x * (self.buffer.len() as f32 - 1.0);
        return index.round() as usize;
    }

    pub fn set_k_rate_params(
        &mut self,
        start: Option<f32>, 
        grain_duration:Option<f32>,
        range:Option<f32>,
    ) {
        
        let start_anchor = start.map(|x| self.to_sample_index(x));
        let grain_duration = grain_duration.map(|x| self.to_sample_index(x));


        if start_anchor.is_some() || grain_duration.is_some() || range.is_some(){
            for param in self.params.iter_mut() {
                if start_anchor.is_some() {
                    param.start_anchor = start_anchor.unwrap();
                }
                if grain_duration.is_some() {
                    param.grain_duration = grain_duration.unwrap();
                }
                if range.is_some() {
                    param.range = range.unwrap();
                }
            }
        }
    }
}

impl SamplePlayer for GranularSynthesizer {
    fn new() -> Self {
        GranularSynthesizer {
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
        self.params.push(Box::new(GrainPlayhead::new(
            0.5,
            self.buffer.len() / 2,
            5000,
            0.01,
            GrainEnv {
                attack: 0.2,
                sustain: 0.6,
                release: 0.2,
            },
        )));
        self.params.push(Box::new(GrainPlayhead::new(
            0.5,
            7000 + self.buffer.len() / 2,
            8000,
            0.02,
            GrainEnv {
                attack: 0.2,
                sustain: 0.6,
                release: 0.2,
            },
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
