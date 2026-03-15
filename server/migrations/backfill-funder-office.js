/**
 * One-time migration: Set officeAcronym to 'JA' for all existing funders that don't have one.
 *
 * Usage:  node server/migrations/backfill-funder-office.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const connStr = `${process.env.MONGODB_SCHEME}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}?retryWrites=true&w=majority&appName=VetBorrower`;

import FundersModel from '../dbModel/funderRecordModel.js';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(connStr);
  console.log('Connected.\n');

  const result = await FundersModel.updateMany(
    { $or: [{ officeAcronym: null }, { officeAcronym: { $exists: false } }, { officeAcronym: "" }] },
    { $set: { officeAcronym: 'JA' } }
  );
  console.log(`Updated ${result.modifiedCount} funder(s) to office JA`);

  console.log('\nDone. Closing connection.');
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
