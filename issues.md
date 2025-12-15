# Project Issues & Tasks

This document outlines all the issues and tasks needed to complete the Stacks Multisig Vaults project. Contributors can pick up any of these issues to work on.

## Clarity 4 Features

This project will leverage Clarity 4 features for enhanced security and functionality. See [CLARITY4-IMPLEMENTATION-PLAN.md](./CLARITY4-IMPLEMENTATION-PLAN.md) for detailed implementation plans. Clarity 4 features are noted in relevant issues below with **Clarity 4** tags.

## Smart Contract Issues

### Contract Setup & Structure

- [x] **Issue #0**: Set up contract structure and constants
  - Import SIP-010 trait: `SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard`
  - Define constants: `CONTRACT_OWNER`, `MAX_SIGNERS` (u100), `MIN_SIGNATURES_REQUIRED` (u1)
  - Define all error constants (ERR_OWNER_ONLY, ERR_ALREADY_INITIALIZED, ERR_TOO_MANY_SIGNERS, etc.)
  - Define storage variables: `initialized`, `signers`, `threshold`, `txn-id`
  - Define `transactions` map with fields: type, amount, recipient, token, executed
  - Define `txn-signers` map to track which signers have signed each transaction

### Core Contract Implementation

- [x] **Issue #1**: Implement `initialize` function
  - Verify contract owner using `tx-sender` equals `CONTRACT_OWNER`
  - Check initialization status (must be false)
  - Validate signers list length (max 100 using `MAX_SIGNERS`)
  - Validate threshold (min 1 using `MIN_SIGNATURES_REQUIRED`, max should be <= signers count)
  - Set signers and threshold in storage using `var-set`
  - Mark contract as initialized (set `initialized` to true)
  - Return `(ok true)`

- [x] **Issue #2**: Implement `submit-txn` function
  - Get current `txn-id` from storage
  - Verify contract is initialized (must be true)
  - Verify caller is a signer using `index-of` on signers list
  - Validate amount > 0
  - Validate transaction type (0 = STX transfer, 1 = SIP-010 transfer)
  - For type 1 (SIP-010), validate that token contract is provided (not none)
  - Store transaction in `transactions` map with: type, amount, recipient, token, executed: false
  - Increment `txn-id` by 1
  - Print transaction details for logging
  - Return `(ok id)` with the transaction ID
  - **Clarity 4**: Use `to-ascii?` for enhanced human-readable logging (see CLARITY4-IMPLEMENTATION-PLAN.md)

- [ ] **Issue #3**: Implement `hash-txn` read-only function
  - Load transaction from `transactions` map using transaction ID
  - Convert transaction tuple to consensus buffer using `to-consensus-buff?`
  - Hash the buffer using `sha256` function
  - Return the 32-byte hash buffer

- [x] **Issue #4**: Implement `extract-signer` read-only function
  - Take message hash (buff 32) and signature (buff 65) as parameters
  - Recover public key from signature using `secp256k1-recover?` with message hash and signature
  - Convert public key to principal using `principal-of?`
  - Verify principal is in signers list using `index-of`
  - Return `(ok signer)` if valid, error otherwise

- [x] **Issue #5**: Implement `count-valid-unique-signature` private function
  - Take signature (buff 65) and accumulator tuple as parameters
  - Accumulator should contain: id (uint), hash (buff 32), count (uint)
  - Extract signer from signature using `extract-signer` function
  - Check if signer extraction was successful (`is-ok`)
  - Check if signer has NOT already signed using `txn-signers` map lookup
  - If valid and unique: mark signer as signed in `txn-signers` map, increment count
  - Return updated accumulator with incremented count
  - This function is used with `fold` to process a list of signatures
  - Added a public `count-unique-valid-signatures` helper and tests to exercise duplicate/invalid signature handling

- [ ] **Issue #6**: Implement `execute-stx-transfer-txn` function
  - Verify caller is a signer
  - Load transaction from `transactions` map using transaction ID
  - Get transaction hash using `hash-txn` function
  - Use `fold` with `count-valid-unique-signature` to count valid unique signatures from signatures list
  - Verify signatures list length >= threshold
  - Verify unique valid signature count >= threshold
  - Verify transaction ID is valid (<= current txn-id)
  - Verify transaction type is 0 (STX transfer)
  - Verify transaction hasn't been executed (executed = false)
  - Execute STX transfer using `as-contract` wrapper and `stx-transfer?`
  - Mark transaction as executed in `transactions` map
  - Print execution details for logging
  - Return `(ok true)`
  - **Clarity 4**: Use `to-ascii?` for enhanced human-readable logging (see CLARITY4-IMPLEMENTATION-PLAN.md)

- [ ] **Issue #7**: Implement `execute-token-transfer-txn` function
  - Verify caller is a signer
  - Load transaction from `transactions` map using transaction ID
  - Get transaction hash using `hash-txn` function
  - Use `fold` with `count-valid-unique-signature` to count valid unique signatures from signatures list
  - Verify signatures list length >= threshold
  - Verify unique valid signature count >= threshold
  - Verify transaction ID is valid (<= current txn-id)
  - Verify transaction type is 1 (SIP-010 transfer)
  - Verify token principal is provided (is-some)
  - Verify token contract parameter matches the stored token principal using `contract-of`
  - Verify transaction hasn't been executed (executed = false)
  - Execute SIP-010 transfer using `as-contract` wrapper and `contract-call?` on token's transfer function
  - Mark transaction as executed in `transactions` map
  - Print execution details for logging
  - Return `(ok true)`
  - **Clarity 4 Features** (see CLARITY4-IMPLEMENTATION-PLAN.md):
    - Use `restrict-assets?` to set post-conditions protecting assets (HIGH PRIORITY)
    - Use `contract-hash?` to verify token contract authenticity (MEDIUM PRIORITY)
    - Use `to-ascii?` for enhanced logging (LOW PRIORITY)

### Testing Setup

- [ ] **Issue #7.5**: Set up testing environment
  - Install testing dependencies: `@hirosystems/clarinet-sdk-wasm`, `vite`
  - Configure vitest.config.js with clarinet environment
  - Set up test file structure with imports from `@stacks/transactions`
  - Create helper functions for generating test signers using `makeRandomPrivKey`
  - Set up `beforeEach` hook for test setup (mint tokens, etc.)
  - Import necessary functions: `getAddressFromPrivateKey`, `signMessageHashRsv`, `Cl` from SDKs

### Testing

- [x] **Issue #8**: Write initialization tests
  - Test successful initialization with valid signers and threshold
  - Test owner-only restriction (non-owner cannot initialize)
  - Test one-time initialization (cannot initialize twice)
  - Test max signers limit (cannot exceed 100 signers)
  - Test minimum threshold validation (threshold must be >= 1)
  - Verify signers list is stored correctly
  - Verify threshold is stored correctly
  - Verify initialized flag is set to true

- [x] **Issue #9**: Write transaction submission tests
  - Test any signer can submit STX transaction (type 0)
  - Test any signer can submit SIP-010 transaction (type 1)
  - Test non-signer cannot submit transactions
  - Test validation of transaction types (only 0 and 1 allowed)
  - Test validation of amounts (must be > 0)
  - Test token contract requirement for SIP-010 (must provide token for type 1)
  - Test transaction ID increments correctly
  - Test transaction is stored in transactions map
  - Test transaction is marked as not executed initially

- [ ] **Issue #10**: Write signature verification tests
  - Test hash-txn returns correct 32-byte buffer hash
  - Test hash-txn for different transactions returns different hashes
  - Test extract-signer with valid signature returns correct signer principal
  - Test extract-signer with invalid signature returns error
  - Test extract-signer verifies signer is in signers list
  - Test duplicate signature detection (same signer cannot sign twice)
  - Test signature verification works with `signMessageHashRsv` from @stacks/transactions

- [ ] **Issue #11**: Write STX transfer execution tests
  - Test successful execution with threshold signatures (e.g., 2/3 multisig with 2 signatures)
  - Test full end-to-end flow: submit → sign off-chain → execute
  - Test execution fails with insufficient signatures (below threshold)
  - Test execution fails with invalid signatures
  - Test execution fails if transaction already executed
  - Test execution fails if transaction type is not STX (0)
  - Test STX balance updates correctly (multisig balance decreases, recipient increases)
  - Test transaction is marked as executed after successful execution
  - Test that STX must be sent to multisig before execution
  - Test using `as-contract` wrapper for transfers

- [ ] **Issue #12**: Write SIP-010 transfer execution tests
  - Test successful execution with threshold signatures (e.g., 2/3 multisig with 2 signatures)
  - Test full end-to-end flow: submit → sign off-chain → execute
  - Test execution fails with insufficient signatures (below threshold)
  - Test execution fails with wrong token contract (token parameter doesn't match stored token)
  - Test execution fails if transaction type is not SIP-010 (1)
  - Test token balance updates correctly (multisig balance decreases, recipient increases)
  - Test transaction is marked as executed after successful execution
  - Test that tokens must be sent to multisig before execution
  - Test using `as-contract` wrapper for contract-call transfers

- [ ] **Issue #13**: Create mock-token contract for testing
  - Implement SIP-010 trait: `SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard`
  - Define fungible token: `mock-token`
  - Implement `transfer` function (amount, sender, recipient, memo)
  - Implement `get-name` (returns "Mock Token")
  - Implement `get-symbol` (returns "MT")
  - Implement `get-decimals` (returns u6)
  - Implement `get-balance` (who principal)
  - Implement `get-total-supply`
  - Implement `get-token-uri` (returns none)
  - Add public `mint` function for testing (allows minting to any recipient)

### Security & Edge Cases

- [ ] **Issue #14**: Add reentrancy protection
- [ ] **Issue #15**: Add transaction expiration mechanism
  - Add `expiration` field to `transactions` map (uint timestamp)
  - Update `submit-txn` to accept optional expiration parameter (default: 7 days)
  - Add expiration check in execution functions (`execute-stx-transfer-txn`, `execute-token-transfer-txn`)
  - Add error constant: `ERR_TXN_EXPIRED`
  - **Clarity 4**: Use `stacks-block-time` to get current block timestamp (see CLARITY4-IMPLEMENTATION-PLAN.md)
- [ ] **Issue #16**: Add ability to cancel pending transactions
- [ ] **Issue #17**: Add signer management (add/remove signers)
- [ ] **Issue #18**: Add threshold update functionality
