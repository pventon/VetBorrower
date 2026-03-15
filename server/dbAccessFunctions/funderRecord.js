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
import FundersModel from '../dbModel/funderRecordModel.js';

/**
 * Title-case a string: capitalize the first letter of each word.
 */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

export async function GetAllFunders() {
  return await FundersModel.find({}).sort({ funderName: 1 });
}

export async function GetFunderById(id) {
  return await FundersModel.findById(id);
}

export async function AddFunder(data) {
  const name = toTitleCase((data.funderName || '').trim());
  if (!name) throw new Error('Funder name is required');
  // Check for duplicate (case-insensitive)
  const existing = await FundersModel.findOne({ funderName: name });
  if (existing) return existing; // Return existing instead of creating duplicate
  const record = new FundersModel({ funderName: name });
  return await record.save();
}

export async function UpdateFunder(id, data) {
  const name = toTitleCase((data.funderName || '').trim());
  if (!name) throw new Error('Funder name is required');
  // Check for duplicate (case-insensitive, excluding self)
  const existing = await FundersModel.findOne({ funderName: name, _id: { $ne: id } });
  if (existing) throw new Error('A funder with this name already exists');
  return await FundersModel.findByIdAndUpdate(id, { funderName: name }, { returnDocument: 'after' });
}

export async function DeleteFunder(id) {
  return await FundersModel.findByIdAndDelete(id);
}
