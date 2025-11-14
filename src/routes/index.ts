import express from 'express'
import TransactionRouter from './transaction.routes'

const router = express.Router()

router.use('/transactions', TransactionRouter.router)

export default router
