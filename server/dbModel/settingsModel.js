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
import mongoose from 'mongoose';

const IndustryType = new mongoose.Schema({

  type: String,
  sic: Number,

}, { _id: false });

const UsState = new mongoose.Schema({

  acronym: String,
  fullname: String,

}, { _id: false });

const UserRole = new mongoose.Schema({

  role: String,
  description: String,

}, { _id: false });

const ExpenseCategory = new mongoose.Schema({
  category: String,
  officeAcronym: String,
}, { _id: false });

const FeeCategory = new mongoose.Schema({
  category: String,
  officeAcronym: String,
}, { _id: false });

const OcrFieldMapping = new mongoose.Schema({
  documentLabels: String,    // Pipe-separated aliases, e.g. "Funded Amount|Fund Amt"
  dealField: String,         // Target field key, e.g. "fundedAmount"
  fieldLabel: String,        // Human-readable field name, e.g. "Funded Amount ($)"
}, { _id: false });

// Define the settings schema
const settingsSchema = new mongoose.Schema({
  // ************************************************************************
  // GUI Settings
  // ************************************************************************

  // Specifies the number of records to display in a list when there is a
  // large number of records to display. Each value can be selected in a
  // GUI dropdown to display the required number of records on a given page
  guiPaginationValues: [Number],
  // ************************************************************************

  // ************************************************************************
  // Server settings
  // ************************************************************************
  // Applications server port number
  serverPort: Number,

  // The rate at which the API can be accessed
  rateLimitPerSecond: Number,
  // ************************************************************************

  // ************************************************************************
  // Enumerations
  // ************************************************************************
  industryTypes: [IndustryType],

  usStates: [UsState],

  userRoles: [UserRole],

  expenseCategories: [ExpenseCategory],

  feeCategories: [FeeCategory],

  ocrFieldMappings: [OcrFieldMapping],
  // ************************************************************************

  // Internal record data
  dateRecordCreated: Date,                // Date this record was created
  dateRecordLastUpdated: Date,            // Date that this recored was last updated

}, {
  collection: "settings"              // Explicitly set the collection name
});

// Create the DB model based on the schema
const SettingsModel = mongoose.model('Settings', settingsSchema);

export default SettingsModel;