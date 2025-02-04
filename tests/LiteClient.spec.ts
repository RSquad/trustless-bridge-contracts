import { compile } from "@ton/blueprint";
import { Cell, toNano } from "@ton/core";
import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import "@ton/test-utils";
import { LiteClient, OpCodes } from "../wrappers/LiteClient";
import { extractValidatorsConfig, readBockFromFile } from "./utils";

function readLocalBoc(name: string, pruned = true) {
  const block = readBockFromFile(
    pruned ? name + "_pruned" : name,
    "cliexample",
  );
  const epoch = extractValidatorsConfig(block, 34, pruned);
  const signatures = readBockFromFile(name + "_sig", "cliexample");

  return { block, epoch, signatures };
}

const keyblock_1 = readLocalBoc("1_keyblock");
const keyblock_765944 = readLocalBoc("block_765944");
const keyblock_850955 = readLocalBoc("block_850955");

const keyblock_1_filehash =
  "CBE1CAE785474647DD3DD8DB2C04DBCCAA8AE84FF898AB311CA7E74E90A7D1C5";
const block_1 = readLocalBoc("1_check_block");
const block_1_filehash =
  "782CA5563423A011FBEFCBC4F65A41FFDC927A65EDF774E681A5CC48D631CF63";
const block_1_rand = readLocalBoc("1_check_random_block");
const block_1_rand_filehash =
  "A0F28E409CEAB410E547B6C4995758A41EB5C3212525E4752C6DBAA6D5AA8455";
const keyblock_2 = readLocalBoc("2_keyblock_36");
const keyblock_2_filehash =
  "510B82A02A38EB105346E75DDC11B355F52A7C711561D1F58CA953DA4B7FBD53";
const block_2 = readLocalBoc("2_check_block");
const block_2_filehash =
  "A1287066E2681F8EC5513FF17AB4371F03BA43C030D354EB0304E7E8989743B8";
const keyblock_3 = readLocalBoc("3_keyblock");
const keyblock_3_filehash =
  "EEDC39CC0496E10CE5D691C6C2A05AA3104C9A1FD74BF414B17108D138ADA940";
const block_3 = readLocalBoc("3_check_block");
const block_3_filehash =
  "8E7367DCB4DB460D30AF2F7CC187391D9734DD845915A5CC580D7CD01FA41098";

describe("LiteClientCLI", () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile("LiteClient");
  });

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let liteClient: SandboxContract<LiteClient>;

  beforeAll(async () => {
    blockchain = await Blockchain.create();

    liteClient = blockchain.openContract(
      LiteClient.createFromConfig(
        {
          validators: keyblock_1.epoch!.shortValidators,
          totalWeight: keyblock_1.epoch!.totalWeight,
          validatorsHash: keyblock_1.epoch!.validatorsHash,
        },
        code,
      ),
    );

    deployer = await blockchain.treasury("deployer");

    const deployResult = await liteClient.sendDeploy(
      deployer.getSender(),
      toNano("0.05"),
    );

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      deploy: true,
      success: true,
    });
  });

  it("should fail check same keyblock (wrong epoch)", async () => {
    const result = await liteClient.sendNewKeyBlock(
      deployer.getSender(),
      toNano(0.1),
      keyblock_1.block,
      keyblock_1.signatures,
      Buffer.from(keyblock_1_filehash, "hex"),
    );
    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      success: false,
      exitCode: 112,
    });
  });

  it("should check block", async () => {
    const result = await liteClient.sendCheckBlock(
      deployer.getSender(),
      toNano(0.1),
      block_1_rand.block,
      block_1_rand.signatures,
      Buffer.from(block_1_rand_filehash, "hex"),
    );

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      op: OpCodes.OP_CHECKBLOCK,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: liteClient.address,
      to: deployer.address,
      op: OpCodes.OP_CHECKBLOCK_ANSWER,
      success: true,
    });
  });

  it("should check another block", async () => {
    const result = await liteClient.sendCheckBlock(
      deployer.getSender(),
      toNano(0.1),
      block_1.block,
      block_1.signatures,
      Buffer.from(block_1_filehash, "hex"),
    );

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      op: OpCodes.OP_CHECKBLOCK,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: liteClient.address,
      to: deployer.address,
      op: OpCodes.OP_CHECKBLOCK_ANSWER,
      success: true,
    });
  });

  it("should check block if config 34 not changed", async () => {
    const result = await liteClient.sendCheckBlock(
      deployer.getSender(),
      toNano(0.1),
      block_2.block,
      block_2.signatures,
      Buffer.from(block_2_filehash, "hex"),
    );

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      op: OpCodes.OP_CHECKBLOCK,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: liteClient.address,
      to: deployer.address,
      op: OpCodes.OP_CHECKBLOCK_ANSWER,
      success: true,
    });
  });

  it("should fail check block of another epoch", async () => {
    const result = await liteClient.sendCheckBlock(
      deployer.getSender(),
      toNano(0.1),
      block_3.block,
      block_3.signatures,
      Buffer.from(block_3_filehash, "hex"),
    );

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      success: false,
      exitCode: 112,
    });
  });

  it("should succesfully check keyblock (with same config 34)", async () => {
    const result = await liteClient.sendNewKeyBlock(
      deployer.getSender(),
      toNano(0.1),
      keyblock_2.block,
      keyblock_2.signatures,
      Buffer.from(keyblock_2_filehash, "hex"),
    );
    await liteClient.getValidators();

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      op: OpCodes.OP_NEW_KEYBLOCK,
      success: true,
    });

    expect(result.transactions).toHaveTransaction({
      from: liteClient.address,
      to: deployer.address,
      op: OpCodes.OP_NEW_KEYBLOCK_ANSWER,
      success: true,
    });
  });

  it("should check block 2", async () => {
    const result = await liteClient.sendCheckBlock(
      deployer.getSender(),
      toNano(0.1),
      block_2.block,
      block_2.signatures,
      Buffer.from(block_2_filehash, "hex"),
    );

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      op: OpCodes.OP_CHECKBLOCK,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: liteClient.address,
      to: deployer.address,
      op: OpCodes.OP_CHECKBLOCK_ANSWER,
      success: true,
    });
  });

  it("should succesfully check keyblock (with new config 34)", async () => {
    const result = await liteClient.sendNewKeyBlock(
      deployer.getSender(),
      toNano(0.1),
      keyblock_3.block,
      keyblock_3.signatures,
      Buffer.from(keyblock_3_filehash, "hex"),
    );
    await liteClient.getValidators();

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      op: OpCodes.OP_NEW_KEYBLOCK,
      success: true,
    });

    expect(result.transactions).toHaveTransaction({
      from: liteClient.address,
      to: deployer.address,
      op: OpCodes.OP_NEW_KEYBLOCK_ANSWER,
      success: true,
    });
  });

  it("should check block of new epoch", async () => {
    const result = await liteClient.sendCheckBlock(
      deployer.getSender(),
      toNano(0.1),
      block_3.block,
      block_3.signatures,
      Buffer.from(block_3_filehash, "hex"),
    );

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      op: OpCodes.OP_CHECKBLOCK,
      success: true,
    });
    expect(result.transactions).toHaveTransaction({
      from: liteClient.address,
      to: deployer.address,
      op: OpCodes.OP_CHECKBLOCK_ANSWER,
      success: true,
    });
  });

  it("should fail check block of old epoch", async () => {
    const result = await liteClient.sendCheckBlock(
      deployer.getSender(),
      toNano(0.1),
      block_1.block,
      block_1.signatures,
      Buffer.from(block_2_filehash, "hex"),
    );
    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      success: false,
      exitCode: 112,
    });
  });

  it("should fail op new_key_block with not keyblock", async () => {
    const result = await liteClient.sendNewKeyBlock(
      deployer.getSender(),
      toNano(0.1),
      block_2.block,
      block_2.signatures,
      Buffer.from(block_2_filehash, "hex"),
    );

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      success: false,
      exitCode: 118,
    });
  });

  it("parse fastnet block with no shards", async () => {
    const liteClient2 = blockchain.openContract(
      LiteClient.createFromConfig(
        {
          validators: keyblock_765944.epoch!.shortValidators,
          totalWeight: keyblock_765944.epoch!.totalWeight,
          validatorsHash: keyblock_765944.epoch!.validatorsHash,
        },
        code,
      ),
    );

    await liteClient2.sendDeploy(deployer.getSender(), toNano("0.05"));
    const result = await liteClient2.sendNewKeyBlock(
      deployer.getSender(),
      toNano(0.1),
      keyblock_850955.block,
      keyblock_850955.signatures,
      Buffer.from(
        "A9979387DE0A1508C2228DFB900EC34A1BAD161562ABB0E31E6ABE218E48E65F",
        "hex",
      ),
    );

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient2.address,
      success: true,
      exitCode: 0,
    });
  });
});
