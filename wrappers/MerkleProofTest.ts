import { compile } from "@ton/blueprint";
import {
  beginCell,
  Cell,
  contractAddress,
} from "@ton/core";
import { DeployableContract } from "./DeployableContract";

export class MerkleProofTest extends DeployableContract {
    constructor(
        init: { code: Cell; data: Cell },
    ) { 
        super(contractAddress(0, init), init)
    }

    static async create() {
        const data = beginCell().endCell();
        const code = await compile("MerkleProofTest");
        const init = { code, data };
        return new MerkleProofTest(init);
    }

}
