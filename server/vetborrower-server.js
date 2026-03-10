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
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { OutputConsoleMessage, OutputConsoleErrorMessage } from './utils.js';

const app = express();
const PORT = 9195;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the flag that indicates we are in the test environment
 */
dotenv.config({ path: resolve(__dirname, '../.env'), quiet: true });
const isTestEnvironment = process.env.VITE_ENV_IS_TEST_ENV?.toLocaleLowerCase() === "true";
OutputConsoleMessage(`System is running in ${isTestEnvironment ? 'TEST' : 'LIVE'} environment`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Serve React App for all other routes
app.get('*path', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, '127.0.0.1', () => {
  OutputConsoleMessage(`Server is running on port ${PORT}`);
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
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
    OutputConsoleMessage('Server closed.');
    process.exit(0);
  } catch (error) {
    OutputConsoleErrorMessage('Error during shutdown:', error);
    process.exit(1);
  }
}
