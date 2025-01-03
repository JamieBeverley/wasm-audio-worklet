
const BASE:f32 = 2.0;

pub use common::alloc;

#[no_mangle]
pub extern "C" fn process(
    block_size: usize,
    // TODO multi-channel eventually
    in_channels: usize,
    out_channels: usize,
    in_ptr: *mut f32,
    out_ptr: *mut f32,
    crush_ptr: *mut f32,
) -> bool {
    let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, block_size) };
    let _in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, block_size) };
    let crush_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(crush_ptr, block_size) };
    for i in 0..block_size {
        let crush: f32 = BASE.powf(32.0-crush_buf[i].min(32.0));
        out_buf[i] = (_in_buf[i]*crush).round()/crush;
    }
    return true;
}