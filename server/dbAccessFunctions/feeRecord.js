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
import FeesModel from '../dbModel/feeRecordModel.js';

export async function GetAllFees(filter = {}) {
  return await FeesModel.find(filter).sort({ feeNumber: 1 });
}

export async function GetFeesByIds(ids) {
  return await FeesModel.find({ _id: { $in: ids } }).sort({ feeNumber: 1 });
}

export async function GetFeeById(id) {
  return await FeesModel.findById(id);
}

export async function AddFee(data) {
  const record = new FeesModel(data);
  return await record.save();
}

export async function UpdateFee(id, data) {
  return await FeesModel.findByIdAndUpdate(id, data, { returnDocument: 'after' });
}

export async function DeleteFee(id) {
  return await FeesModel.findByIdAndDelete(id);
}
