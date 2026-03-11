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
  GetAllDeals,
  GetDealById,
  AddDeal,
  UpdateDeal,
  DeleteDeal
} from '../dbAccessFunctions/dealRecord.js';

const router = express.Router();

// Get all deals
router.get('/api/deal', async (req, res) => {
  try {
    const records = await GetAllDeals();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deal by ID
router.get('/api/deal/:id', async (req, res) => {
  try {
    const record = await GetDealById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Deal not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a deal
router.post('/api/deal', async (req, res) => {
  try {
    const record = await AddDeal(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a deal
router.put('/api/deal/:id', async (req, res) => {
  try {
    const record = await UpdateDeal(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Deal not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a deal
router.delete('/api/deal/:id', async (req, res) => {
  try {
    const record = await DeleteDeal(req.params.id);
    if (!record) return res.status(404).json({ error: 'Deal not found' });
    res.json({ message: 'Deal deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
