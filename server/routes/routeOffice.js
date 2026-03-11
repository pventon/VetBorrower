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
  GetAllOffices,
  GetOfficeById,
  GetAllOfficeAcronyms,
  AddOffice,
  UpdateOffice,
  DeleteOffice
} from '../dbAccessFunctions/officeRecord.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all office acronyms (root and admin — admin needs this to assign offices to users)
router.get('/api/office/acronyms', authenticateToken, authorizeRoles('root', 'admin'), async (req, res) => {
  try {
    const acronyms = await GetAllOfficeAcronyms();
    res.json(acronyms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all offices (root only)
router.get('/api/office', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const records = await GetAllOffices();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get office by ID (root only)
router.get('/api/office/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const record = await GetOfficeById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Office not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add an office (root only)
router.post('/api/office', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const record = await AddOffice(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an office (root only)
router.put('/api/office/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const record = await UpdateOffice(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'Office not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an office (root only)
router.delete('/api/office/:id', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const record = await DeleteOffice(req.params.id);
    if (!record) return res.status(404).json({ error: 'Office not found' });
    res.json({ message: 'Office deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
