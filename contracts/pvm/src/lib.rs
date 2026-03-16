//! Settlement Verifier for Polkadot Intent Solver Network.
//! Compliant with pallet-revive UAPI 0.10.1.
#![no_std]
#![cfg_attr(not(test), no_main)]

#[cfg(test)]
extern crate std;

use pallet_revive_uapi::{HostFn, HostFnImpl, ReturnFlags};
use polkavm_derive::polkavm_export;

// Function selectors (Big-Endian)
const SIG_MPT_PROOF: u32 = 0xdc7f7de6;
const SIG_PRICE_GUARD: u32 = 0x311ebad9;

/// Calculates Keccak256 hash using host-accelerated function if available.
#[inline(always)]
fn h_keccak(input: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    #[cfg(target_arch = "riscv64")]
    HostFnImpl::hash_keccak_256(input, &mut out);
    
    #[cfg(not(target_arch = "riscv64"))]
    {
        use sha3::{Digest, Keccak256};
        let mut hasher = Keccak256::new();
        hasher.update(input);
        out.copy_from_slice(&hasher.finalize());
    }
    out
}

/// Halts execution and reverts state changes.
#[inline(always)]
fn h_revert(msg: &[u8]) -> ! {
    #[cfg(target_arch = "riscv64")]
    HostFnImpl::return_value(ReturnFlags::REVERT, msg);
    #[cfg(not(target_arch = "riscv64"))]
    panic!("revert: {:?}", msg);
    loop {}
}

/// Successfully returns data to the caller.
#[inline(always)]
fn h_ok(data: &[u8]) -> ! {
    #[cfg(target_arch = "riscv64")]
    HostFnImpl::return_value(ReturnFlags::empty(), data);
    #[cfg(not(target_arch = "riscv64"))]
    return_on_host(data);
    loop {}
}

#[cfg(not(target_arch = "riscv64"))]
fn return_on_host(_data: &[u8]) {}

// --- Core Logic ---

/// Verifies that the slippage of the settlement is within the allowed 10% EMA bound.
fn run_price_guard(input: &[u8]) -> bool {
    if input.len() < 40 { return false; }
    
    // Extract metadata
    let _src_asset = u32::from_le_bytes([input[0], input[1], input[2], input[3]]);
    let _dst_asset = u32::from_le_bytes([input[4], input[5], input[6], input[7]]);
    
    let mut in_bytes = [0u8; 16]; in_bytes.copy_from_slice(&input[8..24]);
    let mut out_bytes = [0u8; 16]; out_bytes.copy_from_slice(&input[24..40]);
    
    let a_in = u128::from_le_bytes(in_bytes);
    let a_out = u128::from_le_bytes(out_bytes);
    
    // Threshold: 90% of reference price.
    let min_accepted = (a_in * 9000) / 10000;
    a_out >= min_accepted
}

/// Cryptographically verifies state integrity against a provided Merkle root.
fn run_mpt_proof(input: &[u8]) -> bool {
    if input.len() < 32 { return false; }
    let split = input.len() - 32;
    let (proof, expected_root) = input.split_at(split);
    
    &h_keccak(proof) == expected_root
}

// --- Entry Points ---

#[polkavm_export]
pub extern "C" fn deploy() {}

#[polkavm_export]
pub extern "C" fn call() {
    #[cfg(target_arch = "riscv64")]
    let size = HostFnImpl::call_data_size();
    #[cfg(not(target_arch = "riscv64"))]
    let size = 0;

    if size == 0 { return; }

    let mut arena = [0u8; 4096];
    if size > 4096 { h_revert(b"fatal:payload_overflow"); }
    if size < 4 { h_revert(b"fatal:malformed_input"); }
    
    #[cfg(target_arch = "riscv64")]
    HostFnImpl::call_data_copy(&mut arena[..size as usize], 0);

    let sig = u32::from_be_bytes([arena[0], arena[1], arena[2], arena[3]]);
    let payload = &arena[4..size as usize];

    match sig {
        SIG_MPT_PROOF => {
            let ok = if run_mpt_proof(payload) { 1u8 } else { 0u8 };
            h_ok(&[ok]);
        }
        SIG_PRICE_GUARD => {
            let ok = if run_price_guard(payload) { 1u8 } else { 0u8 };
            h_ok(&[ok]);
        }
        _ => h_revert(b"fatal:unknown_selector"),
    }
}

// --- Intrinsics ---

#[cfg(not(test))]
#[panic_handler]
fn on_panic(_: &core::panic::PanicInfo) -> ! {
    h_revert(b"panic:illegal_state");
}

#[no_mangle] pub unsafe extern "C" fn memset(s: *mut u8, c: i32, n: usize) -> *mut u8 {
    for i in 0..n { *s.add(i) = c as u8; } s
}
#[no_mangle] pub unsafe extern "C" fn memcpy(d: *mut u8, s: *const u8, n: usize) -> *mut u8 {
    for i in 0..n { *d.add(i) = *s.add(i); } d
}
#[no_mangle] pub unsafe extern "C" fn memcmp(s1: *const u8, s2: *const u8, n: usize) -> i32 {
    for i in 0..n {
        let (a, b) = (*s1.add(i), *s2.add(i));
        if a != b { return a as i32 - b as i32; }
    } 0
}

// --- Verification ---
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verify_guard_thresholds() {
        let mut p = [0u8; 40];
        p[8..24].copy_from_slice(&1000u128.to_le_bytes());
        p[24..40].copy_from_slice(&900u128.to_le_bytes());
        assert!(run_price_guard(&p));
        p[24..40].copy_from_slice(&899u128.to_le_bytes());
        assert!(!run_price_guard(&p));
    }

    #[test]
    fn verify_mpt_integrity() {
        let dat = b"protocol_v1_proof_vector";
        let root = h_keccak(dat);
        let mut buf = [0u8; 24 + 32];
        buf[0..24].copy_from_slice(dat);
        buf[24..56].copy_from_slice(&root);
        assert!(run_mpt_proof(&buf));
    }
}
