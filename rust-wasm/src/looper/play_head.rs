
// TODO: doubtful this is really safe... (Send + Sync)
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
