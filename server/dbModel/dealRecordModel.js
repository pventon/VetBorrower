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

const dealSchema = new mongoose.Schema({
    
  officeAcronym: String,
  broker: { type: mongoose.Schema.Types.ObjectId, ref: 'Brokers' },
  typeOfDeal: String,             // new/renewal
  position: String,               // Number of lenders assigned 
  fundedDate: Date,
  defaultDate: Date,
  defaultDays: Number,
  renewalDate: Date,
  fundedAmount: Number,
  netFundedAmount: Number,
  originationFee: Number,
  originationFeePercent: Number,
  loanTerm: Number,               // How many days
  weeklyOrDailyPayment: Boolean,  // True = weekly, fale = daily
  paymentAmount: Number,
  buyRate: Number,
  factorRate: Number,
  mcaHistory: String,
  brokerFee: Number,
  brokerCommission: Number,
  totalPaybackAmount: Number,
  
}, {
  collection: "deals"              // Explicitly set the collection name
});
    
// Create the DB model based on the schema
const DealsModel = mongoose.model('Deals', dealSchema);
  
export default DealsModel;