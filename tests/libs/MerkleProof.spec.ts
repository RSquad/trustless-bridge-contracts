import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { MerkleProofTest } from '../../wrappers/MerkleProofTest';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('MerkleProof', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('TxChecker');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let merkleProof: SandboxContract<MerkleProofTest>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        merkleProof = blockchain.openContract(await MerkleProofTest.create());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await merkleProof.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: merkleProof.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and txChecker are ready to use
    });
});
