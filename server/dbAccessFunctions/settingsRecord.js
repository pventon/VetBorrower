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
import SettingsModel from '../dbModel/settingsModel.js';

export async function GetSettings() {
  return await SettingsModel.findOne({});
}

export async function AddSettings(data) {
  const record = new SettingsModel(data);
  return await record.save();
}

export async function UpdateSettings(id, data) {
  return await SettingsModel.findByIdAndUpdate(id, data, { returnDocument: 'after' });
}

export async function DeleteSettings(id) {
  return await SettingsModel.findByIdAndDelete(id);
}
