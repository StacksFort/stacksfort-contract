;; Multi-signature vault contract
;; Implements a multisig wallet for managing STX and SIP-010 tokens
;;
;; Clarity Version: 3 (local dev) / 4 (planned for mainnet)
;; Clarity 4 Features: See CLARITY4-IMPLEMENTATION-PLAN.md for planned features:
;;   - restrict-assets? (Issue #7) - Post-conditions for token transfers
;;   - stacks-block-time (Issue #15) - Transaction expiration
;;   - contract-hash? (Issue #7) - Token contract verification
;;   - to-ascii? (Issues #2, #6, #7) - Enhanced logging

;; SIP-010 trait import - will be used for token transfers
;; Note: Trait syntax will be fixed when implementing Issue #7 (token transfers)
;; (use-trait sip-010-trait-ft-standard 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard)

;; ============================================
;; Constants
;; ============================================
(define-constant CONTRACT_OWNER 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
(define-constant MAX_SIGNERS u100)
(define-constant MIN_SIGNATURES_REQUIRED u1)

;; ============================================
;; Error Constants
;; ============================================
(define-constant ERR_OWNER_ONLY (err u1))
(define-constant ERR_ALREADY_INITIALIZED (err u2))
(define-constant ERR_TOO_MANY_SIGNERS (err u3))
(define-constant ERR_INVALID_THRESHOLD (err u4))
(define-constant ERR_NOT_INITIALIZED (err u5))
(define-constant ERR_NOT_SIGNER (err u6))
(define-constant ERR_INVALID_AMOUNT (err u7))
(define-constant ERR_INVALID_TXN_TYPE (err u8))
(define-constant ERR_INVALID_TXN_ID (err u9))
(define-constant ERR_TXN_ALREADY_EXECUTED (err u10))
(define-constant ERR_INSUFFICIENT_SIGNATURES (err u11))
(define-constant ERR_INVALID_SIGNATURE (err u12))
(define-constant ERR_INVALID_TOKEN (err u13))

;; ============================================
;; Data Variables
;; ============================================
(define-data-var initialized bool false)
(define-data-var signers (list 100 principal) (list))
(define-data-var threshold uint u0)
(define-data-var txn-id uint u0)

;; ============================================
;; Maps
;; ============================================
(define-map transactions
  uint
  {
    type: uint,
    amount: uint,
    recipient: principal,
    token: (optional principal),
    executed: bool
  }
)

(define-map txn-signers
  (tuple (txn-id uint) (signer principal))
  bool
)

;; ============================================
;; Public Functions
;; ============================================

;; Issue #2: Submit a new transaction proposal
(define-public (submit-txn
    (txn-type uint)
    (amount uint)
    (recipient principal)
    (token (optional principal))
)
    (response uint uint)
    (begin
        ;; Verify contract is initialized
        (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
        ;; Verify caller is a signer
        (let ((caller tx-sender))
            (asserts! (is-some (index-of (var-get signers) caller)) ERR_NOT_SIGNER)
            ;; Validate amount > 0
            (asserts! (> amount u0) ERR_INVALID_AMOUNT)
            ;; Validate transaction type (0 = STX transfer, 1 = SIP-010 transfer)
            (asserts! (or (= txn-type u0) (= txn-type u1)) ERR_INVALID_TXN_TYPE)
            ;; For type 1 (SIP-010), validate that token contract is provided
            (if (= txn-type u1)
                (asserts! (is-some token) ERR_INVALID_TOKEN)
                true
            )
            ;; Get current txn-id from storage
            (let ((current-id (var-get txn-id)))
                ;; Store transaction in transactions map
                (map-set transactions current-id {
                    type: txn-type,
                    amount: amount,
                    recipient: recipient,
                    token: token,
                    executed: false
                })
                ;; Increment txn-id by 1
                (var-set txn-id (+ current-id u1))
                ;; Print transaction details for logging
                (print {txn-id: current-id, type: txn-type, amount: amount, recipient: recipient, token: token})
                (ok current-id)
            )
        )
    )
)

