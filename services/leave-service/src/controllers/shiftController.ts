import { Request, Response } from 'express';
import Shift from '../models/Shift';
import ShiftAssignment from '../models/ShiftAssignment';
import ShiftSwapRequest from '../models/ShiftSwapRequest';
import mongoose from 'mongoose';

const generateSwapRequestNumber = async (tenantId: string): Promise<string> => {
  const count = await ShiftSwapRequest.countDocuments({ tenantId });
  return `SWP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// Shift Controllers
export const createShift = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const shift = new Shift({ ...req.body, tenantId });
    await shift.save();
    res.status(201).json({ success: true, data: shift });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShifts = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { isActive } = req.query;
    const query: any = { tenantId };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const shifts = await Shift.find(query).sort({ name: 1 });
    res.json({ success: true, data: shifts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShift = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const shift = await Shift.findOneAndUpdate({ _id: id, tenantId }, req.body, { new: true });
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    res.json({ success: true, data: shift });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Shift Assignment Controllers
export const assignShift = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, shiftId, date, notes } = req.body;

    const assignment = await ShiftAssignment.findOneAndUpdate(
      { tenantId, employeeId, date: new Date(date) },
      { tenantId, employeeId, shiftId, date: new Date(date), notes },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkAssignShifts = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { assignments } = req.body;

    const ops = assignments.map((a: any) => ({
      updateOne: {
        filter: { tenantId, employeeId: a.employeeId, date: new Date(a.date) },
        update: { tenantId, employeeId: a.employeeId, shiftId: a.shiftId, date: new Date(a.date) },
        upsert: true,
      },
    }));
    await ShiftAssignment.bulkWrite(ops);
    res.json({ success: true, message: `${assignments.length} shifts assigned` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShiftSchedule = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId, startDate, endDate, departmentId } = req.query;
    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const assignments = await ShiftAssignment.find(query)
      .populate('employeeId', 'firstName lastName departmentId')
      .populate('shiftId')
      .sort({ date: 1, employeeId: 1 });

    let filtered = assignments;
    if (departmentId) {
      filtered = assignments.filter((a: any) =>
        a.employeeId?.departmentId?.toString() === departmentId
      );
    }

    res.json({ success: true, data: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeSchedule = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    const query: any = { tenantId, employeeId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const schedule = await ShiftAssignment.find(query).populate('shiftId').sort({ date: 1 });
    res.json({ success: true, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Shift Swap Controllers
export const createSwapRequest = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const requestNumber = await generateSwapRequestNumber(tenantId);
    const { swapType, targetEmployeeId } = req.body;

    const status = swapType === 'direct' ? 'pending_employee' : 'pending_manager';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const swapRequest = new ShiftSwapRequest({
      ...req.body,
      tenantId,
      requestNumber,
      status,
      expiresAt,
    });
    await swapRequest.save();
    res.status(201).json({ success: true, data: swapRequest });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSwapRequests = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { requesterId, targetEmployeeId, status, swapType } = req.query;
    const query: any = { tenantId };
    if (requesterId) query.requesterId = requesterId;
    if (targetEmployeeId) query.targetEmployeeId = targetEmployeeId;
    if (status) query.status = status;
    if (swapType) query.swapType = swapType;

    const requests = await ShiftSwapRequest.find(query)
      .populate('requesterId', 'firstName lastName')
      .populate('targetEmployeeId', 'firstName lastName')
      .populate('requesterShiftId')
      .populate('targetShiftId')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOpenSwapRequests = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const requests = await ShiftSwapRequest.find({
      tenantId,
      swapType: 'open',
      status: 'pending_manager',
      expiresAt: { $gt: new Date() },
    })
      .populate('requesterId', 'firstName lastName departmentId')
      .populate('requesterShiftId')
      .sort({ requesterShiftDate: 1 });
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const respondToSwapRequest = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { accepted, comments } = req.body;

    const newStatus = accepted ? 'pending_manager' : 'rejected';
    const request = await ShiftSwapRequest.findOneAndUpdate(
      { _id: id, tenantId, status: 'pending_employee' },
      {
        status: newStatus,
        targetEmployeeResponse: { accepted, respondedAt: new Date(), comments },
      },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found or already processed' });
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const expressInterest = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { employeeId, shiftDate, shiftId } = req.body;

    const request = await ShiftSwapRequest.findOneAndUpdate(
      { _id: id, tenantId, swapType: 'open', status: 'pending_manager' },
      {
        $push: {
          interestedEmployees: { employeeId, shiftDate, shiftId, expressedAt: new Date() },
        },
      },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const selectInterest = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { interestedEmployeeId } = req.body;

    const request = await ShiftSwapRequest.findOne({ _id: id, tenantId, swapType: 'open' });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const interest = request.interestedEmployees?.find(
      (i) => i.employeeId.toString() === interestedEmployeeId
    );
    if (!interest) return res.status(400).json({ success: false, message: 'Interest not found' });

    request.targetEmployeeId = interest.employeeId;
    request.targetShiftDate = interest.shiftDate;
    request.targetShiftId = interest.shiftId;
    request.selectedInterest = interest.employeeId;
    await request.save();

    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveSwapRequest = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { approverId, comments } = req.body;

    const request = await ShiftSwapRequest.findOne({ _id: id, tenantId, status: 'pending_manager' });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found or not pending approval' });

    // Execute the swap
    await ShiftAssignment.findOneAndUpdate(
      { tenantId, employeeId: request.requesterId, date: request.requesterShiftDate },
      {
        shiftId: request.targetShiftId,
        originalShiftId: request.requesterShiftId,
        isSwapped: true,
        swapRequestId: request._id,
      }
    );

    await ShiftAssignment.findOneAndUpdate(
      { tenantId, employeeId: request.targetEmployeeId, date: request.targetShiftDate },
      {
        shiftId: request.requesterShiftId,
        originalShiftId: request.targetShiftId,
        isSwapped: true,
        swapRequestId: request._id,
      }
    );

    request.status = 'approved';
    request.managerApproval = { approverId, approved: true, actionDate: new Date(), comments };
    request.completedAt = new Date();
    await request.save();

    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectSwapRequest = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { approverId, comments } = req.body;

    const request = await ShiftSwapRequest.findOneAndUpdate(
      { _id: id, tenantId, status: 'pending_manager' },
      {
        status: 'rejected',
        managerApproval: { approverId, approved: false, actionDate: new Date(), comments },
      },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelSwapRequest = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const request = await ShiftSwapRequest.findOneAndUpdate(
      { _id: id, tenantId, status: { $in: ['pending_employee', 'pending_manager'] } },
      { status: 'cancelled' },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyPendingSwaps = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;

    const requests = await ShiftSwapRequest.find({
      tenantId,
      $or: [
        { requesterId: employeeId },
        { targetEmployeeId: employeeId, status: 'pending_employee' },
      ],
      status: { $in: ['pending_employee', 'pending_manager'] },
    })
      .populate('requesterId', 'firstName lastName')
      .populate('targetEmployeeId', 'firstName lastName')
      .populate('requesterShiftId')
      .populate('targetShiftId');
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
