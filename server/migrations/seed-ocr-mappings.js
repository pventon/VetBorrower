/**
 * One-time migration: Seed initial OCR field mappings into settings.
 *
 * Usage:  node --experimental-modules server/migrations/seed-ocr-mappings.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const connStr = `${process.env.MONGODB_SCHEME}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}?retryWrites=true&w=majority&appName=VetBorrower`;

import SettingsModel from '../dbModel/settingsModel.js';

const initialMappings = [
  { documentLabels: "Funded Amount|Fund Amt|Funding Amount", dealField: "fundedAmount", fieldLabel: "Funded Amount ($)" },
  { documentLabels: "Funded Date|Funding Date|Fund Date", dealField: "fundedDate", fieldLabel: "Funded Date" },
  { documentLabels: "Origination Fee|Orig Fee|Origination", dealField: "originationFeePercent", fieldLabel: "Origination Fee (%)" },
  { documentLabels: "Buy Rate|BuyRate|Buy-Rate", dealField: "buyRate", fieldLabel: "Buy Rate" },
  { documentLabels: "Broker Fee|Broker %|Broker Percent", dealField: "brokerFee", fieldLabel: "Broker Fee (%)" },
  { documentLabels: "Loan Term|Term|Loan Days", dealField: "loanTerm", fieldLabel: "Loan Term (days)" },
  { documentLabels: "Payment Frequency|Pay Frequency|Frequency", dealField: "paymentFrequency", fieldLabel: "Payment Frequency" },
  { documentLabels: "Position|Positions|Pos", dealField: "position", fieldLabel: "Position" },
  { documentLabels: "MCA History|MCA|MCA Hist", dealField: "mcaHistory", fieldLabel: "MCA History" },
];

async function run() {
  await mongoose.connect(connStr);
  console.log('Connected to MongoDB');

  const settings = await SettingsModel.findOne();
  if (!settings) {
    console.log('No settings record found!');
    process.exit(1);
  }

  if (settings.ocrFieldMappings && settings.ocrFieldMappings.length > 0) {
    console.log(`Settings already has ${settings.ocrFieldMappings.length} OCR mappings. Skipping seed.`);
  } else {
    settings.ocrFieldMappings = initialMappings;
    await settings.save();
    console.log(`Seeded ${initialMappings.length} OCR field mappings.`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
