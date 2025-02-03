import {
  Blockchain,
  SandboxContract,
  SendMessageResult,
  TreasuryContract,
} from "@ton/sandbox";
import "@ton/test-utils";
import { LiteClient } from "../wrappers/LiteClient";
import { OpCodes as LiteClientOpCodes } from "../wrappers/LiteClient";
import { OpCodes, TxChecker } from "../wrappers/TxChecker";
import { compile } from "@ton/blueprint";
import { Address, beginCell, Cell, toNano } from "@ton/core";
import { extractValidatorsConfig, readBockFromFile } from "./utils";

// Block at start of the epoch
//(1,8000000000000000,27620817)
const initKeyBlock = readBockFromFile("pruned_block_27620817", "cliexample");
const INITIAL_SETUP = extractValidatorsConfig(initKeyBlock, 34, true)!;
// Array of test cases for checkTransaction

type CHECK_TRANSACTION_TEST = {
  transaction: Cell;
  proof: Cell;
  currentBlock: Cell;
};

const createTestCase = (
  seqno: number,
  fileHash: string,
  txhash: string,
  accountAddr: string,
  txlt: bigint,
): CHECK_TRANSACTION_TEST => {
  const dir = "cliexample";
  return {
    transaction: TxChecker.packTransaction({
      txhash,
      accountAddr,
      txlt,
    }),
    proof: readBockFromFile(
      `txproof_${txhash.slice(0, 6)}_block_${seqno.toString()}`,
      dir,
    ),
    currentBlock: TxChecker.packCurrentBlock({
      fileHash,
      prunedBlock: readBockFromFile(`pruned_block_${seqno.toString()}`, dir),
      signatures: readBockFromFile(`block_signatures_${seqno.toString()}`, dir),
    }),
  };
};

const TEST_CASES: CHECK_TRANSACTION_TEST[] = [
  createTestCase(
    27626103,
    "3DB14851B77E1DA2D7331B340314DC7C0D6BB1FCF0274C361F3B1633A86BB8AD",
    "E36ABF1A2DC3C028C117E7C979E29FF51D71D4EECF51DB910BA4FCC8D05B4C3F",
    "5555555555555555555555555555555555555555555555555555555555555555",
    30803209000003n,
  ),
  createTestCase(
    27620829,
    "8C260145BCB30D8AF1EC48D9C7A98DC4FC9F43A616BBDB76AC1804D28C3044A8",
    "13D7C48E429DFC6470164BB9E51FFD2A46A91FBC544EBE0E9B442322182A1A6C",
    "05ce881221c7876c939140f023ee93dc8a24790cb87081b831620c5a2ffedf41",
    30797635000001n,
  ),
  createTestCase(
    27620829,
    "8C260145BCB30D8AF1EC48D9C7A98DC4FC9F43A616BBDB76AC1804D28C3044A8",
    "E14B6A3D86BFA336D42C7D8500372FB5DD7A8F28965810100D149D3B0DF83DF6",
    "05ce881221c7876c939140f023ee93dc8a24790cb87081b831620c5a2ffedf41",
    30797635000005n,
  ),
  createTestCase(
    27620829,
    "8C260145BCB30D8AF1EC48D9C7A98DC4FC9F43A616BBDB76AC1804D28C3044A8",
    "CBE9559D7DC5D01019040166FEAD2AD484B59BEE1A83D9C52ECDD0FB57D376DA",
    "7D833E7C484C437B115526D78E49970F0F115EBA345C2B83B2F6A0617C90B92F",
    30797635000003n,
  ),
  createTestCase(
    27620829,
    "8C260145BCB30D8AF1EC48D9C7A98DC4FC9F43A616BBDB76AC1804D28C3044A8",
    "A09B43578F26BD626D3A38E6CD6B581823A3753488B2611B10F528976F433081",
    "3333333333333333333333333333333333333333333333333333333333333333",
    30797635000002n,
  ),
];

describe("Integration tests", () => {
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let liteClient: SandboxContract<LiteClient>;
  let txChecker: SandboxContract<TxChecker>;
  let result: SendMessageResult | undefined;

  const expectDeploySuccess = (addr: Address) => {
    expect(result!.transactions).toHaveTransaction({
      from: deployer.address,
      to: addr,
      deploy: true,
      success: true,
    });
  };
  beforeAll(async () => {
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury("deployer");
    liteClient = blockchain.openContract(
      LiteClient.createFromConfig(
        {
          validators: INITIAL_SETUP.shortValidators,
          totalWeight: INITIAL_SETUP.totalWeight,
          validatorsHash: INITIAL_SETUP.validatorsHash,
        },
        await compile("LiteClient"),
      ),
    );
    txChecker = blockchain.openContract(
      TxChecker.createFromConfig(
        {
          liteClientAddress: liteClient.address,
        },
        await compile("TxChecker"),
      ),
    );

    result = await liteClient.sendDeploy(deployer.getSender(), toNano(0.1));
    expectDeploySuccess(liteClient.address);

    result = await txChecker.sendDeploy(deployer.getSender(), toNano(0.1));
    expectDeploySuccess(txChecker.address);
  });

  const expectCheckTransactionSucceeded = (
    r: SendMessageResult,
    t: CHECK_TRANSACTION_TEST,
  ) => {
    expect(r.transactions).toHaveTransaction({
      from: deployer.address,
      to: txChecker.address,
      success: true,
      op: OpCodes.OP_CHECK_TRANSACTION,
    });
    expect(r.transactions).toHaveTransaction({
      from: txChecker.address,
      to: liteClient.address,
      success: true,
      op: LiteClientOpCodes.OP_CHECKBLOCK,
      body: beginCell()
        .storeUint(LiteClientOpCodes.OP_CHECKBLOCK, 32)
        .storeUint(0, 64)
        .storeSlice(t.currentBlock.beginParse())
        .storeAddress(deployer.address)
        .storeRef(t.transaction)
        .endCell(),
    });
    expect(r.transactions).toHaveTransaction({
      from: liteClient.address,
      to: txChecker.address,
      success: true,
      op: LiteClientOpCodes.OP_CHECKBLOCK_ANSWER,
    });
    expect(r.transactions).toHaveTransaction({
      from: txChecker.address,
      to: deployer.address,
      success: true,
      op: OpCodes.OP_TRANSACTION_CHECKED,
      body: beginCell()
        .storeUint(OpCodes.OP_TRANSACTION_CHECKED, 32)
        .storeRef(t.transaction)
        .endCell(),
    });
  };

  it.each(TEST_CASES)("Check transaction flow (success)", async (t) => {
    const result = await txChecker.sendCheckTransaction(
      deployer.getSender(),
      toNano(0.1),
      t,
    );
    expectCheckTransactionSucceeded(result, t);
  });
});
