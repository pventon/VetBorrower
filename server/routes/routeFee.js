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
import { GetFeesByIds, AddFee, UpdateFee, DeleteFee } from '../dbAccessFunctions/feeRecord.js';
import { UpdateDeal, GetDealById } from '../dbAccessFunctions/dealRecord.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get fees for a deal
router.get('/api/fee', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.query;
    if (!dealId) return res.status(400).json({ error: 'dealId query parameter is required' });
    const deal = await GetDealById(dealId);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const records = await GetFeesByIds(deal.fees || []);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a fee and link it to a deal
router.post('/api/fee', authenticateToken, async (req, res) => {
  try {
    const { dealId, ...feeData } = req.body;
    if (!dealId) return res.status(400).json({ error: 'dealId is required' });
    if (!feeData.officeAcronym) feeData.officeAcronym = req.user.officeAcronym;
    const deal = await GetDealById(dealId);
    feeData.dealId = deal.entityId || "";
    const record = await AddFee(feeData);
    const fees = deal.fees || [];
    fees.push(record._id);
    await UpdateDeal(dealId, { fees });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a fee
router.put('/api/fee/:id', authenticateToken, async (req, res) => {
  try {
    const record = await UpdateFee(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Fee not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a fee and unlink from deal
router.delete('/api/fee/:id', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.query;
    const record = await DeleteFee(req.params.id);
    if (!record) return res.status(404).json({ error: 'Fee not found' });
    if (dealId) {
      const deal = await GetDealById(dealId);
      if (deal) {
        const fees = (deal.fees || []).filter(id => id.toString() !== req.params.id);
        await UpdateDeal(dealId, { fees });
      }
    }
    res.json({ message: 'Fee deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
