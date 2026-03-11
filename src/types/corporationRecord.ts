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

export interface Owner {
  ownerName: string[];
  ownerPhone: string[];
  ownerEmail: string[];
  ethnicity: string;
}

export interface Address {
  streetName: string;
  city: string;
  state: string;
  zip: string;
}

export interface CorporationRecord {
  _id: string;
  businessName: string;
  dbaName: string;
  ownerDetails: Owner[];
  percentOfOwnership: number;
  businessAddress: Address;
  homeAddress: Address;
  timeInBusiness: number;
  lengthOfOwnership: number;
  dob: string;
  ficoScore: number;
  stateOfTheBusiness: string;
  industryType: string;
  officeAcronym: string;
  deals: string[];
}
