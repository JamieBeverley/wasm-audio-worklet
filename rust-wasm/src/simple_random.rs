

pub struct SimpleRNG {
    seed: u32,
}

impl SimpleRNG {
    pub const fn new(seed: u32) -> Self {
        SimpleRNG { seed }
    }

    pub fn next(&mut self) -> u32 {
        self.seed = self.seed.wrapping_mul(1664525).wrapping_add(1013904223);
        self.seed
    }

    pub fn next_f32(&mut self) -> f32 {
        (self.next() as f32) / (u32::MAX as f32)
    }
}
