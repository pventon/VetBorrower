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
  GetSettings,
  AddSettings,
  UpdateSettings,
  DeleteSettings
} from '../dbAccessFunctions/settingsRecord.js';

const router = express.Router();

// Get settings (single record)
router.get('/api/settings', async (req, res) => {
  try {
    const record = await GetSettings();
    if (!record) return res.status(404).json({ error: 'Settings not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add settings
router.post('/api/settings', async (req, res) => {
  try {
    const record = await AddSettings(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
router.put('/api/settings/:id', async (req, res) => {
  try {
    const record = await UpdateSettings(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Settings not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete settings
router.delete('/api/settings/:id', async (req, res) => {
  try {
    const record = await DeleteSettings(req.params.id);
    if (!record) return res.status(404).json({ error: 'Settings not found' });
    res.json({ message: 'Settings deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
