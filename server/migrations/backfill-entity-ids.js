/**
 * One-time migration: Backfill entityId for all existing brokers, corporations, and deals.
 *
 * Usage:  node --experimental-modules server/migrations/backfill-entity-ids.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const connStr = `${process.env.MONGODB_SCHEME}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}?retryWrites=true&w=majority&appName=VetBorrower`;

// Import models (registers schemas with mongoose)
import BrokersModel from '../dbModel/brokerRecordModel.js';
import CorporationsModel from '../dbModel/corporationRecordModel.js';
import DealsModel from '../dbModel/dealRecordModel.js';
import { getNextEntityId } from '../dbModel/counterModel.js';

async function backfill(Model, entityType, prefix, label) {
  const records = await Model.find({ $or: [{ entityId: null }, { entityId: { $exists: false } }] });
  console.log(`Found ${records.length} ${label}(s) without entityId`);
  for (const rec of records) {
    const entityId = await getNextEntityId(entityType, prefix);
    await Model.findByIdAndUpdate(rec._id, { entityId });
    console.log(`  ${label} ${rec._id} -> ${entityId}`);
  }
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(connStr);
  console.log('Connected.\n');

  await backfill(BrokersModel, 'broker', 'B', 'Broker');
  await backfill(CorporationsModel, 'corporation', 'C', 'Corporation');
  await backfill(DealsModel, 'deal', 'D', 'Deal');

  console.log('\nDone. Closing connection.');
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
