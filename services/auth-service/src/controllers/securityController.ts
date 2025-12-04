import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import TwoFactorAuth from '../models/TwoFactorAuth';
import SSOConfiguration from '../models/SSOConfiguration';
import SecuritySettings from '../models/SecuritySettings';
import GDPRRequest from '../models/GDPRRequest';
import User from '../models/User';

// ==================== 2FA ENDPOINTS ====================

export const setup2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { method } = req.body;

    let secret: string | undefined;
    let backupCodes: { code: string; used: boolean }[] | undefined;

    if (method === 'totp') {
      secret = crypto.randomBytes(20).toString('hex');
    }

    if (method === 'backup_codes') {
      backupCodes = Array.from({ length: 10 }, () => ({
        code: crypto.randomBytes(4).toString('hex').toUpperCase(),
        used: false
      }));
    }

    const twoFA = await TwoFactorAuth.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), tenantId: new mongoose.Types.ObjectId(tenantId), method },
      { secret, backupCodes, isEnabled: false, failedAttempts: 0 },
      { upsert: true, new: true }
    );

    const responseData: any = { method, isEnabled: false };
    if (method === 'totp' && secret) {
      responseData.secret = secret;
      responseData.qrCodeUrl = `otpauth://totp/HRM:${userId}?secret=${secret}&issuer=HRM`;
    }
    if (method === 'backup_codes') {
      responseData.backupCodes = backupCodes?.map(b => b.code);
    }

    res.json({ success: true, data: responseData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verify2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { method, code } = req.body;

    const twoFA = await TwoFactorAuth.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      method
    }).select('+secret');

    if (!twoFA) {
      res.status(404).json({ success: false, message: '2FA not configured' });
      return;
    }

    if (twoFA.lockedUntil && twoFA.lockedUntil > new Date()) {
      res.status(423).json({ success: false, message: 'Account locked due to too many failed attempts' });
      return;
    }

    let isValid = false;

    if (method === 'totp' && twoFA.secret) {
      // Simple TOTP validation (in production, use a proper library like speakeasy)
      isValid = validateTOTP(twoFA.secret, code);
    } else if (method === 'backup_codes') {
      const backupCode = twoFA.backupCodes?.find(b => b.code === code && !b.used);
      if (backupCode) {
        backupCode.used = true;
        backupCode.usedAt = new Date();
        isValid = true;
      }
    }

    if (!isValid) {
      twoFA.failedAttempts++;
      if (twoFA.failedAttempts >= 5) {
        twoFA.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await twoFA.save();
      res.status(401).json({ success: false, message: 'Invalid code' });
      return;
    }

    twoFA.isEnabled = true;
    twoFA.lastVerified = new Date();
    twoFA.failedAttempts = 0;
    twoFA.lockedUntil = undefined;
    await twoFA.save();

    res.json({ success: true, message: '2FA verified and enabled' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const disable2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { method, password } = req.body;

    const user = await User.findById(userId).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid password' });
      return;
    }

    await TwoFactorAuth.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      method
    });

    res.json({ success: true, message: '2FA disabled' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const get2FAStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const methods = await TwoFactorAuth.find({
      userId: new mongoose.Types.ObjectId(userId),
      tenantId: new mongoose.Types.ObjectId(tenantId)
    }).select('method isEnabled lastVerified');

    res.json({ success: true, data: methods });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== SSO ENDPOINTS ====================

export const createSSOConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const sso = new SSOConfiguration({
      ...req.body,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      createdBy: new mongoose.Types.ObjectId(userId)
    });
    await sso.save();

    res.status(201).json({ success: true, data: sso });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSSOConfigurations = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const configs = await SSOConfiguration.find({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSSOConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { ssoId } = req.params;

    const sso = await SSOConfiguration.findOneAndUpdate(
      { _id: ssoId, tenantId: new mongoose.Types.ObjectId(tenantId) },
      { $set: req.body },
      { new: true }
    );

    if (!sso) {
      res.status(404).json({ success: false, message: 'SSO configuration not found' });
      return;
    }

    res.json({ success: true, data: sso });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSSOConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { ssoId } = req.params;
    await SSOConfiguration.findOneAndDelete({ _id: ssoId, tenantId: new mongoose.Types.ObjectId(tenantId) });
    res.json({ success: true, message: 'SSO configuration deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== SECURITY SETTINGS ENDPOINTS ====================

export const getSecuritySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    let settings = await SecuritySettings.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) });

    if (!settings) {
      settings = new SecuritySettings({ tenantId: new mongoose.Types.ObjectId(tenantId) });
      await settings.save();
    }

    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSecuritySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const settings = await SecuritySettings.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(tenantId) },
      { $set: req.body },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GDPR ENDPOINTS ====================

export const createGDPRRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { type, reason, requestedData } = req.body;

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const gdprRequest = new GDPRRequest({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
      type,
      reason,
      requestedData,
      verificationToken
    });
    await gdprRequest.save();

    res.status(201).json({ success: true, data: gdprRequest, verificationRequired: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGDPRRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { status, type, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId: new mongoose.Types.ObjectId(tenantId) };
    if (status) query.status = status;
    if (type) query.type = type;

    const requests = await GDPRRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await GDPRRequest.countDocuments(query);

    res.json({ success: true, data: requests, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processGDPRRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { requestId } = req.params;
    const { action, notes } = req.body;

    const gdprRequest = await GDPRRequest.findOne({
      _id: requestId,
      tenantId: new mongoose.Types.ObjectId(tenantId)
    });

    if (!gdprRequest) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    if (action === 'approve') {
      gdprRequest.status = 'processing';
      gdprRequest.processedBy = new mongoose.Types.ObjectId(userId);
      gdprRequest.processedAt = new Date();

      if (gdprRequest.type === 'data_export') {
        gdprRequest.exportUrl = `/api/gdpr/export/${gdprRequest._id}`;
        gdprRequest.exportExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        gdprRequest.status = 'completed';
        gdprRequest.completedAt = new Date();
      } else if (gdprRequest.type === 'data_deletion') {
        // Queue data deletion
        gdprRequest.status = 'processing';
      }
    } else if (action === 'reject') {
      gdprRequest.status = 'rejected';
      gdprRequest.processedBy = new mongoose.Types.ObjectId(userId);
      gdprRequest.processedAt = new Date();
    }

    gdprRequest.notes = notes;
    await gdprRequest.save();

    res.json({ success: true, data: gdprRequest });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportUserData = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=user_data_export_${userId}.json`);
    res.json(exportData);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== IP WHITELIST ENDPOINTS ====================

export const checkIPAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const clientIP = req.ip || req.connection.remoteAddress || '';

    const settings = await SecuritySettings.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) });

    if (!settings) {
      res.json({ success: true, allowed: true });
      return;
    }

    if (settings.ipBlacklist?.enabled && settings.ipBlacklist.addresses.includes(clientIP)) {
      res.status(403).json({ success: false, allowed: false, message: 'IP address blocked' });
      return;
    }

    if (settings.ipWhitelist?.enabled && settings.ipWhitelist.addresses.length > 0) {
      const isAllowed = settings.ipWhitelist.addresses.some(ip => {
        if (ip.includes('/')) {
          return isIPInCIDR(clientIP, ip);
        }
        return ip === clientIP;
      });

      if (!isAllowed) {
        res.status(403).json({ success: false, allowed: false, message: 'IP address not in whitelist' });
        return;
      }
    }

    res.json({ success: true, allowed: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper functions
function validateTOTP(secret: string, code: string): boolean {
  // Simplified TOTP validation - in production use speakeasy or similar
  const now = Math.floor(Date.now() / 30000);
  const validCodes = [now - 1, now, now + 1].map(t => {
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(Buffer.from(t.toString(16).padStart(16, '0'), 'hex'));
    const hash = hmac.digest();
    const offset = hash[hash.length - 1] & 0xf;
    const otp = ((hash[offset] & 0x7f) << 24 | (hash[offset + 1] & 0xff) << 16 | (hash[offset + 2] & 0xff) << 8 | (hash[offset + 3] & 0xff)) % 1000000;
    return otp.toString().padStart(6, '0');
  });
  return validCodes.includes(code);
}

function isIPInCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);
  const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);
  return (ipNum & mask) === (rangeNum & mask);
}
