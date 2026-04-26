import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment or generate a default one (should be 32 bytes for AES-256)
const getEncryptionKey = (): Buffer => {
  const key = process.env.PAYOUT_ENCRYPTION_KEY;
  if (key) {
    // If key is provided as hex string (64 chars = 32 bytes)
    if (key.length === 64) {
      return Buffer.from(key, 'hex');
    }
    // If key is provided as base64
    if (key.length === 44) {
      return Buffer.from(key, 'base64');
    }
    // Use key directly and hash it to 32 bytes
    return crypto.createHash('sha256').update(key).digest();
  }

  // Default key for development (DO NOT use in production!)
  console.warn('WARNING: Using default encryption key. Set PAYOUT_ENCRYPTION_KEY in production!');
  return crypto.createHash('sha256').update('default-dev-key-change-in-production').digest();
};

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export const encrypt = (text: string): string => {
  if (!text) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return IV + AuthTag + Encrypted data as hex string
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
};

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';

  try {
    const key = getEncryptionKey();

    // Extract IV (first 32 hex chars = 16 bytes)
    const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex');

    // Extract auth tag (next 32 hex chars = 16 bytes)
    const authTag = Buffer.from(
      encryptedText.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
      'hex'
    );

    // Extract encrypted data
    const encrypted = encryptedText.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash sensitive data (one-way, for verification)
 */
export const hash = (text: string): string => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Mask account number for display (show last 4 digits)
 */
export const maskAccountNumber = (accountNumber: string): string => {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return 'XXXX' + accountNumber.slice(-4);
};

/**
 * Generate a secure random reference ID
 */
export const generateReferenceId = (prefix: string = 'PAY'): string => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
};
