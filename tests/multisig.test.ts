import { Cl } from "@stacks/transactions";
import { describe, expect, it, beforeEach } from "vitest";
import {
  makeRandomSigner,
  initMultisigWithSigners,
  submitStxTxn,
  getTxnHash,
  bufferHexFromOk,
  signHash,
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
      expect(() => {
        simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
      }).toThrow("value not found");
    });

    it("should have 'txn-signers' map defined", () => {
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
    initMultisigWithSigners([signer1.address, signer2.address], 2);
  });

  it("should allow a signer to submit an STX transaction", () => {
    const amount = 1000;
    const result = submitStxTxn(signer1.address, amount);

    expect(result.result).toBeOk(Cl.uint(0));

    const txnResult = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
    const expectedExpiration = simnet.blockHeight + 1008;
    expect(txnResult).toBeSome(
      Cl.tuple({
        type: Cl.uint(0),
        amount: Cl.uint(amount),
        recipient: Cl.principal(signer1.address), // submitStxTxn uses sender as recipient
        token: Cl.none(),
        executed: Cl.bool(false),
        expiration: Cl.uint(expectedExpiration),
      })
    );

    const txnId = simnet.getDataVar("multisig", "txn-id");
    expect(txnId).toBeUint(1);
  });

  it("should reject transaction submission from non-signer", () => {
    const amount = 1000;
    const result = submitStxTxn(nonSigner.address, amount);
    expect(result.result.type).toBe("err");
  });

  it("should reject transaction with zero amount", () => {
    const result = submitStxTxn(signer1.address, 0);
    expect(result.result.type).toBe("err");
  });

  it("should store multiple transactions with sequential IDs", () => {
    const result1 = submitStxTxn(signer1.address, 1000);
    expect(result1.result).toBeOk(Cl.uint(0));

    const result2 = submitStxTxn(signer1.address, 500);
    expect(result2.result).toBeOk(Cl.uint(1));

    const txn0 = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
    const txn1 = simnet.getMapEntry("multisig", "transactions", Cl.uint(1));

    expect(txn0).toBeDefined();
    expect(txn1).toBeDefined();
    expect(txn0).not.toEqual(txn1);

    const txnId = simnet.getDataVar("multisig", "txn-id");
    expect(txnId).toBeUint(2);
  });
});

describe("Issue #3: hash-txn function", () => {
  const signer1 = makeRandomSigner();

  beforeEach(() => {
    initMultisigWithSigners([signer1.address], 1);
    submitStxTxn(signer1.address, 1000);
  });

  it("should return a 32-byte hash for an existing transaction", () => {
    const result = getTxnHash(0, signer1.address);

    // Verify it returns ok with a buffer
    expect(result.result.type).toBe("ok");

    // Verify it's a 32-byte hash
    const hashHex = bufferHexFromOk(result);
    expect(hashHex.length).toBe(64);
  });

  it("should return different hashes for different transactions", () => {
    submitStxTxn(signer1.address, 500);

    const hash1 = bufferHexFromOk(getTxnHash(0, signer1.address));
    const hash2 = bufferHexFromOk(getTxnHash(1, signer1.address));

    expect(hash1).not.toBe(hash2);
  });

  it("should return error for non-existent transaction", () => {
    const result = getTxnHash(999, signer1.address);
    expect(result.result.type).toBe("err");
  });
});

describe("Issue #4: extract-signer function", () => {
  it("recovers and validates a signer from a valid signature", () => {
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

describe("Issue #15: Transaction Expiration", () => {
  const signer1 = makeRandomSigner();
  const signer2 = makeRandomSigner();

  beforeEach(() => {
    initMultisigWithSigners([signer1.address, signer2.address], 2);
  });

  it("should allow submission with explicit expiration", () => {
    // Current block time is 0 in simnet initially, but let's assume some future time
    const expiration = 100000;
    const result = submitStxTxn(signer1.address, 100, Cl.some(Cl.uint(expiration)));
    expect(result.result).toBeOk(Cl.uint(0));

    const txn = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
    expect(txn).toBeSome(
      Cl.tuple({
        type: Cl.uint(0),
        amount: Cl.uint(100),
        recipient: Cl.principal(signer1.address),
        token: Cl.none(),
        executed: Cl.bool(false),
        expiration: Cl.uint(expiration),
      })
    );
  });

  it("should set default expiration if not provided", () => {
    const result = submitStxTxn(signer1.address, 100, Cl.none());
    expect(result.result).toBeOk(Cl.uint(0));

    const txn = simnet.getMapEntry("multisig", "transactions", Cl.uint(0));
    // Default is block-height + 1008.
    const expectedExpiration = simnet.blockHeight + 1008;
    // Check fields manually or use toBeSome with calculated expiration
    // But we need to know other fields.
    // Let's just check expiration field existence and value if possible.
    // Or use toBeSome with full tuple.
    expect(txn).toBeSome(
      Cl.tuple({
        type: Cl.uint(0),
        amount: Cl.uint(100),
        recipient: Cl.principal(signer1.address),
        token: Cl.none(),
        executed: Cl.bool(false),
        expiration: Cl.uint(expectedExpiration),
      })
    );
  });

  it("should fail execution if transaction is expired", () => {
    // Set expiration to current block height + 10
    // Simnet starts at block 0?
    const expiration = 10;
    submitStxTxn(signer1.address, 100, Cl.some(Cl.uint(expiration)));

    // Advance chain height to be past expiration (11 blocks)
    simnet.mineEmptyBlocks(11);

    // Now try to execute
    // Need signatures first
    const txnId = 0;
    const hashResult = getTxnHash(txnId, signer1.address);
    const hashHex = bufferHexFromOk(hashResult);
    const sig1 = signHash(hashHex, signer1.privateKey);
    const sig2 = signHash(hashHex, signer2.privateKey);

    const result = simnet.callPublicFn(
      "multisig",
      "execute-stx-transfer-txn",
      [Cl.uint(txnId), Cl.list([Cl.bufferFromHex(sig1), Cl.bufferFromHex(sig2)])],
      signer1.address
    );

    expect(result.result).toBeErr(Cl.uint(15)); // ERR_TXN_EXPIRED
  });
});
