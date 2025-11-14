import { Schema, model } from 'mongoose'

export interface ITransaction {
  flContractAddress: string
  flWalletAddress: string
  pairAddress: string
  amountIn: string
  amountOut: string
  amountInUsd: number
  amountOutUsd: number
  tokenIn: {
    address: string
    symbol: string
    decimals: number
  }
  tokenOut: {
    address: string
    symbol: string
    decimals: number
  }
  blockNumber: number
  txHash: string
  timestamp: Date
  gasPrice: number
  gasUsed: number
  gasFees: number
  fees: {
    tokenAddress: string
    amount: string
    amountInUsd: number
    sender: string
    recipient: string
  }
  txType: string
  recipient: string
  txUrl: string
  tokenPrice: number
}

const TransactionSchema = new Schema<ITransaction>(
  {
    flContractAddress: { type: String, required: true }, // deployed dexer flashloan contract address
    flWalletAddress: { type: String, required: true }, // flashloan wallet address
    pairAddress: { type: String, required: true },
    amountIn: { type: String, required: true },
    amountOut: { type: String, required: true },
    amountInUsd: { type: Number, required: true },
    amountOutUsd: { type: Number, required: true },
    tokenIn: {
      address: { type: String, required: true },
      symbol: { type: String, required: true },
      decimals: { type: Number, required: true },
    },
    tokenOut: {
      address: { type: String, required: true },
      symbol: { type: String, required: true },
      decimals: { type: Number, required: true },
    },
    blockNumber: { type: Number, required: true },
    txHash: { type: String, required: true },
    timestamp: { type: Date, required: true },
    gasPrice: { type: Number, required: true },
    gasUsed: { type: Number, required: true },
    gasFees: { type: Number, required: true },
    fees: {
      tokenAddress: { type: String, required: true },
      amount: { type: String, required: true },
      amountInUsd: { type: Number, required: true },
      sender: { type: String, required: true },
      recipient: { type: String, required: true },
    },
    txType: { type: String, required: true },
    recipient: { type: String, required: true },
    txUrl: { type: String, required: true },
    tokenPrice: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
)

const Transaction = model<ITransaction>('Transaction', TransactionSchema)

export default Transaction
