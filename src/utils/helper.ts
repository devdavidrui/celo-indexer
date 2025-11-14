import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import { logger } from './logger'

interface PoolInfo {
  token0: string
  token1: string
  fee: number
  slot0: { sqrtPriceX96: number }
  liquidity: string
  tickSpacing: number
}
export const getPoolAddress = async (
  factoryContractAddress: string,
  token0: string,
  token1: string,
  fee: number,
  provider: ethers.Provider,
): Promise<string> => {
  const factoryContract = new ethers.Contract(
    factoryContractAddress,
    [
      'function getPool(address token0, address token1, uint24 fee) external view returns (address pool)',
    ],
    provider,
  )
  return factoryContract.getPool(token0, token1, fee)
}

export const getPoolInfo = async (
  poolAddress: string,
  provider: ethers.Provider,
): Promise<PoolInfo> => {
  const ABI = [
    'function token0() view returns (address)',
    'function token1() view returns (address)',
    'function fee() view returns (uint24)',
    'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)',
    'function liquidity() view returns (uint128)',
    'function tickSpacing() external view returns (int24)',
  ]
  const poolContract = new ethers.Contract(poolAddress, ABI, provider)
  const [token0, token1, fee, slot0, liquidity, tickSpacing] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
    poolContract.slot0(),
    poolContract.liquidity(),
    poolContract.tickSpacing(),
  ])
  return { token0, token1, fee, slot0, liquidity, tickSpacing }
}

export const getPoolPrice = async (sqrtPriceX96: number, decimals0: number, decimals1: number) => {
  const sqrtPriceX96BN = new BigNumber(sqrtPriceX96)
  const price0 = sqrtPriceX96BN
    .dividedBy(new BigNumber(2).exponentiatedBy(96))
    .pow(2)
    .dividedBy(new BigNumber(10).pow(decimals0 - decimals1))
    .toFixed(decimals0)
  const price1 = new BigNumber(1).dividedBy(new BigNumber(price0)).toFixed(decimals1)
  return { price0, price1: Number.isFinite(Number(price1)) ? price1 : '0' }
}

export const getTokenInfo = async (
  address: string,
  provider: ethers.Provider,
): Promise<{
  id?: string
  name: string
  address: string
  symbol: string
  decimals: number
}> => {
  try {
    const tokenContract = new ethers.Contract(
      address,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
      ],
      provider,
    )
    if (!tokenContract) return { name: '', address: '', symbol: '', decimals: 0 }
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ])
    return { name, address, symbol, decimals: Number(decimals) }
  } catch (error) {
    logger.error(error)
    return { name: '', address: '', symbol: '', decimals: 0 }
  }
}

export const getAmountInUsd = (amount: number) => {
  if (amount === 0) {
    return '$0.00'
  }

  if (amount < 0.01) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    }).format(amount)
  }

  if (amount < 1) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount)
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
