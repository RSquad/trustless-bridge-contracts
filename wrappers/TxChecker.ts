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
import { OpCodes as LiteClientOpCodes } from "./LiteClient";
export const OpCodes = {
  OP_CHECK_TRANSACTION: 0x91d555f7,
  OP_TRANSACTION_CHECKED: 0x756adff1,
};

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

  static packCurrentBlock(args: {
    fileHash: string;
    prunedBlock: Cell;
    signatures: Cell;
  }): Cell {
    return beginCell()
      .storeRef(
        beginCell()
          .storeBuffer(Buffer.from(args.fileHash, "hex"), 32)
          .storeRef(args.prunedBlock)
          .endCell(),
      )
      .storeRef(args.signatures)
      .endCell();
  }

  static packTransaction(args: {
    txhash: string;
    accountAddr: string;
    txlt: bigint;
  }): Cell {
    return beginCell()
    .storeUint(BigInt('0x' + args.txhash), 256)
    .storeUint(BigInt('0x' + args.accountAddr), 256)
    .storeUint(args.txlt, 64)
    .endCell();
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      bounce: false,
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

  async sendCheckBlockAnswer(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    ops: {
      blockHash: string;
      transaction: Cell;
      recipientAddress: Address;
    },
  ) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(LiteClientOpCodes.OP_CHECKBLOCK_ANSWER, 32)
        .storeUint(0, 64)
        .storeBuffer(Buffer.from(ops.blockHash, "hex"), 32)
        .storeRef(ops.transaction)
        .storeAddress(ops.recipientAddress)
        .endCell(),
    });
  }
}
