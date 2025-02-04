import { compile, NetworkProvider } from "@ton/blueprint";
import { Dictionary, toNano } from "@ton/core";
import { LiteClient } from "../wrappers/LiteClient";

export async function run(provider: NetworkProvider) {
  const liteClient = provider.open(
    LiteClient.createFromConfig({
      totalWeight: 0n,
      validatorsHash: Buffer.alloc(32),
      validators: Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.BigInt(64)),
    }, await compile("LiteClient")),
  );

  await liteClient.sendDeploy(provider.sender(), toNano("0.05"));

  await provider.waitForDeploy(liteClient.address);
}
