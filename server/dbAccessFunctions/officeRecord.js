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
import OfficeModel from '../dbModel/officeRecordModel.js';

export async function GetAllOffices() {
  return await OfficeModel.find({});
}

export async function GetOfficeById(id) {
  return await OfficeModel.findById(id);
}

export async function GetAllOfficeAcronyms() {
  const records = await OfficeModel.find({}, { officeAcronym: 1, _id: 0 });
  return records.map(r => r.officeAcronym);
}

export async function AddOffice(data) {
  data.dateCreated = new Date();
  data.lastUpdated = new Date();
  const record = new OfficeModel(data);
  return await record.save();
}

export async function UpdateOffice(id, data) {
  data.lastUpdated = new Date();
  return await OfficeModel.findByIdAndUpdate(id, data, { returnDocument: 'after' });
}

export async function DeleteOffice(id) {
  return await OfficeModel.findByIdAndDelete(id);
}
