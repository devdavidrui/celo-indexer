import TransactionController from '@controllers/transaction.controller'
import { Router } from 'express'

class TransactionRouter {
  private transactionController = new TransactionController()
  readonly router = Router()

  constructor() {
    this.routes()
  }

  private routes() {
    this.router.get('/duplicate', this.transactionController.findDuplicateTransactions)
    this.router.get('/stats', this.transactionController.getMonthlyStats)
    this.router.get('/', this.transactionController.getAllTransactions)
  }
}

export default new TransactionRouter()
