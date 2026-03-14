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

/**
 * Derive the deal state from the deal's current data.
 *
 * State precedence (highest to lowest):
 *   1. "default"   — hasDefaulted is true
 *   2. "renewal"   — renewalDealId is set (this deal has been renewed)
 *   3. "completed" — fully paid back (totalPaybackAmount > 0 and amountPaidIn >= totalPaybackAmount)
 *   4. "active"    — fundedDate is in the past or today
 *   5. "dormant"   — fundedDate is in the future or not set
 *
 * @param {Object} deal - The deal document (plain object or Mongoose doc)
 * @returns {string} The derived state
 */
export function deriveDealState(deal) {
  // Default takes priority — once declared, state is locked
  if (deal.hasDefaulted) {
    return 'default';
  }

  // Renewal — this deal has been superseded by a renewal
  if (deal.renewalDealId) {
    return 'renewed';
  }

  // Check if funded date exists and has been reached
  if (!deal.fundedDate) {
    return 'dormant';
  }

  const now = new Date();
  const fundedDate = new Date(deal.fundedDate);

  // Strip time for date-only comparison
  now.setHours(0, 0, 0, 0);
  fundedDate.setHours(0, 0, 0, 0);

  if (fundedDate > now) {
    return 'dormant';
  }

  // Completed — total payback is defined and amount paid in covers it
  if (deal.totalPaybackAmount > 0 && deal.amountPaidIn >= deal.totalPaybackAmount) {
    return 'completed';
  }

  // Funded date has passed, not defaulted, not renewed, not fully paid
  return 'active';
}

/**
 * Update the dealState field on a deal document if it has changed.
 * Returns true if the state was updated, false if unchanged.
 *
 * @param {Object} deal - Mongoose document
 * @returns {boolean} Whether the state changed
 */
export function applyDealState(deal) {
  const newState = deriveDealState(deal);
  if (deal.dealState !== newState) {
    deal.dealState = newState;
    return true;
  }
  return false;
}
