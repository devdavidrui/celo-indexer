import dotenv from 'dotenv'
dotenv.config()

export const config = {
  logger: {
    dir: '../../logs',
  },
  mongo: {
    host: process.env.MONGO_HOST,
    name: process.env.MONGO_NAME,
  },
  rpc: {
    host: process.env.RPC_URL,
  },
  explorerUrl: process.env.EXPLORER_URL,
}
