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
import dotenv from 'dotenv';
import { OutputConsoleMessage } from './utils.js';

/**
 * Set up the environment file, exit if it cannot be loaded
 */
const envData = dotenv.config({path:"./.env", override: true });
if (envData.error) {
  OutputConsoleMessage("Error loading '.env' file:", envData.error);
  process.exit(1);
}

/**
 * Get the configuration data from the server .env file; the port number is optionally
 * assigned by either the local environment, or the host server hosting this app.
 * (roomPreferences/server/.env)
 */
const MONGODB_RUNNING_ON_LOCAL_HOST = process.env.MONGODB_RUNNING_ON_LOCAL_HOST;

// Set up the MongoDB environment variables
let MONGODB_URL = process.env.MONGODB_URL_RM;
let MONGODB_PASSWORD = process.env.MONGODB_PASSWORD_RM;
let MONGODB_USERNAME = process.env.MONGODB_USERNAME_RM;
let MONGODB_SCHEME = process.env.MONGODB_SCHEME_RM;

if (MONGODB_RUNNING_ON_LOCAL_HOST === "true") {
  MONGODB_URL = process.env.MONGODB_URL_LH;
  MONGODB_PASSWORD = process.env.MONGODB_PASSWORD_LH;
  MONGODB_USERNAME = process.env.MONGODB_USERNAME_LH;
  MONGODB_SCHEME = process.env.MONGODB_SCHEME_LH;
}

/**
 * Log the MongoDB parameters (MI6-DB-Service/server/.env)
*/
OutputConsoleMessage("Mongo DB URL:", MONGODB_URL);
//OutputConsoleMessage("Mongo DB Password", MONGODB_PASSWORD);
OutputConsoleMessage("Mongo DB Username", MONGODB_USERNAME);
OutputConsoleMessage("Mongo DB Scheme", MONGODB_SCHEME);

export {
  MONGODB_RUNNING_ON_LOCAL_HOST,
  MONGODB_URL,
  MONGODB_PASSWORD,
  MONGODB_USERNAME,
  MONGODB_SCHEME,
};