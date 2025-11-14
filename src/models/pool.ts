import type { DateTime } from 'luxon'
import { Schema, model } from 'mongoose'

export interface IPool {
  name: string
  address: string
  token0: {
    address: string
    symbol: string
    decimals: number
  }
  token1: {
    address: string
    symbol: string
    decimals: number
  }
  priceInUsd: number
  createdAt?: string
  updatedAt?: string
}

const PoolSchema = new Schema<IPool>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    token0: {
      address: { type: String, required: true },
      symbol: { type: String, required: true },
      decimals: { type: Number, required: true },
    },
    token1: {
      address: { type: String, required: true },
      symbol: { type: String, required: true },
      decimals: { type: Number, required: true },
    },
    priceInUsd: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
)

const Pool = model<IPool>('Pool', PoolSchema)

export default Pool
