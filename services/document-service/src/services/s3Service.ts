import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'hrm-documents';

export interface UploadResult {
  key: string;
  bucket: string;
  region: string;
  size: number;
  checksum: string;
  versionId?: string;
}

export async function uploadFile(
  file: Buffer,
  originalName: string,
  mimeType: string,
  tenantId: string,
  category: string,
  employeeId?: string
): Promise<UploadResult> {
  const extension = originalName.split('.').pop() || '';
  const fileName = `${uuidv4()}.${extension}`;
  const key = employeeId
    ? `${tenantId}/employees/${employeeId}/${category}/${fileName}`
    : `${tenantId}/${category}/${fileName}`;

  const checksum = crypto.createHash('md5').update(file).digest('hex');

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: mimeType,
    Metadata: {
      'original-name': encodeURIComponent(originalName),
      'tenant-id': tenantId,
      checksum,
    },
  });

  await s3Client.send(command);

  return {
    key,
    bucket: BUCKET_NAME,
    region: process.env.AWS_REGION || 'us-east-1',
    size: file.length,
    checksum,
  };
}

export async function uploadVersion(
  file: Buffer,
  originalKey: string,
  version: number,
  mimeType: string
): Promise<{ key: string; checksum: string }> {
  const versionKey = originalKey.replace(/(\.[^.]+)$/, `_v${version}$1`);
  const checksum = crypto.createHash('md5').update(file).digest('hex');

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: versionKey,
    Body: file,
    ContentType: mimeType,
    Metadata: { checksum, version: version.toString() },
  });

  await s3Client.send(command);

  return { key: versionKey, checksum };
}

export async function getFileStream(key: string): Promise<ReadableStream | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    return response.Body as ReadableStream;
  } catch (error) {
    console.error('Error getting file from S3:', error);
    return null;
  }
}

export async function getFileBuffer(key: string): Promise<Buffer | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const stream = response.Body as any;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error getting file buffer from S3:', error);
    return null;
  }
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
  downloadFilename?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: downloadFilename
      ? `attachment; filename="${encodeURIComponent(downloadFilename)}"`
      : undefined,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getSignedUploadUrl(
  key: string,
  mimeType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFile(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    return false;
  }
}

export async function copyFile(sourceKey: string, destinationKey: string): Promise<boolean> {
  try {
    const command = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error copying file in S3:', error);
    return false;
  }
}

export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

export async function listFiles(
  prefix: string,
  maxKeys: number = 100
): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);

  return (response.Contents || []).map((item) => ({
    key: item.Key || '',
    size: item.Size || 0,
    lastModified: item.LastModified || new Date(),
  }));
}

export async function getFileMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
  metadata: Record<string, string>;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || '',
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  } catch {
    return null;
  }
}
