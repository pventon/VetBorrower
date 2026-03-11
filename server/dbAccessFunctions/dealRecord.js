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
import DealsModel from '../dbModel/dealRecordModel.js';
import CorporationsModel from '../dbModel/corporationRecordModel.js';

export async function GetAllDeals() {
  return await DealsModel.find({});
}

export async function GetDealsByCorporation(corpId) {
  const corp = await CorporationsModel.findById(corpId).select('deals');
  if (!corp) return [];
  return await DealsModel.find({ _id: { $in: corp.deals } }).populate('broker', 'brokerName');
}

export async function GetDealById(id) {
  return await DealsModel.findById(id);
}

export async function AddDeal(data) {
  const record = new DealsModel(data);
  return await record.save();
}

export async function UpdateDeal(id, data) {
  return await DealsModel.findByIdAndUpdate(id, data, { returnDocument: 'after' });
}

export async function DeleteDeal(id) {
  return await DealsModel.findByIdAndDelete(id);
}
