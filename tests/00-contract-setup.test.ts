import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Get test accounts from simnet
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;

describe("Issue #0: Contract Setup & Structure", () => {
  describe("Storage Variables Initialization", () => {
    it("should initialize 'initialized' variable to false", () => {
      const initialized = simnet.getDataVar("multisig", "initialized");
      expect(initialized).toBeBool(false);
    });

    it("should initialize 'signers' variable to empty list", () => {
      const signers = simnet.getDataVar("multisig", "signers");
      expect(signers).toBeList([]);
    });

    it("should initialize 'threshold' variable to 0", () => {
      const threshold = simnet.getDataVar("multisig", "threshold");
      expect(threshold).toBeUint(0);
    });

    it("should initialize 'txn-id' variable to 0", () => {
      const txnId = simnet.getDataVar("multisig", "txn-id");
      expect(txnId).toBeUint(0);
    });
  });

  describe("Maps Definition", () => {
    it("should have 'transactions' map defined and return none for non-existent key", () => {
      const transaction = simnet.getMapEntry(
        "multisig",
        "transactions",
        Cl.uint(0)
      );
      expect(transaction).toBeNone();
    });

    it("should have 'txn-signers' map defined and return none for non-existent key", () => {
      const txnSigner = simnet.getMapEntry(
        "multisig",
        "txn-signers",
        Cl.tuple({
          "txn-id": Cl.uint(0),
          signer: Cl.principal(deployer),
        })
      );
      expect(txnSigner).toBeNone();
    });
  });
});

