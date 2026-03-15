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
  GetAllFunders,
  AddFunder,
  UpdateFunder,
  DeleteFunder
} from '../dbAccessFunctions/funderRecord.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all funders
router.get('/api/funder', authenticateToken, async (req, res) => {
  try {
    const records = await GetAllFunders();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a funder (title-cased, de-duped)
router.post('/api/funder', authenticateToken, async (req, res) => {
  try {
    const record = await AddFunder(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a funder
router.put('/api/funder/:id', authenticateToken, async (req, res) => {
  try {
    const record = await UpdateFunder(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Funder not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a funder
router.delete('/api/funder/:id', authenticateToken, async (req, res) => {
  try {
    const record = await DeleteFunder(req.params.id);
    if (!record) return res.status(404).json({ error: 'Funder not found' });
    res.json({ message: 'Funder deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
