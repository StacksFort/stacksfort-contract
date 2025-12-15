import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

import {
  bufferHexFromOk,
  countUniqueValidSignatures,
  getTxnHash,
  initMultisigWithSigners,
  makeRandomSigner,
  signHash,
  submitStxTxn,
} from "./helpers/signing";

describe("Issue #5: count-valid-unique-signature", () => {
  it("counts a signer only once even when its signature is submitted twice", () => {
    const signer = makeRandomSigner();

    initMultisigWithSigners([signer.address], 1);
    submitStxTxn(signer.address);

    const hashHex = bufferHexFromOk(getTxnHash(0, signer.address));
    const signature = signHash(hashHex, signer.privateKey);

    const result = countUniqueValidSignatures(0, [signature, signature]);

    expect(result.result).toBeOk(Cl.uint(1));
  });

  it("ignores signatures belonging to non-signers while counting valid ones", () => {
    const signer = makeRandomSigner();
    const outsider = makeRandomSigner();

    initMultisigWithSigners([signer.address], 1);
    submitStxTxn(signer.address);

    const hashHex = bufferHexFromOk(getTxnHash(0, signer.address));
    const signerSignature = signHash(hashHex, signer.privateKey);
    const outsiderSignature = signHash(hashHex, outsider.privateKey);

    const result = countUniqueValidSignatures(0, [signerSignature, outsiderSignature]);

    expect(result.result).toBeOk(Cl.uint(1));
  });

  it("counts each unique signer once across multiple valid signatures", () => {
    const signerA = makeRandomSigner();
    const signerB = makeRandomSigner();

    initMultisigWithSigners([signerA.address, signerB.address], 2);
    submitStxTxn(signerA.address);

    const hashHex = bufferHexFromOk(getTxnHash(0, signerA.address));
    const signatures = [signerA, signerB].map((signer) => signHash(hashHex, signer.privateKey));

    const result = countUniqueValidSignatures(0, signatures);

    expect(result.result).toBeOk(Cl.uint(2));
  });
});
