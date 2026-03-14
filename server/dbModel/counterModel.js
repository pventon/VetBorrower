/**
 * Copyright (c) 2025 Ventec SW LLC.
 * All rights reserved.
 *
 * This software is the intellectual property of Ventec SW LLC. Permission is
 * hereby denied for any use, copying, modification, distribution, or
 * transmission of this software and its design paradigm, in whole or in
 * part, without the prior written permission of Ventec SW LLC.
 *
 * No part of this source code may be copied, reproduced, distributed,
 * or transmitted in any form or by any means, electronic or mechanical,
 * without the prior written permission of the copyright holder, nor
 * shall it be used for any purpose other than in connection with an
 * agreement or proposed agreement with Ventec SW LLC.
 */
import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: String,           // e.g. "broker", "corporation", "deal"
  seq: { type: Number, default: 999 },  // Last assigned number (starts at 999 so first assigned is 1000)
  prefix: String,        // e.g. "B", "C", "D"
}, {
  collection: "counters"
});

const CounterModel = mongoose.model('Counter', counterSchema);

/**
 * Get the next entity ID for the given entity type.
 * Uses findOneAndUpdate with $inc for atomic increment.
 * Auto-initializes the counter if it doesn't exist yet.
 */
export async function getNextEntityId(entityType, prefix) {
  // Ensure the counter document exists (initialize at 999 so first increment yields 1000)
  await CounterModel.updateOne(
    { _id: entityType },
    { $setOnInsert: { seq: 999, prefix } },
    { upsert: true }
  );
  // Atomically increment and return the new value
  const counter = await CounterModel.findByIdAndUpdate(
    entityType,
    { $inc: { seq: 1 } },
    { returnDocument: 'after' }
  );
  return `${prefix}${counter.seq}`;
}

export default CounterModel;
