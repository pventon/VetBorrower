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

export interface DealRecord {
  _id: string;
  entityId: string;
  officeAcronym: string;
  broker: { _id: string; brokerName: string } | null;  // populated from Brokers collection
  typeOfDeal: string;         // "new" | "renewal"
  position: string;
  fundedDate: string;
  defaultDate: string;
  defaultDays: number;
  fundedAmount: number;
  netFundedAmount: number;
  originationFee: number;
  originationFeePercent: number;
  loanTerm: number;           // days
  weeklyOrDailyPayment: boolean;
  paymentAmount: number;
  buyRate: number;
  factorRate: number;
  mcaHistory: string;
  brokerFee: number;
  brokerCommission: number;
  totalPaybackAmount: number;
  hasDefaulted: boolean;
  amountOwedAsOfDefault: number;
  miscellaneousFees: number;
  miscellaneousExpenses: number;
  discount: number;
  amountPaidIn: number;
  rolledBalance: number;
  netNewCashOut: number;
  roi: number;
  currentRoi: number;
  dealState: string;              // "dormant" | "active" | "completed" | "default" | "renewal"
  renewalDealId: string | null;    // ID of the renewal deal created from this deal
  parentDealId: string | null;     // ID of the parent deal this renewal was created from
}
