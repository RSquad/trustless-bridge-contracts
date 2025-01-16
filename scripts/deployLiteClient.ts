import { compile, NetworkProvider } from "@ton/blueprint";
import { toNano } from "@ton/core";
import { LiteClient } from "../wrappers/LiteClient";

export async function run(provider: NetworkProvider) {
  const liteClient = provider.open(
    LiteClient.createFromConfig({}, await compile("LiteClient")),
  );

  await liteClient.sendDeploy(provider.sender(), toNano("0.05"));

  await provider.waitForDeploy(liteClient.address);
}
