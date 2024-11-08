use simple_random::SimpleRNG;

mod simple_random;

static mut  RNG :SimpleRNG= SimpleRNG::new(5);

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut f32 {
    // initialize a vec32
    let vec: Vec<f32> = vec![0.0; size];
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
