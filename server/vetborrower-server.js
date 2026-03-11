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
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { OutputConsoleMessage, OutputConsoleErrorMessage } from './utils.js';
import { GetSettings } from './dbAccessFunctions/settingsRecord.js';
import { GetUserAccountCount } from './dbAccessFunctions/userAccountRecord.js';
import UserAccountModel from './dbModel/userAccountModel.js';
import routeAuth from './routes/routeAuth.js';
import routeUserAccount from './routes/routeUserAccount.js';
import routeCorporationRecord from './routes/routeCorporationRecord.js';
import routeDealRecord from './routes/routeDealRecord.js';
import routeBroker from './routes/routeBroker.js';
import routeSettings from './routes/routeSettings.js';
import routeOffice from './routes/routeOffice.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the flag that indicates we are in the test environment
 */
dotenv.config({ path: resolve(__dirname, '../.env'), quiet: true });
const isTestEnvironment = process.env.VITE_ENV_IS_TEST_ENV?.toLocaleLowerCase() === "true";
OutputConsoleMessage(`System is running in ${isTestEnvironment ? 'TEST' : 'LIVE'} environment`);

/**
 * Load server-side environment variables
 */
dotenv.config({ path: resolve(__dirname, '.env'), quiet: true });

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

/**
 * Forces this server to use the 'built' react files in the 'dist' directory
 * to serve / display the web page rather than serving the static files from
 * the default web server, (could be the development environment server or
 * the hosting web server).
 */
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * Connect to the MongoDB
 */
const connectToMongoDB = async (connectionString) => {
  try {
    await mongoose.connect(connectionString);
    OutputConsoleMessage('Mongoose connected.');
  } catch (error) {
    OutputConsoleErrorMessage('MongoDB connection error:', error);
    process.exit(1);
  }
};

const dbParams = `${process.env.MONGODB_SCHEME}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}?retryWrites=true&w=majority&appName=VetBorrower`;

/**
 * Start the server: connect to DB, fetch settings, apply rate limiting, listen
 */
let server;

async function startServer() {
  await connectToMongoDB(dbParams);

  const settings = await GetSettings();
  if (!settings) {
    OutputConsoleErrorMessage('No settings record found in DB. Cannot start server.');
    process.exit(1);
  }

  /**
   * Apply rate limiting from settings
   */
  OutputConsoleMessage('Rate Limit', settings.rateLimitPerSecond + '/second');
  const limiter = rateLimit({
    windowMs: 1000,
    max: settings.rateLimitPerSecond,
    message: `Rate limit ${settings.rateLimitPerSecond}/second exceeded (429 error)`
  });
  app.use(limiter);

  /**
   * Seed default admin account if no users exist
   */
  const userCount = await GetUserAccountCount();
  if (userCount === 0) {
    const now = new Date();
    await UserAccountModel.collection.insertOne({
      email: process.env.DEFAULT_ADMIN_EMAIL.toLowerCase(),
      password: process.env.DEFAULT_ADMIN_PASSWORD_HASH,
      firstName: process.env.DEFAULT_ADMIN_FIRST_NAME,
      lastName: process.env.DEFAULT_ADMIN_LAST_NAME,
      role: 'root',
      isActive: true,
      dateRecordCreated: now,
      dateRecordLastUpdated: now,
    });
    OutputConsoleMessage('Default root account created:', process.env.DEFAULT_ADMIN_EMAIL);
  }

  /**
   * Routes
   */
  app.use(routeAuth);
  app.use(routeUserAccount);
  app.use(routeCorporationRecord);
  app.use(routeDealRecord);
  app.use(routeBroker);
  app.use(routeSettings);
  app.use(routeOffice);

  // Serve React App for all other routes
  app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  /**
   * Server listener, the '127.0.0.1' ensures localhost always resolves
   * to an IP4 address. Without this, the NGINX server may on occasion
   * try to map localhost to an IP6 address.
   */
  server = app.listen(settings.serverPort, '127.0.0.1', () => {
    OutputConsoleMessage(`Server is running on port ${settings.serverPort}`);
  });
}

startServer().catch((error) => {
  OutputConsoleErrorMessage('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

let isShuttingDown = false;
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    OutputConsoleMessage('Shutting down server...');
    await mongoose.connection.close(false);
    OutputConsoleMessage('MongoDB connection closed.');

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve(null);
        });
      });
    }
    OutputConsoleMessage('Server closed.');
    process.exit(0);
  } catch (error) {
    OutputConsoleErrorMessage('Error during shutdown:', error);
    process.exit(1);
  }
}
