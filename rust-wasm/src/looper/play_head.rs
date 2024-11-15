use crate::simple_random::SimpleRNG;
use std::cmp::{max, min};

// TODO: doubtful this is really safe...
pub trait PlayHead: Send + Sync {
    fn get_sample(&mut self, buffer: &Vec<f32>, paused: bool) -> f32;
}
pub struct SimplePlayHead {
    playhead: f32,
    playback_rate: f32,
    start: usize,
    end: usize,
}

impl SimplePlayHead {
    pub fn new(playhead: f32, playback_rate: f32, start: usize, end: usize) -> Self {
        SimplePlayHead {
            playhead,
            playback_rate,
            start,
            end,
        }
    }

    pub fn new_rand(upper_bound: usize, mut rng: SimpleRNG) -> Self {
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

        SimplePlayHead {
            playhead: start as f32,
            playback_rate,
            start,
            end,
        }
    }
}

impl PlayHead for SimplePlayHead {
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

pub struct GrainEnv {
    pub attack: f32, // in portions. All sum to 1
    pub sustain: f32,
    pub release: f32,
}

pub struct GrainPlayhead {
    // private
    rng: SimpleRNG,
    playhead: f32,
    pub start: usize,
    end: usize,
    // 'fixed' (ish)
    pub playback_rate: f32,
    pub start_anchor: usize,
    pub n_frames: usize,
    pub range: f32,
    pub envelope: GrainEnv,
}

impl GrainPlayhead {
    pub fn new(
        playback_rate: f32,
        start_anchor: usize,
        n_frames: usize,
        range: f32,
        envelope: GrainEnv,
    ) -> Self {
        GrainPlayhead {
            rng: SimpleRNG::new(5),
            playhead: start_anchor as f32,
            start: start_anchor,
            end: start_anchor + n_frames,
            playback_rate,
            start_anchor,
            n_frames,
            range,
            envelope,
        }
    }

    fn get_envelope(&self) -> f32 {
        let dur = (self.end - self.start) as f32;
        let index = self.playhead;
        let start = self.start as f32;

        if index < (start + (self.envelope.attack * dur)) {
            return ((index - start) as f32) / (self.envelope.attack * dur) as f32;
        } else if index > (start + (self.envelope.attack + self.envelope.sustain) * dur) {
            let attack_sustain = (self.envelope.attack + self.envelope.sustain) * dur;
            return (index - start - attack_sustain) / (self.envelope.release * dur);
        }
        return 1.0;
    }

    fn reset_rand_playhead(&mut self, buffer: &Vec<f32>) {
        let buffer_len = buffer.len();

        let start_pos = (self.rng.next_f32() * 2.0 * self.range) - self.range;
        let start_pos = self.start_anchor as i32 + (start_pos * (buffer_len as f32)).round() as i32;

        if start_pos < 0 {
            self.start = 0;
        } else {
            self.start = start_pos as usize;
        }

        self.end = min(buffer_len - 1, self.start + self.n_frames);

        if self.end == buffer_len - 1 {
            self.start = self.end - self.n_frames;
        }

        if self.playback_rate < 0.0 {
            self.playhead = self.end as f32;
        } else {
            self.playhead = self.start as f32;
        }
    }

    fn advance_playhead(&mut self, buffer: &Vec<f32>) {
        self.playhead += self.playback_rate;
        if (self.playhead >= self.end as f32) || (self.playhead < self.start as f32) {
            self.reset_rand_playhead(buffer);
        }
    }
}

impl PlayHead for GrainPlayhead {
    fn get_sample(&mut self, buffer: &Vec<f32>, paused: bool) -> f32 {
        let index = self.playhead.floor() as usize;
        let sample = buffer[index] * self.get_envelope();
        if !paused {
            self.advance_playhead(buffer);
        }
        return sample;
    }
}
