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
import ExpensesModel from '../dbModel/expenseRecordModel.js';

export async function GetAllExpenses(filter = {}) {
  return await ExpensesModel.find(filter).sort({ expenseNumber: 1 });
}

export async function GetExpensesByIds(ids) {
  return await ExpensesModel.find({ _id: { $in: ids } }).sort({ expenseNumber: 1 });
}

export async function GetExpenseById(id) {
  return await ExpensesModel.findById(id);
}

export async function AddExpense(data) {
  const record = new ExpensesModel(data);
  return await record.save();
}

export async function UpdateExpense(id, data) {
  return await ExpensesModel.findByIdAndUpdate(id, data, { returnDocument: 'after' });
}

export async function DeleteExpense(id) {
  return await ExpensesModel.findByIdAndDelete(id);
}
