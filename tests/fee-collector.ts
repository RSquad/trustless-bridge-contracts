import {
  Address,
  TransactionActionPhase,
  TransactionComputeVm,
  TransactionDescriptionGeneric,
  TransactionStoragePhase,
  fromNano,
} from "@ton/core";
import { BlockchainTransaction, SendMessageResult } from "@ton/sandbox";

export type Fees = {
  totalFees: bigint;
  gasFees: bigint;
  storageFees: bigint;
  msgFees: bigint;
  fwdFees: bigint;
  gasUsed: bigint;
};

type TransactionFees = {
  from: string;
  to: string;
} & Fees;

type TransactionChainFees = {
  summary: Fees;
  fees: TransactionFees[];
};

function mapTransactionFees(
  t: BlockchainTransaction,
  includeExternalTx: boolean = false,
): TransactionFees {
  const computePhase = (t.description as TransactionDescriptionGeneric)
    ?.computePhase as TransactionComputeVm;
  const storagePhase = (t.description as TransactionDescriptionGeneric)
    ?.storagePhase as TransactionStoragePhase;
  const actionPhase = (t.description as TransactionDescriptionGeneric)
    ?.actionPhase as TransactionActionPhase;

  // Don't include transaction with external inbound message if flag is not set.
  if (!t.parent && !includeExternalTx) {
    return {
      from: "nowhere",
      to: t.inMessage!.info.dest!.toString(),
      totalFees: 0n,
      gasFees: 0n,
      storageFees: 0n,
      msgFees: 0n,
      fwdFees: 0n,
      gasUsed: 0n,
    };
  }
  return {
    from: t.inMessage?.info.src?.toString() ?? "nowhere",
    to: t.inMessage?.info.dest?.toString() ?? "nowhere",
    totalFees: t.totalFees.coins,
    gasFees: computePhase.gasFees ?? 0n,
    storageFees: storagePhase.storageFeesCollected ?? 0n,
    msgFees: actionPhase?.totalActionFees ?? 0n,
    fwdFees: actionPhase?.totalFwdFees ?? 0n,
    gasUsed: computePhase.gasUsed ?? 0n,
  };
}

export function extractTransactionChainFees<T extends SendMessageResult>(
  result: T,
  includeExternalTx: boolean = false,
): TransactionChainFees {
  const fees = result.transactions.map((tx) =>
    mapTransactionFees(tx, includeExternalTx),
  );

  const summary = fees.reduce(
    (prev, tx) => {
      if (tx.gasFees === undefined) {
        return prev;
      }
      return {
        totalFees: prev.totalFees + tx.totalFees,
        gasFees: prev.gasFees + tx.gasFees,
        storageFees: prev.storageFees + tx.storageFees,
        msgFees: prev.msgFees + tx.msgFees,
        fwdFees: prev.fwdFees + tx.fwdFees,
        gasUsed: prev.gasUsed + tx.gasUsed,
      };
    },
    {
      totalFees: 0n,
      gasFees: 0n,
      storageFees: 0n,
      msgFees: 0n,
      fwdFees: 0n,
      gasUsed: 0n,
    },
  );
  return {
    summary,
    fees,
  };
}

function convertFeesToString(txFees: Fees) {
  const props = Object.keys(txFees);

  for (let i in props) {
    if (props[i] === "gasUsed" || props[i] === "to" || props[i] === "from")
      continue;
    Object.defineProperty(txFees, props[i], {
      value: fromNano(Object.getOwnPropertyDescriptor(txFees, props[i])?.value),
    });
  }
  return txFees;
}

export class FeeCollector {
  readonly testFees: Map<string, TransactionChainFees> = new Map<
    string,
    TransactionChainFees
  >();
  participants: Map<string, string>;
  showFeesPerTransaction: boolean;

  constructor(
    participants?: Map<string, string>,
    showFeesPerTransaction: boolean = false,
  ) {
    this.participants = participants ?? new Map<string, string>();
    this.showFeesPerTransaction = showFeesPerTransaction;
  }

  addParticipant = (address: Address, name: string) => {
    this.participants.set(address.toString(), name);
  };

  addTestFees = (
    result: SendMessageResult,
    description?: String,
    includeExternalTx: boolean = false,
  ) => {
    if (process.env.PRINT_FEES != "true") return;

    const fees = extractTransactionChainFees(result, includeExternalTx);
    convertFeesToString(fees.summary);
    fees.fees.map((f) => {
      convertFeesToString(f);
      f.from = this.getParticipantName(f.from);
      f.to = this.getParticipantName(f.to);
    }, this);
    this.testFees.set(
      expect.getState().currentTestName +
        (description ? ` (${description})` : ""),
      fees,
    );
  };

  getParticipantName = (address: string) => {
    return this.participants?.get(address) ?? address.slice(0, 20);
  };

  printTestFees = () => {
    if (process.env.PRINT_FEES == "true") {
      const summaries: ({ test: string } & Fees)[] = [];
      this.testFees.forEach((v, k) => {
        console.table(v.fees);
        summaries.push({
          test: k,
          ...v.summary,
        });
      });
      console.table(summaries);
    }
  };
}
