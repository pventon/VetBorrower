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
import express from 'express';
import { GetExpensesByIds, AddExpense, UpdateExpense, DeleteExpense } from '../dbAccessFunctions/expenseRecord.js';
import { UpdateDeal, GetDealById } from '../dbAccessFunctions/dealRecord.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get expenses for a deal
router.get('/api/expense', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.query;
    if (!dealId) return res.status(400).json({ error: 'dealId query parameter is required' });
    const deal = await GetDealById(dealId);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const records = await GetExpensesByIds(deal.expenses || []);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add an expense and link it to a deal
router.post('/api/expense', authenticateToken, async (req, res) => {
  try {
    const { dealId, ...expData } = req.body;
    if (!dealId) return res.status(400).json({ error: 'dealId is required' });
    if (!expData.officeAcronym) expData.officeAcronym = req.user.officeAcronym;
    const deal = await GetDealById(dealId);
    expData.dealId = deal.entityId || "";
    const record = await AddExpense(expData);
    const expenses = deal.expenses || [];
    expenses.push(record._id);
    await UpdateDeal(dealId, { expenses });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an expense
router.put('/api/expense/:id', authenticateToken, async (req, res) => {
  try {
    const record = await UpdateExpense(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Expense not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an expense and unlink from deal
router.delete('/api/expense/:id', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.query;
    const record = await DeleteExpense(req.params.id);
    if (!record) return res.status(404).json({ error: 'Expense not found' });
    if (dealId) {
      const deal = await GetDealById(dealId);
      if (deal) {
        const expenses = (deal.expenses || []).filter(id => id.toString() !== req.params.id);
        await UpdateDeal(dealId, { expenses });
      }
    }
    res.json({ message: 'Expense deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
