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
  GetAllBrokers,
  GetBrokerById,
  AddBroker,
  UpdateBroker,
  DeleteBroker
} from '../dbAccessFunctions/brokerRecord.js';

const router = express.Router();

// Get all brokers
router.get('/api/broker', async (req, res) => {
  try {
    const records = await GetAllBrokers();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get broker by ID
router.get('/api/broker/:id', async (req, res) => {
  try {
    const record = await GetBrokerById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Broker not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a broker
router.post('/api/broker', async (req, res) => {
  try {
    const record = await AddBroker(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a broker
router.put('/api/broker/:id', async (req, res) => {
  try {
    const record = await UpdateBroker(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Broker not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a broker
router.delete('/api/broker/:id', async (req, res) => {
  try {
    const record = await DeleteBroker(req.params.id);
    if (!record) return res.status(404).json({ error: 'Broker not found' });
    res.json({ message: 'Broker deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
