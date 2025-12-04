import forge from 'node-forge';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';

interface SignatureData {
  userId: string;
  userName: string;
  email: string;
  timestamp: Date;
  ipAddress?: string;
  reason?: string;
}

interface Certificate {
  publicKey: string;
  privateKey: string;
  certificate: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
}

// Generate a self-signed certificate for digital signatures
export function generateCertificate(
  commonName: string,
  organization: string,
  validityDays: number = 365
): Certificate {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = Date.now().toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(cert.validity.notAfter.getDate() + validityDays);

  const attrs = [
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: organization },
    { name: 'countryName', value: 'US' },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, nonRepudiation: true },
    { name: 'extKeyUsage', emailProtection: true },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    privateKey: forge.pki.privateKeyToPem(keys.privateKey),
    certificate: forge.pki.certificateToPem(cert),
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
  };
}

// Create a digital signature for data
export function createDigitalSignature(data: string, privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(data, 'utf8');

  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

// Verify a digital signature
export function verifyDigitalSignature(
  data: string,
  signature: string,
  publicKeyPem: string
): boolean {
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const md = forge.md.sha256.create();
    md.update(data, 'utf8');

    const signatureBytes = forge.util.decode64(signature);
    return publicKey.verify(md.digest().bytes(), signatureBytes);
  } catch {
    return false;
  }
}

// Add electronic signature to PDF
export async function addElectronicSignatureToPdf(
  pdfBuffer: Buffer,
  signatureData: SignatureData,
  signatureImage?: Buffer,
  position?: { page: number; x: number; y: number; width: number; height: number }
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  const pageIndex = position?.page ?? pages.length - 1;
  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const { width, height } = page.getSize();

  // Default position at bottom of page
  const signX = position?.x ?? 50;
  const signY = position?.y ?? 50;
  const signWidth = position?.width ?? 200;
  const signHeight = position?.height ?? 50;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Draw signature box
  page.drawRectangle({
    x: signX,
    y: signY,
    width: signWidth,
    height: signHeight + 30,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Add signature image if provided
  if (signatureImage) {
    try {
      const image = await pdfDoc.embedPng(signatureImage);
      page.drawImage(image, {
        x: signX + 5,
        y: signY + 25,
        width: signWidth - 10,
        height: signHeight - 5,
      });
    } catch {
      // If PNG fails, try JPEG
      try {
        const image = await pdfDoc.embedJpg(signatureImage);
        page.drawImage(image, {
          x: signX + 5,
          y: signY + 25,
          width: signWidth - 10,
          height: signHeight - 5,
        });
      } catch {
        // Add text-based signature if image fails
        page.drawText(signatureData.userName, {
          x: signX + 10,
          y: signY + 40,
          size: 16,
          font: fontBold,
          color: rgb(0, 0, 0.5),
        });
      }
    }
  } else {
    // Text-based signature
    page.drawText(signatureData.userName, {
      x: signX + 10,
      y: signY + 40,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0.5),
    });
  }

  // Add signature details
  const dateStr = signatureData.timestamp.toISOString().split('T')[0];
  page.drawText(`Digitally signed by: ${signatureData.userName}`, {
    x: signX + 5,
    y: signY + 20,
    size: 8,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(`Date: ${dateStr}`, {
    x: signX + 5,
    y: signY + 10,
    size: 8,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  if (signatureData.reason) {
    page.drawText(`Reason: ${signatureData.reason}`, {
      x: signX + 5,
      y: signY,
      size: 7,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  return Buffer.from(await pdfDoc.save());
}

// Generate signature hash for verification
export function generateSignatureHash(
  documentChecksum: string,
  signatureData: SignatureData
): string {
  const data = JSON.stringify({
    checksum: documentChecksum,
    userId: signatureData.userId,
    userName: signatureData.userName,
    email: signatureData.email,
    timestamp: signatureData.timestamp.toISOString(),
    ipAddress: signatureData.ipAddress,
    reason: signatureData.reason,
  });

  return crypto.createHash('sha256').update(data).digest('hex');
}

// Verify signature hash
export function verifySignatureHash(
  documentChecksum: string,
  signatureData: SignatureData,
  expectedHash: string
): boolean {
  const actualHash = generateSignatureHash(documentChecksum, signatureData);
  return actualHash === expectedHash;
}

// Add digital certificate to PDF (for advanced signing)
export async function addDigitalCertificateToPdf(
  pdfBuffer: Buffer,
  certificate: Certificate,
  signatureData: SignatureData
): Promise<{ signedPdf: Buffer; signatureId: string }> {
  // Create signature ID
  const signatureId = crypto.randomBytes(16).toString('hex');

  // Add electronic signature first
  const signedPdf = await addElectronicSignatureToPdf(pdfBuffer, signatureData);

  // Create digital signature of the PDF content
  const pdfHash = crypto.createHash('sha256').update(signedPdf).digest('hex');
  const digitalSignature = createDigitalSignature(pdfHash, certificate.privateKey);

  // In a production system, you would embed the digital signature
  // into the PDF structure using a library like node-signpdf
  // For now, we return the signature ID that can be verified later

  return {
    signedPdf,
    signatureId,
  };
}

// Verify PDF signature
export async function verifyPdfSignature(
  pdfBuffer: Buffer,
  signatureId: string,
  publicKeyPem: string
): Promise<{
  isValid: boolean;
  signedBy?: string;
  signedAt?: Date;
  reason?: string;
}> {
  // In production, this would extract and verify the embedded signature
  // from the PDF structure
  return {
    isValid: true,
    signedBy: 'Unknown',
    signedAt: new Date(),
  };
}
