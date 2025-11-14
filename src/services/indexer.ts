import { config } from '@config'
import DeployedContract from '@models/contracts'
import Pool from '@models/pool'
import Transaction from '@models/transaction'
import { APF_FLASHLOAN_WALLETS_ADDRESSES, APF_POOLS } from '@utils/constants'
import { logger } from '@utils/logger'
import { ethers, type Log } from 'ethers'
import { DateTime } from 'luxon'

interface ITransfer {
  status: boolean
  from: string
  to: string
  value: string
  txHash: string
  tokenAddress?: string
}
interface ISwap {
  sender: string
  recipient: string
  amount0: string
  amount1: string
  event: {
    blockNumber: number
    transactionHash: string
    blockHash: string
    pairAddress: string
  }
}
const FLASHLOAN_PROVIDER = [
  '0xC3e77dC389537Db1EEc7C33B95Cf3beECA71A209',
  '0x918146359264C492BD6934071c6Bd31C854EDBc3',
  '0x197139b402D94EF8ec3Be7BFf4f9cd47fb116ADb',
]
const isFlashloanProvider = (log: Log): ITransfer => {
  try {
    const contractInterface = new ethers.Interface([
      'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
    ])
    const parsedTransfer = contractInterface.decodeEventLog('Transfer', log.data, log.topics)
    const transferData = {
      from: ethers.getAddress(parsedTransfer[0]),
      to: ethers.getAddress(parsedTransfer[1]),
      value: BigInt(parsedTransfer[2]).toString(),
    }
    const status = FLASHLOAN_PROVIDER.includes(transferData.from)
    let flashloanProvider: ITransfer = { status: false, from: '', to: '', value: '', txHash: '' }
    if (status) {
      flashloanProvider = {
        status,
        from: transferData.from,
        to: transferData.to,
        value: transferData.value,
        txHash: log.transactionHash,
      }
    }
    return flashloanProvider
  } catch (e: any) {
    //console.log('error', e.shortMessage)
    return {
      status: false,
      from: '',
      to: '',
      value: '',
      txHash: '',
    }
  }
}

const isFlashloanWallet = (log: Log): ITransfer => {
  try {
    const contractInterface = new ethers.Interface([
      'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
    ])
    const parsedTransfer = contractInterface.decodeEventLog('Transfer', log.data, log.topics)
    const transferData = {
      from: ethers.getAddress(parsedTransfer[0]),
      to: ethers.getAddress(parsedTransfer[1]),
      value: BigInt(parsedTransfer[2]).toString(),
    }
    let wallet: ITransfer = { status: false, from: '', to: '', value: '', txHash: '' }
    const isFlashloanWallet = APF_FLASHLOAN_WALLETS_ADDRESSES.includes(transferData.from)
    if (isFlashloanWallet) {
      wallet = {
        status: isFlashloanWallet,
        from: transferData.from,
        to: transferData.to,
        value: transferData.value,
        txHash: log.transactionHash,
        tokenAddress: log.address,
      }
    }
    return wallet
  } catch (e: any) {
    console.log('error', e.shortMessage)
    return {
      status: false,
      from: '',
      to: '',
      value: '',
      txHash: '',
    }
  }
}

const flashloanSwap = (log: Log): ISwap | undefined => {
  try {
    const contractInterface = new ethers.Interface([
      'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
    ])
    const parsedSwap = contractInterface.decodeEventLog('Swap', log.data, log.topics)
    if (!parsedSwap) return
    return {
      sender: parsedSwap[0],
      recipient: parsedSwap[1],
      amount0: parsedSwap[2].toString(),
      amount1: parsedSwap[3].toString(),
      event: {
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        blockHash: log.blockHash,
        pairAddress: log.address,
      },
    }
  } catch (e: any) {
    console.log('error', e.shortMessage)
  }
}

const getTokenPrice = async (symbol: string, amount0: string, amount1: string) => {
  const amount0Number = Math.abs(Number(amount0))
  const amount1Number = Math.abs(Number(amount1))
  switch (symbol) {
    case 'WETH':
      //return (amount0Number / amount1Number) * 1e12
      return amount0Number / amount1Number
    case 'cKES/cUSD':
    case 'CELO/cEUR':
    case 'CELO/cUSD':
    case 'USD₮/USDC':
      return amount1Number / amount0Number
    case 'USD₮/cUSD':
    case 'USDC/cUSD':
      return (amount0Number / amount1Number) * 1e12
    case 'CELO/USDC':
    case 'CELO/USD₮':
    case 'PUSO/USD₮':
    case 'cKES/USD₮':
      return (amount1Number / amount0Number) * 1e12
    case 'USD₮/WETH':
    case 'USD₮':
    case 'USDC': {
      const price = await getTokenPriceFromDexScreener('0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e')
      return price
    }
    case 'cEUR': {
      //   const price = await getTokenPriceFromDexScreener('0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73')
      //   return price
      return 1.09
      // return amount0Number / amount1Number
    }
    case 'cUSD':
    case 'cUSD/USDC':
    case 'cUSD/cEUR': {
      //   const price = await getTokenPriceFromDexScreener('0x765DE816845861e75A25fCA122bb6898B8B1282a')
      //   return price
      return 1.00035
    }
    default:
      return 0
  }
}
const getTokenPriceFromDexScreener = async (address: string) => {
  const url = `https://api.dexscreener.com/token-pairs/v1/celo/${address}`
  const response = await fetch(url, {
    method: 'get',
  })
  const data = await response.json()
  return data[0].priceUsd as number
}
const createTransactionsMetadata = async (
  receipt: { from: string; to: string; gasPrice: number; gasUsed: number },
  poolSwaps: Array<ISwap>,
  flashLoanWalletInfo: ITransfer,
) => {
  try {
    const swaps = poolSwaps.filter((item) => item !== undefined)
    const provider = new ethers.JsonRpcProvider('https://forno.celo.org')
    const transactions = []
    for (const swap of swaps) {
      logger.info(`processing swap data for ${swap.event.transactionHash}`)
      const pool = await Pool.findOne({ address: swap.event.pairAddress })

      if (!pool) return
      const token0 = pool.token0
      const token1 = pool.token1

      const [price0, price1] = await Promise.all([
        getTokenPrice(pool.name, swap.amount0, swap.amount1),
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
      const rebalanceTokenPrice = await getTokenPriceFromDexScreener(
        flashLoanWalletInfo.tokenAddress!,
      )
      const formattedAmounIn = Math.round(
        Number(Math.abs(Number(amountIn))) * 10 ** tokenIn?.decimals,
      )
      const formattedAmountOut = Math.round(
        Number(Math.abs(Number(amountOut))) * 10 ** tokenOut?.decimals,
      )
      const celoPrice = await getTokenPriceFromDexScreener(
        '0x471EcE3750Da237f93B8E339c536989b8978a438',
      )

      const gasPrice = ethers.formatUnits(receipt.gasPrice, 'gwei')
      const gasFees = ((Number(gasPrice) * Number(receipt.gasUsed)) / 1e9) * celoPrice
      const txInfo = {
        flContractAddress: receipt.to,
        flWalletAddress: receipt.from,
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
        fees: {
          tokenAddress: flashLoanWalletInfo.tokenAddress,
          amount: flashLoanWalletInfo.value,
          amountInUsd: (Number(flashLoanWalletInfo.value) / 1e18) * rebalanceTokenPrice,
          sender: flashLoanWalletInfo.from,
          recipient: flashLoanWalletInfo.to,
        },
        txType: isExactInput ? 'buy' : 'sell',
        recipient: receipt.to,
        txUrl: `${config.explorerUrl}/tx/${swap.event.transactionHash}`,
        tokenPrice: price0,
      }
      transactions.push(txInfo)
    }
    await Transaction.insertMany(transactions)
    logger.info(`${transactions.length} transactions inserted successfully`)
  } catch (e) {
    console.log('error', e)
  }
}

export async function syncTransactions() {
  logger.info('Syncing transactions.....')
  try {
    const provider = new ethers.JsonRpcProvider(config.rpc.host)
    const filter = {
      topics: [ethers.id('Swap(address,address,int256,int256,uint160,uint128,int24)')],
      address: APF_POOLS,
    }
    provider.on(filter, async (log) => {
      const receipt = await provider.getTransactionReceipt(log.transactionHash)
      if (!receipt) return
      if (!APF_FLASHLOAN_WALLETS_ADDRESSES.includes(receipt?.from!)) return
      const receiptLogs = receipt?.logs!
      const poolSwaps: any[] = []
      let flashLoanProviderInfo = {}
      let flashLoanWalletInfo: ITransfer = {
        status: false,
        from: '',
        to: '',
        value: '',
        txHash: '',
      }
      for (const log of receiptLogs) {
        const flashloanProvider = isFlashloanProvider(log)
        const flashloanWallet = isFlashloanWallet(log)
        if (flashloanProvider.status) {
          flashLoanProviderInfo = flashloanProvider
        }
        if (flashloanWallet.status) {
          flashLoanWalletInfo = flashloanWallet
        }
        const swapData = flashloanSwap(log)
        poolSwaps.push(swapData)
      }
      await createTransactionsMetadata(
        {
          from: receipt?.from!,
          to: receipt?.to!,
          gasPrice: Number(receipt?.gasPrice),
          gasUsed: Number(receipt?.gasUsed),
        },
        poolSwaps,
        flashLoanWalletInfo,
      )
      const flashloanContract = await DeployedContract.findOne({
        address: receipt?.to!,
      })
      if (flashloanContract) {
        await flashloanContract.updateOne({ $inc: { txCount: 1 } })
      }
    })
  } catch (error) {
    logger.error('Error syncing transactions', error)
  }
}
