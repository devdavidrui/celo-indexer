import { model, Schema } from 'mongoose'

const DeployedContractSchema = new Schema({
  address: { type: String, required: true },
  name: { type: String, required: true },
  txCount: { type: Number, required: true },
})

const DeployedContract = model('DeployedContract', DeployedContractSchema)

export default DeployedContract
