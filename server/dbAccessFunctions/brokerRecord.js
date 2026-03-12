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
import BrokersModel from '../dbModel/brokerRecordModel.js';

export async function GetAllBrokers(officeAcronym) {
  return await BrokersModel.aggregate([
    { $match: { officeAcronym } },
    {
      $lookup: {
        from: 'deals',
        localField: '_id',
        foreignField: 'broker',
        as: 'dealDocs'
      }
    },
    {
      $addFields: {
        numberOfFundedDeals: { $size: '$dealDocs' },
        totalDollarAmountFunded: { $sum: '$dealDocs.fundedAmount' },
        totalDollarAmountOfDefaults: {
          $sum: {
            $map: {
              input: '$dealDocs',
              as: 'd',
              in: { $cond: [{ $eq: ['$$d.hasDefaulted', true] }, { $ifNull: ['$$d.amountOwedAsOfDefault', 0] }, 0] }
            }
          }
        },
        totalNumberOfDefaults: {
          $size: {
            $filter: { input: '$dealDocs', as: 'd', cond: { $eq: ['$$d.hasDefaulted', true] } }
          }
        },
        totalCommissionAmount: { $sum: '$dealDocs.brokerCommission' }
      }
    },
    { $project: { dealDocs: 0 } }
  ]);
}

export async function GetBrokerById(id) {
  return await BrokersModel.findById(id);
}

export async function AddBroker(data) {
  const record = new BrokersModel(data);
  return await record.save();
}

export async function UpdateBroker(id, data) {
  return await BrokersModel.findByIdAndUpdate(id, data, { returnDocument: 'after' });
}

export async function DeleteBroker(id) {
  return await BrokersModel.findByIdAndDelete(id);
}

export async function UpdateBrokerStatsIncrement(brokerId, delta) {
  if (!brokerId) return;
  return await BrokersModel.findByIdAndUpdate(brokerId, { $inc: delta });
}
