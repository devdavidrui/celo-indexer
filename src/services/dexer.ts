import { config } from '@config'
import DeployedContract from '@models/contracts'
import Pool from '@models/pool'
import Transaction from '@models/transaction'
import { getPoolInfo, getPoolPrice } from '@utils/helper'
import { logger } from '@utils/logger'
import { ethers, type Log } from 'ethers'
import { DateTime } from 'luxon'
import { fetch as undiciFetch } from 'undici'
const FLASHLOAN_PROVIDER = [
  '0xC3e77dC389537Db1EEc7C33B95Cf3beECA71A209',
  '0x918146359264C492BD6934071c6Bd31C854EDBc3',
  '0x197139b402D94EF8ec3Be7BFf4f9cd47fb116ADb',
]
const DEPLOYED_FLASHLOAN_CONTRACTS = ['0x87dCFeF7582736f8269Ee59A91506115423a932F']
const pools = [
  '0x34757893070B0FC5de37AaF2844255fF90F7F1E0', //USDC-CUSD

  '0x6cde5f5a192fBf3fD84df983aa6DC30dbd9f8Fac', //USDT-CELO
  '0xf130F72F8190f662522774C3367E6e8814f5e219', // CELO-CEURO
  '0xA1777e082fA1746eB78DD9C1fbB515419CF6e538', //CELO-USDC
  '0x95faa9a91cD6c1C018e4B1a6fC4c89D4F1695e5D', //CUSD-CKES
  '0x61Ef8708fc240DC7f9F2c0d81c3124Df2fd8829F', //USDT-CKES
  '0x1c8DafD358d308b880F71eDB5170B010b106Ca60', //CUSD-CEURO
  '0xEa3fB6e3313A2A90757E4Ca3d6749EfD0107B0B6', //CUSD-USDC
  '0x2d70cBAbf4d8e61d5317b62cBe912935FD94e0FE', //CELO-CUSD
  '0x5dC631aD6C26BEA1a59fBF2C2680CF3df43d249f', //CUSD-USDT
  '0xd80D28850bEBE6208433c298334392bC940B4fc7', //CELO_WETH
  '0xF55791AfBB35aD42984f18D6Fe3e1fF73D81900c', //USDT_WETH_ERC20
  '0x87deC9a2589d9e6511Df84C193561b3A16cF6238', //USDT-PUSO

  //old
  '0xEa3fB6e3313A2A90757E4Ca3d6749EfD0107B0B6', //CUSD-USDC(wormhole)
]
const FLASHLOAN_WALLETS_ADDRESSES = [
  '0xC702EE34b862627aEa854d9Ee51257b4657Be0B0',
  '0x576B82af6DCa74a6b6A803AbF910fc6525A60182',
  '0x1dfAFD3857CEd5468C2F2A8e465D6a46ae2e72bD',
  '0x0310D87c66BFE6C45361D3c998F3e7e6C75a859e',
  '0x8c800B862bc98f54a031bF32D5347eA63aD713df',
  '0x0Bc17d754ad5a6E0c267d4E63eb127380733901E',
  '0x036BA5616373FbE18dccb30f60C71A17B1F2AF76',
  '0x0C02a5bE5b8fdBDEAA2268283Cb9B4851d056cbC',
  '0x6edC57767546734d938b761775840Dca3e1CA17c', 
  '0x2F00800024281B16ac3Ce220d7E089396e30f82A',

  '0x9A0f952936bC00dDdd93cDef5f738f1e991ab229', 
  '0x514E497Cb4584c2884Bf1f07c51674C0CF068955',
  '0x2032cC0C05ADC7DcaC3dA978eEce2481E1ebdF32',
  '0xEC5bF1e0b37eDF11717923718E52bDF96401374B',
  '0xE4D260338De6A806337a5992e74DA1c6ec77b4a3',
  '0x6dF475aCb1346ad56331Ad77Ef776bab3B7D10aA',
  '0xCAC3C031536DB6E35B40090073D135d73BDE26F0',
  '0x697B30097167a2708d08D93f8179f7DC52ad98BD',
  '0x48DCE8dAc55052B462898ACf11a53f9bcfcDe573',
  '0xa0f536A9853ff58beAC6304a5eF52478882bb189',


  '0xe9bd03D035788F0DA196Cdc4A625cb43D1E3745E',
  '0xe539DFA24FEE75C9b337833f10287219B36e389F',
  '0x0A77d3506A6Fc440a5FDE6641901B1c42fEDB1D2',
  '0x3ee09729F7495b15281b294389C12fee79e43c10',
  '0x41a17485038445dBD881ef43f05900C75110b0e0',
  '0x349e0D7272bCeB9360C85c078cC249958b3cbEDD',
  '0x240B3226d3386eEceAaC33f5378C81E0C048Df69',
  '0x7531fd502F382c9191a51bdC75cFC168332564EF',
  '0x29cFcA7a03E6C79D2f9079e2B092678F477E0584',
  '0x15FAB0757B7a764581701a6139a5E2648B9aafcd',
]
interface ITransfer {
  status: boolean
  from: string
  to: string
  value: string
  txHash: string
  tokenAddress?: string
}
export interface ISwap {
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
    const isFlashloanWallet = FLASHLOAN_WALLETS_ADDRESSES.includes(transferData.from)
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

export const flashloanSwap = (log: Log): ISwap | undefined => {
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

const tokenPriceTemp = (
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amount0: string,
  amount1: string,
  blockCeloPrice: number,
) => {
  const amount0Number = Math.abs(Number(amount0))
  const amount1Number = Math.abs(Number(amount1))
  if (tokenInSymbol === 'CELO' && tokenOutSymbol === 'WETH') {
    return {
      price0: blockCeloPrice,
      price1: amount0Number / amount1Number,
    }
  }
  if (tokenInSymbol === 'WETH' && tokenOutSymbol === 'CELO') {
    return {
      price0: blockCeloPrice,
      price1: amount0Number / amount1Number,
    }
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
      return 1.05
    }
    default:
      return 0
  }
}

const getTokenPriceFromDexScreener = async (address: string) => {
  const url = `https://api.dexscreener.com/token-pairs/v1/celo/${address}`
  // ensure fetch is available in older Node versions
  if (typeof globalThis.fetch === 'undefined') {
    ;(globalThis as any).fetch = undiciFetch
  }

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
  let blockCeloPrice = 0
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

      let [price0, price1] = await Promise.all([
        getTokenPrice(pool.name, swap.amount0, swap.amount1),
        getTokenPrice(token1.symbol, swap.amount0, swap.amount1),
      ])

      if (token0.symbol === 'CELO' && token1.symbol === 'WETH') {
        const isExactInput = Number(swap.amount0) > 0
        const tokenIn = isExactInput ? token0 : token1
        const tokenOut = isExactInput ? token1 : token0
        const xPrice = tokenPriceTemp(
          tokenIn.symbol,
          tokenOut.symbol,
          swap.amount0,
          swap.amount1,
          blockCeloPrice,
        )!
        price0 = xPrice.price0
        price1 = xPrice.price1
      }

      const formattedInitialAmount0 = ethers.formatUnits(swap.amount0, token0.decimals)
      const formattedInitialAmount1 = ethers.formatUnits(swap.amount1, token1.decimals)
      const initialAmountInUsd = Number(formattedInitialAmount0) * Number(price0)
      const initialAmountOutUsd = Number(formattedInitialAmount1) * Number(price1)

      const isExactInput = Number(swap.amount0) > 0

      const tokenIn = isExactInput ? token0 : token1
      const tokenOut = isExactInput ? token1 : token0

      //remove
      // if (tokenIn.symbol === 'CELO' && tokenOut.symbol === 'USDC') {
      //   blockCeloPrice = price0
      // }
      if (tokenIn.symbol === 'CELO' && tokenOut.symbol === 'cEUR') {
        blockCeloPrice = price0
      }
      if (tokenIn.symbol === 'CELO' && tokenOut.symbol === 'cUSD') {
        blockCeloPrice = price0
      }

      const amountIn = isExactInput
        ? ethers.formatUnits(swap.amount0, tokenIn?.decimals)
        : ethers.formatUnits(swap.amount1, tokenIn?.decimals)
      const amountOut = isExactInput
        ? ethers.formatUnits(swap.amount1, tokenOut?.decimals)
        : ethers.formatUnits(swap.amount0, tokenOut?.decimals)

      const amountInUsd = isExactInput ? initialAmountInUsd : initialAmountOutUsd
      const amountOutUsd = isExactInput ? initialAmountOutUsd : initialAmountInUsd

      const block = await provider.getBlock(swap.event.blockNumber)
      // const rebalanceTokenPrice = await getTokenPriceFromDexScreener(
      //   flashLoanWalletInfo.tokenAddress!,
      // )
      const formattedAmounIn = Math.round(
        Number(Math.abs(Number(amountIn))) * 10 ** tokenIn?.decimals,
      )
      const formattedAmountOut = Math.round(
        Number(Math.abs(Number(amountOut))) * 10 ** tokenOut?.decimals,
      )
      // const celoPrice = await getTokenPriceFromDexScreener(
      //   '0x471EcE3750Da237f93B8E339c536989b8978a438',
      // )

      const gasPrice = ethers.formatUnits(receipt.gasPrice, 'gwei')
      const gasFees = ((Number(gasPrice) * Number(receipt.gasUsed)) / 1e9) * blockCeloPrice
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
          amountInUsd: (Number(flashLoanWalletInfo.value) / 1e18) * 0.272688,
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

const BLOCKS = [
48758449,
48763849,
48767449,
48772849,
48781849,
48834088,
48835887,
48837650,
48839487,
48841249,
48843050,
48844850,
48846687,
48848451,
48850249,
48852050,
48853850,
48855649,
48857451,
48859287,
48861051,
48862850,
48864649,
48866456,
48868249,
48870051,
48871849,
48873649,
48875450,
48931250,
48983449,
48985249,
48987050,
48988849,
48990649,
48992449,
48994249,
48996050,
48997849,
48999649,
49001449,
49003249,
49005054,
49006849,
49008649,
49010449,
49012249,
49014049,
49015849,
49017649,
49019449,
49021249,
49024849,
49028449,
49030249,
49032049,
49033849,
49037449,
49041050,
49042970,
49051849,
49053649,
49059049,
49062649,
49104049,
49161649,
49163449,
49165249,
49167049,
49168849,
49170649,
49172449,
49174249,
49176049,
49177849,
49179649,
49181449,
49183249,
49185049,
49186849,
49188649,
49190451,
49192249,
49194049,
49195849,
49197649,
49199449,
49201249,
49203049,
49204849,
49206649,
49208450,
49210249,
49212049,
49213849,
49215650,
49217449,
49219250,
49221049,
49222850,
49224650,
49228248,
49231849,
49235449,
49237249,
49239049,
49240849,
49242650,
49244450,
49246249,
49248050,
49249849,
49251649,
49253449,
49255249,
49257049,
49258849,
49267850,
49269649,
49273249,
49276850,
49278649,
49282249,
49284049,
49287649,
49296649,
49305649,
49307449,
49309249,
49311049,
49314648,
49352449,
49354249,
49356049,
49361449,
49363249,
49368651,
49370449,
49375849,
49392049,
49402849,
49424449,
49426249,
49428050,
50037577,
50045451,
50097515,
50097544,
50097650,
50099449,
50101249,
50103049,
50192815,
50193080,
50193351,
50195420,
50202556,
50227250,
50229049,
50230849,
50232649,
50234449,
50236250,
50238049,
50255842,
50258700,
50261450,
50263249,
50265051,
50284558,
50284569,
50344250,
50346049,
50349649,
50358030,
50358059,
50358155,
50360450,
50364049,
50386089,
50389697,
50435163,
50436519,
50438027,
50439650,
50443250,
50446849,
50450449,
50450449,
50450449,
50452249,
50452249,
50455849,
50463050,
50466650,
50470249,
50472049,
50884251,
50886050,
50887849,
50889650,
50891449,
50893249,
50895049,
50896849,
50898649,
50900619,
50902249,
50904049,
50905850,
50907649,
50909449,
50911249,
50913049,
50914849,
50916649,
50918450,
50920249,
50922049,
50923850,
50925650,
50927451,
50929251,
50931050,
50932851,
50934650,
50954449,
50956249,
50958049,
50959849,
50961649,
50963449,
50965249,
50967049,
50968849,
50970649,
50972449,
50974249,
50976049,
50999397,
50999466,
51005148,
51006649,
51008469,
51010270,
51013850,
51015651,
51017451,
51024650,
51026449,
51028249,
51035449,
51037249,
51040849,
51044449,
51046249,
51048049,
51049849,
51051650,
51053449];

export async function syncDexerTransactions() {
  console.log('starting...')
  try {
    const provider = new ethers.JsonRpcProvider('https://forno.celo.org')
    const filter = {
      topics: [ethers.id('Swap(address,address,int256,int256,uint160,uint128,int24)')],
      address: pools,
    }
    for (let i = 0; i < BLOCKS.length; i++) {
      logger.info(`processing block ${i} out of ${BLOCKS.length}`)
      const block = await provider.getBlock(Number(BLOCKS[i]))
      const transactions = block?.transactions!
      for (const tx of transactions) {
        logger.info(`processing tx ${tx}`)
        const poolSwaps: any[] = []
        let flashLoanProviderInfo = {}
        let flashLoanWalletInfo: ITransfer = {
          status: false,
          from: '',
          to: '',
          value: '',
          txHash: '',
        }
        const receipt = await provider.getTransactionReceipt(tx)
        if (!DEPLOYED_FLASHLOAN_CONTRACTS.includes(receipt?.to!)) continue
        //if (!FLASHLOAN_WALLETS_ADDRESSES.includes(receipt?.from!)) continue
        const receiptLogs = receipt?.logs!
        for (const log of receiptLogs) {
          const flashloanProvider = isFlashloanProvider(log)
          const flashloanWallet = isFlashloanWallet(log)
          if (flashloanProvider.status) {
            flashLoanProviderInfo = flashloanProvider
          }1
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
      }
      await new Promise((resolve) => setTimeout(resolve, 3000)) //sleep for 30 seconds
    }
  } catch (e) {
    console.log('error')
  }
}
