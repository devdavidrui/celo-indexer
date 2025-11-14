import { config } from '@config'
import Pool from '@models/pool'
import { logger } from '@utils/logger'
import { ethers } from 'ethers'
import { DateTime } from 'luxon'
import { flashloanSwap, type ISwap } from './dexer'

const pools = ['0x0dbb0769b00d01d241ba4f7b2891fb5c2a975d51']
const traderAddress = '0xecA109A2686F074c9461bcb05656b19EF61FbC9e'
const contractAddress = '0xe5311e67226F0bff3EA0388EF55559F03D5B1652'
const tokenIn = '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3'
const tokenOut = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'

const getTokenPrice = async (symbol: string, amount0: string, amount1: string) => {
  const amount0Number = Math.abs(Number(amount0))
  const amount1Number = Math.abs(Number(amount1))
  switch (symbol) {
    case 'USDGLO/G$':
      return amount0Number / amount1Number
    case 'G$':
      return amount0Number / amount1Number
    case 'USDGLO':
      return 1.0
    default:
      return 0
  }
}
const getTransactionMetadata = async (
  receipt: { from: string; to: string; gasPrice: number; gasUsed: number },
  poolSwaps: Array<ISwap>,
) => {
  logger.info('getting transaction metadata')
  try {
    const blockCeloPrice = 0
    const swaps = poolSwaps.filter((item) => item !== undefined)
    console.log('swaps', swaps)
    const provider = new ethers.JsonRpcProvider('https://forno.celo.org')
    const transactions = []
    for (const swap of swaps) {
      logger.info(`processing swap data for ${swap.event.transactionHash}`)
      const pool = await Pool.findOne({ address: swap.event.pairAddress })
      if (!pool) return
      const token0 = pool.token0
      const token1 = pool.token1

      const [price0, price1] = await Promise.all([
        getTokenPrice(token0.symbol, swap.amount0, swap.amount1),
        getTokenPrice(token1.symbol, swap.amount0, swap.amount1),
      ])

      const formattedInitialAmount0 = ethers.formatUnits(swap.amount0, token0.decimals)
      const formattedInitialAmount1 = ethers.formatUnits(swap.amount1, token1.decimals)
      const initialAmountInUsd = Number(formattedInitialAmount0) * Number(price0)
      const initialAmountOutUsd = Number(formattedInitialAmount1) * Number(price1)

      const isExactInput = Number(swap.amount0) > 0

      const tokenIn = isExactInput ? token0 : token1
      const tokenOut = isExactInput ? token1 : token0

      const amountIn = isExactInput
        ? ethers.formatUnits(swap.amount0, tokenIn?.decimals)
        : ethers.formatUnits(swap.amount1, tokenIn?.decimals)
      const amountOut = isExactInput
        ? ethers.formatUnits(swap.amount1, tokenOut?.decimals)
        : ethers.formatUnits(swap.amount0, tokenOut?.decimals)

      const amountInUsd = isExactInput ? initialAmountInUsd : initialAmountOutUsd
      const amountOutUsd = isExactInput ? initialAmountOutUsd : initialAmountInUsd

      const block = await provider.getBlock(swap.event.blockNumber)
      const formattedAmounIn = Math.round(
        Number(Math.abs(Number(amountIn))) * 10 ** tokenIn?.decimals,
      )
      const formattedAmountOut = Math.round(
        Number(Math.abs(Number(amountOut))) * 10 ** tokenOut?.decimals,
      )
      const gasPrice = ethers.formatUnits(receipt.gasPrice, 'gwei')
      const gasFees = ((Number(gasPrice) * Number(receipt.gasUsed)) / 1e9) * blockCeloPrice
      const txInfo = {
        contractAddress: receipt.to,
        walletAddress: receipt.from,
        pairAddress: pool.address,
        amountIn: BigInt(formattedAmounIn).toString(),
        amountOut: BigInt(formattedAmountOut).toString(),
        amountInUsd: Math.abs(Number(amountInUsd)),
        amountOutUsd: Math.abs(Number(amountOutUsd)),
        tokenIn,
        tokenOut,
        blockNumber: swap.event.blockNumber,
        txHash: swap.event.transactionHash,
        timestamp: DateTime.fromSeconds(block?.timestamp!).toFormat('yyyy-MM-dd'),
        gasPrice: receipt.gasPrice,
        gasUsed: receipt.gasUsed,
        gasFees,
        txType: isExactInput ? 'buy' : 'sell',
        recipient: receipt.to,
        txUrl: `${config.explorerUrl}/tx/${swap.event.transactionHash}`,
        tokenPrice: price0,
      }
      console.log('txInfo', txInfo)
    }
  } catch (e) {
    logger.error(e)
  }
}

export async function getSwapData() {
  console.log('starting.....')
  try {
    const poolSwaps: any[] = []
    const provider = new ethers.JsonRpcProvider('https://forno.celo.org')
    const block = await provider.getBlock(40685233)
    const transactions = block?.transactions!
    for (const tx of transactions) {
      logger.info(`processing tx ${tx}`)
      const receipt = await provider.getTransactionReceipt(tx)
      console.log(receipt)
      if (receipt?.to !== contractAddress) continue
      const receiptLogs = receipt?.logs!
      for (const log of receiptLogs) {
        const swapData = flashloanSwap(log)
        poolSwaps.push(swapData)
      }
      await getTransactionMetadata(
        {
          from: receipt?.from!,
          to: receipt?.to!,
          gasPrice: Number(receipt?.gasPrice),
          gasUsed: Number(receipt?.gasUsed),
        },
        poolSwaps,
      )
    }
  } catch (e) {
    console.log('error', e)
  }
}
