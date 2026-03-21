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

export interface IndustryType {
  type: string;
  sic: number;
}

export interface UsState {
  acronym: string;
  fullname: string;
}

export interface UserRole {
  role: string;
  description: string;
}

export interface ExpenseCategory {
  category: string;
  officeAcronym: string;
}

export interface FeeCategory {
  category: string;
  officeAcronym: string;
}

export interface OcrFieldMapping {
  documentLabels: string;    // Pipe-separated aliases
  dealField: string;         // Target field key
  fieldLabel: string;        // Human-readable field name
}

export interface SettingsRecord {
  _id: string;
  guiPaginationValues: number[];
  serverPort: number;
  rateLimitPerSecond: number;
  industryTypes: IndustryType[];
  usStates: UsState[];
  userRoles: UserRole[];
  expenseCategories: ExpenseCategory[];
  feeCategories: FeeCategory[];
  ocrFieldMappings: OcrFieldMapping[];
  dateRecordCreated: string;
  dateRecordLastUpdated: string;
}
