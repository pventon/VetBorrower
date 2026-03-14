/**
 * Fix migration: Reset counters to 999 and re-backfill entity IDs starting at 1000.
 *
 * Usage:  node server/migrations/fix-entity-ids.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const connStr = `${process.env.MONGODB_SCHEME}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}?retryWrites=true&w=majority&appName=VetBorrower`;

import BrokersModel from '../dbModel/brokerRecordModel.js';
import CorporationsModel from '../dbModel/corporationRecordModel.js';
import DealsModel from '../dbModel/dealRecordModel.js';
import CounterModel from '../dbModel/counterModel.js';

async function reassign(Model, entityType, prefix, label) {
  // Reset counter to 999 so first $inc gives 1000
  await CounterModel.findByIdAndUpdate(entityType, { seq: 999, prefix }, { upsert: true });

  const records = await Model.find({}).sort({ _id: 1 });
  console.log(`Reassigning ${records.length} ${label}(s)`);
  for (const rec of records) {
    // Atomically increment
    const counter = await CounterModel.findByIdAndUpdate(
      entityType,
      { $inc: { seq: 1 } },
      { returnDocument: 'after' }
    );
    const entityId = `${prefix}${counter.seq}`;
    await Model.findByIdAndUpdate(rec._id, { entityId });
    console.log(`  ${label} ${rec._id} -> ${entityId}`);
  }
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(connStr);
  console.log('Connected.\n');

  await reassign(BrokersModel, 'broker', 'B', 'Broker');
  await reassign(CorporationsModel, 'corporation', 'C', 'Corporation');
  await reassign(DealsModel, 'deal', 'D', 'Deal');

  console.log('\nDone. Closing connection.');
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
