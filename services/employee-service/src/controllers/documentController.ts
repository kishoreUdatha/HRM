import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Document from '../models/Document';
import mongoose from 'mongoose';

// ==================== DOCUMENT CONTROLLERS ====================

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const document = new Document({
      ...req.body,
      tenantId,
      uploadedBy: userId,
    });

    await document.save();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document },
    });
  } catch (error) {
    console.error('[Employee Service] Upload document error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
};

export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, category, accessLevel, tags, search, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId, isActive: true };
    if (employeeId) query.employeeId = employeeId;
    if (category) query.category = category;
    if (accessLevel) query.accessLevel = accessLevel;
    if (tags) query.tags = { $in: (tags as string).split(',') };

    const skip = (Number(page) - 1) * Number(limit);

    let documents;
    let total;

    if (search) {
      // Text search
      documents = await Document.find({
        ...query,
        $text: { $search: search as string }
      })
        .populate('employeeId', 'firstName lastName employeeId')
        .populate('uploadedBy', 'firstName lastName')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      total = await Document.countDocuments({
        ...query,
        $text: { $search: search as string }
      });
    } else {
      [documents, total] = await Promise.all([
        Document.find(query)
          .populate('employeeId', 'firstName lastName employeeId')
          .populate('uploadedBy', 'firstName lastName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Document.countDocuments(query),
      ]);
    }

    res.status(200).json({
      success: true,
      data: {
        documents,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
};

export const getDocumentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const document = await Document.findOne({ _id: id, tenantId, isActive: true })
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('uploadedBy', 'firstName lastName')
      .populate('departmentIds', 'name')
      .lean();

    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    res.status(200).json({ success: true, data: { document } });
  } catch (error) {
    console.error('[Employee Service] Get document error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch document' });
  }
};

export const updateDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { name, description, category, tags, isConfidential, accessLevel, departmentIds, expiryDate } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags;
    if (isConfidential !== undefined) updateData.isConfidential = isConfidential;
    if (accessLevel) updateData.accessLevel = accessLevel;
    if (departmentIds) updateData.departmentIds = departmentIds;
    if (expiryDate) updateData.expiryDate = expiryDate;

    const document = await Document.findOneAndUpdate(
      { _id: id, tenantId },
      updateData,
      { new: true }
    );

    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Document updated',
      data: { document },
    });
  } catch (error) {
    console.error('[Employee Service] Update document error:', error);
    res.status(500).json({ success: false, message: 'Failed to update document' });
  }
};

export const uploadNewVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { fileUrl, fileSize, mimeType } = req.body;

    const document = await Document.findOne({ _id: id, tenantId });
    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    // Store current version in history
    if (!document.previousVersions) {
      document.previousVersions = [];
    }
    document.previousVersions.push({
      fileUrl: document.fileUrl,
      uploadedAt: document.updatedAt,
      uploadedBy: document.uploadedBy,
    });

    // Update with new version
    document.fileUrl = fileUrl;
    document.fileSize = fileSize;
    document.mimeType = mimeType;
    document.version += 1;
    document.uploadedBy = new mongoose.Types.ObjectId(userId);

    await document.save();

    res.status(200).json({
      success: true,
      message: 'New version uploaded',
      data: { document },
    });
  } catch (error) {
    console.error('[Employee Service] Upload new version error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload new version' });
  }
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    // Soft delete
    const document = await Document.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: false },
      { new: true }
    );

    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('[Employee Service] Delete document error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
};

export const acknowledgeDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { employeeId } = req.body;

    const document = await Document.findOne({ _id: id, tenantId });
    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    // Check if already acknowledged
    const alreadyAcknowledged = document.acknowledgements?.some(
      ack => ack.employeeId.toString() === employeeId
    );

    if (alreadyAcknowledged) {
      res.status(400).json({ success: false, message: 'Document already acknowledged' });
      return;
    }

    if (!document.acknowledgements) {
      document.acknowledgements = [];
    }
    document.acknowledgements.push({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      acknowledgedAt: new Date(),
    });

    await document.save();

    res.status(200).json({
      success: true,
      message: 'Document acknowledged',
      data: { document },
    });
  } catch (error) {
    console.error('[Employee Service] Acknowledge document error:', error);
    res.status(500).json({ success: false, message: 'Failed to acknowledge document' });
  }
};

export const getEmployeeDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;

    const documents = await Document.find({
      tenantId,
      employeeId,
      isActive: true
    })
      .select('name category type fileUrl fileSize createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    console.error('[Employee Service] Get employee documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee documents' });
  }
};

export const getPolicyDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const documents = await Document.find({
      tenantId,
      category: { $in: ['policy', 'legal'] },
      isActive: true,
      accessLevel: { $in: ['public', 'department', 'manager'] }
    })
      .select('name description category type fileUrl createdAt acknowledgements')
      .sort({ createdAt: -1 })
      .lean();

    // Mark which documents user has acknowledged
    const documentsWithStatus = documents.map(doc => ({
      ...doc,
      acknowledged: doc.acknowledgements?.some(
        ack => ack.employeeId.toString() === userId
      ) || false,
    }));

    res.status(200).json({
      success: true,
      data: { documents: documentsWithStatus },
    });
  } catch (error) {
    console.error('[Employee Service] Get policy documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch policy documents' });
  }
};

export const getDocumentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const [totalDocuments, byCategory, byAccessLevel, expiringDocuments] = await Promise.all([
      Document.countDocuments({ tenantId, isActive: true }),
      Document.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Document.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true } },
        { $group: { _id: '$accessLevel', count: { $sum: 1 } } },
      ]),
      Document.countDocuments({
        tenantId,
        isActive: true,
        expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDocuments,
        expiringDocuments,
        byCategory: Object.fromEntries(byCategory.map(c => [c._id, c.count])),
        byAccessLevel: Object.fromEntries(byAccessLevel.map(a => [a._id, a.count])),
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get document stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch document stats' });
  }
};
