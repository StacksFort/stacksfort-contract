# Project Issues & Tasks

This document outlines all the issues and tasks needed to complete the Stacks Multisig Vaults project. Contributors can pick up any of these issues to work on.


## Frontend Issues

### Workflow Overview

The multisig frontend follows this workflow:
1. **Transaction Submission**: Any signer submits a transaction on-chain (calls `submit-txn`)
2. **Off-chain Signing**: Signers sign the transaction hash off-chain using their wallet private keys
3. **Signature Storage**: Signatures are stored in a database/state until threshold is met
4. **Execution**: Once threshold signatures are collected, any signer can execute the transaction on-chain

### Setup & Configuration

- [x] **Issue #19**: Set up Next.js project with TypeScript
  - ✅ Initialize Next.js with App Router
  - ✅ Configure TypeScript
  - ✅ Set up Tailwind CSS
  - ✅ Configure path aliases

- [x] **Issue #20**: Install and configure Stacks dependencies
  - ✅ Install @stacks/connect (v7.2.0)
  - ✅ Install @stacks/transactions (v7.2.0)
  - ✅ Configure wallet connection

- [x] **Issue #21**: Set up project structure
  - ✅ Create component directories
  - ✅ Create hooks directory
  - ✅ Create lib utilities directory
  - ✅ Set up routing structure

### Core Components

- [x] **Issue #22**: Create Navbar component
  - ✅ Wallet connection button
  - ✅ Disconnect functionality
  - ✅ Network indicator
  - ✅ Navigation links

- [x] **Issue #23**: Create useStacks hook (implemented as useStacksWallet)
  - ✅ Wallet connection logic
  - ✅ User data management
  - ✅ Session persistence
  - ✅ Disconnect functionality

- [x] **Issue #24**: Create useMultisig hook
  - ✅ Contract interaction functions (read-only and public functions)
  - ✅ Transaction fetching from contract state
  - ✅ State management for multisig data (signers, threshold, transactions)
  - ✅ Error handling for contract calls
  - ✅ Helper functions to check if user is a signer
  - ✅ Helper functions to get transaction status

- [ ] **Issue #25**: Create MultisigDashboard component
  - Display multisig address
  - Show signers list
  - Display threshold information
  - Show multisig balance (STX and tokens)

- [ ] **Issue #26**: Create TransactionList component
  - Fetch and display transactions
  - Filter by status (pending/executed)
  - Pagination
  - Loading states

- [ ] **Issue #27**: Create TransactionDetail component
  - Display transaction information (ID, type, amount, recipient, token)
  - Show transaction type (STX transfer or SIP-010 token transfer)
  - Display amount and recipient address
  - Show token contract address for SIP-010 transfers
  - Display transaction hash (for signing)
  - Show signature status for each signer (signed/unsigned)
  - Show execution status (pending, ready-to-execute, executed)
  - Display progress toward threshold (e.g., "2/3 signatures")
  - Show transaction timestamp
  - Link to transaction on Stacks Explorer (if executed)

- [ ] **Issue #28**: Create CreateTransaction component
  - Form for transaction type selection
  - Amount input
  - Recipient address input
  - Token selection for SIP-010
  - Submit transaction functionality

- [ ] **Issue #29**: Create SignTransaction component
  - Display transaction hash (fetched from contract using `hash-txn` read-only function)
  - Sign transaction hash off-chain using wallet private key
  - Use `signMessageHashRsv` from `@stacks/transactions` for signing
  - Show signature status (signed/unsigned) for each signer
  - Display which signers have already signed
  - Submit signature to backend/state (store in database/state until threshold met)
  - Show progress toward threshold (e.g., "2/3 signatures collected")
  - Allow signers to sign pending transactions

- [ ] **Issue #30**: Create ExecuteTransaction component
  - Collect all signatures from signers (aggregate signatures from database/state)
  - Verify threshold is met (check signature count >= threshold)
  - Display which signers have signed
  - Show transaction details (type, amount, recipient, token)
  - Execute transaction (call `execute-stx-transfer-txn` or `execute-token-transfer-txn`)
  - Pass signatures list to contract execution function
  - Handle execution status (pending, success, error)
  - Show transaction execution confirmation
  - Update transaction status after execution

### Pages

- [ ] **Issue #31**: Create Home page
  - Landing page design
  - Connect wallet prompt
  - Multisig discovery/search
  - Create new multisig link

- [ ] **Issue #32**: Create Multisig page ([address]/page.tsx)
  - Display multisig dashboard
  - Show transaction list
  - Transaction creation interface
  - Signing interface

### Utilities & Helpers

- [ ] **Issue #33**: Create multisig-contract.ts utilities
  - Contract ABI definitions
  - Contract call helpers
  - Read-only function wrappers
  - Public function wrappers

- [ ] **Issue #34**: Create transaction-helpers.ts
  - Transaction hash calculation (call contract's `hash-txn` read-only function)
  - Off-chain signature generation using `signMessageHashRsv` from `@stacks/transactions`
  - Signature validation helpers (verify signature format, extract signer)
  - Transaction status helpers (pending, signed, ready-to-execute, executed)
  - Transaction formatting (display type, amount, recipient in user-friendly format)
  - Signature aggregation logic (collect and format signatures for execution)
  - Check if threshold is met for a transaction

- [ ] **Issue #35**: Create stx-utils.ts
  - Address abbreviation
  - Transaction ID abbreviation
  - Amount formatting
  - Date/time formatting

### Backend Integration

- [ ] **Issue #36**: Set up API routes for transaction storage
  - Store pending signatures (signer address, transaction ID, signature)
  - Fetch pending transactions from contract state
  - Update signature status when signer signs a transaction
  - Track which signers have signed which transactions
  - Aggregate signatures for execution when threshold is met
  - Clean up executed transactions (optional: archive old transactions)
  - API endpoint to get all signatures for a transaction ID
  - API endpoint to check if transaction is ready to execute

- [ ] **Issue #37**: Implement signature aggregation
  - Collect signatures from multiple signers (from database/state)
  - Validate signatures format (65-byte buffers)
  - Aggregate signatures into list format for contract execution
  - Handle signature submission from individual signers
  - Check for duplicate signatures (same signer signing twice)
  - Verify signatures are from valid signers
  - Format signatures list for contract call (list of 100 (buff 65))
  - Trigger execution automatically when threshold is met (optional)

### UI/UX

- [ ] **Issue #38**: Design and implement loading states
  - Transaction loading
  - Signature submission loading
  - Execution loading
  - Skeleton loaders

- [ ] **Issue #39**: Implement error handling and display
  - Transaction errors
  - Signature errors
  - Execution errors
  - User-friendly error messages

- [ ] **Issue #40**: Add transaction status indicators
  - Pending status
  - Signing in progress
  - Ready to execute
  - Executed status
  - Failed status

- [ ] **Issue #41**: Implement responsive design
  - Mobile-friendly layout
  - Tablet optimization
  - Desktop layout
  - Touch-friendly interactions

- [ ] **Issue #42**: Add dark mode support
  - Theme toggle
  - Dark mode styles
  - Persist theme preference

### Advanced Features

- [ ] **Issue #43**: Add transaction notifications
  - New transaction alerts
  - Signature received notifications
  - Execution confirmations
  - Browser notifications

- [ ] **Issue #44**: Implement transaction filtering and search
  - Filter by type
  - Filter by status
  - Search by transaction ID
  - Search by recipient

- [ ] **Issue #45**: Add multisig creation flow
  - Form for signers
  - Threshold selection
  - Initialization transaction
  - Confirmation page

- [ ] **Issue #46**: Implement transaction history export
  - CSV export
  - PDF export
  - Transaction details export

- [ ] **Issue #47**: Add multisig analytics
  - Transaction volume
  - Most active signers
  - Transaction frequency
  - Token distribution

## Integration & Testing

- [ ] **Issue #48**: End-to-end testing setup
  - Playwright/Cypress setup
  - Test wallet setup
  - Integration test scenarios

- [ ] **Issue #49**: Write E2E tests for transaction flow
  - Create transaction
  - Sign transaction
  - Execute transaction
  - Verify on-chain

- [ ] **Issue #50**: Write E2E tests for multisig creation
  - Initialize multisig
  - Verify signers
  - Verify threshold
  - Test first transaction

## Documentation

- [ ] **Issue #51**: Write user documentation
  - How to create a multisig
  - How to submit transactions
  - How to sign transactions
  - How to execute transactions

- [ ] **Issue #52**: Write developer documentation
  - Architecture overview
  - Contract API documentation
  - Frontend component documentation
  - Contribution guidelines

- [ ] **Issue #53**: Create video tutorials
  - Setup walkthrough
  - Creating a multisig
  - Transaction flow
  - Advanced features

## Deployment

- [ ] **Issue #54**: Set up CI/CD pipeline
  - Automated testing
  - Contract deployment
  - Frontend deployment
  - Version management

- [ ] **Issue #55**: Deploy contracts to testnet
  - Testnet deployment script
  - Verify deployment
  - Update frontend config

- [ ] **Issue #56**: Deploy frontend to production
  - Vercel/Netlify setup
  - Environment configuration
  - Domain setup
  - SSL configuration

- [ ] **Issue #57**: Deploy contracts to mainnet
  - Mainnet deployment script
  - Security audit
  - Verify deployment
  - Update frontend config

## Security & Audits

- [ ] **Issue #58**: Smart contract security audit
  - Code review
  - Vulnerability assessment
  - Gas optimization
  - Best practices check

- [ ] **Issue #59**: Frontend security review
  - XSS prevention
  - Input validation
  - Secure wallet integration
  - API security

## Performance & Optimization

- [ ] **Issue #60**: Optimize contract gas usage
  - Review and optimize functions
  - Reduce storage operations
  - Optimize loops

- [ ] **Issue #61**: Frontend performance optimization
  - Code splitting
  - Lazy loading
  - Image optimization
  - Bundle size optimization

## Additional Features (Future)

- [ ] **Issue #62**: Add transaction scheduling
- [ ] **Issue #63**: Add transaction templates
- [ ] **Issue #64**: Add multisig governance features
- [ ] **Issue #65**: Add mobile app support
- [ ] **Issue #66**: Add hardware wallet support
- [ ] **Issue #67**: Add multi-chain support

---

## How to Contribute

1. Check this issues list for available tasks
2. Comment on an issue to claim it
3. Create a branch: `git checkout -b issue-XX-description`
4. Make your changes and write tests
5. Submit a pull request referencing the issue number

## Priority Levels

- **P0 (Critical)**: Core contract functions, basic frontend
- **P1 (High)**: Testing, security, core UI components
- **P2 (Medium)**: Advanced features, optimizations
- **P3 (Low)**: Nice-to-have features, enhancements
