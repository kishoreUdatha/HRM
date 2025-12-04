interface PaymentRecord {
  employeeId: string;
  employeeName: string;
  bankName: string;
  bankCode: string;
  branchCode: string;
  accountNumber: string;
  ifscCode: string;
  amount: number;
  narration: string;
}

interface BankFileConfig {
  format: 'NEFT' | 'RTGS' | 'ACH' | 'SWIFT' | 'CSV' | 'SAP';
  companyName: string;
  companyAccountNumber: string;
  companyBankCode: string;
  companyIfscCode: string;
  batchReference: string;
  valueDate: Date;
}

// Generate NEFT/RTGS bank file (Indian banks format)
export function generateNEFTFile(records: PaymentRecord[], config: BankFileConfig): string {
  const lines: string[] = [];
  const valueDate = formatDate(config.valueDate, 'DDMMYYYY');
  let totalAmount = 0;

  // Header record
  lines.push(`H~${config.batchReference}~${valueDate}~${config.companyAccountNumber}~${config.companyName}~SALARY~${records.length}~`);

  // Detail records
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    totalAmount += record.amount;
    const paymentMode = record.amount >= 200000 ? 'RTGS' : 'NEFT';
    lines.push(`D~${i + 1}~${record.ifscCode}~${record.accountNumber}~${record.employeeName}~${record.amount.toFixed(2)}~${paymentMode}~${record.narration}~`);
  }

  // Trailer record
  lines.push(`T~${records.length}~${totalAmount.toFixed(2)}~`);

  return lines.join('\n');
}

// Generate ACH file (US format - NACHA)
export function generateACHFile(records: PaymentRecord[], config: BankFileConfig): string {
  const lines: string[] = [];
  const fileCreationDate = formatDate(new Date(), 'YYMMDD');
  const fileCreationTime = formatDate(new Date(), 'HHMM');
  const effectiveDate = formatDate(config.valueDate, 'YYMMDD');
  let batchTotal = 0;
  let entryHash = 0;

  // File Header Record (1)
  lines.push(`101 ${padRight(config.companyBankCode, 9)}${padRight('', 10)}${fileCreationDate}${fileCreationTime}A094101${padRight('', 23)}${padRight(config.companyName, 23)}${padRight('', 8)}`);

  // Batch Header Record (5)
  lines.push(`5200${padRight(config.companyName, 16)}${padRight('', 20)}${padRight(config.batchReference, 10)}PPDPayroll   ${effectiveDate}   1${padRight(config.companyBankCode, 8)}0000001`);

  // Entry Detail Records (6)
  let traceNumber = 1;
  for (const record of records) {
    const routingNumber = record.bankCode.slice(0, 8);
    const checkDigit = record.bankCode.slice(8, 9) || calculateCheckDigit(routingNumber);
    batchTotal += record.amount;
    entryHash += parseInt(routingNumber);

    lines.push(`622${routingNumber}${checkDigit}${padRight(record.accountNumber, 17)}${padLeft(Math.round(record.amount * 100).toString(), 10, '0')}${padRight(record.employeeId, 15)}${padRight(record.employeeName, 22)}  ${padRight(config.companyBankCode, 8)}${padLeft(traceNumber.toString(), 7, '0')}`);
    traceNumber++;
  }

  // Batch Control Record (8)
  const entryHashStr = (entryHash % 10000000000).toString();
  lines.push(`8200${padLeft(records.length.toString(), 6, '0')}${padLeft(entryHashStr, 10, '0')}${padLeft('0', 12, '0')}${padLeft(Math.round(batchTotal * 100).toString(), 12, '0')}${padRight(config.batchReference, 10)}${padRight('', 25)}${padRight(config.companyBankCode, 8)}0000001`);

  // File Control Record (9)
  lines.push(`9000001000001${padLeft(entryHashStr, 10, '0')}${padLeft('0', 12, '0')}${padLeft(Math.round(batchTotal * 100).toString(), 12, '0')}${padRight('', 39)}`);

  return lines.join('\n');
}

// Generate SWIFT MT103 file (International transfers)
export function generateSWIFTFile(records: PaymentRecord[], config: BankFileConfig): string {
  const messages: string[] = [];

  for (const record of records) {
    const message = [
      `{1:F01${config.companyBankCode}XXXX0000000000}`,
      `{2:I103${record.bankCode}XXXXN}`,
      `{4:`,
      `:20:${config.batchReference}`,
      `:23B:CRED`,
      `:32A:${formatDate(config.valueDate, 'YYMMDD')}USD${record.amount.toFixed(2)}`,
      `:50K:/${config.companyAccountNumber}`,
      config.companyName,
      `:59:/${record.accountNumber}`,
      record.employeeName,
      `:70:${record.narration}`,
      `:71A:OUR`,
      `-}`
    ];
    messages.push(message.join('\n'));
  }

  return messages.join('\n\n');
}

// Generate CSV file (Universal format)
export function generateCSVFile(records: PaymentRecord[], config: BankFileConfig): string {
  const headers = ['Sr.No', 'Employee ID', 'Employee Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount', 'Narration'];
  const lines: string[] = [headers.join(',')];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    lines.push([
      i + 1,
      record.employeeId,
      `"${record.employeeName}"`,
      `"${record.bankName}"`,
      record.accountNumber,
      record.ifscCode,
      record.amount.toFixed(2),
      `"${record.narration}"`
    ].join(','));
  }

  // Add summary
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  lines.push('');
  lines.push(`Total Records:,${records.length}`);
  lines.push(`Total Amount:,${totalAmount.toFixed(2)}`);
  lines.push(`Value Date:,${config.valueDate.toISOString().split('T')[0]}`);
  lines.push(`Batch Reference:,${config.batchReference}`);

  return lines.join('\n');
}

// Generate SAP format file
export function generateSAPFile(records: PaymentRecord[], config: BankFileConfig): string {
  const lines: string[] = [];

  for (const record of records) {
    lines.push([
      padRight(config.companyAccountNumber, 20),
      padRight(record.accountNumber, 20),
      padLeft(Math.round(record.amount * 100).toString(), 15, '0'),
      'SAL',
      formatDate(config.valueDate, 'YYYYMMDD'),
      padRight(record.employeeName, 35),
      padRight(record.narration, 50)
    ].join('|'));
  }

  return lines.join('\n');
}

export function generateBankFile(records: PaymentRecord[], config: BankFileConfig): { content: string; filename: string; mimeType: string } {
  let content: string;
  let extension: string;
  let mimeType: string;

  switch (config.format) {
    case 'NEFT':
    case 'RTGS':
      content = generateNEFTFile(records, config);
      extension = 'txt';
      mimeType = 'text/plain';
      break;
    case 'ACH':
      content = generateACHFile(records, config);
      extension = 'ach';
      mimeType = 'text/plain';
      break;
    case 'SWIFT':
      content = generateSWIFTFile(records, config);
      extension = 'mt103';
      mimeType = 'text/plain';
      break;
    case 'SAP':
      content = generateSAPFile(records, config);
      extension = 'sap';
      mimeType = 'text/plain';
      break;
    case 'CSV':
    default:
      content = generateCSVFile(records, config);
      extension = 'csv';
      mimeType = 'text/csv';
  }

  const filename = `salary_${config.batchReference}_${formatDate(config.valueDate, 'YYYYMMDD')}.${extension}`;

  return { content, filename, mimeType };
}

// Helper functions
function formatDate(date: Date, format: string): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString();
  const yy = y.slice(2);
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');

  return format
    .replace('YYYY', y).replace('YY', yy)
    .replace('MM', m).replace('DD', d)
    .replace('HH', h).replace('mm', min);
}

function padRight(str: string, length: number, char = ' '): string {
  return str.padEnd(length, char).slice(0, length);
}

function padLeft(str: string, length: number, char = ' '): string {
  return str.padStart(length, char).slice(-length);
}

function calculateCheckDigit(routingNumber: string): string {
  const weights = [3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(routingNumber[i]) * weights[i];
  }
  return ((10 - (sum % 10)) % 10).toString();
}

export type { PaymentRecord, BankFileConfig };
