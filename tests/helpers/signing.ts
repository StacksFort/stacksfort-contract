import { signatureVrsToRsv } from "@stacks/common";
import { Cl, getAddressFromPrivateKey, makeRandomPrivKey, signWithKey } from "@stacks/transactions";

type Signer = {
  privateKey: string;
  address: string;
};

export function makeRandomSigner(): Signer {
  const privateKey = makeRandomPrivKey();
  const address = getAddressFromPrivateKey(privateKey, "testnet");
  return { privateKey, address };
}

export function initMultisigWithSigners(signers: string[], threshold: number = 1) {
  const signerList = Cl.list(signers.map((addr) => Cl.principal(addr)));
  const thresholdValue = Cl.uint(threshold);
  return simnet.callPublicFn("multisig", "initialize", [signerList, thresholdValue], simnet.deployer);
}

export function submitStxTxn(sender: string, amount: number = 100) {
  return simnet.callPublicFn(
    "multisig",
    "submit-txn",
    [Cl.uint(0), Cl.uint(amount), Cl.principal(sender), Cl.none()],
    sender,
  );
}

export function getTxnHash(txnId: number, sender: string) {
  return simnet.callReadOnlyFn("multisig", "hash-txn", [Cl.uint(txnId)], sender);
}

export function signHash(hashHex: string, privateKey: string) {
  const signatureVrs = signWithKey(privateKey, hashHex);
  return signatureVrsToRsv(signatureVrs);
}

export function bufferHexFromOk(result: any): string {
  if (result.result.type !== "ok" || result.result.value.type !== "buffer") {
    throw new Error("Expected ok buffer clarity value");
  }
  return result.result.value.value;
}

export function countUniqueValidSignatures(txnId: number, signatures: string[]) {
  const signatureList = Cl.list(signatures.map((signature) => Cl.bufferFromHex(signature)));

  return simnet.callPublicFn(
    "multisig",
    "count-unique-valid-signatures",
    [Cl.uint(txnId), signatureList],
    simnet.deployer,
  );
}
