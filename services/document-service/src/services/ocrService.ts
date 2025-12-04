import Tesseract from 'tesseract.js';
import sharp from 'sharp';

interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  words: {
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }[];
}

export async function extractTextFromImage(
  imageBuffer: Buffer,
  language: string = 'eng'
): Promise<OCRResult> {
  try {
    // Preprocess image for better OCR results
    const processedImage = await preprocessImage(imageBuffer);

    const result = await Tesseract.recognize(processedImage, language, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const words = result.data.words.map((word) => ({
      text: word.text,
      confidence: word.confidence,
      bbox: word.bbox,
    }));

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
      language: (result.data as any).language || language,
      words,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Apply image preprocessing for better OCR
    const processed = await sharp(imageBuffer)
      .grayscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Sharpen edges
      .threshold(128) // Apply threshold for binary image
      .toBuffer();

    return processed;
  } catch (error) {
    console.log('Image preprocessing failed, using original');
    return imageBuffer;
  }
}

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<OCRResult> {
  // For PDF OCR, we would typically convert each page to an image first
  // This is a simplified version - in production, use pdf-to-image library
  try {
    // Placeholder - would need pdf-poppler or similar to convert PDF to images
    return {
      text: '',
      confidence: 0,
      language: 'eng',
      words: [],
    };
  } catch (error) {
    console.error('PDF OCR Error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function detectDocumentType(text: string): Promise<{
  type: string;
  confidence: number;
  detectedFields: Record<string, string>;
}> {
  const patterns = {
    id_proof: {
      keywords: ['passport', 'driver license', 'national id', 'aadhar', 'pan card', 'social security'],
      fields: {
        idNumber: /(?:id|number|no\.?)\s*[:.]?\s*([A-Z0-9-]+)/i,
        name: /(?:name)\s*[:.]?\s*([A-Za-z\s]+)/i,
        dateOfBirth: /(?:dob|date of birth|birth)\s*[:.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
      },
    },
    contract: {
      keywords: ['agreement', 'contract', 'terms and conditions', 'hereby agree', 'party of the first'],
      fields: {
        effectiveDate: /(?:effective date|dated)\s*[:.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
        parties: /(?:between|party)\s*[:.]?\s*([A-Za-z\s,]+)(?:and|&)/i,
      },
    },
    certificate: {
      keywords: ['certificate', 'certify', 'awarded', 'completion', 'hereby certify'],
      fields: {
        recipientName: /(?:presented to|awarded to|certify that)\s*[:.]?\s*([A-Za-z\s]+)/i,
        date: /(?:date|issued on)\s*[:.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
      },
    },
    offer_letter: {
      keywords: ['offer letter', 'employment offer', 'pleased to offer', 'position of', 'salary'],
      fields: {
        position: /(?:position|role|designation)\s*[:.]?\s*([A-Za-z\s]+)/i,
        salary: /(?:salary|compensation|ctc)\s*[:.]?\s*([0-9,.$]+)/i,
        startDate: /(?:start date|joining date)\s*[:.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
      },
    },
  };

  const lowerText = text.toLowerCase();
  let bestMatch = { type: 'other', confidence: 0, detectedFields: {} as Record<string, string> };

  for (const [type, config] of Object.entries(patterns)) {
    let matchCount = 0;
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    const confidence = matchCount / config.keywords.length;

    if (confidence > bestMatch.confidence) {
      const detectedFields: Record<string, string> = {};

      for (const [fieldName, pattern] of Object.entries(config.fields)) {
        const match = text.match(pattern);
        if (match) {
          detectedFields[fieldName] = match[1].trim();
        }
      }

      bestMatch = { type, confidence, detectedFields };
    }
  }

  return bestMatch;
}

export async function validateDocument(
  text: string,
  expectedType: string
): Promise<{
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}> {
  const requiredFields: Record<string, string[]> = {
    id_proof: ['idNumber', 'name'],
    contract: ['effectiveDate'],
    certificate: ['recipientName'],
    offer_letter: ['position', 'salary', 'startDate'],
  };

  const detected = await detectDocumentType(text);
  const required = requiredFields[expectedType] || [];
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (detected.type !== expectedType && detected.confidence > 0.3) {
    warnings.push(`Document appears to be ${detected.type} instead of ${expectedType}`);
  }

  for (const field of required) {
    if (!detected.detectedFields[field]) {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}
