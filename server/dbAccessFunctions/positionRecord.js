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
import PositionsModel from '../dbModel/positionRecordModel.js';

export async function GetPositionsByIds(ids) {
  return await PositionsModel.find({ _id: { $in: ids } });
}

export async function GetPositionById(id) {
  return await PositionsModel.findById(id);
}

export async function AddPosition(data) {
  const record = new PositionsModel(data);
  return await record.save();
}

export async function UpdatePosition(id, data) {
  return await PositionsModel.findByIdAndUpdate(id, data, { returnDocument: 'after' });
}

export async function DeletePosition(id) {
  return await PositionsModel.findByIdAndDelete(id);
}
