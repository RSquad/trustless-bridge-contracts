import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { beginCell, Cell, toNano } from "@ton/core";
import { OpCodes, TxChecker } from "../wrappers/TxChecker";
import { OpCodes as LiteClientOpCodes } from "../wrappers/LiteClient";
import "@ton/test-utils";
import { compile } from "@ton/blueprint";
import { readBocFromFile } from "./utils";

// Block (-1,8000000000000000,27626103)
const checkBlockCell = readBocFromFile("pruned_block_27626103", "samples");
const checkBlockSignaturesCell = readBocFromFile(
  "block_signatures_27626103",
  "samples",
);
const BLOCK_FILE_HASH =
  "3DB14851B77E1DA2D7331B340314DC7C0D6BB1FCF0274C361F3B1633A86BB8AD";
const BLOCK_ROOT_HASH =
  "FE48DA5050192E5B19FD2A0DFF10932E7CB5650E71F58A266EF1023E541D95DD";
// Transaction from block (-1,8000000000000000,27626103)
const txProofCell = readBocFromFile(
  "txproof_E36ABF_block_27626103",
  "samples",
);
const TX_HASH =
  "0xE36ABF1A2DC3C028C117E7C979E29FF51D71D4EECF51DB910BA4FCC8D05B4C3F";
const ACCOUNT_ADDR =
  "0x5555555555555555555555555555555555555555555555555555555555555555";
const TX_LT = 30803209000003n;

describe("TxChecker", () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile("TxChecker");
  });

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let txChecker: SandboxContract<TxChecker>;
  let liteClientMock: SandboxContract<TreasuryContract>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury("deployer");
    liteClientMock = await blockchain.treasury("liteClientMock");
    txChecker = blockchain.openContract(
      TxChecker.createFromConfig(
        {
          liteClientAddress: liteClientMock.address,
        },
        code,
      ),
    );
    const deployResult = await txChecker.sendDeploy(
      deployer.getSender(),
      toNano("0.1"),
    );
    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: txChecker.address,
      deploy: true,
      success: true,
    });
  });

  it("check transaction", async () => {
    const currentBlockCell = TxChecker.packCurrentBlock({
      fileHash: BLOCK_FILE_HASH,
      prunedBlock: checkBlockCell,
      signatures: checkBlockSignaturesCell,
    });
    const transactionCell = beginCell()
      .storeUint(BigInt(TX_HASH), 256)
      .storeUint(BigInt(ACCOUNT_ADDR), 256)
      .storeUint(TX_LT, 64)
      .endCell();
    const result = await txChecker.sendCheckTransaction(
      deployer.getSender(),
      toNano(0.1),
      {
        transaction: transactionCell,
        proof: txProofCell,
        currentBlock: currentBlockCell,
      },
    );
    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: txChecker.address,
      success: true,
      op: OpCodes.OP_CHECK_TRANSACTION,
    });
    expect(result.transactions).toHaveTransaction({
      from: txChecker.address,
      to: liteClientMock.address,
      success: true,
      op: LiteClientOpCodes.OP_CHECKBLOCK,
      body: beginCell()
        .storeUint(LiteClientOpCodes.OP_CHECKBLOCK, 32)
        .storeUint(0, 64)
        .storeSlice(currentBlockCell.beginParse())
        .storeAddress(deployer.address)
        .storeRef(transactionCell)
        .endCell(),
    });

    const res = await txChecker.sendCheckBlockAnswer(
      liteClientMock.getSender(),
      toNano(0.1),
      {
        blockHash: BLOCK_ROOT_HASH,
        transaction: transactionCell,
        recipientAddress: deployer.address,
      },
    );
    expect(res.transactions).toHaveTransaction({
      from: liteClientMock.address,
      to: txChecker.address,
      success: true,
      op: LiteClientOpCodes.OP_CHECKBLOCK_ANSWER,
    });
    expect(res.transactions).toHaveTransaction({
      from: txChecker.address,
      to: deployer.address,
      success: true,
      op: OpCodes.OP_TRANSACTION_CHECKED,
      body: beginCell()
        .storeUint(OpCodes.OP_TRANSACTION_CHECKED, 32)
        .storeRef(transactionCell)
        .endCell(),
    });
  });
});
