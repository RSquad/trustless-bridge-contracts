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
import { ValidatorDescriptionDictValue } from "../tests/utils";

export type LiteClientConfig = {
  rootHash: Buffer;
  validators: Cell;
};

export const OpCodes = {
  OP_NEW_KEYBLOCK: 0x2d69cd97,
  OP_NEW_KEYBLOCK_ANSWER: 0xff8ff4e1,
}

export function liteClientConfigToCell(config: LiteClientConfig): Cell {
  return beginCell()
    .storeBuffer(config.rootHash, 32)
    .storeRef(config.validators)
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
        .storeBuffer(fileHash, 32)
        .storeRef(block)
        .storeRef(signatures)
        .endCell(),
    });
  }


  async getConfig34(provider: ContractProvider): Promise<{
    config34: Cell;
    
  }> {
    const result = await provider.get("get_config_34", []);
    const cell = result.stack.readCellOpt();
    if (!cell) {
      throw Error("no state");
    }
    return {
      config34: cell
    };
  }

  async getValidators(provider: ContractProvider): Promise<{
    validators: Dictionary<number, {
      publicKey: Buffer;
      weight: bigint;
      adnlAddress: Buffer | null;
  }>;
  }> {
    const result = await provider.get("get_validators", []);
    const cell = result.stack.readCellOpt();
    if (!cell) {
      throw Error("no state");
    }
  
    const slice = cell.beginParse();
    const validators = slice.loadDictDirect(Dictionary.Keys.Uint(16), ValidatorDescriptionDictValue)
    return {
      validators
    };
  }
}
