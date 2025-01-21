import { compile } from "@ton/blueprint";
import { beginCell, BitString, Cell, Slice, toNano } from "@ton/core";
import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import "@ton/test-utils";
import { LiteClient } from "../wrappers/LiteClient";
import fs from "fs";
import path from "path";

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

    liteClient = blockchain.openContract(LiteClient.createFromConfig({}, code));

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

  it("should deploy", async () => {
    const fileHash =
      "84AC209CED677BFC7461731B0083DC4E3BAF4C01175809179D1F48039820B30D";
    const bufBoc = fs.readFileSync(
      path.resolve(__dirname, `${fileHash.toUpperCase()}.boc`),
    );
    const cell = Cell.fromBoc(bufBoc)[0];
    const rootHash = cell.hash().toString("hex").toUpperCase();
    expect(rootHash).toBe(
      "E0F0875B779F63ADFE92D12FCC50E5E7E166B055EA0C575C0E22D83F0036D651",
    );

    function createPrunnedBranchCell(cell: Cell) {
      const slice = beginCell()
        .storeUint(1, 8)
        .storeUint(1, 8)
        .storeBuffer(cell.hash())
        .storeUint(cell.depth(), 16)
        .endCell();

      const testCell = new Cell({
        exotic: true,
        bits: slice.bits,
      });

      return testCell;
    }

    const testRef = cell.beginParse().loadRef();
    console.log(testRef.hash().toString("hex"));
    const prunedTest = createPrunnedBranchCell(testRef);
    console.log(prunedTest.hash().toString("hex"));


    const slice_block = cell.beginParse();
    
    const modifiedBlockCell = beginCell()
    .storeBits(cell.bits)
    .storeRef(createPrunnedBranchCell(slice_block.loadRef()))
    .storeRef(createPrunnedBranchCell(slice_block.loadRef()))
    .storeRef(createPrunnedBranchCell(slice_block.loadRef()))
    .storeRef(slice_block.loadRef())

    .endCell();

    console.log(cell.hash().toString("hex"));
    console.log(modifiedBlockCell.hash().toString("hex"));
    console.log(cell.depth(), modifiedBlockCell.depth());

    const s = cell.beginParse()
    s.loadRef();
    s.loadRef()
    s.loadRef()
    const extra = s.loadRef().beginParse();
    const tag = extra.loadUint(32);
    console.log("tag", tag, tag === 0x4a33f6fd);
    console.log(extra.loadUint(1));



    const result = await liteClient.sendNewKeyBlock(
      deployer.getSender(),
      toNano("10.05"),
      cell
      // modifiedBlockCell,
    );

    console.log(result.transactions.map((x) => x.vmLogs));

    // expect(result.transactions).toHaveTransaction({
    //   from: deployer.address,
    //   to: liteClient.address,
    //   success: true,
    // });
  });
});
