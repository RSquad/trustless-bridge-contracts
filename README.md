# Trustless Bridge Contracts

**This repository contains the smart contracts for the [TON Trustless Bridge Challenge](https://contest.com/docs/TrustlessBridgeChallenge).**  
It includes the **LiteClient** and **TxChecker** contracts, plus any supporting logic.

## Prerequisites

It is highly recommended to install the **Trustless Bridge CLI** for convenient interaction with these contracts https://github.com/RSquad/trustless-bridge-cli. The CLI documentation explains how to send transactions, deploy contracts, and more.

## Overview

This repository provides two main contracts.

### LiteClient

#### Storage

```
[
   g::total_weight: uint64
   g::epoch_hash:  uint256
   g::validators: (Hashmap 256 uint64)
] = State;
```

#### Supported Messages

1. `new_key_block#11a78ffe query_id:uint64 block:^Cell signatures:^Cell = InternalMsgBody;` — This operation processes a new key block, verifying its validity and signatures, updating the epoch parameters, and confirming with an `ok#ff8ff4e1 query_id:uint64 block_hash:uint256 = InternalMsgBody;` message if successful or bounce otherwise.

```
new_key_block#11a78ffe
query_id:uint64
block:^ [
  file_hash:uint256
  block_proof:^Cell
]
signatures:^Cell
 = InternalMsgBody;
```

2. `check_block#8eaa9d76 query_id:uint64 block:^Cell signatures:^Cell = InternalMsgBody` — This operation verifies that a block is correctly signed and corresponds to the current epoch, responding with a `correct#ce02b807 query_id:uint64 block_hash:uint256 = InternalMsgBody` message if valid or bounce otherwise.

```
check_block#8eaa9d76
query_id:uint64
block:^ [
  file_hash:uint256
  pruned_block:^Cell
]
signatures:^Cell
 = InternalMsgBody;
```

#### Getters

```
;; returns dictionary, which contains main validators
cell get_validators() method_id

;; returns contract storage
(cell, int, int) get_storage() method_id
```

### TxChecker

#### State

1. `check_transaction#8eaa9d76 query_id:uint64 block:^Cell transaction_proof:^Cell = InternalMsgBody` — This operation verifies a transaction using a proof and the current block. It interacts with the LiteClient to validate the block's authenticity. The contract responds with `transaction_checked#756adff1 transaction:^Cell = InternalMsgBody` upon successful verification and bounce upon failure.

```
check_transaction#91d555f7
  transaction:^[tx_hash:uint256 account_addr:uint256 tx_lt:uint64]
  proof:^(MerkleProof Transaction)
  current_block:^[
     block:^[file_hash:uint256 pruned_block:^Cell]
     signatures:^Cell
  ]
= InternalMsgBody;
```

## Deployment

Use Trustless Bridge CLI command to deploy all contracts:

```bash
trustless-bridge-cli deploy all -s 595933 --network testnet --config .cfg.yaml
```

- This command requires a seqno from the masterchain block of the opposite network.
- The script will fetch the last key block before the provided seqno (if the given block is not itself a key block) and deploy the contracts using that block as the trusted starting block.

### Trusted Setup

We need an initial reference point (the trusted block). The CLI:

1. Determines the validator set active at that block.
2. Stores them as the current epoch.

Later, the epoch can be updated by sending `new_key_block#11a78ffe` with signatures from the current validators.

## Important Contest Related Points

1. **Interface Changes**  
   Wherever `block:^Cell` was expected, we now send `file_hash:uint256 pruned_block:^Cell`, and wherever `current_block:^Cell` was used, it is now `block:^Cell signatures:^Cell`. This is required to ensure verifiable proofs for blocks with file hash.

2. **Block Pruning**

   - **Key blocks**: only the branch up to `config 34` is retained. If the config is not updated relative to the current epoch, the block is rejected.
   - **checkBlock**: everything except `block_info` is pruned (only the minimal needed for verification is kept).

3. **Transaction Pruning**  
   Transactions are also pruned. We rely on an account-level block proof (from the masterchain down to the transaction).

4. **Signature Optimization**  
   We only include the minimal subset of validators whose combined weights are sufficient to verify the block, specifically ≥ 2/3 of the total weight, rather than including all validators. Ideally, we would further optimize this by defining a getter that maintains an ordered list of public keys and removing the dictionary structure from the signatures. This would involve creating a singly linked list of signatures, pre-sorted off-chain, which would significantly reduce the verification cost. However, due to the contest requirements, `signatures is a hashmap` — we have retained the hashmap where the key is the public key and the value is the signature. Nonetheless, it is possible to eliminate the public key and the dictionary structure altogether.

5. **Why We Don't Store Verified Blocks**  
   In a production environment, storing verified blocks could be beneficial, especially when dealing with older blocks and shard blocks that require Merkle proofs. However, according to the challenge requirements, only the current epoch blocks from the masterchain need verification. Therefore, storing already verified blocks is unnecessary. The overhead of deploying and checking the existence of a stored block is significantly higher than directly verifying signatures. In the basic scenario, we simply verify signatures, which is always efficient, especially given the small number of signatures required. In contrast, storing verified blocks would involve:

   - Sending two additional messages: one to calculate the address of the stored block and another to send a message to it, receiving either an acknowledgment or a bounce.

   - The cost of initially deploying the storage contract, which would require leaving at least 0.001 TON, equivalent to a full verification operation.

   - Additional storage for the contract code and other related overheads.

   As a result, the overhead of storing contracts is significantly higher than direct signature verification. If a block is used only once (and without shard block proofs, reuse for different transactions is nearly zero due to the block generation speed), direct verification involves checking the minimum number of signatures for a quorum. In contrast, storing involves the same signature verification plus deployment costs, deployment messages, and two additional messages for initial verification, among other overheads. This approach is almost twice as expensive. Given that blocks are not reused, we opted for verification without storage.

## Gas Efficiency

![img](gas.png)

## Example Workflow

### TON FASTNET

LiteClient: Ef_cmIsszQinqjDnK4LIib3vSBE8Zhf-ytgRJDGispoD-Et5

TxChecker: Ef8zZWfeh22ib982EIgo_FZM0n2Iym1WHFBRBA_H7BEfsoMK

### TON TESTNET

LiteClient: EQBGWoImJJ8Uw4Lz0b2yXjpOf31awQfXHJthrYB4zppnL3c1

TxChecker: EQCEILr1N8ey9Ar-9OtnCq8A4v217lsE0pJuEZgrZOStAVVa

Transaction history with demonstration of successful and unsuccessful checks of blocks and transactions:
[testcases.md](https://github.com/RSquad/trustless-bridge-cli/blob/master/testcases.md)

## Project structure

- `contracts` - source code of all the smart contracts of the project and their dependencies.
- `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
- `tests` - tests for the contracts.
- `scripts` - scripts used by the project, mainly the deployment scripts.

## Running Tests

`npx blueprint test` or `yarn blueprint test`
