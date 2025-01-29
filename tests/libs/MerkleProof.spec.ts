import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import * as fs from 'fs';
import { Cell, toNano } from '@ton/core';
import { MerkleProofTest } from '../../wrappers/MerkleProofTest';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('MerkleProof', () => {
    beforeAll(async () => {
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

    it('find tx', async () => {
        // block (0,2000000000000000,29361913)
        const blockHex = fs.readFileSync("./tests/libs/EFFC17EF8FE824E6A039944F3BFC9CEC4A5D9F74D8D93122243EDBD7BF5D4123.boc", "hex");
        const expectedHash = "A43DEBA96E0815151645411FEF0FE7E54FF35500B02310A19E7A89AFDFA58194";
        const block = Cell.fromBoc(Buffer.from(blockHex, "hex"))[0];
        const txCell = await merkleProof.getMerkleProofFindTx(block);
        expect(txCell).toBeDefined();
        expect(txCell?.hash(0).toString("hex")).toBe(expectedHash);
    });
});
