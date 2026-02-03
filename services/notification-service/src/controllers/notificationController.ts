import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import axios from 'axios';
import Notification from '../models/Notification';
import NotificationTemplate from '../models/NotificationTemplate';
import emailService from '../services/emailService';
import pushNotificationService from '../services/pushNotificationService';

// Auth service URL for getting users with FCM tokens
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Get notifications for user
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { isRead, category, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId, userId };
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Notification Service] Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
};

// Get unread notification count
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const unreadCount = await Notification.countDocuments({ tenantId, userId, isRead: false });

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error('[Notification Service] Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
    });
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, tenantId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { notification },
    });
  } catch (error) {
    console.error('[Notification Service] Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const result = await Notification.updateMany(
      { tenantId, userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    console.error('[Notification Service] Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
    });
  }
};

// Create notification
export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const headerUserId = req.headers['x-user-id'] as string;

    // Use userId from body, or fall back to header
    const userId = req.body.userId || headerUserId;
    const category = req.body.category || 'system';

    const notification = new Notification({
      ...req.body,
      tenantId,
      userId,
      category,
    });
    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Notification created',
      data: { notification },
    });
  } catch (error) {
    console.error('[Notification Service] Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
    });
  }
};

// Send notification to multiple users
export const sendBulkNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { userIds, type, category, title, message, link, sendEmail } = req.body;

    const notifications = userIds.map((userId: string) => ({
      tenantId,
      userId,
      type,
      category,
      title,
      message,
      link,
    }));

    await Notification.insertMany(notifications);

    // Optionally send emails (would need user emails from user service)
    if (sendEmail) {
      // This would typically call user service to get emails
      console.log('[Notification Service] Email sending requested for bulk notification');
    }

    res.status(201).json({
      success: true,
      message: `${userIds.length} notifications sent`,
    });
  } catch (error) {
    console.error('[Notification Service] Bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk notification',
    });
  }
};

// Delete notification
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({ _id: id, tenantId, userId });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('[Notification Service] Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
    });
  }
};

// Send email
export const sendEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { to, subject, body, cc, bcc, templateCode, variables } = req.body;

    let emailBody = body;

    // If template is specified, use it
    if (templateCode) {
      const template = await NotificationTemplate.findOne({ tenantId, code: templateCode, isActive: true });
      if (template) {
        emailBody = emailService.parseTemplate(template.body, variables || {});
      }
    }

    const result = await emailService.sendEmail({
      tenantId,
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      templateCode,
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: { messageId: result.messageId },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[Notification Service] Send email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
    });
  }
};

// ==================== TEMPLATE CONTROLLERS ====================

export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const template = new NotificationTemplate({ ...req.body, tenantId });
    await template.save();

    res.status(201).json({
      success: true,
      message: 'Template created',
      data: { template },
    });
  } catch (error: unknown) {
    console.error('[Notification Service] Create template error:', error);
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Template with this code already exists',
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
    });
  }
};

export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { category, isActive } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const templates = await NotificationTemplate.find(query).sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    console.error('[Notification Service] Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
    });
  }
};

export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const template = await NotificationTemplate.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Template updated',
      data: { template },
    });
  } catch (error) {
    console.error('[Notification Service] Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
    });
  }
};

export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const template = await NotificationTemplate.findOneAndDelete({ _id: id, tenantId });

    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    console.error('[Notification Service] Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
    });
  }
};

// Seed default templates
export const seedTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const defaultTemplates = [
      {
        name: 'Leave Request Submitted',
        code: 'LEAVE_SUBMITTED',
        category: 'leave',
        subject: 'Leave Request Submitted',
        body: '<p>Dear {{managerName}},</p><p>{{employeeName}} has submitted a leave request from {{startDate}} to {{endDate}}.</p><p>Please review and take action.</p>',
        variables: ['managerName', 'employeeName', 'startDate', 'endDate'],
        channels: ['email', 'inApp'],
      },
      {
        name: 'Leave Approved',
        code: 'LEAVE_APPROVED',
        category: 'leave',
        subject: 'Your Leave Request has been Approved',
        body: '<p>Dear {{employeeName}},</p><p>Your leave request from {{startDate}} to {{endDate}} has been approved.</p>',
        variables: ['employeeName', 'startDate', 'endDate'],
        channels: ['email', 'inApp'],
      },
      {
        name: 'Leave Rejected',
        code: 'LEAVE_REJECTED',
        category: 'leave',
        subject: 'Your Leave Request has been Rejected',
        body: '<p>Dear {{employeeName}},</p><p>Your leave request from {{startDate}} to {{endDate}} has been rejected.</p><p>Reason: {{reason}}</p>',
        variables: ['employeeName', 'startDate', 'endDate', 'reason'],
        channels: ['email', 'inApp'],
      },
      {
        name: 'Payslip Generated',
        code: 'PAYSLIP_GENERATED',
        category: 'payroll',
        subject: 'Your Payslip for {{month}} {{year}}',
        body: '<p>Dear {{employeeName}},</p><p>Your payslip for {{month}} {{year}} has been generated.</p><p>Net Salary: {{netSalary}}</p>',
        variables: ['employeeName', 'month', 'year', 'netSalary'],
        channels: ['email', 'inApp'],
      },
      {
        name: 'Welcome Email',
        code: 'WELCOME_EMPLOYEE',
        category: 'employee',
        subject: 'Welcome to {{companyName}}!',
        body: '<p>Dear {{employeeName}},</p><p>Welcome to {{companyName}}! We are excited to have you on board.</p><p>Your employee ID is: {{employeeCode}}</p>',
        variables: ['employeeName', 'companyName', 'employeeCode'],
        channels: ['email'],
      },
    ];

    const created = [];
    for (const template of defaultTemplates) {
      const existing = await NotificationTemplate.findOne({ tenantId, code: template.code });
      if (!existing) {
        const newTemplate = new NotificationTemplate({ ...template, tenantId });
        await newTemplate.save();
        created.push(newTemplate);
      }
    }

    res.status(200).json({
      success: true,
      message: `${created.length} templates created`,
      data: { templates: created },
    });
  } catch (error) {
    console.error('[Notification Service] Seed templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed templates',
    });
  }
};

// ==================== LATE ATTENDANCE NOTIFICATION ====================

// Send late attendance notification to tenant admins (internal API called by attendance service)
export const sendLateAttendanceNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tenantId,
      employeeId,
      employeeName,
      checkInTime,
      lateByMinutes,
      shiftStartTime,
      isOfflineSync,
    } = req.body;

    if (!tenantId || !employeeId || !employeeName || !lateByMinutes) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: tenantId, employeeId, employeeName, lateByMinutes',
      });
      return;
    }

    console.log(`[Notification Service] Late attendance notification for ${employeeName} (${lateByMinutes} min late)`);

    // 1. Get tenant admins with FCM tokens from auth service
    let adminsWithTokens: Array<{
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      fcmTokens: Array<{ token: string; isActive: boolean }>;
    }> = [];

    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/internal/users-with-fcm-tokens`,
        {
          tenantId,
          roles: ['tenant_admin', 'hr'],
        },
        {
          headers: { 'X-Internal-Service': 'notification-service' },
          timeout: 5000,
        }
      );

      if (response.data.success) {
        adminsWithTokens = response.data.data;
      }
    } catch (error) {
      console.error('[Notification Service] Failed to fetch admins from auth service:', error);
    }

    // 2. Create in-app notifications for all admins
    const adminIds = adminsWithTokens.map(admin => admin._id);

    // If we couldn't get admins from auth service, we still create in-app notification
    // by querying the notification based on tenantId (admin will see it in dashboard)
    const notificationTitle = isOfflineSync
      ? 'Late Check-in Alert (Offline Sync)'
      : 'Late Check-in Alert';

    const notificationMessage = `${employeeName} checked in ${lateByMinutes} minutes late` +
      (shiftStartTime ? ` (Shift starts at ${shiftStartTime})` : '') +
      (checkInTime ? `. Check-in time: ${new Date(checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : '');

    // Create notifications for each admin
    if (adminIds.length > 0) {
      const notifications = adminIds.map(userId => ({
        tenantId,
        userId,
        category: 'attendance',
        type: 'warning',
        title: notificationTitle,
        message: notificationMessage,
        data: {
          employeeId,
          employeeName,
          checkInTime,
          lateByMinutes,
          shiftStartTime,
          isOfflineSync: isOfflineSync || false,
        },
        link: `/attendance?employeeId=${employeeId}`,
        isRead: false,
      }));

      await Notification.insertMany(notifications);
      console.log(`[Notification Service] Created ${notifications.length} in-app notifications`);
    }

    // 3. Send push notifications to admins with FCM tokens
    const allTokens = adminsWithTokens.flatMap(admin =>
      admin.fcmTokens
        .filter(t => t.isActive)
        .map(t => t.token)
    );

    let pushResult = { successCount: 0, failureCount: 0, failedTokens: [] as string[] };

    if (allTokens.length > 0 && pushNotificationService.isEnabled()) {
      pushResult = await pushNotificationService.sendLateAttendanceNotification({
        tokens: allTokens,
        employeeName,
        lateByMinutes,
        checkInTime: new Date(checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        employeeId,
        tenantId,
      });

      console.log(`[Notification Service] Push sent: ${pushResult.successCount} success, ${pushResult.failureCount} failed`);
    } else if (allTokens.length === 0) {
      console.log('[Notification Service] No FCM tokens found for admins');
    }

    res.status(200).json({
      success: true,
      message: 'Late attendance notification sent',
      data: {
        adminsNotified: adminIds.length,
        pushSent: pushResult.successCount,
        pushFailed: pushResult.failureCount,
      },
    });
  } catch (error) {
    console.error('[Notification Service] Late attendance notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send late attendance notification',
    });
  }
};
