# Clarity 4 Implementation Plan

## Overview

This document outlines the plan for integrating Clarity 4 features into the Stacks Multisig Vault contract. Clarity 4 was activated on mainnet at Bitcoin block 923222 (November 2025) and introduces powerful new functions for building safer, more secure smart contracts.

**Reference**: [Clarity 4 Documentation](https://docs.stacks.co/whats-new/clarity-4-is-now-live)

## Current Status

- **Clarity Version**: 3 (for local development)
- **Clarity 4 Status**: Live on mainnet, but Clarinet SDK doesn't support it yet for local development
- **Implementation Status**: Not yet implemented - planned for future issues

## Clarity 4 Features to Implement

### 1. `restrict-assets?` - Post-Conditions for Asset Protection

**Priority**: 🔴 HIGH (Security Critical)

**Use Case**: Issue #7 - `execute-token-transfer-txn` function

**Implementation Location**: `contracts/multisig.clar` - `execute-token-transfer-txn` function

**Why**: Prevents malicious or buggy token contracts from moving more assets than authorized. Automatically rolls back if external contract misbehaves.

**Implementation Details**:
```clarity
(define-public (execute-token-transfer-txn
    (txn-id uint)
    (signatures (list 65 (buff 65)))
    (token-contract principal)
  )
  (let (
    (txn (unwrap! (map-get? transactions txn-id) ERR_INVALID_TXN_ID))
    (amount (get amount txn))
    (recipient (get recipient txn))
  )
    ;; ... signature verification ...
    
    ;; Set post-condition to restrict asset movement
    (try! (restrict-assets? 
      (list 
        { 
          asset: (some (ft 0x0000000000000000000000000000000000000000000000000001 token-contract)), 
          amount: amount 
        }
      )
    ))
    
    ;; Now safely call the token contract
    (as-contract (contract-call? token-contract transfer amount tx-sender recipient none))
    
    ;; ... mark as executed ...
  )
)
```

**Benefits**:
- Prevents token contract from moving more than authorized
- Automatic rollback on unauthorized asset movement
- Safer interactions with unknown token contracts

**Testing Requirements**:
- Test that post-condition prevents over-transfer
- Test that transaction rolls back if post-condition violated
- Test with various token contracts

---

### 2. `stacks-block-time` - Transaction Expiration

**Priority**: 🟡 MEDIUM (Feature Enhancement)

**Use Case**: Issue #15 - Transaction expiration mechanism

**Implementation Location**: 
- `contracts/multisig.clar` - Update `transactions` map and execution functions

**Why**: Enables time-based transaction expiration, preventing execution of stale proposals and automatic cleanup.

**Implementation Details**:

**Step 1**: Update transactions map to include expiration field
```clarity
(define-map transactions
  uint
  {
    type: uint,
    amount: uint,
    recipient: principal,
    token: (optional principal),
    executed: bool,
    expiration: uint  ;; NEW: expiration timestamp (0 = no expiration)
  }
)
```

**Step 2**: Update `submit-txn` to accept expiration parameter
```clarity
(define-public (submit-txn
    (type uint)
    (amount uint)
    (recipient principal)
    (token (optional principal))
    (expiration (optional uint))  ;; NEW: optional expiration timestamp
  )
  ;; ... existing validation ...
  
  (let (
    (current-time (stacks-block-time))
    (expiration-time (default-to (+ current-time u604800) expiration))  ;; Default: 7 days
  )
    (map-set transactions id {
      type: type,
      amount: amount,
      recipient: recipient,
      token: token,
      executed: false,
      expiration: expiration-time
    })
    (ok id)
  )
)
```

**Step 3**: Add expiration check in execution functions
```clarity
(define-public (execute-stx-transfer-txn ...)
  (let (
    (txn (unwrap! (map-get? transactions txn-id) ERR_INVALID_TXN_ID))
    (current-time (stacks-block-time))
    (expiration (get expiration txn))
  )
    ;; Verify transaction hasn't expired
    (asserts! (or (is-eq expiration u0) (<= current-time expiration)) ERR_TXN_EXPIRED)
    ;; ... continue with execution ...
  )
)
```

**Step 4**: Add new error constant
```clarity
(define-constant ERR_TXN_EXPIRED (err u14))
```

**Benefits**:
- Prevents execution of stale transactions
- Automatic cleanup of expired proposals
- Time-based security controls

**Testing Requirements**:
- Test transaction expiration check
- Test default expiration (7 days)
- Test custom expiration times
- Test expired transaction rejection

---

### 3. `contract-hash?` - Token Contract Verification

**Priority**: 🟡 MEDIUM (Security Enhancement)

**Use Case**: Issue #7 - Enhanced token contract verification

**Implementation Location**: `contracts/multisig.clar` - `execute-token-transfer-txn` function

**Why**: Verify that token contracts match expected code before interaction, preventing interactions with malicious or modified contracts.

**Implementation Details**:

**Step 1**: Add map to store verified token contract hashes
```clarity
(define-map verified-tokens
  principal
  (buff 32)
)
```

**Step 2**: Add function to register verified tokens (owner only)
```clarity
(define-public (register-verified-token
    (token-contract principal)
    (expected-hash (buff 32))
  )
  (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
  (map-set verified-tokens token-contract expected-hash)
  (ok true)
)
```

**Step 3**: Verify contract hash in `execute-token-transfer-txn`
```clarity
(define-public (execute-token-transfer-txn ...)
  (let (
    (txn (unwrap! (map-get? transactions txn-id) ERR_INVALID_TXN_ID))
    (stored-token (unwrap! (get token txn) ERR_INVALID_TOKEN))
    (expected-hash (map-get? verified-tokens stored-token))
  )
    ;; Verify contract hash matches expected (if verification is enabled)
    (if (is-some expected-hash)
      (let ((actual-hash (unwrap! (contract-hash? stored-token) ERR_INVALID_TOKEN)))
        (asserts! (is-eq actual-hash (unwrap-panic expected-hash)) ERR_INVALID_TOKEN)
      )
      true
    )
    ;; ... continue with execution ...
  )
)
```

**Benefits**:
- Verify token contracts match expected code
- Prevent interactions with malicious contracts
- Safer token integrations

**Testing Requirements**:
- Test contract hash verification
- Test with verified and unverified tokens
- Test hash mismatch rejection

---

### 4. `to-ascii?` - Enhanced Logging

**Priority**: 🟢 LOW (Developer Experience)

**Use Case**: Issues #2, #6, #7 - Transaction logging

**Implementation Location**: `contracts/multisig.clar` - All transaction-related functions

**Why**: Better debugging and monitoring with human-readable transaction logs.

**Implementation Details**:
```clarity
(define-public (submit-txn ...)
  ;; ... existing code ...
  
  ;; Enhanced logging with readable strings
  (print (concat 
    "Transaction submitted: ID=" 
    (unwrap-panic (to-ascii? (unwrap-panic (to-consensus-buff? id))))
    ", Recipient="
    (unwrap-panic (to-ascii? (unwrap-panic (to-consensus-buff? recipient))))
  ))
  
  (ok id)
)
```

**Benefits**:
- Better debugging and monitoring
- Human-readable transaction logs
- Easier integration with frontends

**Testing Requirements**:
- Verify logs are readable
- Test with various data types

---

### 5. `secp256r1-verify` - Passkey Support (Future)

**Priority**: 🟢 LOW (Future Enhancement)

**Use Case**: Optional feature for modern authentication

**Implementation Location**: New function in `contracts/multisig.clar`

**Why**: Support for hardware-secured wallets and biometric transaction signing.

**Implementation Details**:
```clarity
(define-read-only (verify-passkey-signature
    (message-hash (buff 32))
    (signature (buff 64))
    (public-key (buff 33))
  )
  (secp256r1-verify message-hash signature public-key)
)
```

**Note**: This is a future enhancement and not critical for initial implementation.

---

## Implementation Timeline

### Phase 1: High Priority (Security)
1. ✅ **Issue #0**: Contract setup (COMPLETED)
2. ⏳ **Issue #7**: Implement `execute-token-transfer-txn` with `restrict-assets?`
   - Add `restrict-assets?` post-conditions
   - Test thoroughly

### Phase 2: Medium Priority (Features)
3. ⏳ **Issue #15**: Implement transaction expiration with `stacks-block-time`
   - Update transactions map
   - Add expiration logic
   - Test expiration scenarios

4. ⏳ **Issue #7 Enhancement**: Add `contract-hash?` verification
   - Add verified tokens map
   - Implement verification logic
   - Test contract hash matching

### Phase 3: Low Priority (Polish)
5. ⏳ **Issues #2, #6, #7**: Enhanced logging with `to-ascii?`
   - Update all transaction functions
   - Improve log readability

6. ⏳ **Future**: Passkey support with `secp256r1-verify`
   - Research use cases
   - Implement if needed

## Migration Strategy

### Step 1: Wait for Clarinet Support
- Monitor Clarinet SDK updates for Clarity 4 support
- Test locally once available

### Step 2: Incremental Implementation
- Implement features one at a time
- Test thoroughly before moving to next feature
- Update tests for each feature

### Step 3: Mainnet Deployment
- Deploy to testnet first
- Test extensively on testnet
- Deploy to mainnet after verification

## Testing Strategy

For each Clarity 4 feature:
1. **Unit Tests**: Test the feature in isolation
2. **Integration Tests**: Test with existing functionality
3. **Edge Cases**: Test boundary conditions
4. **Security Tests**: Verify security properties
5. **Mainnet Simulation**: Test on testnet before mainnet

## Documentation Updates

- [x] Update README.md with Clarity 4 information
- [ ] Update inline code comments
- [ ] Add examples in documentation
- [ ] Update deployment guide

## References

- [Clarity 4 Announcement](https://docs.stacks.co/whats-new/clarity-4-is-now-live)
- [SIP-033 Specification](https://github.com/stacksgov/sips)
- [SIP-034 Specification](https://github.com/stacksgov/sips)
- [Clarity Language Documentation](https://docs.stacks.co/docs/clarity)

---

**Last Updated**: 2025-01-XX
**Status**: Planning Phase - Awaiting Clarinet Clarity 4 Support

