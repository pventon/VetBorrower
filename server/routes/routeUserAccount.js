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
import bcrypt from 'bcrypt';
import {
  GetAllUserAccounts,
  GetUserAccountById,
  AddUserAccount,
  UpdateUserAccount,
  DeleteUserAccount
} from '../dbAccessFunctions/userAccountRecord.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all user accounts (root or admin; non-root callers never see root accounts)
router.get('/api/useraccount', authenticateToken, authorizeRoles('root', 'admin'), async (req, res) => {
  try {
    const records = await GetAllUserAccounts();
    const visible = req.user.role === 'root'
      ? records
      : records.filter(r => r.role !== 'root');
    res.json(visible);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user account by ID (admin only)
router.get('/api/useraccount/:id', authenticateToken, authorizeRoles('root', 'admin'), async (req, res) => {
  try {
    const record = await GetUserAccountById(req.params.id);
    if (!record) return res.status(404).json({ error: 'User account not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a user account (root or admin)
router.post('/api/useraccount', authenticateToken, authorizeRoles('root', 'admin'), async (req, res) => {
  try {
    if (req.body.role === 'root' && req.user.role !== 'root') {
      return res.status(403).json({ error: 'Only root may assign the root role.' });
    }
    const record = await AddUserAccount(req.body);
    res.status(201).json(record);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update a user account (root or admin)
router.put('/api/useraccount/:id', authenticateToken, authorizeRoles('root', 'admin'), async (req, res) => {
  try {
    if (req.body.role === 'root' && req.user.role !== 'root') {
      return res.status(403).json({ error: 'Only root may assign the root role.' });
    }
    // If password is being updated, hash it
    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 12);
    }
    const record = await UpdateUserAccount(req.params.id, req.body);
    if (!record) return res.status(404).json({ error: 'User account not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a user account (admin only)
router.delete('/api/useraccount/:id', authenticateToken, authorizeRoles('root', 'admin'), async (req, res) => {
  try {
    const record = await DeleteUserAccount(req.params.id);
    if (!record) return res.status(404).json({ error: 'User account not found' });
    res.json({ message: 'User account deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
