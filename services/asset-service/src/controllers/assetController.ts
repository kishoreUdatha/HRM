import { Request, Response } from 'express';
import Asset from '../models/Asset';
import AssetRequest from '../models/AssetRequest';
import mongoose from 'mongoose';

const generateRequestNumber = async (tenantId: string): Promise<string> => {
  const count = await AssetRequest.countDocuments({ tenantId });
  return `AR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// Asset Controllers
export const createAsset = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const asset = new Asset({ ...req.body, tenantId, createdBy: req.body.userId });
    await asset.save();
    res.status(201).json({ success: true, data: asset });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAssets = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { category, status, assignedTo, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId };
    if (category) query.category = category;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const skip = (Number(page) - 1) * Number(limit);
    const [assets, total] = await Promise.all([
      Asset.find(query).populate('assignedTo', 'firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Asset.countDocuments(query),
    ]);
    res.json({ success: true, data: assets, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAssetById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const asset = await Asset.findOne({ _id: id, tenantId }).populate('assignedTo');
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: asset });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const asset = await Asset.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: asset });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignAsset = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { employeeId, notes } = req.body;

    const asset = await Asset.findOne({ _id: id, tenantId });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    if (asset.status !== 'available') return res.status(400).json({ success: false, message: 'Asset not available' });

    asset.assignedTo = employeeId;
    asset.assignedAt = new Date();
    asset.status = 'assigned';
    asset.assignmentHistory.push({ employeeId, assignedAt: new Date(), condition: asset.condition, notes });
    await asset.save();

    res.json({ success: true, data: asset });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const returnAsset = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { condition, notes } = req.body;

    const asset = await Asset.findOne({ _id: id, tenantId });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    const lastAssignment = asset.assignmentHistory[asset.assignmentHistory.length - 1];
    if (lastAssignment) {
      lastAssignment.returnedAt = new Date();
      lastAssignment.condition = condition;
      lastAssignment.notes = notes;
    }

    asset.assignedTo = undefined;
    asset.assignedAt = undefined;
    asset.status = 'available';
    asset.condition = condition;
    await asset.save();

    res.json({ success: true, data: asset });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addMaintenance = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const maintenanceData = req.body;

    const asset = await Asset.findOneAndUpdate(
      { _id: id, tenantId },
      { $push: { maintenanceHistory: { ...maintenanceData, date: new Date() } } },
      { new: true }
    );
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: asset });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeAssets = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const assets = await Asset.find({ tenantId, assignedTo: employeeId, status: 'assigned' });
    res.json({ success: true, data: assets });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Asset Request Controllers
export const createAssetRequest = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const requestNumber = await generateRequestNumber(tenantId);
    const request = new AssetRequest({ ...req.body, tenantId, requestNumber });
    await request.save();
    res.status(201).json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAssetRequests = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, status, requestType } = req.query;
    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (requestType) query.requestType = requestType;

    const requests = await AssetRequest.find(query).populate('employeeId', 'firstName lastName').sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveAssetRequest = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { approvedBy, comments } = req.body;

    const request = await AssetRequest.findOneAndUpdate(
      { _id: id, tenantId },
      { status: 'approved', $push: { approvalWorkflow: { level: 1, approverId: approvedBy, status: 'approved', actionDate: new Date(), comments } } },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const fulfillAssetRequest = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { assetId, fulfilledBy } = req.body;

    const request = await AssetRequest.findOneAndUpdate(
      { _id: id, tenantId, status: 'approved' },
      { status: 'fulfilled', fulfilledAssetId: assetId, fulfilledAt: new Date(), fulfilledBy },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found or not approved' });

    // Assign the asset
    await Asset.findByIdAndUpdate(assetId, { assignedTo: request.employeeId, assignedAt: new Date(), status: 'assigned' });

    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Stats
export const getAssetStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const [byStatus, byCategory, totalValue] = await Promise.all([
      Asset.aggregate([{ $match: { tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $match: { tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $match: { tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true } }, { $group: { _id: null, total: { $sum: '$purchasePrice' }, current: { $sum: '$currentValue' } } }]),
    ]);

    res.json({ success: true, data: { byStatus, byCategory, totalValue: totalValue[0] || { total: 0, current: 0 } } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
