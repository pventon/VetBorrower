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

const Owner = new mongoose.Schema({

  ownerName: [String],
  ownerPhone: [String],
  ownerEmail: [String],
  ethnicity: String,
  dob: Date,
  age: Number,

}, { _id: false });

const Address = new mongoose.Schema({

  streetName: String,
  city: String,
  state: String,
  zip: String,

}, { _id: false });

const corporationSchema = new mongoose.Schema({
  
  businessName: String,
  dbaName: String,                // DBA = Doing Business As
  ownerDetails: [Owner],
  percentOfOwnership: Number,
  businessAddress: Address,
  homeAddress: Address,
  timeInBusiness: Number,         // In days
  businessStartDate: Date,
  lengthOfOwnership: Number,
  ficoScore: Number,
  stateOfTheBusiness: String,     // US state the business operates in
  industryType: String,
  officeAcronym: String,
  deals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Deals' }]

}, {
  collection: "corporations"              // Explicitly set the collection name
});
  
// Create the DB model based on the schema
const CorporationsModel = mongoose.model('Corporations', corporationSchema);

export default CorporationsModel;