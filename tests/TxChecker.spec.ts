import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { OpCodes, TxChecker } from '../wrappers/TxChecker';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { extractEpoch, readByFileHash } from "./utils";

// Block (-1,8000000000000000,27620817) 
//const initBlockCell = readByFileHash("init_block", "cliexample");

// Block (-1,8000000000000000,27626103) 
const checkBlockCell = readByFileHash("block_proof_27626103", "cliexample");
const checkBlockSignaturesCell = readByFileHash("block_signatures_27626103", "cliexample");
const BLOCK_FILE_HASH = "3DB14851B77E1DA2D7331B340314DC7C0D6BB1FCF0274C361F3B1633A86BB8AD";
// Transaction from block 27626103
const txProofCell = readByFileHash("txproof_E36ABF_block_27626103", "cliexample");
const TX_HASH = "0xE36ABF1A2DC3C028C117E7C979E29FF51D71D4EECF51DB910BA4FCC8D05B4C3F";
const ACCOUNT_ADDR = "0x5555555555555555555555555555555555555555555555555555555555555555";
const TX_LT = 30803209000003n;

describe('TxChecker', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('TxChecker');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let txChecker: SandboxContract<TxChecker>;
    let liteClient: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        liteClient = await blockchain.treasury('liteClient');
        txChecker = blockchain.openContract(TxChecker.createFromConfig({
            liteClientAddress: liteClient.address
        }, code));
        const deployResult = await txChecker.sendDeploy(deployer.getSender(), toNano('0.1'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: txChecker.address,
            deploy: true,
            success: true,
        });
    });

    it('check transaction', async () => {
        const result = await txChecker.sendCheckTransaction(deployer.getSender(), toNano(0.1), {
            transaction: beginCell()
                .storeUint(BigInt(TX_HASH), 256)
                .storeUint(BigInt(ACCOUNT_ADDR), 256)
                .storeUint(TX_LT, 64)
                .endCell(),
            proof: txProofCell,
            currentBlock: TxChecker.packCurrentBlock(
                BLOCK_FILE_HASH,
                checkBlockCell,
                checkBlockSignaturesCell
            ),
        });
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: txChecker.address,
            success: true,
            op: OpCodes.OP_CHECK_TRANSACTION
        });
    });
});
