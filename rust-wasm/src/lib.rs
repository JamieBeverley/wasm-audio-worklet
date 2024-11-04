use simple_random::SimpleRNG;

mod simple_random;

static mut  RNG :SimpleRNG= SimpleRNG::new(5);


#[no_mangle]
pub extern "C" fn get_sample() -> f32 {
    unsafe { RNG.next_f32() }
}
