import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
  DictionaryKey,
  DictionaryKeyTypes,
  Sender,
  SendMode,
} from "@ton/core";
import { ValidatorDescriptionDictValue } from "../tests/utils";

export type LiteClientConfig = {
  validators: Dictionary<Buffer<ArrayBufferLike>, bigint>;
  totalWeight: bigint;
  validatorsHash: Buffer<ArrayBufferLike>;
};

export const OpCodes = {
  OP_NEW_KEYBLOCK: 0x2d69cd97,
  OP_NEW_KEYBLOCK_ANSWER: 0xff8ff4e1,
  OP_CHECKBLOCK: 0x9af476bc,
  OP_CHECKBLOCK_ANSWER: 0xce02b807,
};

export function liteClientConfigToCell(config: LiteClientConfig): Cell {
  return beginCell()
    .storeUint(config.totalWeight, 64)
    .storeBuffer(config.validatorsHash, 32)
    .storeDict(config.validators)
    .endCell();
}

export class LiteClient implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new LiteClient(address);
  }

  static createFromConfig(config: LiteClientConfig, code: Cell, workchain = 0) {
    const data = liteClientConfigToCell(config);
    const init = { code, data };
    return new LiteClient(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendNewKeyBlock(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    block: Cell,
    signatures: Cell,
    fileHash: Buffer,
  ) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OpCodes.OP_NEW_KEYBLOCK, 32)
        .storeUint(0, 64)
        .storeRef(
          beginCell()
            .storeBuffer(fileHash, 32)
            .storeRef(block)
          .endCell(),
        )
        .storeRef(signatures)
        .endCell(),
    });
  }

  async sendCheckBlock(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    block: Cell,
    signatures: Cell,
    fileHash: Buffer,
  ) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OpCodes.OP_CHECKBLOCK, 32)
        .storeUint(0, 64)
        .storeRef(
          beginCell()
            .storeBuffer(fileHash, 32)
            .storeRef(block)
          .endCell(),
        )
        .storeRef(signatures)
        .endCell(),
    });
  }

  async getValidators(provider: ContractProvider): Promise<{
    validators: Dictionary<Buffer<ArrayBufferLike>, bigint>;
  }> {
    const result = await provider.get("get_validators", []);
    const cell = result.stack.readCellOpt();
    if (!cell) {
      throw Error("no state");
    }

    const slice = cell.beginParse();
    const validators = slice.loadDictDirect(
      Dictionary.Keys.Buffer(32),
      Dictionary.Values.BigUint(64),
    );
    return {
      validators,
    };
  }

  async getStorage(provider: ContractProvider): Promise<{
    validators: Dictionary<Buffer<ArrayBufferLike>, bigint>;
    totalWeight: bigint;
    epochHash: Buffer;
  }> {
    const result = await provider.get("get_storage", []);
    const cell = result.stack.readCellOpt();
    if (!cell) {
      throw Error("no state");
    }

    const slice = cell.beginParse();
    const validators = slice.loadDictDirect(
      Dictionary.Keys.Buffer(32),
      Dictionary.Values.BigUint(64),
    );
    const totalWeight = result.stack.readBigNumber();
    const epochHash = Buffer.from(
      "0x" + result.stack.readBigNumber().toString(16),
      "hex",
    );
    return {
      validators,
      totalWeight,
      epochHash,
    };
  }
}
