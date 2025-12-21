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
    [Cl.uint(0), Cl.uint(amount), Cl.principal(sender), Cl.none(), Cl.none()],
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

export function executeStxTransfer(txnId: number, signatures: string[], caller: string) {
    const signatureList = Cl.list(signatures.map((signature) => Cl.bufferFromHex(signature)));
    return simnet.callPublicFn(
        "multisig",
        "execute-stx-transfer-txn",
        [Cl.uint(txnId), signatureList],
        caller
    );
}

export function getStxBalance(address: string): number {
    const assets = simnet.getAssetsMap().get(address);
    if (!assets) return 0;
    return Number(assets.get("STX") || assets.get("stx") || 0);
}

export function fundMultisigWithStx(amount: number) {
    // In simnet, we can't easily "mint" STX to a contract, but we can transfer from deployer
    // deployer usually has infinite/large STX
    const contractPrincipal = `${simnet.deployer}.multisig`;
    return simnet.transferSTX((amount * 1000000), contractPrincipal, simnet.deployer);
}

export function executeTokenTransfer(txnId: number, signatures: string[], tokenContract: string, caller: string) {
    const signatureList = Cl.list(signatures.map((signature) => Cl.bufferFromHex(signature)));
    return simnet.callPublicFn(
        "multisig",
        "execute-token-transfer-txn",
        [Cl.uint(txnId), signatureList, Cl.contractPrincipal(simnet.deployer, tokenContract)],
        caller
    );
}

export function submitTokenTxn(sender: string, tokenContract: string, amount: number = 100) {
  // Type 1 = SIP-010 Transfer
  return simnet.callPublicFn(
    "multisig",
    "submit-txn",
    [Cl.uint(1), Cl.uint(amount), Cl.principal(sender), Cl.some(Cl.contractPrincipal(simnet.deployer, tokenContract)), Cl.none()],
    sender,
  );
}

export function mintMockToken(tokenContract: string, recipient: string, amount: number) {
    let recipientPrincipal;
    if (recipient.includes(".")) {
        const [addr, name] = recipient.split(".");
        recipientPrincipal = Cl.contractPrincipal(addr, name);
    } else {
        recipientPrincipal = Cl.principal(recipient);
    }
    return simnet.callPublicFn(
        tokenContract,
        "mint",
        [Cl.uint(amount), recipientPrincipal],
        simnet.deployer // Only owner can mint (deployer)
    );
}

export function getTokenBalance(tokenContract: string, owner: string) {
    let ownerPrincipal;
    if (owner.includes(".")) {
        const [addr, name] = owner.split(".");
        ownerPrincipal = Cl.contractPrincipal(addr, name);
    } else {
        ownerPrincipal = Cl.principal(owner);
    }
    return simnet.callReadOnlyFn(
        tokenContract,
        "get-balance",
        [ownerPrincipal],
        simnet.deployer // Sender must be a standard principal
    );
}
