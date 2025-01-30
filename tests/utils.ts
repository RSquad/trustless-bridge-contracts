import { beginCell, Builder, Cell, Dictionary, DictionaryValue, Slice } from "@ton/core";
import { loadConfigParamById, parseValidatorSet } from "@ton/ton";
import fs from "fs";
import path from "path";
import {sha256_sync} from "@ton/crypto";


function readPublicKey(slice: Slice) {
    // 8e81278a
    if (slice.loadUint(32) !== 0x8e81278a) {
        throw Error('Invalid config');
    }
    return slice.loadBuffer(32);
}

export const ValidatorDescriptionDictValue: DictionaryValue<{publicKey: Buffer, weight: bigint, adnlAddress: Buffer|null}> = {
    serialize(src: any, builder: Builder): void {
        throw Error("not implemented")
    },
    parse(src: Slice): {publicKey: Buffer, weight: bigint, adnlAddress: Buffer|null} {
        const header = src.loadUint(8);
        if (header === 0x53) {
            return {
                publicKey: readPublicKey(src),
                weight: src.loadUintBig(64),
                adnlAddress: null
            };
        } else if (header === 0x73) {
            return {
                publicKey: readPublicKey(src),
                weight: src.loadUintBig(64),
                adnlAddress: src.loadBuffer(32)
            };
        } else {
            throw Error('Invalid config');
        }
    }
}

export const readByFileHash = (fileHash: string, dir = "keyblocks") => {
  const bufBoc = fs.readFileSync(
    path.resolve(__dirname, `${dir}/${fileHash}.boc`),
  );
  return Cell.fromBoc(bufBoc)[0];
};

export const extractEpoch = (cell: Cell) => {
  const slice = cell.beginParse();

  const magic = slice.loadUint(32);
  if (magic !== 0x11ef55aa) {
    throw Error("not a Block");
  }
  const globalId = slice.loadUint(32);
  const info = slice.loadRef();
  const valueFlow = slice.loadRef();
  const stateUpdate = slice.loadRef();
  const extra = slice.loadRef();
  const extraS = extra!.beginParse();

  extraS.loadRef();
  extraS.loadRef();
  extraS.loadRef();
  const custom = extraS.loadRef();

  const customSlice = custom.beginParse();
  const customMagic = customSlice.loadUint(16);
  if (customMagic !== 0xcca5) {
    console.log("customMagic", customMagic.toString(16))
    throw Error("not a McBlockExtra");
  }
  const isKeyBlock = customSlice.loadUint(1);
  // easier take last cell
  if (!isKeyBlock) {
    throw Error("not a keyblock");
  }
  
  customSlice.loadRef();
  customSlice.loadRef();
  customSlice.loadRef();
  const config = customSlice.loadRef();
  const configSlice = config.beginParse();

  const dict = configSlice.loadDictDirect(Dictionary.Keys.BigInt(32), Dictionary.Values.Cell());
  const validators = dict.get(34n);
  const liteClientEpochDict = Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.BigInt(64));
  let totalWeight = 0n;
  let validatorsHash = Buffer.alloc(32);
  if (validators) {
    const valSlice = validators.beginParse();
    const valsType = valSlice.loadUint(8);
    const utimeSince = valSlice.loadUint(32);
    const utimeUntil = valSlice.loadUint(32);
    const total = valSlice.loadUint(16);
    const main = valSlice.loadUint(16);
    if (total < main) {
        throw Error("total < main");
    }
    if (main < 1) {
        throw Error("main < 1");
    }
    const totalWeight = valSlice.loadUintBig(64);
    // 64 + 16 + 16 + 32 + 32 + 8 = 192
    // console.log('weight', weight, total, main);
    const validatosCell = valSlice.preloadRef();
    validatorsHash = validatosCell.hash(3);
    const validatorsList = valSlice.loadDict(Dictionary.Keys.Uint(16), ValidatorDescriptionDictValue);
    

    console.log({
        valsType, utimeSince, utimeUntil, total, main, totalWeight
    })

    // console.log("FULL LIST:");
    // console.log(validatorsList.values());
    const vals = validatorsList.values().filter((v, i) => i < main).map(v => ({
      publicKey: v.publicKey,
      weight: v.weight
    }));

    console.log("MAIN LIST:");
    console.log(vals);
    
    vals.forEach(v => {
      liteClientEpochDict.set(Buffer.from(v.publicKey), v.weight);
    })

  }
  return {rootHash: cell.hash(0), validators: validators, shortValidators: liteClientEpochDict, totalWeight, validatorsHash};
};
