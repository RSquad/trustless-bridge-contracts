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
const TEST_CASES: CHECK_TRANSACTION_TEST[] = [
  {
    transaction: TxChecker.packTransaction({
      txhash:
        "E36ABF1A2DC3C028C117E7C979E29FF51D71D4EECF51DB910BA4FCC8D05B4C3F",
      accountAddr:
        "5555555555555555555555555555555555555555555555555555555555555555",
      txlt: 30803209000003n,
    }),
    proof: readBockFromFile("txproof_E36ABF_block_27626103", "cliexample"),
    currentBlock: TxChecker.packCurrentBlock({
      fileHash:
        "3DB14851B77E1DA2D7331B340314DC7C0D6BB1FCF0274C361F3B1633A86BB8AD",
      prunedBlock: readBockFromFile("pruned_block_27626103", "cliexample"),
      signatures: readBockFromFile("block_signatures_27626103", "cliexample"),
    }),
  },
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

  it("Check transaction flow (success)", async () => {
    const result = await txChecker.sendCheckTransaction(
      deployer.getSender(),
      toNano(0.1),
      TEST_CASES[0],
    );
    expectCheckTransactionSucceeded(result, TEST_CASES[0]);
  });
});
