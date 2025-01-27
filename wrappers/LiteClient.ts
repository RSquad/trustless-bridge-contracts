import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
} from "@ton/core";

export type LiteClientConfig = {
  rootHash: Buffer;
  validators: Cell;
};

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
  ) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x2d69cd97, 32)
        .storeUint(0, 64)
        .storeRef(block)
        .storeRef(signatures)
        .endCell(),
    });
  }
}
