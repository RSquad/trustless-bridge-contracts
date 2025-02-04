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
        /*blockchain.setVerbosityForAddress(merkleProof.address, {
            print: true,
            blockchainLogs: true,
            vmLogs: "vm_logs",
            debugLogs: true,
        })*/
    });

    it('find tx', async () => {
        // block (0,2000000000000000,29361913)
        const blockHex = fs.readFileSync("./tests/libs/txproof_A43DEB.boc", "hex");
        const expectedHash = "A43DEBA96E0815151645411FEF0FE7E54FF35500B02310A19E7A89AFDFA58194".toLowerCase();
        const accountAddr = "2304BB12FDAC407FAE3B336B0FB42542B09FA423858FF3637BDA03CB1E3B0D1D";
        const txLogicalTime = 30763016000001n;
        const block = Cell.fromBoc(Buffer.from(blockHex, "hex"))[0];
        const txCell = await merkleProof.getMerkleProofFindTx(block, accountAddr, txLogicalTime);
        expect(txCell).toBeDefined();
        expect(txCell?.hash(0).toString("hex")).toBe(expectedHash);
    });

    it('find tx 3', async () => {
        // 	(-1,8000000000000000,27626103)
        const blockHex = fs.readFileSync("./tests/samples/txproof_E36ABF_block_27626103.boc", "hex");
        const expectedHash = "E36ABF1A2DC3C028C117E7C979E29FF51D71D4EECF51DB910BA4FCC8D05B4C3F".toLowerCase();
        const accountAddr = "5555555555555555555555555555555555555555555555555555555555555555";
        const txLogicalTime = 30803209000003n;
        const block = Cell.fromBoc(Buffer.from(blockHex, "hex"))[0];
        const txCell = await merkleProof.getMerkleProofFindTx(block, accountAddr, txLogicalTime);
        expect(txCell).toBeDefined();
        expect(txCell?.hash(0).toString("hex")).toBe(expectedHash);
    });
});
