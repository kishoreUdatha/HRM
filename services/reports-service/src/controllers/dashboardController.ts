import { Request, Response } from 'express';
import Dashboard from '../models/Dashboard';
import mongoose from 'mongoose';

// ==================== DASHBOARD CONTROLLERS ====================

export const createDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const dashboard = new Dashboard({
      ...req.body,
      tenantId,
      createdBy: userId,
    });

    await dashboard.save();

    res.status(201).json({
      success: true,
      message: 'Dashboard created successfully',
      data: { dashboard },
    });
  } catch (error) {
    console.error('[Reports Service] Create dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to create dashboard' });
  }
};

export const getDashboards = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const dashboards = await Dashboard.find({
      tenantId,
      isActive: true,
      $or: [
        { createdBy: userId },
        { isPublic: true },
        { sharedWith: userId },
      ],
    })
      .populate('createdBy', 'firstName lastName')
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { dashboards },
    });
  } catch (error) {
    console.error('[Reports Service] Get dashboards error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboards' });
  }
};

export const getDashboardById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const dashboard = await Dashboard.findOne({ _id: id, tenantId, isActive: true })
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    res.status(200).json({ success: true, data: { dashboard } });
  } catch (error) {
    console.error('[Reports Service] Get dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
};

export const updateDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const dashboard = await Dashboard.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard updated',
      data: { dashboard },
    });
  } catch (error) {
    console.error('[Reports Service] Update dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to update dashboard' });
  }
};

export const deleteDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const dashboard = await Dashboard.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: false },
      { new: true }
    );

    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Dashboard deleted' });
  } catch (error) {
    console.error('[Reports Service] Delete dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete dashboard' });
  }
};

export const setDefaultDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    // Remove default from all user's dashboards
    await Dashboard.updateMany(
      { tenantId, createdBy: userId },
      { isDefault: false }
    );

    // Set new default
    const dashboard = await Dashboard.findOneAndUpdate(
      { _id: id, tenantId, createdBy: userId },
      { isDefault: true },
      { new: true }
    );

    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Default dashboard set',
      data: { dashboard },
    });
  } catch (error) {
    console.error('[Reports Service] Set default dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to set default dashboard' });
  }
};

export const addWidget = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const widget = req.body;

    // Generate widget ID
    widget.id = new mongoose.Types.ObjectId().toString();

    const dashboard = await Dashboard.findOneAndUpdate(
      { _id: id, tenantId },
      { $push: { widgets: widget } },
      { new: true }
    );

    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Widget added',
      data: { dashboard },
    });
  } catch (error) {
    console.error('[Reports Service] Add widget error:', error);
    res.status(500).json({ success: false, message: 'Failed to add widget' });
  }
};

export const updateWidget = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id, widgetId } = req.params;
    const updates = req.body;

    const dashboard = await Dashboard.findOne({ _id: id, tenantId });
    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) {
      res.status(404).json({ success: false, message: 'Widget not found' });
      return;
    }

    // Update widget properties
    Object.assign(dashboard.widgets[widgetIndex], updates);
    await dashboard.save();

    res.status(200).json({
      success: true,
      message: 'Widget updated',
      data: { dashboard },
    });
  } catch (error) {
    console.error('[Reports Service] Update widget error:', error);
    res.status(500).json({ success: false, message: 'Failed to update widget' });
  }
};

export const removeWidget = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id, widgetId } = req.params;

    const dashboard = await Dashboard.findOneAndUpdate(
      { _id: id, tenantId },
      { $pull: { widgets: { id: widgetId } } },
      { new: true }
    );

    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Widget removed',
      data: { dashboard },
    });
  } catch (error) {
    console.error('[Reports Service] Remove widget error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove widget' });
  }
};

export const getWidgetData = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id, widgetId } = req.params;

    const dashboard = await Dashboard.findOne({ _id: id, tenantId });
    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) {
      res.status(404).json({ success: false, message: 'Widget not found' });
      return;
    }

    // Generate mock data based on widget type and data source
    const data = generateWidgetData(widget.type, widget.dataSource, widget.query);

    res.status(200).json({
      success: true,
      data: { widgetData: data },
    });
  } catch (error) {
    console.error('[Reports Service] Get widget data error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch widget data' });
  }
};

export const shareDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { userIds, isPublic } = req.body;

    const updateData: Record<string, unknown> = {};
    if (userIds) updateData.sharedWith = userIds;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const dashboard = await Dashboard.findOneAndUpdate(
      { _id: id, tenantId },
      updateData,
      { new: true }
    );

    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard sharing updated',
      data: { dashboard },
    });
  } catch (error) {
    console.error('[Reports Service] Share dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to share dashboard' });
  }
};

export const duplicateDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { name } = req.body;

    const originalDashboard = await Dashboard.findOne({ _id: id, tenantId });
    if (!originalDashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    const newDashboard = new Dashboard({
      tenantId,
      name: name || `${originalDashboard.name} (Copy)`,
      description: originalDashboard.description,
      layout: originalDashboard.layout,
      widgets: originalDashboard.widgets.map(w => ({
        ...w,
        id: new mongoose.Types.ObjectId().toString(),
      })),
      createdBy: userId,
      isDefault: false,
      isPublic: false,
    });

    await newDashboard.save();

    res.status(201).json({
      success: true,
      message: 'Dashboard duplicated',
      data: { dashboard: newDashboard },
    });
  } catch (error) {
    console.error('[Reports Service] Duplicate dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to duplicate dashboard' });
  }
};

// Helper function to generate mock widget data
function generateWidgetData(type: string, dataSource: string, query: Record<string, unknown>): unknown {
  const mockData: Record<string, Record<string, unknown>> = {
    employees: {
      metric: { value: 150, change: 5, changeType: 'increase' },
      chart: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [140, 142, 145, 148, 150, 150],
      },
      table: [
        { id: 1, name: 'John Doe', department: 'Engineering', status: 'active' },
        { id: 2, name: 'Jane Smith', department: 'Sales', status: 'active' },
      ],
    },
    attendance: {
      metric: { value: 94.5, unit: '%', change: 1.2, changeType: 'increase' },
      chart: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        data: [95, 93, 96, 94, 92],
      },
      gauge: { value: 94.5, min: 0, max: 100, target: 95 },
    },
    leave: {
      metric: { value: 12, label: 'Pending Requests' },
      chart: {
        labels: ['Annual', 'Sick', 'Personal', 'Other'],
        data: [280, 95, 45, 30],
      },
    },
    payroll: {
      metric: { value: 2500000, format: 'currency', currency: 'USD' },
      chart: {
        labels: ['Jan', 'Feb', 'Mar'],
        data: [2400000, 2450000, 2500000],
      },
    },
    recruitment: {
      metric: { value: 15, label: 'Open Positions' },
      list: [
        { title: 'Software Engineer', applications: 45 },
        { title: 'Sales Manager', applications: 30 },
        { title: 'Marketing Lead', applications: 25 },
      ],
    },
  };

  const sourceData = mockData[dataSource] || mockData['employees'];
  return sourceData[type] || sourceData['metric'];
}
