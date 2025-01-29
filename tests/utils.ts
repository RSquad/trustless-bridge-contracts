import { Builder, Cell, Dictionary, DictionaryValue, Slice } from "@ton/core";
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

const ValidatorDescriptionDictValue: DictionaryValue<{publicKey: Buffer, weight: bigint, adnlAddress: Buffer|null}> = {
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

export const readByFileHash = (fileHash: string) => {
  const bufBoc = fs.readFileSync(
    path.resolve(__dirname, `keyblocks/${fileHash.toUpperCase()}.boc`),
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
  const validators = dict.get(32n);
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
    const weight = valSlice.loadUintBig(64);
    // 64 + 16 + 16 + 32 + 32 + 8 = 192
    // console.log('weight', weight, total, main);
    const validatorsList = valSlice.loadDict(Dictionary.Keys.Uint(16), ValidatorDescriptionDictValue);

    console.log({
        valsType, utimeSince, utimeUntil, total, main, weight
    })

    console.log(validatorsList.values().map(v =>  {
      let pk = new Uint8Array(36);
    pk.set([0xc6, 0xb4, 0x13, 0x48], 0);
    pk.set(v.publicKey, 4);
    
    return sha256_sync(Buffer.from(pk)).toString('hex');
    }));
  }
  return {rootHash: cell.hash(0), validators: validators};
};
