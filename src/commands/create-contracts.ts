import DeployedContract from '@models/contracts'
import { DEPLOYED_FLASHLOAN_CONTRACTS } from '@utils/constants'
import { logger } from '@utils/logger'
import { ethers } from 'ethers'
import connectDB from '../database'
connectDB()

export default async function createFlContracts() {
  logger.info('Creating flashloan contracts...')
  try {
    const deployedContracts = []
    for (const [index, contract] of DEPLOYED_FLASHLOAN_CONTRACTS.entries()) {
      deployedContracts.push({
        address: ethers.getAddress(contract),
        name: `Flashloan ${index + 1}`,
        txCount: 0,
      })
    }
    await DeployedContract.insertMany(deployedContracts)
  } catch (e) {
    logger.error('Error creating flashloan contracts', e)
  }
}
