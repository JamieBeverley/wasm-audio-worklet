// TODO: can and probably should be removed, passed in from JS context.
#[deprecated]
pub const BLOCK_SIZE: usize = 128;

// NOTE: this is made public/available to JS without explicitly re-exporting as 
// pub from the concrete wasm processor module. This is desired behavior (we
// alloc to be defined to js) but somewhat opaque/unclear.
// TODO: Consider removing no_mangle here and forcing client Rust to explicitly
// re-export it with no_mangle (more clear but more duped code) 
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
