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
import { LiteClient } from "../wrappers/LiteClient";
import fs from "fs";
import path from "path";
import { extractEpoch, readByFileHash } from "./utils";
import sigs from "./keyblocks/signaturesA1DBB3C51BC30E32DB706C1B20FA2AB43A3E6639E3314DFB5C09360D7AF75C1E.json";

describe("LiteClient", () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile("LiteClient");
  });

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let liteClient: SandboxContract<LiteClient>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    const initialKeyblock = readByFileHash(
      "A1DBB3C51BC30E32DB706C1B20FA2AB43A3E6639E3314DFB5C09360D7AF75C1E",
    );
    const epoch = extractEpoch(initialKeyblock);

    liteClient = blockchain.openContract(
      LiteClient.createFromConfig(
        { rootHash: epoch.rootHash, validators: epoch.validators! },
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

  it("should read block", async () => {
    const secondKeyblock = readByFileHash(
      "1345DCE991E8B6D99A75A63F1A4A962215A3196B90CD5D28A14C14EB594CDB77",
    );
    const epoch = extractEpoch(secondKeyblock);
    const signatures = Dictionary.empty<number, Cell>(
      Dictionary.Keys.Uint(16),
      Dictionary.Values.Cell(),
    );
    sigs.result.signatures.forEach((sig, index) => {
      console.log(Buffer.from(sig.node_id_short, "base64").toString("hex"));
      signatures.set(
        index,
        beginCell()
          .storeBuffer(Buffer.from(sig.node_id_short, "base64"), 32)
          .storeBuffer(Buffer.from(sig.signature, "base64"), 64)
          .endCell(),
      );
    });

    const result = await liteClient.sendNewKeyBlock(
      deployer.getSender(),
      toNano("10.05"),
      secondKeyblock,
      beginCell().storeDict(signatures).endCell(),
    );

    // console.log(result.transactions.map((x) => x.vmLogs));

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: liteClient.address,
      success: true,
    });
    // console.log(initialKeyblock);
    // const keyblockFileHash =
    //   "1345DCE991E8B6D99A75A63F1A4A962215A3196B90CD5D28A14C14EB594CDB77";

    // let bufBoc = fs.readFileSync(
    //   path.resolve(
    //     __dirname,
    //     `keyblocks/${keyblockFileHash.toUpperCase()}.boc`,
    //   ),
    // );

    // const fileHash = "fake_block";
    // let bufBoc = fs.readFileSync(
    //   path.resolve(__dirname, `${fileHash.toUpperCase()}.boc`),
    // );
    // let cell = Cell.fromBoc(bufBoc)[0];
    // const rootHash = cell.hash().toString("hex").toUpperCase();
    // 656F80236B11C24F2A308BB87AE7B8451017B4737BB98FB8473A8FC6F87B59E8
    // 45880602109506549274537014871681591099759462326937571943059192132250585749992

    // E329C1A53A60785CF7FAA5D1E659812E928DA48B7AB35D1FD3151178EC24410E
    // 102748793849641313019215166757466598687531865212291872693182978807228996534542
    // console.log(rootHash);
    // console.log(cell.isExotic);
    // console.log(cell.bits.subbuffer(0, cell.bits.length - 80)!.toString('hex'))
    // console.log(cell.bits.subbuffer(
    //   cell.bits.length - 80,
    //   16,
    // )?.toString('hex'))
    // console.log(cell.bits.subbuffer(cell.bits.length - 80 + 16, 80 - 16)?.toString('hex'))

    // console.log(cell.bits.subbuffer(0, cell.bits.length)!.toString('hex'));

    // const bits = new BitString(
    //   Buffer.concat([
    //     cell.bits.subbuffer(0, cell.bits.length - 80)!,
    //     Buffer.alloc(2, 'a'),
    //     cell.bits.subbuffer(cell.bits.length - 80 + 16, 80 - 16)!,
    //   ]),
    //   0,
    //   cell.bits.length,
    // );

    // const modifiedBlockCell = beginCell()
    //   .storeBits(cell.bits)

    //   .storeRef(cell.refs[0])
    //   .endCell({ exotic: true });

    // console.log(cell);
    // console.log(modifiedBlockCell);

    // const result = await liteClient.sendNewKeyBlock(
    //   deployer.getSender(),
    //   toNano("10.05"),
    //   cell,
    // );

    // console.log(result.transactions.map((x) => x.vmLogs));
    // expect(result.transactions).toHaveTransaction({
    //   from: deployer.address,
    //   to: liteClient.address,
    //   success: true,
    // });

    // const blockName = "block";

    // bufBoc = fs.readFileSync(path.resolve(__dirname, `${blockName}.boc`));

    // cell = Cell.fromBoc(bufBoc)[0];
    // console.log("origin hash:", cell.hash().toString("hex").toUpperCase());

    // const prunnedBlockName = "block_proof";

    // bufBoc = fs.readFileSync(
    //   path.resolve(__dirname, `${prunnedBlockName}.boc`),
    // );

    // cell = Cell.fromBoc(bufBoc)[0];
    // console.log(cell.refs.length);
    // console.log(cell.refs[0].hash().toString("hex").toUpperCase());

    // console.log(cell.level(), "ref", cell.refs[0].level());
    // for (let i = 0; i < 10; i++) {
    //   console.log(cell.refs[0].hash(i).toString("hex").toUpperCase(), i);
    // }

    // const result = await liteClient.sendNewKeyBlock(
    //   deployer.getSender(),
    //   toNano("10.05"),
    //   cell,
    //   // modifiedBlockCell,
    // );
  });

  // it("should deploy", async () => {
  //   const fileHash =
  //     "84AC209CED677BFC7461731B0083DC4E3BAF4C01175809179D1F48039820B30D";
  //   const bufBoc = fs.readFileSync(
  //     path.resolve(__dirname, `${fileHash.toUpperCase()}.boc`),
  //   );
  //   const cell = Cell.fromBoc(bufBoc)[0];
  //   const rootHash = cell.hash().toString("hex").toUpperCase();
  //   expect(rootHash).toBe(
  //     "E0F0875B779F63ADFE92D12FCC50E5E7E166B055EA0C575C0E22D83F0036D651",
  //   );

  //   function createPrunnedBranchCell(cell: Cell) {
  //     const slice = beginCell()
  //       .storeUint(1, 8)
  //       .storeUint(1, 8)
  //       .storeBuffer(cell.hash())
  //       .storeUint(cell.depth(), 16)
  //       .endCell();

  //     const testCell = new Cell({
  //       exotic: true,
  //       bits: slice.bits,
  //     });

  //     return testCell;
  //   }

  //   const testRef = cell.beginParse().loadRef();
  //   console.log(testRef.hash().toString("hex"));
  //   const prunedTest = createPrunnedBranchCell(testRef);
  //   console.log(prunedTest.hash().toString("hex"));

  //   const slice_block = cell.beginParse();

  //   const modifiedBlockCell = beginCell()
  //   .storeBits(cell.bits)
  //   .storeRef(createPrunnedBranchCell(slice_block.loadRef()))
  //   .storeRef(createPrunnedBranchCell(slice_block.loadRef()))
  //   .storeRef(createPrunnedBranchCell(slice_block.loadRef()))
  //   .storeRef(slice_block.loadRef())

  //   .endCell();

  //   console.log(cell.hash().toString("hex"));
  //   console.log(modifiedBlockCell.hash().toString("hex"));
  //   console.log(cell.depth(), modifiedBlockCell.depth());

  //   const s = cell.beginParse()
  //   s.loadRef();
  //   s.loadRef()
  //   s.loadRef()
  //   const extra = s.loadRef().beginParse();
  //   const tag = extra.loadUint(32);
  //   console.log("tag", tag, tag === 0x4a33f6fd);
  //   const isKeyBlock = extra.loadUint(1)
  //   console.log(isKeyBlock, extra.remainingRefs);
  //   if (isKeyBlock || true) {
  //     // shard_hashes:ShardHashes
  //     extra.loadRef();
  //     // shard_fees:ShardFees
  //     extra.loadRef();
  //     // prev_blk_signatures
  //     let maybeConfig = extra.loadRef();
  //     console.log(maybeConfig);
  //     if (extra.remainingRefs > 0) {
  //       console.log('has config')
  //       maybeConfig = extra.loadRef();
  //     }
  //     console.log(maybeConfig);
  //   }

  //   const result = await liteClient.sendNewKeyBlock(
  //     deployer.getSender(),
  //     toNano("10.05"),
  //     cell
  //     // modifiedBlockCell,
  //   );

  //   console.log(result.transactions.map((x) => x.vmLogs));

  //   // expect(result.transactions).toHaveTransaction({
  //   //   from: deployer.address,
  //   //   to: liteClient.address,
  //   //   success: true,
  //   // });
  // });

  // it("should read block", async () => {
  //   const fileHash =
  //     "block_proof";
  //   const bufBoc = fs.readFileSync(
  //     path.resolve(__dirname, `${fileHash.toUpperCase()}.boc`),
  //   );
  //   const cell = Cell.fromBoc(bufBoc)[0];

  //   const result = await liteClient.sendNewKeyBlock(
  //     deployer.getSender(),
  //     toNano("10.05"),
  //     cell
  //     // modifiedBlockCell,
  //   );

  //   console.log(result.transactions.map((x) => x.vmLogs));

  //   expect(result.transactions).toHaveTransaction({
  //     from: deployer.address,
  //     to: liteClient.address,
  //     success: true,
  //   });
  // });
});

/*
keyblock: 7B0584A95FB4AAB5BE172FEF94F18027B5D0448637814DD23BFCB50E72C938EA
some block: 47EE0A5A2B53B5331884023517B383B146BE9FA0296B34780A3EAE0ABEB258E2
last keyblock: CA97EB92E0E3399D6B66600F1804751E841B30C43DD365D6BB23C583A79D14D8

initial keyblock: E32DD9BCBE279845FCCA4FCF1B459A539550CE399340535F314CC4F13CE03A92 1345DCE991E8B6D99A75A63F1A4A962215A3196B90CD5D28A14C14EB594CDB77
keyblock for sub:7FF80DFA84E8BE71E09B279E5F99CFD6F05DA0977BF9A4F16E3AEBAE9DAE9447  A1DBB3C51BC30E32DB706C1B20FA2AB43A3E6639E3314DFB5C09360D7AF75C1E

*/

/**
 *
 * test ideas: 1. 100 bits skip, change something (меняем хэш)
 * упасть должен XCTOS а не проверка
 * 2. поменять что-то в самом пруфе.
 */
