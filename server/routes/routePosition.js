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
import {
  GetPositionsByIds,
  AddPosition,
  UpdatePosition,
  DeletePosition
} from '../dbAccessFunctions/positionRecord.js';
import { UpdateDeal, GetDealById } from '../dbAccessFunctions/dealRecord.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get positions for a deal
router.get('/api/position', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.query;
    if (!dealId) return res.status(400).json({ error: 'dealId query parameter is required' });
    const deal = await GetDealById(dealId);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const records = await GetPositionsByIds(deal.positions || []);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a position and link it to a deal
router.post('/api/position', authenticateToken, async (req, res) => {
  try {
    const { dealId, ...posData } = req.body;
    if (!dealId) return res.status(400).json({ error: 'dealId is required' });
    const record = await AddPosition(posData);
    // Add position ID to the deal's positions array
    const deal = await GetDealById(dealId);
    const positions = deal.positions || [];
    positions.push(record._id);
    await UpdateDeal(dealId, { positions });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a position
router.put('/api/position/:id', authenticateToken, async (req, res) => {
  try {
    const record = await UpdatePosition(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Position not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a position and unlink from deal
router.delete('/api/position/:id', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.query;
    const record = await DeletePosition(req.params.id);
    if (!record) return res.status(404).json({ error: 'Position not found' });
    if (dealId) {
      const deal = await GetDealById(dealId);
      if (deal) {
        const positions = (deal.positions || []).filter(id => id.toString() !== req.params.id);
        await UpdateDeal(dealId, { positions });
      }
    }
    res.json({ message: 'Position deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
