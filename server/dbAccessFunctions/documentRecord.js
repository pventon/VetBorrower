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
import DocumentsModel from '../dbModel/documentRecordModel.js';

export async function GetDocumentsByDealId(dealId) {
  // Return metadata only (exclude fileData for list views)
  return await DocumentsModel.find({ dealId }).select('-fileData');
}

export async function GetDocumentById(id) {
  return await DocumentsModel.findById(id);
}

export async function AddDocument(data) {
  const record = new DocumentsModel(data);
  return await record.save();
}

export async function DeleteDocument(id) {
  return await DocumentsModel.findByIdAndDelete(id);
}

export async function DeleteDocumentsByDealId(dealId) {
  return await DocumentsModel.deleteMany({ dealId });
}
