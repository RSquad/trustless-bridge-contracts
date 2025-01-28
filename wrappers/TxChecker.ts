import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TxCheckerConfig = {};

export function txCheckerConfigToCell(config: TxCheckerConfig): Cell {
    return beginCell().endCell();
}

export class TxChecker implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new TxChecker(address);
    }

    static createFromConfig(config: TxCheckerConfig, code: Cell, workchain = 0) {
        const data = txCheckerConfigToCell(config);
        const init = { code, data };
        return new TxChecker(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
