import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
  Sender,
  SendMode,
} from "@ton/core";

export const OpCodes = {
  OP_CHECK_TRANSACTION: 0x91d555f7,
  OP_TRANSACTION_CHECKED: 0x756adff1,
}

export type TxCheckerConfig = {
  liteClientAddress: Address;
};

export function txCheckerConfigToCell(config: TxCheckerConfig): Cell {
  return beginCell().storeAddress(config.liteClientAddress).endCell();
}

export class TxChecker implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new TxChecker(address);
  }

  static createFromConfig(config: TxCheckerConfig, code: Cell, workchain = 0) {
    const data = txCheckerConfigToCell(config);
    const init = { code, data };
    return new TxChecker(contractAddress(workchain, init), init);
  }

  static packCurrentBlock(fileHash: string, prunedBlock: Cell, signatures: Cell): Cell {
    return beginCell()
        .storeBuffer(Buffer.from(fileHash, "hex"), 32)
        .storeRef(prunedBlock)
        .storeRef(signatures)
        .endCell();
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendCheckTransaction(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    ops: {
      transaction: Cell;
      proof: Cell;
      currentBlock: Cell;
    },
  ) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OpCodes.OP_CHECK_TRANSACTION, 32)
        .storeRef(ops.transaction)
        .storeRef(ops.proof)
        .storeRef(ops.currentBlock)
        .endCell(),
    });
  }
}
