import express from 'express'
import TransactionRouter from './transaction.routes'
import CollectRouter from './collect.routes'

const router = express.Router()

router.use('/transactions', TransactionRouter.router)
router.use('/collect', CollectRouter.router)

export default router