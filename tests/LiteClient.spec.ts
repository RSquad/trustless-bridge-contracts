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

const signatures = [
  {
    "@type": "blocks.signature",
    "node_id_short": "rA3beStFvctuyK3SEb5uzDLixwgUwlxyZZbCocWFQ+Q=",
    "signature":
      "5XQoFMuPsSbezamOCddJnbsWT6K7sQQwp7ZE2njSJNLDChuI/8rS7PpDrbZ4sAWLqpqA61FR2BwZd8tXL83KDQ==",
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "ZjvzAa+kkXqiNquiRkn5eO69q31IXyA2kIatYi6ZTuY=",
    "signature":
      "TzQza2rW3puHU9G1Ne6LvsydvMWs7TwnVFF23pBAVkymk+kte4XZu1d2H4aZspXjFkBLHptOM/L+suat4aZyCQ==",
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "OLf4rToLxLCdhBDqOPgs9BNgD7CcboyFLSYrrA/03qk=",
    "signature":
      "B4CBpOpKhIlD9WOsj+6xPBIMlgrvso7GBx9wYSHZE3FzLbXR9DOnRFGR7QfV9hN9R+YTN9U7LBNgjJgN5HKhCA==",
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "IkJFgJSXeSiZoIRo9eax09XOtTliLa/QA1oGT6ZdCXs=",
    "signature":
      "v7QD9Cd3oO7YWa3Xv5BlyeosoqQ7Mrj1d/hdrSgeSLEYgGV0lo56jZcW16XBiItzEQfLdy9XgLYwnO56YN3GCA==",
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "ToRyu1aNWLsHM9v/lUidWmAcnpgQYlhd9dW4LYDt8Pk=",
    "signature":
      "Lum0eo6X+iIOb7W/l6jByO4KG71eglzaFzIfLOjFSJl5c3QkowWakE1P0Roe8Jn9VrRuVKW7eENc2Wvh008hBg==",
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "NNIcbDtjNyU+8ud/IfP2QMzesHdkNLRrn3igDFEAIMw=",
    "signature":
      "1AEI6DBzFlajhWCWm/WvHtyzTMcrgqvdTq4H+63IeZo7TcRLAgQndCC2USYSJDUli7XSAH51xdV+rem7HIZJAg==",
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "RKgYsMQxLY96UO+/W89WCw70n+wISrYvJvFC+fZnMak=",
    "signature":
      "aRmItpSUjjJidl0gxi4s5JbzaQz8S+J5AjCHrSRwdI4khwazzysXIagMzQ9j/t6O76X+8s05W2ruPM+8d0aEBA==",
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "np8C/S5WnZg4i2UKHXlao0EwcvxPOlponNOTUsrUeOw=",
    "signature":
      "Q/V/eaTvdxMluOd9YteeEeqbncw2BkKtd1QB/eDC6mxpbjl4P+JtADnSmbfmM/q07DV2/IPM7CucgZruAbo3Dw==",
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "cQrBlm1swaO7+pCc76trHa38zdIEjEmNaJkG82Xz+yk=",
    "signature":
      "p9scvv62Sc0DuYT3JTEziBNWRZbMc4exfrOiY5pAEa0MZ08H8+N6ReBgk498Me3hxJ2DZriwPKP71bztAe9OAQ==",
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "qplKVFBD/HHKprm/8CQjDwz29USNRQHK4lKnoNddEPs=",
    "signature":
      "8yCbBerlYDGKmgZBXCYKQklzUoBoW0ZvwaOg6+5GJDM7UbjiX5X0v9MRlhWjbSzNe++Ika83MHz9nvdlUp9/BA==",
  },
];

const signatures2 = [
  {
    "@type": "blocks.signature",
    "node_id_short": "F4JPinIv86hrCCh7gyg0sMxu8KqLnQsNSwfqMIigzRk=",
    "signature": "P/oyggVobPsnpNfDUlfgQpmNBc9dEaGyV5NEp7Ie6KTea/PvPkNSaXvQ9LqU6XdKKslJnVLCzqps7MayFglYBQ=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "oKHJ2f3twYaXYWvnCaEgvp5E7QrD6PCHzBMGyJaAYFU=",
    "signature": "1k40Dis90zMSCLGRznAyhEdBduZrNX1tpDzHSOMueOgko0No3Lk7MXDeTm2Oujx1dVKa3jJfByhhdZ2lZXdnBQ=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "6MLYtFyNNSTAG8OR/LBfwLzlijvxKWCkTz83QwZL3jo=",
    "signature": "yURIhvmZm84kniwU18oVG4OXnAwoXL9gtONInGHyP+0i+86y742Eoo3xpUSeuYP7DsQadeq7ZIAID783/ryzBA=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "/9QbEJhuA1sKNihK3Z2M4gheEnOWQIFP2r+GCLiMRYM=",
    "signature": "JSp2OR6E8Ndhlmu1KSi0DHz5SjMdysUWO2loRlxnZJkf6fzYVGM38jwk1k60nHfgG7yeo2IUOCXUr6grgSWICA=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "UveeEiVleWWuV39I/FaRWSUABv7rLe9ndBl5xcdLOp8=",
    "signature": "smIsvUfiFTmLz+TuysQxJ+wfOoDxPMC7TBctfJ7KGgAdUBDJS0jUu2x9hUnwzoxnUW71ugfAm+atWmbr4FRbDw=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "EsNP2gtxDaVc3a+51P8ORIAAksV/s/l24UuQ7+F/nuU=",
    "signature": "nlxHpMyfWoa9cXzkmM3zp2kpPZh7QPELDyyKP719LCGQFRwtRnftLydUc1QcWbY1ef3DFqimTbRTkANimFdkDQ=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "7N6BhCVW4lLbZm/i0GqtRhVmCAuGn61FO36JF4NfWoM=",
    "signature": "TL+9xxGBSAAEK+s63nNTAD6T01keHGvg1izSYvlyNgPHIIVosQA3GeTkLjBsabmhjie02HObamzXCZAmE506Dw=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "7yrSE1/IpNxFc7L2vbUNTnDRGxx7KSpShAYaPECUkX0=",
    "signature": "AbQJhkoPXwU/XbJIJDdKLDznKBhFGmXYcNR1IFm4dtPnlvp4Gqbm/YvNA2a3YJLFhW0bDOtxlgymRqhtLph/AA=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "pde/zTajMjTwqc+vzi/lwfBncbDMizvDE1TqAT9z15I=",
    "signature": "bVV5xp7stFztLyX51laZxsmes1+2nlo9qWDlOSqxG+P9gy/xyn85w5pnw2XvUk+gzQA6JdZsPxfcvy9VdrcEAA=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "Kz3orXRWtT0tIg9L7Is4bn6QOnf85GniVciKR1Oc8fc=",
    "signature": "1xcKk2qlD0lHy440QxHnNIAjN5DuBX5wbd7aae1EN9WQ8TU3jhpLjeAVRNMvaKgP8iZtEAnlp0mWTxlfd2bkDA=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "HncLJSfiGwMy06oYx9Ge3WiSCZcpTlNawCC44q/Bbao=",
    "signature": "yIqDFMxh8kDujNGzranMTbMUkPMKy04pTr2u2zS5o/ofeqvKOf0o1WJ0A+X0ykbu8dP1/0J8o4R0FxCtD6MHCw=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "+Vq49ne9rN1pKXn/cZVNyC7ic1WXIZhLe3JXGWg+OFc=",
    "signature": "fMXX3w6EiJYNxz2x4kK7qumluIY43EkyTtP3w41PVQZKjOn9YeiN/DA2UsoMajWhOjWnbHeVVOVBwxeqdtbsCg=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "kwlsFZrkTMCPA2EvRIpPaoT7rl5+BSg2xY+0TFTYNds=",
    "signature": "LkqLLOCtVHgqd93jmIPIIdipybmIMX8N+/rxD3oBdaU1i2w5r+ZFfsn3sTIAU3/vIu+F/PownVlNiEXLZZriAg=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "nQo6lByYVhml865djCTZ5NINewpaynfw4WBBVLP0PvQ=",
    "signature": "wK2R+pECC3XjTo4LIjHdUrFNVhhAVC4PxLfUiF4JbeYbtVlN+deyfMhagmELR0l8j2TU+Djam/KWcUu3qYBGBg=="
  },
  {
    "@type": "blocks.signature",
    "node_id_short": "R/Hi932OqOLjcb53ylUckDIiuKUI8AhoKubPjSgQWWM=",
    "signature": "gRPku4MiY1v5iZp2Pq1qWYzO4yKc5FDt0H83f0POb1p6q4/6PwMXvmeiTLvwKqWlsY0XnCkXDBnsdtck7XNgBA=="
  }
];

function readLocalBoc(name: string, pruned = true) {
  const block = readByFileHash(pruned ? name + '_pruned' : name, "cliexample");
  const epoch = extractEpoch(block, 34, pruned);
  const signatures = readByFileHash(name + "_sig", "cliexample");

  return { block, epoch, signatures };
}

const block = readByFileHash("pruned_test", "cliexample");

const keyblock_1 = readLocalBoc("1_keyblock");
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

  it.skip("should check block", async () => {
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

  it.skip("should check another block", async () => {
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

  it.skip("should check block if config 34 not changed", async () => {
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

  it.skip("should check block 2", async () => {
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
});
