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
import sigs from "./keyblocks/signaturesA1DBB3C51BC30E32DB706C1B20FA2AB43A3E6639E3314DFB5C09360D7AF75C1E.json";

// describe("LiteClient", () => {
//   let code: Cell;

//   beforeAll(async () => {
//     code = await compile("LiteClient");
//   });

//   let blockchain: Blockchain;
//   let deployer: SandboxContract<TreasuryContract>;
//   let liteClient: SandboxContract<LiteClient>;

//   beforeEach(async () => {
//     blockchain = await Blockchain.create();

//     const initialKeyblock = readByFileHash(
//       "A1DBB3C51BC30E32DB706C1B20FA2AB43A3E6639E3314DFB5C09360D7AF75C1E",
//     );
//     const epoch = extractEpoch(initialKeyblock);

//     liteClient = blockchain.openContract(
//       LiteClient.createFromConfig(
//         { rootHash: epoch.rootHash, validators: epoch.validators! },
//         code,
//       ),
//     );

//     deployer = await blockchain.treasury("deployer");

//     const deployResult = await liteClient.sendDeploy(
//       deployer.getSender(),
//       toNano("0.05"),
//     );

//     expect(deployResult.transactions).toHaveTransaction({
//       from: deployer.address,
//       to: liteClient.address,
//       deploy: true,
//       success: true,
//     });
//   });

//   it.skip("should read block", async () => {
//     const secondKeyblock = readByFileHash(
//       "A1DBB3C51BC30E32DB706C1B20FA2AB43A3E6639E3314DFB5C09360D7AF75C1E",
//     );
//     const epoch = extractEpoch(secondKeyblock);
//     const signatures = Dictionary.empty<number, Cell>(
//       Dictionary.Keys.Uint(16),
//       Dictionary.Values.Cell(),
//     );
//     sigs.result.signatures.forEach((sig, index) => {
//       signatures.set(
//         index,
//         beginCell()
//           .storeBuffer(Buffer.from(sig.node_id_short, "base64"), 32)
//           .storeBuffer(Buffer.from(sig.signature, "base64"), 64)
//           .endCell(),
//       );
//     });

//     const result = await liteClient.sendNewKeyBlock(
//       deployer.getSender(),
//       toNano("10.05"),
//       secondKeyblock,
//       beginCell().storeDict(signatures).endCell(),
//       Buffer.from(
//         "A1DBB3C51BC30E32DB706C1B20FA2AB43A3E6639E3314DFB5C09360D7AF75C1E",
//         "hex",
//       ),
//     );
//     await liteClient.getValidators();

//     expect(result.transactions).toHaveTransaction({
//       from: deployer.address,
//       to: liteClient.address,
//       op: OpCodes.OP_NEW_KEYBLOCK,
//       success: true,
//     });

//     expect(result.transactions).toHaveTransaction({
//       from: liteClient.address,
//       to: deployer.address,
//       op: OpCodes.OP_NEW_KEYBLOCK_ANSWER,
//       success: true,
//     });
//   });
// });
