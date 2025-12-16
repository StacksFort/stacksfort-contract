import { Cl } from "@stacks/transactions";
import { describe, expect, it, beforeEach } from "vitest";
import {
  makeRandomSigner,
  initMultisigWithSigners,
  submitStxTxn,
  getTxnHash,
  bufferHexFromOk,
} from "./helpers/signing";

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
    it("should have 'transactions' map defined", () => {
      // Attempting to read from a non-existent key throws "value not found"
      // This confirms the map is defined (otherwise it would be a different error)
      expect(() => {
        simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
      }).toThrow("value not found");
    });

    it("should have 'txn-signers' map defined", () => {
      // Attempting to read from a non-existent key throws "value not found"
      // This confirms the map is defined (otherwise it would be a different error)
      expect(() => {
        simnet.getMapEntry(
          "multisig",
          "txn-signers",
          Cl.tuple({
            "txn-id": Cl.uint(0),
            signer: Cl.principal(deployer),
          })
        );
      }).toThrow("value not found");
    });
  });
});

describe("Issue #2: submit-txn function", () => {
  const signer1 = makeRandomSigner();
  const signer2 = makeRandomSigner();
  const nonSigner = makeRandomSigner();

  beforeEach(() => {
    // Initialize contract before each test
    initMultisigWithSigners([signer1.address, signer2.address], 2);
  });

  it("should allow a signer to submit an STX transaction", () => {
    const amount = 1000;
    const recipient = signer2.address;
    const result = submitStxTxn(signer1.address, amount, recipient);

    // Should return ok with transaction ID 0
    expect(result.result).toBeOk(Cl.uint(0));

    // Verify transaction was stored correctly
    const txn = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));

    expect(txn).toBeTuple({
      type: Cl.uint(0), // STX transfer type
      amount: Cl.uint(amount),
      recipient: Cl.principal(recipient),
      executed: Cl.bool(false),
    });

    // Verify txn-id was incremented
    const txnId = simnet.getDataVar("multisig", "txn-id");
    expect(txnId).toBeUint(1);
  });

  it("should reject transaction submission from non-signer", () => {
    const amount = 1000;
    const recipient = signer2.address;
    const result = submitStxTxn(nonSigner.address, amount, recipient);

    // Should return error (not-ok)
    expect(result.result).not.toBeOk();
  });

  it("should reject transaction with zero amount", () => {
    const recipient = signer2.address;
    const result = submitStxTxn(signer1.address, 0, recipient);
    expect(result.result).not.toBeOk();
  });

  it("should store multiple transactions with sequential IDs", () => {
    const recipient = signer2.address;

    // Submit first transaction
    const result1 = submitStxTxn(signer1.address, 1000, recipient);
    expect(result1.result).toBeOk(Cl.uint(0));

    // Submit second transaction
    const result2 = submitStxTxn(signer1.address, 500, recipient);
    expect(result2.result).toBeOk(Cl.uint(1));

    // Verify both transactions exist
    const txn0 = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
    const txn1 = simnet.getMapEntry("multisig", "transactions", Cl.uint(1));

    expect(txn0).toBeDefined();
    expect(txn1).toBeDefined();
    expect(txn0).not.toEqual(txn1);

    // Verify txn-id was incremented correctly
    const txnId = simnet.getDataVar("multisig", "txn-id");
    expect(txnId).toBeUint(2);
  });
});

describe("Issue #3: hash-txn function", () => {
  const signer1 = makeRandomSigner();
  const recipient = makeRandomSigner().address;

  beforeEach(() => {
    initMultisigWithSigners([signer1.address], 1);

    // Submit a test transaction
    submitStxTxn(signer1.address, 1000, recipient);
  });

  it("should return a 32-byte hash for an existing transaction", () => {
    const result = getTxnHash(0, signer1.address);

    // Should return ok with a buffer
    expect(result.result).toBeOk(Cl.bufferFromHex("00".repeat(32)));

    // Verify it's a 32-byte hash
    const hashHex = bufferHexFromOk(result);
    expect(hashHex.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it("should return different hashes for different transactions", () => {
    // Submit a second transaction
    submitStxTxn(signer1.address, 500, recipient);

    const hash1 = bufferHexFromOk(getTxnHash(0, signer1.address));
    const hash2 = bufferHexFromOk(getTxnHash(1, signer1.address));

    expect(hash1).not.toBe(hash2);
  });

  it("should return error for non-existent transaction", () => {
    const result = getTxnHash(999, signer1.address);
    expect(result.result).not.toBeOk();
  });
});

describe("Issue #2: submit-txn function", () => {
  const signer1 = makeRandomSigner();
  const signer2 = makeRandomSigner();
  const nonSigner = makeRandomSigner();
  const recipient = makeRandomSigner().address;

  beforeEach(() => {
    // Initialize contract before each test
    initMultisigWithSigners([signer1.address, signer2.address], 2);
  });

  it("should allow a signer to submit an STX transaction", () => {
    const amount = 1000;
    const result = submitStxTxn(signer1.address, amount);

    // Should return ok with transaction ID 0
    expect(result.result).toBeOk(Cl.uint(0));

    // Verify transaction was stored correctly
    const txn = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));

    expect(txn).toBeTuple({
      type: Cl.uint(0), // STX transfer type
      amount: Cl.uint(amount),
      recipient: Cl.principal(recipient),
      executed: Cl.bool(false),
    });

    // Verify txn-id was incremented
    const txnId = simnet.getDataVar("multisig", "txn-id");
    expect(txnId).toBeUint(1);
  });

  it("should reject transaction submission from non-signer", () => {
    const amount = 1000;
    const result = submitStxTxn(nonSigner.address, amount);

    // Should return error (not-ok)
    expect(result.result).not.toBeOk();
  });

  it("should reject transaction with zero amount", () => {
    const result = submitStxTxn(signer1.address, 0);
    expect(result.result).not.toBeOk();
  });

  it("should store multiple transactions with sequential IDs", () => {
    // Submit first transaction
    const result1 = submitStxTxn(signer1.address, 1000);
    expect(result1.result).toBeOk(Cl.uint(0));

    // Submit second transaction
    const result2 = submitStxTxn(signer1.address, 500);
    expect(result2.result).toBeOk(Cl.uint(1));

    // Verify both transactions exist
    const txn0 = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
    const txn1 = simnet.getMapEntry("multisig", "transactions", Cl.uint(1));

    expect(txn0).toBeDefined();
    expect(txn1).toBeDefined();
    expect(txn0).not.toEqual(txn1);

    // Verify txn-id was incremented correctly
    const txnId = simnet.getDataVar("multisig", "txn-id");
    expect(txnId).toBeUint(2);
  });
});

describe("Issue #3: hash-txn function", () => {
  const signer1 = makeRandomSigner();
  const recipient = makeRandomSigner().address;

  beforeEach(() => {
    initMultisigWithSigners([signer1.address], 1);

    // Submit a test transaction
    submitStxTxn(signer1.address, 1000);
  });

  it("should return a 32-byte hash for an existing transaction", () => {
    const result = getTxnHash(0, signer1.address);

    // Should return ok with a buffer
    expect(result.result).toBeOk(Cl.bufferFromHex("00".repeat(32)));

    // Verify it's a 32-byte hash
    const hashHex = bufferHexFromOk(result);
    expect(hashHex.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it("should return different hashes for different transactions", () => {
    // Submit a second transaction
    submitStxTxn(signer1.address, 500);

    const hash1 = bufferHexFromOk(getTxnHash(0, signer1.address));
    const hash2 = bufferHexFromOk(getTxnHash(1, signer1.address));

    expect(hash1).not.toBe(hash2);
  });

  it("should return error for non-existent transaction", () => {
    const result = getTxnHash(999, signer1.address);
    expect(result.result).not.toBeOk();
  });
});

import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

import {
  bufferHexFromOk,
  getTxnHash,
  initMultisigWithSigners,
  makeRandomSigner,
  signHash,
  submitStxTxn,
} from "./helpers/signing";

describe("Issue #4: extract-signer", () => {
  it("returns signer principal for a valid signature from a configured signer", () => {
    const signer = makeRandomSigner();

    initMultisigWithSigners([signer.address], 1);
    submitStxTxn(signer.address);

    const hashResult = getTxnHash(0, signer.address);
    const hashHex = bufferHexFromOk(hashResult);
    const signature = signHash(hashHex, signer.privateKey);

    const extractResult = simnet.callReadOnlyFn(
      "multisig",
      "extract-signer",
      [Cl.bufferFromHex(hashHex), Cl.bufferFromHex(signature)],
      signer.address
    );

    expect(extractResult.result).toBeOk(Cl.principal(signer.address));
  });

  it("rejects signature when recovered principal is not a configured signer", () => {
    const signer = makeRandomSigner();
    const outsider = makeRandomSigner();

    initMultisigWithSigners([signer.address], 1);
    submitStxTxn(signer.address);

    const hashResult = getTxnHash(0, signer.address);
    const hashHex = bufferHexFromOk(hashResult);
    const outsiderSig = signHash(hashHex, outsider.privateKey);

    const extractResult = simnet.callReadOnlyFn(
      "multisig",
      "extract-signer",
      [Cl.bufferFromHex(hashHex), Cl.bufferFromHex(outsiderSig)],
      signer.address
    );

    expect(extractResult.result).toBeErr(Cl.uint(12));
  });

  it("rejects malformed signatures that cannot be recovered", () => {
    const signer = makeRandomSigner();

    initMultisigWithSigners([signer.address], 1);
    submitStxTxn(signer.address);

    const hashResult = getTxnHash(0, signer.address);
    const hashHex = bufferHexFromOk(hashResult);
    const badSignature = "00".repeat(65);

    const extractResult = simnet.callReadOnlyFn(
      "multisig",
      "extract-signer",
      [Cl.bufferFromHex(hashHex), Cl.bufferFromHex(badSignature)],
      signer.address
    );

    expect(extractResult.result).toBeErr(Cl.uint(12));
  });
});
