import { Command } from 'commander'
import createFlContracts from './create-contracts'
import createPool from './create-pool'
const program = new Command()

program
  .command('seed-pool')
  .description('Seed pool')
  .action(() => {
    createPool()
  })

program
  .command('seed-contracts')
  .description('Seed contracts')
  .action(() => {
    createFlContracts()
  })

program.parse(process.argv)
