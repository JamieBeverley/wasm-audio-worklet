use common::BLOCK_SIZE;

const CRUSH_PARAM:f32 = 4.0;

const BASE:f32 = 2.0;

pub use common::alloc_block;

#[no_mangle]
pub extern "C" fn process(in_ptr: *mut f32, out_ptr: *mut f32) -> bool {
    let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, BLOCK_SIZE) };
    let _in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, BLOCK_SIZE) };
    let crush: f32 = BASE.powf(CRUSH_PARAM-1.0);
    for i in 0..BLOCK_SIZE {
        out_buf[i] = (_in_buf[i]*crush).round()/crush;
    }
    return true;
}