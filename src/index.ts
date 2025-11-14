import { ErrorMiddleware } from '@middlewares/error.middleware'
import { getSwapData } from '@services/swaps'
import { logger } from '@utils/logger'
import cors from 'cors'
import express from 'express'
import createError from 'http-errors'
import connectDB from './database'
import BaseRouter from './routes'
import { syncDexerTransactions } from './services/dexer'

const app = express()

const PORT = process.env.PORT || 3000
connectDB()

// Collection will run on-demand via the /collect route
// syncDexerTransactions()
//getSwapData()

app.use('/', BaseRouter)

app.get('/', (req, res) => {
  res.json({
    message: 'Dexer indexer API is running',
  })
})

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.use(ErrorMiddleware as unknown as express.ErrorRequestHandler)

app.use((req, res, next) => {
  next(createError(404))
})

app.listen(PORT, () => logger.info(`Dexer server started on port http://0.0.0.0:${PORT}`))
