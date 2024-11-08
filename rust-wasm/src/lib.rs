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

// #[no_mangle]
// pub extern "C" fn process(out_ptr_l: *mut f32, out_ptr_r: *mut f32, size: usize) {
//     let mut looper = LOOPER.lock().unwrap();
//     looper.process(out_ptr_l, out_ptr_r, size);
// }

#[no_mangle]
pub extern "C" fn process(in_ptr: *mut f32, out_ptr:*mut f32, block_size:usize) -> bool {
    let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, block_size)};
    for i in 0..block_size {
        out_buf[i] = get_sample();
    }
    return true;
}

#[no_mangle]
pub extern "C" fn process_2_chan(in_ptr_l: *mut f32, in_ptr_r: *mut f32, out_ptr_l:*mut f32, out_ptr_r:*mut f32, block_size:usize) -> bool {
    let out_buf_l: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr_l, block_size)};
    let out_buf_r: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr_r, block_size)};
    
    for i in 0..block_size {
        out_buf_l[i] = get_sample();
        out_buf_r[i] = get_sample();
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
