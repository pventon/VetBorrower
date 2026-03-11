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
import jwt from 'jsonwebtoken';
import { GetUserAccountByEmail, UpdateUserAccount } from '../dbAccessFunctions/userAccountRecord.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Login
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Need to explicitly select password since toJSON strips it
    const user = await GetUserAccountByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is disabled. Contact an administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last login
    await UpdateUserAccount(user._id, { lastLogin: new Date() });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, officeAcronym: user.officeAcronym ?? '' },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '8h') }
    );

    res.json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile (requires authentication)
router.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await GetUserAccountByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
