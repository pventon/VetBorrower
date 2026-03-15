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

export async function GetAllFunders(filter = {}) {
  return await FundersModel.find(filter).sort({ funderName: 1 });
}

export async function GetFunderById(id) {
  return await FundersModel.findById(id);
}

export async function AddFunder(data) {
  const name = toTitleCase((data.funderName || '').trim());
  if (!name) throw new Error('Funder name is required');
  const officeAcronym = data.officeAcronym || null;
  // Check for duplicate within the same office
  const existing = await FundersModel.findOne({ funderName: name, officeAcronym });
  if (existing) return existing;
  const record = new FundersModel({ funderName: name, officeAcronym });
  return await record.save();
}

export async function UpdateFunder(id, data) {
  const name = toTitleCase((data.funderName || '').trim());
  if (!name) throw new Error('Funder name is required');
  const updateData = { funderName: name };
  if (data.officeAcronym !== undefined) updateData.officeAcronym = data.officeAcronym;
  // Check for duplicate within the same office (excluding self)
  const current = await FundersModel.findById(id);
  const officeAcronym = data.officeAcronym !== undefined ? data.officeAcronym : current?.officeAcronym;
  const existing = await FundersModel.findOne({ funderName: name, officeAcronym, _id: { $ne: id } });
  if (existing) throw new Error('A funder with this name already exists for this office');
  return await FundersModel.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
}

export async function DeleteFunder(id) {
  return await FundersModel.findByIdAndDelete(id);
}
