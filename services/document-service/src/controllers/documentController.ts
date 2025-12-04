import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Document from '../models/Document';
import DocumentTemplate from '../models/DocumentTemplate';
import * as s3Service from '../services/s3Service';
import * as ocrService from '../services/ocrService';
import * as signatureService from '../services/signatureService';

// Upload document
export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const { name, description, category, subcategory, employeeId, departmentId, tags, isConfidential, expiryDate, effectiveDate, visibility, processOcr } = req.body;

    const uploadResult = await s3Service.uploadFile(file.buffer, file.originalname, file.mimetype, tenantId, category, employeeId);

    const document = new Document({
      tenantId,
      employeeId: employeeId ? new mongoose.Types.ObjectId(employeeId) : undefined,
      departmentId: departmentId ? new mongoose.Types.ObjectId(departmentId) : undefined,
      name: name || file.originalname,
      originalName: file.originalname,
      description,
      category,
      subcategory,
      mimeType: file.mimetype,
      size: file.size,
      extension: file.originalname.split('.').pop() || '',
      storage: { provider: 's3', bucket: uploadResult.bucket, key: uploadResult.key, region: uploadResult.region },
      currentVersion: 1,
      versions: [{ version: 1, key: uploadResult.key, size: file.size, uploadedBy: new mongoose.Types.ObjectId(userId), uploadedAt: new Date(), checksum: uploadResult.checksum }],
      metadata: { tags: tags ? JSON.parse(tags) : [], isConfidential: isConfidential === 'true', expiryDate: expiryDate ? new Date(expiryDate) : undefined, effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined },
      access: { visibility: visibility || 'private' },
      audit: [{ action: 'upload', userId: new mongoose.Types.ObjectId(userId), timestamp: new Date(), ipAddress: req.ip, userAgent: req.headers['user-agent'] }],
      uploadedBy: new mongoose.Types.ObjectId(userId),
    });

    await document.save();
    res.status(201).json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, departmentId, category, search, tags, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId, isDeleted: false };
    if (employeeId) query.employeeId = new mongoose.Types.ObjectId(employeeId as string);
    if (departmentId) query.departmentId = new mongoose.Types.ObjectId(departmentId as string);
    if (category) query.category = category;
    if (tags) query['metadata.tags'] = { $in: (tags as string).split(',') };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];

    const documents = await Document.find(query).sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)).select('-versions -audit').lean();
    const total = await Document.countDocuments(query);
    res.json({ success: true, data: documents, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { documentId } = req.params;
    const document = await Document.findOne({ _id: documentId, tenantId, isDeleted: false });
    if (!document) { res.status(404).json({ success: false, message: 'Document not found' }); return; }
    document.audit.push({ action: 'view', userId: new mongoose.Types.ObjectId(userId), timestamp: new Date(), ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    await document.save();
    res.json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDownloadUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { documentId } = req.params;
    const { version } = req.query;
    const document = await Document.findOne({ _id: documentId, tenantId, isDeleted: false });
    if (!document) { res.status(404).json({ success: false, message: 'Document not found' }); return; }
    let key = document.storage.key;
    if (version) { const versionData = document.versions.find((v) => v.version === Number(version)); if (versionData) key = versionData.key; }
    const downloadUrl = await s3Service.getSignedDownloadUrl(key, 3600, document.originalName);
    document.audit.push({ action: 'download', userId: new mongoose.Types.ObjectId(userId), timestamp: new Date(), ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    await document.save();
    res.json({ success: true, data: { url: downloadUrl, expiresIn: 3600 } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { documentId } = req.params;
    const file = req.file;
    const { comment } = req.body;
    if (!file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
    const document = await Document.findOne({ _id: documentId, tenantId, isDeleted: false });
    if (!document) { res.status(404).json({ success: false, message: 'Document not found' }); return; }
    const newVersion = document.currentVersion + 1;
    const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');
    const { key } = await s3Service.uploadVersion(file.buffer, document.storage.key, newVersion, file.mimetype);
    document.storage.key = key;
    document.size = file.size;
    document.currentVersion = newVersion;
    document.versions.push({ version: newVersion, key, size: file.size, uploadedBy: new mongoose.Types.ObjectId(userId), uploadedAt: new Date(), comment, checksum });
    document.audit.push({ action: 'edit', userId: new mongoose.Types.ObjectId(userId), timestamp: new Date(), ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    await document.save();
    res.json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const signDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { documentId } = req.params;
    const { userName, email, reason, signatureImage } = req.body;
    const document = await Document.findOne({ _id: documentId, tenantId, isDeleted: false });
    if (!document) { res.status(404).json({ success: false, message: 'Document not found' }); return; }
    if (document.mimeType !== 'application/pdf') { res.status(400).json({ success: false, message: 'Only PDF documents can be signed' }); return; }
    const fileBuffer = await s3Service.getFileBuffer(document.storage.key);
    if (!fileBuffer) { res.status(500).json({ success: false, message: 'Failed to retrieve document' }); return; }
    const signatureData = { userId, userName, email, timestamp: new Date(), ipAddress: req.ip, reason };
    let signedPdfBuffer = signatureImage ? await signatureService.addElectronicSignatureToPdf(fileBuffer, signatureData, Buffer.from(signatureImage, 'base64')) : await signatureService.addElectronicSignatureToPdf(fileBuffer, signatureData);
    const newVersion = document.currentVersion + 1;
    const checksum = crypto.createHash('md5').update(signedPdfBuffer).digest('hex');
    const { key } = await s3Service.uploadVersion(signedPdfBuffer, document.storage.key, newVersion, 'application/pdf');
    document.storage.key = key;
    document.size = signedPdfBuffer.length;
    document.currentVersion = newVersion;
    document.versions.push({ version: newVersion, key, size: signedPdfBuffer.length, uploadedBy: new mongoose.Types.ObjectId(userId), uploadedAt: new Date(), comment: `Signed by ${userName}`, checksum });
    if (!document.signature) document.signature = { isSigned: true, signedBy: [], signatureType: 'electronic', isVerified: true };
    document.signature.isSigned = true;
    document.signature.signedBy = document.signature.signedBy || [];
    document.signature.signedBy.push({ userId: new mongoose.Types.ObjectId(userId), name: userName, email, signedAt: new Date(), ipAddress: req.ip });
    document.audit.push({ action: 'sign', userId: new mongoose.Types.ObjectId(userId), timestamp: new Date(), ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    await document.save();
    res.json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { documentId } = req.params;
    const document = await Document.findOneAndUpdate({ _id: documentId, tenantId, isDeleted: false }, { isDeleted: true, deletedAt: new Date(), deletedBy: new mongoose.Types.ObjectId(userId), $push: { audit: { action: 'delete', userId: new mongoose.Types.ObjectId(userId), timestamp: new Date(), ipAddress: req.ip } } }, { new: true });
    if (!document) { res.status(404).json({ success: false, message: 'Document not found' }); return; }
    res.json({ success: true, message: 'Document deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const shareDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { documentId } = req.params;
    const { visibility, allowedUsers, allowedRoles, allowedDepartments } = req.body;
    const document = await Document.findOne({ _id: documentId, tenantId, isDeleted: false });
    if (!document) { res.status(404).json({ success: false, message: 'Document not found' }); return; }
    document.access = { visibility, allowedUsers: allowedUsers?.map((id: string) => new mongoose.Types.ObjectId(id)), allowedRoles, allowedDepartments: allowedDepartments?.map((id: string) => new mongoose.Types.ObjectId(id)) };
    document.audit.push({ action: 'share', userId: new mongoose.Types.ObjectId(userId), timestamp: new Date(), ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    await document.save();
    res.json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const template = new DocumentTemplate({ ...req.body, tenantId, createdBy: new mongoose.Types.ObjectId(userId) });
    await template.save();
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { type, isActive } = req.query;
    const query: any = { tenantId };
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const templates = await DocumentTemplate.find(query).sort({ name: 1 }).lean();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { templateId } = req.params;
    const template = await DocumentTemplate.findOne({ _id: templateId, tenantId });
    if (!template) { res.status(404).json({ success: false, message: 'Template not found' }); return; }
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpiringDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { days = 30 } = req.query;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(days));
    const documents = await Document.find({ tenantId, isDeleted: false, 'metadata.expiryDate': { $lte: expiryDate, $gte: new Date() } }).sort({ 'metadata.expiryDate': 1 }).lean();
    res.json({ success: true, data: documents });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAuditTrail = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { documentId } = req.params;
    const document = await Document.findOne({ _id: documentId, tenantId }, { audit: 1, name: 1 }).lean();
    if (!document) { res.status(404).json({ success: false, message: 'Document not found' }); return; }
    res.json({ success: true, data: document.audit });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
