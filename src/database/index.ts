import { logger } from '@utils/logger'
import { NextFunction } from 'express'
import mongoose, { type ConnectOptions } from 'mongoose'
import { config } from '../config/index'

const connectDB = async () => {
  try {
    const mongodbUri = config.mongo.host!
    const dbName = config.mongo.name
    await mongoose.set('strictQuery', true)
    await mongoose.connect(mongodbUri, {
      autoIndex: process.env.NODE_ENV !== 'production',
      dbName: dbName,
    } as ConnectOptions)
    return logger.info('Mongodb Connected')
  } catch (e) {
    console.error('Failed to connect to MongoDB', e)
    process.exit(1) // Exit process with failure
  }
}

export default connectDB
