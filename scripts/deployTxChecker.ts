import { toNano } from '@ton/core';
import { TxChecker } from '../wrappers/TxChecker';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const txChecker = provider.open(TxChecker.createFromConfig({}, await compile('TxChecker')));

    await txChecker.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(txChecker.address);

    // run methods on `txChecker`
}
