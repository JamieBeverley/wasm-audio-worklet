use simple_random::SimpleRNG;

mod simple_random;

static mut  RNG :SimpleRNG= SimpleRNG::new(5);


#[no_mangle]
pub extern "C" fn get_sample() -> f32 {
    unsafe { RNG.next_f32() }
}


#[no_mangle]
pub extern "C" fn process(inputs: *mut f32, outputs:*mut f32, block_size:usize) -> bool {
    let slice = unsafe {
        std::slice::from_raw_parts_mut(outputs, block_size)
    };
    for elem in slice.iter_mut() {
        *elem = get_sample();
    }
    return true;

}

#[no_mangle] // Prevent Rust from renaming the function for FFI compatibility
pub extern "C" fn transform_array(ptr: *mut f32, length: usize) {
    // Convert the raw pointer to a mutable slice to safely access the array.
    let array = unsafe {
        assert!(!ptr.is_null()); // Ensure the pointer is valid (non-null)
        std::slice::from_raw_parts_mut(ptr, length) // Create a mutable slice from the pointer
    };

    // Transform the array in place
    for elem in array.iter_mut() {
        *elem *= 2.0; // Example: multiply each element by 2
    }
}


// #[no_mangle]
// pub extern "C" fn process(inputs: Vec<f32>, outputs: Vec<f32>, block_size:usize) -> bool {
//     for mut elem in outputs {
//         elem = get_sample();
//     }

//     return true;
// }
