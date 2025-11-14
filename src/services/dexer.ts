import { config } from '@config'
import DeployedContract from '@models/contracts'
import Pool from '@models/pool'
import Transaction from '@models/transaction'
import { getPoolInfo, getPoolPrice } from '@utils/helper'
import { logger } from '@utils/logger'
import { ethers, type Log } from 'ethers'
import { DateTime } from 'luxon'
import fetch from 'node-fetch'
const FLASHLOAN_PROVIDER = [
  '0xC3e77dC389537Db1EEc7C33B95Cf3beECA71A209',
  '0x918146359264C492BD6934071c6Bd31C854EDBc3',
  '0x197139b402D94EF8ec3Be7BFf4f9cd47fb116ADb',
]
// const DEPLOYED_FLASHLOAN_CONTRACTS = ['0x87dCFeF7582736f8269Ee59A91506115423a932F']
// const DEPLOYED_FLASHLOAN_CONTRACTS = ['0x9B79700Eb02b70212eEe350757604706dCD08f4b']
const DEPLOYED_FLASHLOAN_CONTRACTS = ['0x05ADB2e6C1Bb9575a10580CE892283ccb64DF2be']
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
    ;(globalThis as any).fetch = fetch as any
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
48672049,
48673850,
48675650,
48677449,
48679249,
48684649,
48686449,
48724250,
48740449,
48742249,
48749449,
48751249,
48753049,
48756649,
48758450,
48762049,
48765650,
48767449,
48801651,
48821450,
48825051,
48843050,
48846649,
48848450,
49404649,
49406450,
49408249,
49410049,
49411850,
49413652,
49415449,
49417257,
49419050,
49420849,
49422649,
49424449,
49426250,
49428049,
49429849,
49431650,
49433449,
49435249,
49437049,
49438849,
49440649,
49442450,
49444249,
49446049,
49447849,
49449648,
49451449,
49453249,
49455049,
49456849,
49458650,
49460449,
49462249,
49464049,
49465849,
49536049,
49622449,
49651251,
49653049,
49654849,
49656650,
49658449,
49660250,
49662050,
49663850,
49665649,
49667449,
49669249,
49671050,
49672849,
49674648,
49676449,
49678249,
49680049,
49681849,
49683649,
49685449,
49687250,
49689049,
49690849,
49692649,
49694450,
49696249,
49698049,
49699849,
49701649,
49703449,
49705249,
49707049,
49708850,
49710649,
49734049,
49735850,
49737649,
49739449,
49741249,
49743049,
49744849,
49746650,
49748449,
49750250,
49752049,
49753849,
49755649,
49757449,
49759249,
49761049,
49762849,
49764649,
49766449,
49768249,
49770049,
49771850,
49773649,
49775449,
49777249,
49779049,
49780849,
49782649,
49784450,
49786249,
49788049,
49791649,
49793449,
49795250,
49815049,
49816851,
49824049,
49825849,
49829449,
49831249,
49834849,
49836649,
49838449,
49842049,
49843849,
49845650,
49847449,
49849249,
49851049,
49852849,
49854649,
49856449,
49858250,
49860049,
49861849,
49863650,
49865452,
49867249,
49869049,
49870850,
49872649,
49874449,
49876249,
49878049,
49879849,
49881650,
49883450,
49885249,
49906849,
49908649,
49910449,
49912249,
49914049,
49915849,
49917649,
49919448,
49921250,
49923050,
49924850,
49926649,
49928449,
49930250,
49932050,
49933849,
49935649,
49937450,
49939250,
49941049,
49942849,
49944650,
49946449,
49948249,
49950050,
49951849,
49953649,
49955449,
49957249,
49959050,
49960849,
49962649,
49964449,
49966250,
49968049,
50009450,
50011251,
50037577,
50045451,
50047250,
50049049,
50050850,
50052649,
50054450,
50056249,
50058049,
50059849,
50061649,
50063449,
50065249,
50067049,
50068849,
50070650,
50072449,
50074249,
50076050,
50077849,
50079648,
50081449,
50083249,
50085049,
50086849,
50088649,
50090449,
50092249,
50094049,
50095849,
50097651,
50099449,
50112211,
50115992,
50119673,
50123506,
50128482,
50132314,
50140849,
50142649,
50144449,
50146250,
50148049,
50149849,
50151649,
50200383,
50202257,
50206190,
50207718,
50211605,
50227250,
50229050,
50230849,
50232650,
50236249,
50238050,
50241649,
50243449,
50245249,
50248850,
50250649,
50252449,
50254250,
50256050,
50257849,
50259651,
50261450,
50265050,
50266849,
50268649,
50272249,
50274049,
50279449,
50281249,
50286649,
50288450,
50290248,
50292049,
50295910,
50297574,
50313650,
50315450,
50317249,
50319049,
50322649,
50344251,
50346049,
50347849,
50351449,
50355049,
50356850,
50360451,
50362249,
50365850,
50369449,
50373050,
50380678,
50382495,
50386049,
50391386,
50394711,
50396541,
50400050,
50405449,
50409049,
50410849,
50414449,
50416249,
50418049,
50419849,
50421649,
50428849,
50430650,
50432449,
50434249,
50436049,
50439650,
50446849,
50450449,
50455849,
50461249,
50463050,
50468449,
50475649,
50491849,
50502649,
50508049,
50509850,
50511649,
50513449,
50515249,
50517050,
50518850,
50520649,
50522449,
50524249,
50526049,
50527849,
50529649,
50531449,
50533249,
50535049,
50536849,
50540449,
50542249,
50544049,
50545849,
50547649,
50549449,
50551250,
50553050,
50554849,
50556649,
50558450,
50560250,
50562049,
50563849,
50565652,
50567449,
50572849,
50596249,
50598049,
50599849,
50601649,
50603449,
50605249,
50607049,
50608850,
50610649,
50612449,
50614250,
50616049,
50617849,
50619649,
50621449,
50623249,
50625049,
50626850,
50628649,
50630449,
50632249,
50634049,
50635849,
50637649,
50639449,
50641249,
50643049,
50644849,
50646649,
50648449,
50650249,
50652050,
50653849,
50655649,
50659250,
50682649,
50684449,
50686249,
50688049,
50689849,
50691649,
50693449,
50695249,
50697049,
50698849,
50700650,
50702449,
50704249,
50706049,
50707850,
50709649,
50711450,
50713250,
50715050,
50716849,
50718649,
50720449,
50722250,
50724054,
50725849,
50727650,
50729450,
50731250,
50733051,
50734850,
50736650,
50738449,
50740250,
50742049,
50745649,
50799649,
50801449,
50803249,
50805049,
50806849,
50808649,
50810449,
50812249,
50815849,
50817649,
50819449,
50821249,
50823049,
50824849,
50826649,
50832049,
50855449,
50857249,
50859049,
50860849,
50862649,
50864449,
50866248,
50871649,
50875249,
50880649,
50882449,
50884250,
50887849,
50889649,
50891449,
50893249,
50896849,
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
51008449,
51010249,
51012049,
51013850,
51015650,
51017450,
51019249,
51022849,
51024649,
51026449,
51028249,
51030049,
51033649,
51035449,
51037249,
51039049,
51042649,
51044449,
51046249,
51051649,
51053449
];

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
