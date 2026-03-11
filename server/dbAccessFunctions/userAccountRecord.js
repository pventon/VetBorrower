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
import UserAccountModel from '../dbModel/userAccountModel.js';

export async function GetAllUserAccounts() {
  return await UserAccountModel.find({});
}

export async function GetUserAccountById(id) {
  return await UserAccountModel.findById(id);
}

export async function GetUserAccountByEmail(email) {
  return await UserAccountModel.findOne({ email: email.toLowerCase() });
}

export async function AddUserAccount(data) {
  data.dateRecordCreated = new Date();
  data.dateRecordLastUpdated = new Date();
  const record = new UserAccountModel(data);
  return await record.save();
}

export async function UpdateUserAccount(id, data) {
  data.dateRecordLastUpdated = new Date();
  return await UserAccountModel.findByIdAndUpdate(id, data, { returnDocument: 'after' });
}

export async function DeleteUserAccount(id) {
  return await UserAccountModel.findByIdAndDelete(id);
}

export async function GetUserAccountCount() {
  return await UserAccountModel.countDocuments();
}
