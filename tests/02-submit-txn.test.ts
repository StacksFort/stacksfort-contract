import { Cl } from "@stacks/transactions";
import { describe, expect, it, beforeEach } from "vitest";

// Get test accounts from simnet
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

// Helper function to initialize contract state for testing
// This simulates the initialize function until Issue #1 is implemented
function initializeContract(signers: string[], threshold: number) {
  // Set signers list
  simnet.callPublicFn(
    "multisig",
    "var-set",
    [Cl.string("signers"), Cl.list(signers.map((s) => Cl.principal(s)))],
    deployer
  );
  
  // Set threshold
  simnet.callPublicFn(
    "multisig",
    "var-set",
    [Cl.string("threshold"), Cl.uint(threshold)],
    deployer
  );
  
  // Mark as initialized
  simnet.callPublicFn(
    "multisig",
    "var-set",
    [Cl.string("initialized"), Cl.bool(true)],
    deployer
  );
}

describe("Issue #2: submit-txn function", () => {
  beforeEach(() => {
    // Reset contract state before each test
    // Note: This is a workaround until Issue #1 (initialize) is implemented
    // In a real scenario, we would call initialize() here
  });

  describe("Successful transaction submission", () => {
    it("should allow any signer to submit STX transaction (type 0)", () => {
      // Setup: Initialize contract with signers
      const signers = [wallet1, wallet2, wallet3];
      const threshold = 2;
      
      // Manually set up contract state for testing
      // TODO: Replace with initialize() call once Issue #1 is implemented
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("signers"), Cl.list(signers.map((s) => Cl.principal(s)))],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("threshold"), Cl.uint(threshold)],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("initialized"), Cl.bool(true)],
        deployer
      );

      // Submit STX transaction (type 0)
      const amount = Cl.uint(1000000); // 1 STX in micro-STX
      const recipient = Cl.principal(wallet2);
      const token = Cl.none();

      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), amount, recipient, token],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));
    });

    it("should allow any signer to submit SIP-010 transaction (type 1)", () => {
      // Setup: Initialize contract with signers
      const signers = [wallet1, wallet2, wallet3];
      const threshold = 2;
      
      // Manually set up contract state for testing
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("signers"), Cl.list(signers.map((s) => Cl.principal(s)))],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("threshold"), Cl.uint(threshold)],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("initialized"), Cl.bool(true)],
        deployer
      );

      // Submit SIP-010 transaction (type 1)
      const amount = Cl.uint(500000);
      const recipient = Cl.principal(wallet2);
      const tokenContract = Cl.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-token");
      const token = Cl.some(tokenContract);

      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(1), amount, recipient, token],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));
    });
  });

  describe("Access control", () => {
    it("should reject transaction submission from non-signer", () => {
      // Setup: Initialize contract with signers (wallet1, wallet2, wallet3)
      const signers = [wallet1, wallet2, wallet3];
      const threshold = 2;
      
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("signers"), Cl.list(signers.map((s) => Cl.principal(s)))],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("threshold"), Cl.uint(threshold)],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("initialized"), Cl.bool(true)],
        deployer
      );

      // Try to submit transaction from deployer (not a signer)
      const amount = Cl.uint(1000000);
      const recipient = Cl.principal(wallet2);
      const token = Cl.none();

      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), amount, recipient, token],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(6)); // ERR_NOT_SIGNER
    });

    it("should reject transaction submission when contract is not initialized", () => {
      // Don't initialize the contract
      const amount = Cl.uint(1000000);
      const recipient = Cl.principal(wallet2);
      const token = Cl.none();

      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), amount, recipient, token],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(5)); // ERR_NOT_INITIALIZED
    });
  });

  describe("Transaction type validation", () => {
    beforeEach(() => {
      // Setup: Initialize contract before each test
      const signers = [wallet1, wallet2];
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("signers"), Cl.list(signers.map((s) => Cl.principal(s)))],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("threshold"), Cl.uint(2)],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("initialized"), Cl.bool(true)],
        deployer
      );
    });

    it("should accept transaction type 0 (STX transfer)", () => {
      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), Cl.uint(1000000), Cl.principal(wallet2), Cl.none()],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));
    });

    it("should accept transaction type 1 (SIP-010 transfer)", () => {
      const tokenContract = Cl.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-token");
      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(1), Cl.uint(500000), Cl.principal(wallet2), Cl.some(tokenContract)],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));
    });

    it("should reject invalid transaction type (e.g., type 2)", () => {
      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(2), Cl.uint(1000000), Cl.principal(wallet2), Cl.none()],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(8)); // ERR_INVALID_TXN_TYPE
    });
  });

  describe("Amount validation", () => {
    beforeEach(() => {
      // Setup: Initialize contract
      const signers = [wallet1, wallet2];
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("signers"), Cl.list(signers.map((s) => Cl.principal(s)))],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("threshold"), Cl.uint(2)],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("initialized"), Cl.bool(true)],
        deployer
      );
    });

    it("should accept amount greater than 0", () => {
      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), Cl.uint(1), Cl.principal(wallet2), Cl.none()],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));
    });

    it("should reject amount equal to 0", () => {
      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), Cl.uint(0), Cl.principal(wallet2), Cl.none()],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(7)); // ERR_INVALID_AMOUNT
    });
  });

  describe("Token validation for SIP-010 transactions", () => {
    beforeEach(() => {
      // Setup: Initialize contract
      const signers = [wallet1, wallet2];
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("signers"), Cl.list(signers.map((s) => Cl.principal(s)))],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("threshold"), Cl.uint(2)],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("initialized"), Cl.bool(true)],
        deployer
      );
    });

    it("should require token contract for type 1 (SIP-010) transactions", () => {
      // Try to submit type 1 transaction without token
      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(1), Cl.uint(500000), Cl.principal(wallet2), Cl.none()],
        wallet1
      );

      expect(result.result).toBeErr(Cl.uint(13)); // ERR_INVALID_TOKEN
    });

    it("should accept token contract for type 1 (SIP-010) transactions", () => {
      const tokenContract = Cl.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-token");
      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(1), Cl.uint(500000), Cl.principal(wallet2), Cl.some(tokenContract)],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));
    });
  });

  describe("Transaction ID management", () => {
    beforeEach(() => {
      // Setup: Initialize contract
      const signers = [wallet1, wallet2];
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("signers"), Cl.list(signers.map((s) => Cl.principal(s)))],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("threshold"), Cl.uint(2)],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("initialized"), Cl.bool(true)],
        deployer
      );
    });

    it("should start transaction ID at 0", () => {
      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), Cl.uint(1000000), Cl.principal(wallet2), Cl.none()],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));
    });

    it("should increment transaction ID correctly", () => {
      // Submit first transaction
      const result1 = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), Cl.uint(1000000), Cl.principal(wallet2), Cl.none()],
        wallet1
      );
      expect(result1.result).toBeOk(Cl.uint(0));

      // Submit second transaction
      const result2 = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), Cl.uint(2000000), Cl.principal(wallet3), Cl.none()],
        wallet1
      );
      expect(result2.result).toBeOk(Cl.uint(1));

      // Submit third transaction
      const result3 = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), Cl.uint(3000000), Cl.principal(wallet2), Cl.none()],
        wallet2
      );
      expect(result3.result).toBeOk(Cl.uint(2));
    });
  });

  describe("Transaction storage", () => {
    beforeEach(() => {
      // Setup: Initialize contract
      const signers = [wallet1, wallet2];
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("signers"), Cl.list(signers.map((s) => Cl.principal(s)))],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("threshold"), Cl.uint(2)],
        deployer
      );
      simnet.callPublicFn(
        "multisig",
        "var-set",
        [Cl.string("initialized"), Cl.bool(true)],
        deployer
      );
    });

    it("should store transaction in transactions map", () => {
      const amount = Cl.uint(1000000);
      const recipient = Cl.principal(wallet2);

      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), amount, recipient, Cl.none()],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));

      // Verify transaction is stored
      const txn = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
      expect(txn).toBeSome(
        Cl.tuple({
          type: Cl.uint(0),
          amount: amount,
          recipient: recipient,
          token: Cl.none(),
          executed: Cl.bool(false),
        })
      );
    });

    it("should mark transaction as not executed initially", () => {
      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [Cl.uint(0), Cl.uint(1000000), Cl.principal(wallet2), Cl.none()],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));

      // Verify executed flag is false
      const txn = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
      const executed = txn.value.data["executed"];
      expect(executed).toBeBool(false);
    });

    it("should store all transaction fields correctly", () => {
      const txnType = Cl.uint(1);
      const amount = Cl.uint(500000);
      const recipient = Cl.principal(wallet3);
      const tokenContract = Cl.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-token");
      const token = Cl.some(tokenContract);

      const result = simnet.callPublicFn(
        "multisig",
        "submit-txn",
        [txnType, amount, recipient, token],
        wallet1
      );

      expect(result.result).toBeOk(Cl.uint(0));

      // Verify all fields are stored correctly
      const txn = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
      expect(txn).toBeSome(
        Cl.tuple({
          type: txnType,
          amount: amount,
          recipient: recipient,
          token: token,
          executed: Cl.bool(false),
        })
      );
    });
  });
});
