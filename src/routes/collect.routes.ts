import TransactionController from '@controllers/transaction.controller'
import { Router } from 'express'
import { syncDexerTransactions } from '@services/dexer'

class CollectRouter {
  readonly router = Router()

  constructor() {
    this.routes()
  }

  private routes() {
    this.router.get('/', (req: Request, res: Response) => {
      // Start collection in background so the HTTP request returns quickly
      void syncDexerTransactions().catch((err) => {
        // log the error — this will go to the process stdout/stderr or your logger
        console.error('collect route error:', err)
      })
      return res.json({ status: 'collection_started' })
    })
  }
}

export default new CollectRouter()