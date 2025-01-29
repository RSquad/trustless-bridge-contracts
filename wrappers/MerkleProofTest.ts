import { compile } from "@ton/blueprint";
import { beginCell, Cell, contractAddress, ContractProvider } from "@ton/core";
import { DeployableContract } from "./DeployableContract";

export class MerkleProofTest extends DeployableContract {
  constructor(init: { code: Cell; data: Cell }) {
    super(contractAddress(0, init), init);
  }

  static async create() {
    const data = beginCell().endCell();
    const code = await compile("MerkleProofTest");
    const init = { code, data };
    return new MerkleProofTest(init);
  }

  async getMerkleProofFindTx(
    provider: ContractProvider,
    txProof: Cell,
  ): Promise<Cell | null> {
    const result = await provider.get("get_merkle_proof_find_tx", [
      { type: "cell", cell: txProof },
    ]);
    return result.stack.readCellOpt();
  }
}
