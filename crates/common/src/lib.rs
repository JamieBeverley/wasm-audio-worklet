pub const BLOCK_SIZE: usize = 128;

#[no_mangle]
pub extern "C" fn alloc_block() -> *mut f32 {
    alloc(BLOCK_SIZE)
}

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut f32 {
    // initialize a vec32
    let vec: Vec<f32> = vec![0.0; size];
    // convert heap-allocated array to just the pointer of the beginning of that
    // array on the heap
    Box::into_raw(
        // convert vec 32 to a heap-allocated array of f32 values
        vec.into_boxed_slice(),
    ) as *mut f32
}
