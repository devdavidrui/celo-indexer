import { config } from '@config'
import Pool, { type IPool } from '@models/pool'
import { APF_POOLS } from '@utils/constants'
import { getPoolInfo, getTokenInfo } from '@utils/helper'
import { logger } from '@utils/logger'
import { ethers } from 'ethers'
import { DateTime } from 'luxon'
import connectDB from '../database'
connectDB()

export default async function createPool() {
  logger.info('Creating pools...')
  try {
    const provider = new ethers.JsonRpcProvider(config.rpc.host)
    const pools: Array<IPool> = []
    for (const pool of APF_POOLS) {
      const poolInfo = await getPoolInfo(pool, provider)
      const [token0, token1] = await Promise.all([
        getTokenInfo(poolInfo.token0, provider),
        getTokenInfo(poolInfo.token1, provider),
      ])
      pools.push({
        name: `${token0.symbol}/${token1.symbol}`,
        address: pool,
        token0,
        token1,
        priceInUsd: 0,
        createdAt: DateTime.now().toJSDate().toString(),
        updatedAt: DateTime.now().toJSDate().toString(),
      })
    }
    await Pool.insertMany(pools)
    logger.info('Pools created successfully')
    process.exit(0)
  } catch (e) {
    console.log('error', e)
  }
}
