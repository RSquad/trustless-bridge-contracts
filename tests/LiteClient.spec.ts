import { compile } from "@ton/blueprint";
import {
  beginCell,
  BitString,
  Cell,
  Dictionary,
  Slice,
  toNano,
} from "@ton/core";
import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import "@ton/test-utils";
import { LiteClient, OpCodes } from "../wrappers/LiteClient";
import fs from "fs";
import path from "path";
import { extractEpoch, readByFileHash } from "./utils";

const initialKeyBlockFileHash =
  "330D95F071CE3DDEE65F7E5362B4F414B20CE7C34E786F8209C12A89C9E2E23D";
const newKeyBlockFileHash =
  "505EAD57915465165FEDC7B7D2BABD492BD4299263FD36FC87994947C4A68ED0";
const initBlockName = "init_block";
const newBlockName = "new_key_block";

const initialKeyBlock = readByFileHash(initBlockName, "cliexample");
const initEpoch = extractEpoch(initialKeyBlock);
const newKeyBlock = readByFileHash(newBlockName, "cliexample");
const newEpoch = extractEpoch(newKeyBlock);
const newKeyBlockSignatures = readByFileHash(
  initBlockName + "_sig",
  "cliexample",
);

describe("LiteClientCLI", () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile("LiteClient");
  });

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let liteClient: SandboxContract<LiteClient>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    liteClient = blockchain.openContract(
      LiteClient.createFromConfig(
        {
          validators: initEpoch.shortValidators,
          totalWeight: initEpoch.totalWeight,
          validatorsHash: initEpoch.validatorsHash,
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

  it("should check block", async () => {
    const result = await liteClient.sendCheckBlock(
      deployer.getSender(),
      toNano("10.05"),
      newKeyBlock,
      newKeyBlockSignatures,
      Buffer.from(newKeyBlockFileHash, "hex"),
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

  it("should succesfully check keyblock and update epoch", async () => {
    const result = await liteClient.sendNewKeyBlock(
      deployer.getSender(),
      toNano("10.05"),
      newKeyBlock,
      newKeyBlockSignatures,
      Buffer.from(newKeyBlockFileHash, "hex"),
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
});
