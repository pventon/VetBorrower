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
  GetAllCorporations,
  GetCorporationById,
  AddCorporation,
  UpdateCorporation,
  DeleteCorporation
} from '../dbAccessFunctions/corporationRecord.js';

const router = express.Router();

// Get all corporations
router.get('/api/corporation', async (req, res) => {
  try {
    const records = await GetAllCorporations();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get corporation by ID
router.get('/api/corporation/:id', async (req, res) => {
  try {
    const record = await GetCorporationById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Corporation not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a corporation
router.post('/api/corporation', async (req, res) => {
  try {
    const record = await AddCorporation(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a corporation
router.put('/api/corporation/:id', async (req, res) => {
  try {
    const record = await UpdateCorporation(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Corporation not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a corporation
router.delete('/api/corporation/:id', async (req, res) => {
  try {
    const record = await DeleteCorporation(req.params.id);
    if (!record) return res.status(404).json({ error: 'Corporation not found' });
    res.json({ message: 'Corporation deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
