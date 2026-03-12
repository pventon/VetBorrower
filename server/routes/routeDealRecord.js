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
  GetDealsByCorporation,
  AddDeal,
  UpdateDeal,
  DeleteDeal
} from '../dbAccessFunctions/dealRecord.js';
import { AddDealToCorporation, RemoveDealFromCorporation } from '../dbAccessFunctions/corporationRecord.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get deals for a corporation
router.get('/api/deal', authenticateToken, async (req, res) => {
  try {
    const { corporationId } = req.query;
    if (!corporationId) return res.status(400).json({ error: 'corporationId query parameter is required' });
    const records = await GetDealsByCorporation(corporationId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deal by ID
router.get('/api/deal/:id', authenticateToken, async (req, res) => {
  try {
    const record = await GetDealById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Deal not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a deal and link it to the corporation
router.post('/api/deal', authenticateToken, async (req, res) => {
  try {
    const { corporationId, ...dealData } = req.body;
    if (!corporationId) return res.status(400).json({ error: 'corporationId is required' });
    dealData.officeAcronym = req.user.officeAcronym;
    const record = await AddDeal(dealData);
    await AddDealToCorporation(corporationId, record._id);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a deal
router.put('/api/deal/:id', authenticateToken, async (req, res) => {
  try {
    const dealData = { ...req.body, officeAcronym: req.user.officeAcronym };
    const record = await UpdateDeal(req.params.id, dealData);
    if (!record) return res.status(404).json({ error: 'Deal not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a deal and unlink it from the corporation
router.delete('/api/deal/:id', authenticateToken, async (req, res) => {
  try {
    const { corporationId } = req.query;
    const record = await DeleteDeal(req.params.id);
    if (!record) return res.status(404).json({ error: 'Deal not found' });
    if (corporationId) await RemoveDealFromCorporation(corporationId, req.params.id);
    res.json({ message: 'Deal deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
