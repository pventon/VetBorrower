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
  GetDealById,
  AddDeal,
  UpdateDeal,
  DeleteDeal
} from '../dbAccessFunctions/dealRecord.js';
import { AddDealToCorporation, RemoveDealFromCorporation } from '../dbAccessFunctions/corporationRecord.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getNextEntityId } from '../dbModel/counterModel.js';
import { deriveDealState, applyDealState } from '../dbAccessFunctions/dealStateEngine.js';

const router = express.Router();

// Get deals for a corporation
router.get('/api/deal', authenticateToken, async (req, res) => {
  try {
    const { corporationId } = req.query;
    if (!corporationId) return res.status(400).json({ error: 'corporationId query parameter is required' });
    const records = await GetDealsByCorporation(corporationId);
    // Recalculate deal states and persist any changes
    for (const deal of records) {
      if (applyDealState(deal)) {
        await UpdateDeal(deal._id, { dealState: deal.dealState });
      }
    }
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
    if (applyDealState(record)) {
      await UpdateDeal(record._id, { dealState: record.dealState });
    }
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
    dealData.entityId = await getNextEntityId('deal', 'D');
    dealData.dealState = deriveDealState(dealData);
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
    // Merge with existing deal data to derive state accurately
    const existing = await GetDealById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Deal not found' });
    const merged = { ...existing.toObject(), ...dealData };
    dealData.dealState = deriveDealState(merged);
    const record = await UpdateDeal(req.params.id, dealData);
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Renew a deal — creates a new renewal deal linked to the parent
router.post('/api/deal/:id/renew', authenticateToken, async (req, res) => {
  try {
    const parentId = req.params.id;
    const { corporationId } = req.body;
    if (!corporationId) return res.status(400).json({ error: 'corporationId is required' });

    // Check parent deal exists and hasn't already been renewed
    const parent = await GetDealById(parentId);
    if (!parent) return res.status(404).json({ error: 'Parent deal not found' });
    if (parent.renewalDealId) return res.status(400).json({ error: 'This deal has already been renewed' });

    // Create renewal deal with same broker/office, typeOfDeal = "renewal", linked to parent
    const renewalData = {
      entityId: await getNextEntityId('deal', 'D'),
      officeAcronym: req.user.officeAcronym,
      broker: parent.broker,
      typeOfDeal: 'renewal',
      parentDealId: parentId,
      renewalDealId: null,
      fundedDate: new Date(),
    };
    renewalData.dealState = deriveDealState(renewalData);
    const renewal = await AddDeal(renewalData);

    // Link parent to the new renewal and update its state to 'renewal'
    await UpdateDeal(parentId, { renewalDealId: renewal._id, dealState: 'renewed' });

    // Add renewal to the corporation's deals array
    await AddDealToCorporation(corporationId, renewal._id);

    res.status(201).json(renewal);
  } catch (error) {
    console.error('Renew deal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a deal and unlink it from the corporation
router.delete('/api/deal/:id', authenticateToken, async (req, res) => {
  try {
    const { corporationId } = req.query;
    const deal = await GetDealById(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    // Prevent deleting a deal that has renewals — must delete renewals first
    if (deal.renewalDealId) {
      return res.status(400).json({ error: 'Cannot delete a deal that has renewals. Delete the renewal first.' });
    }

    // If this deal is a renewal, clear the parent's renewalDealId
    if (deal.parentDealId) {
      await UpdateDeal(deal.parentDealId, { renewalDealId: null });
    }

    const record = await DeleteDeal(req.params.id);
    if (corporationId) await RemoveDealFromCorporation(corporationId, req.params.id);
    res.json({ message: 'Deal deleted', record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
