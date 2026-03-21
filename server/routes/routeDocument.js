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
import multer from 'multer';
import {
  GetDocumentsByDealId,
  GetDocumentById,
  AddDocument,
  DeleteDocument,
  DeleteDocumentsByDealId
} from '../dbAccessFunctions/documentRecord.js';
import { UpdateDeal, GetDealById } from '../dbAccessFunctions/dealRecord.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for memory storage (files stored in MongoDB, not disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 } // 16MB limit (MongoDB document limit)
});

// Get documents for a deal (metadata only, no file data)
router.get('/api/document', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.query;
    if (!dealId) return res.status(400).json({ error: 'dealId query parameter is required' });
    const records = await GetDocumentsByDealId(dealId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload a document and link it to a deal
router.post('/api/document', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { dealId, officeAcronym } = req.body;
    if (!dealId) return res.status(400).json({ error: 'dealId is required' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const docData = {
      dealId,
      officeAcronym: officeAcronym || '',
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileData: req.file.buffer,
    };

    const record = await AddDocument(docData);

    // Add document ID to the deal's documents array
    const deal = await GetDealById(dealId);
    if (deal) {
      const documents = deal.documents || [];
      documents.push(record._id);
      await UpdateDeal(dealId, { documents });
    }

    // Return metadata only (no binary data)
    const { fileData, ...metadata } = record.toObject();
    res.status(201).json(metadata);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload a document for deal creation (no dealId required) — stores doc and returns extracted text
router.post('/api/document/upload-for-mapping', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const docData = {
      dealId: '',  // Will be linked after deal creation
      officeAcronym: req.body.officeAcronym || '',
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileData: req.file.buffer,
    };

    const record = await AddDocument(docData);

    // Extract text
    let extractedText = '';
    const mime = record.mimeType || '';

    if (mime.startsWith('text/') || mime === 'application/csv' || mime === 'application/xml' || mime === 'application/json') {
      extractedText = record.fileData.toString('utf-8');
    } else if (mime === 'application/pdf') {
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const pdfParse = require('pdf-parse');
        const result = await pdfParse(record.fileData);
        extractedText = result.text;
        if (extractedText.trim().length < 20) {
          extractedText = '[PDF appears to be scanned/image-based. Text extraction returned minimal content. Please enter deal values manually from the original document.]';
        }
      } catch (pdfErr) {
        extractedText = `[PDF text extraction failed: ${pdfErr.message || 'Unknown error'}. Please enter deal values manually from the original document.]`;
      }
    } else if (mime.startsWith('image/')) {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(record.fileData);
      extractedText = text;
      await worker.terminate();
    } else {
      extractedText = `[Unsupported file type for text extraction: ${mime}]`;
    }

    const { fileData, ...metadata } = record.toObject();
    res.status(201).json({ ...metadata, extractedText });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Link a temp document to a deal after deal creation
router.put('/api/document/:id/link', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.body;
    if (!dealId) return res.status(400).json({ error: 'dealId is required' });

    const record = await GetDocumentById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Document not found' });

    record.dealId = dealId;
    await record.save();

    // Add document ID to the deal's documents array
    const deal = await GetDealById(dealId);
    if (deal) {
      const documents = deal.documents || [];
      documents.push(record._id);
      await UpdateDeal(dealId, { documents });
    }

    res.json({ message: 'Document linked to deal' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download a document (returns file data)
router.get('/api/document/:id/download', authenticateToken, async (req, res) => {
  try {
    const record = await GetDocumentById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Document not found' });

    res.set({
      'Content-Type': record.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(record.originalName)}"`,
      'Content-Length': record.fileSize,
    });
    res.send(record.fileData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// View a document inline (for double-click to open)
router.get('/api/document/:id/view', authenticateToken, async (req, res) => {
  try {
    const record = await GetDocumentById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Document not found' });

    res.set({
      'Content-Type': record.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(record.originalName)}"`,
      'Content-Length': record.fileSize,
    });
    res.send(record.fileData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OCR / Extract text from a document
router.get('/api/document/:id/ocr', authenticateToken, async (req, res) => {
  try {
    const record = await GetDocumentById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Document not found' });

    let extractedText = '';
    const mime = record.mimeType || '';

    // Text-based files: read directly
    if (mime.startsWith('text/') || mime === 'application/csv' || mime === 'application/xml' || mime === 'application/json') {
      extractedText = record.fileData.toString('utf-8');
    }
    // PDF: use pdf-parse
    else if (mime === 'application/pdf') {
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const pdfParse = require('pdf-parse');
        const result = await pdfParse(record.fileData);
        extractedText = result.text;
        if (extractedText.trim().length < 20) {
          extractedText = '[PDF appears to be scanned/image-based. Text extraction returned minimal content.]';
        }
      } catch (pdfErr) {
        extractedText = `[PDF text extraction failed: ${pdfErr.message || 'Unknown error'}]`;
      }
    }
    // Images: use tesseract OCR
    else if (mime.startsWith('image/')) {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(record.fileData);
      extractedText = text;
      await worker.terminate();
    }
    else {
      extractedText = `[Unsupported file type for text extraction: ${mime}]`;
    }

    res.json({ text: extractedText, fileName: record.originalName, mimeType: mime });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a document and unlink from deal
router.delete('/api/document/:id', authenticateToken, async (req, res) => {
  try {
    const { dealId } = req.query;
    const record = await DeleteDocument(req.params.id);
    if (!record) return res.status(404).json({ error: 'Document not found' });

    if (dealId) {
      const deal = await GetDealById(dealId);
      if (deal) {
        const documents = (deal.documents || []).filter(id => id.toString() !== req.params.id);
        await UpdateDeal(dealId, { documents });
      }
    }
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all documents for a deal
router.delete('/api/document/deal/:dealId', authenticateToken, async (req, res) => {
  try {
    await DeleteDocumentsByDealId(req.params.dealId);
    res.json({ message: 'All documents deleted for deal' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
