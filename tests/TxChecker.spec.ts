import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { TxChecker } from '../wrappers/TxChecker';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('TxChecker', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('TxChecker');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let txChecker: SandboxContract<TxChecker>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        txChecker = blockchain.openContract(TxChecker.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await txChecker.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: txChecker.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and txChecker are ready to use
    });
});
