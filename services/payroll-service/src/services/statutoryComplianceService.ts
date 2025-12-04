import {
  PFECRFile, IPFECRFile,
  ESIReturn, IESIReturn,
  PTReturn, IPTReturn,
  TDSReturn, ITDSReturn,
  LWFReturn, ILWFReturn
} from '../models/StatutoryCompliance';
import { createAuditLog } from './auditService';

function generateFileNumber(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ==================== PF ECR FILE GENERATION ====================

export async function generatePFECRFile(
  tenantId: string,
  data: {
    establishmentId: string;
    establishmentName: string;
    month: number;
    year: number;
    employees: Array<{
      employeeId: string;
      uan: string;
      name: string;
      grossWages: number;
      pfWages: number;
      employeeContribution: number;
      employerContribution: number;
      epsContribution: number;
      edliContribution: number;
      adminCharges: number;
      workingDays: number;
    }>;
    createdBy: string;
  }
): Promise<IPFECRFile> {
  const totals = {
    totalEmployees: data.employees.length,
    totalGrossWages: 0,
    totalPfWages: 0,
    totalEmployeeContribution: 0,
    totalEmployerContribution: 0,
    totalEpsContribution: 0,
    totalEdliContribution: 0,
    totalAdminCharges: 0
  };

  data.employees.forEach(emp => {
    totals.totalGrossWages += emp.grossWages;
    totals.totalPfWages += emp.pfWages;
    totals.totalEmployeeContribution += emp.employeeContribution;
    totals.totalEmployerContribution += emp.employerContribution;
    totals.totalEpsContribution += emp.epsContribution;
    totals.totalEdliContribution += emp.edliContribution;
    totals.totalAdminCharges += emp.adminCharges;
  });

  const ecrFile = new PFECRFile({
    tenantId,
    fileNumber: generateFileNumber('ECR'),
    establishmentId: data.establishmentId,
    establishmentName: data.establishmentName,
    month: data.month,
    year: data.year,
    employees: data.employees,
    ...totals,
    status: 'generated',
    generatedAt: new Date(),
    generatedBy: data.createdBy
  });

  await ecrFile.save();

  await createAuditLog({
    tenantId,
    entityType: 'statutory_compliance',
    entityId: ecrFile._id.toString(),
    action: 'create',
    performedBy: data.createdBy,
    metadata: { type: 'PF_ECR', month: data.month, year: data.year }
  });

  return ecrFile;
}

export async function generateECRTextFile(ecrFileId: string): Promise<string> {
  const ecr = await PFECRFile.findById(ecrFileId);
  if (!ecr) throw new Error('ECR file not found');

  // Generate ECR file format as per EPFO specifications
  let content = '';

  // Header row
  content += `#~#${ecr.establishmentId}#~#${ecr.establishmentName}#~#ECR#~#${ecr.month}/${ecr.year}\n`;

  // Employee rows
  ecr.employees.forEach(emp => {
    content += `${emp.uan}#~#${emp.name}#~#${emp.grossWages}#~#${emp.pfWages}#~#${emp.pfWages}#~#${emp.pfWages}#~#${emp.employeeContribution}#~#${emp.epsContribution}#~#${emp.employerContribution - emp.epsContribution}#~#0#~#${emp.workingDays}\n`;
  });

  ecr.fileContent = content;
  await ecr.save();

  return content;
}

export async function markECRAsUploaded(
  ecrFileId: string,
  trrnNumber: string,
  uploadedBy: string
): Promise<IPFECRFile | null> {
  return PFECRFile.findByIdAndUpdate(
    ecrFileId,
    {
      status: 'uploaded',
      trrnNumber,
      uploadedAt: new Date(),
      uploadedBy
    },
    { new: true }
  );
}

export async function markECRAsApproved(
  ecrFileId: string,
  challanNumber: string,
  paidDate: Date
): Promise<IPFECRFile | null> {
  return PFECRFile.findByIdAndUpdate(
    ecrFileId,
    {
      status: 'approved',
      challanNumber,
      paidDate
    },
    { new: true }
  );
}

// ==================== ESI RETURN ====================

export async function generateESIReturn(
  tenantId: string,
  data: {
    establishmentCode: string;
    contributionPeriod: { from: Date; to: Date };
    employees: Array<{
      employeeId: string;
      ipNumber: string;
      name: string;
      grossWages: number;
      workingDays: number;
      employeeContribution: number;
      employerContribution: number;
      totalContribution: number;
    }>;
    createdBy: string;
  }
): Promise<IESIReturn> {
  const esiReturn = new ESIReturn({
    tenantId,
    returnNumber: generateFileNumber('ESI'),
    establishmentCode: data.establishmentCode,
    contributionPeriod: data.contributionPeriod,
    employees: data.employees,
    totalEmployees: data.employees.length,
    totalGrossWages: data.employees.reduce((sum, e) => sum + e.grossWages, 0),
    totalEmployeeContribution: data.employees.reduce((sum, e) => sum + e.employeeContribution, 0),
    totalEmployerContribution: data.employees.reduce((sum, e) => sum + e.employerContribution, 0),
    totalContribution: data.employees.reduce((sum, e) => sum + e.totalContribution, 0),
    status: 'draft',
    generatedAt: new Date(),
    generatedBy: data.createdBy
  });

  await esiReturn.save();
  return esiReturn;
}

export async function submitESIReturn(
  returnId: string,
  challanNumber: string,
  paidDate: Date,
  submittedBy: string
): Promise<IESIReturn | null> {
  return ESIReturn.findByIdAndUpdate(
    returnId,
    {
      status: 'submitted',
      challanNumber,
      paidDate,
      submittedAt: new Date(),
      submittedBy
    },
    { new: true }
  );
}

// ==================== PROFESSIONAL TAX RETURN ====================

export async function generatePTReturn(
  tenantId: string,
  data: {
    state: string;
    registrationNumber: string;
    month: number;
    year: number;
    employees: Array<{
      employeeId: string;
      name: string;
      grossSalary: number;
      ptAmount: number;
    }>;
    createdBy: string;
  }
): Promise<IPTReturn> {
  const ptReturn = new PTReturn({
    tenantId,
    returnNumber: generateFileNumber('PT'),
    state: data.state,
    registrationNumber: data.registrationNumber,
    month: data.month,
    year: data.year,
    employees: data.employees,
    totalEmployees: data.employees.length,
    totalPTCollected: data.employees.reduce((sum, e) => sum + e.ptAmount, 0),
    status: 'draft',
    generatedAt: new Date(),
    generatedBy: data.createdBy
  });

  await ptReturn.save();
  return ptReturn;
}

export async function submitPTReturn(
  returnId: string,
  challanNumber: string,
  paidDate: Date,
  submittedBy: string
): Promise<IPTReturn | null> {
  return PTReturn.findByIdAndUpdate(
    returnId,
    {
      status: 'submitted',
      challanNumber,
      paidDate,
      submittedAt: new Date(),
      submittedBy
    },
    { new: true }
  );
}

// ==================== TDS RETURN (Form 24Q) ====================

export async function generateTDSReturn(
  tenantId: string,
  data: {
    tanNumber: string;
    quarter: 1 | 2 | 3 | 4;
    financialYear: string;
    deductorDetails: {
      name: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      email: string;
      phone: string;
    };
    employees: Array<{
      employeeId: string;
      pan: string;
      name: string;
      grossSalary: number;
      totalDeductions: number;
      taxableIncome: number;
      tdsDeducted: number;
      tdsDeposited: number;
    }>;
    createdBy: string;
  }
): Promise<ITDSReturn> {
  const tdsReturn = new TDSReturn({
    tenantId,
    returnNumber: generateFileNumber('TDS'),
    tanNumber: data.tanNumber,
    quarter: data.quarter,
    financialYear: data.financialYear,
    formType: '24Q',
    deductorDetails: data.deductorDetails,
    employees: data.employees,
    totalEmployees: data.employees.length,
    totalTdsDeducted: data.employees.reduce((sum, e) => sum + e.tdsDeducted, 0),
    totalTdsDeposited: data.employees.reduce((sum, e) => sum + e.tdsDeposited, 0),
    status: 'draft',
    generatedAt: new Date(),
    generatedBy: data.createdBy
  });

  await tdsReturn.save();

  await createAuditLog({
    tenantId,
    entityType: 'statutory_compliance',
    entityId: tdsReturn._id.toString(),
    action: 'create',
    performedBy: data.createdBy,
    metadata: { type: 'TDS', quarter: data.quarter, year: data.financialYear }
  });

  return tdsReturn;
}

export async function generateTDSFVUFile(returnId: string): Promise<string> {
  const tdsReturn = await TDSReturn.findById(returnId);
  if (!tdsReturn) throw new Error('TDS return not found');

  // Generate FVU (File Validation Utility) format
  // This is a simplified version - actual format is more complex
  let content = '';

  // Batch header
  content += `^FH^24Q^${tdsReturn.financialYear}^Q${tdsReturn.quarter}^${tdsReturn.tanNumber}\n`;

  // Deductor details
  content += `^BH^${tdsReturn.deductorDetails.name}^${tdsReturn.deductorDetails.address}^${tdsReturn.deductorDetails.pincode}\n`;

  // Employee deductee details
  tdsReturn.employees.forEach(emp => {
    content += `^DD^${emp.pan}^${emp.name}^${emp.grossSalary}^${emp.tdsDeducted}\n`;
  });

  tdsReturn.fileContent = content;
  await tdsReturn.save();

  return content;
}

export async function submitTDSReturn(
  returnId: string,
  acknowledgementNumber: string,
  filingDate: Date,
  submittedBy: string
): Promise<ITDSReturn | null> {
  return TDSReturn.findByIdAndUpdate(
    returnId,
    {
      status: 'filed',
      acknowledgementNumber,
      filingDate,
      filedBy: submittedBy
    },
    { new: true }
  );
}

// ==================== LWF RETURN ====================

export async function generateLWFReturn(
  tenantId: string,
  data: {
    state: string;
    registrationNumber: string;
    period: { from: Date; to: Date };
    employees: Array<{
      employeeId: string;
      name: string;
      employeeContribution: number;
      employerContribution: number;
    }>;
    createdBy: string;
  }
): Promise<ILWFReturn> {
  const lwfReturn = new LWFReturn({
    tenantId,
    returnNumber: generateFileNumber('LWF'),
    state: data.state,
    registrationNumber: data.registrationNumber,
    period: data.period,
    employees: data.employees,
    totalEmployees: data.employees.length,
    totalEmployeeContribution: data.employees.reduce((sum, e) => sum + e.employeeContribution, 0),
    totalEmployerContribution: data.employees.reduce((sum, e) => sum + e.employerContribution, 0),
    totalContribution: data.employees.reduce((sum, e) => sum + e.employeeContribution + e.employerContribution, 0),
    status: 'draft',
    generatedAt: new Date(),
    generatedBy: data.createdBy
  });

  await lwfReturn.save();
  return lwfReturn;
}

export async function submitLWFReturn(
  returnId: string,
  challanNumber: string,
  paidDate: Date,
  submittedBy: string
): Promise<ILWFReturn | null> {
  return LWFReturn.findByIdAndUpdate(
    returnId,
    {
      status: 'submitted',
      challanNumber,
      paidDate,
      submittedAt: new Date(),
      submittedBy
    },
    { new: true }
  );
}

// ==================== COMPLIANCE DASHBOARD ====================

export async function getComplianceStatus(
  tenantId: string,
  month: number,
  year: number
): Promise<{
  pf: { status: string; dueDate: Date; filed: boolean };
  esi: { status: string; dueDate: Date; filed: boolean };
  pt: { status: string; dueDate: Date; filed: boolean };
  tds: { status: string; dueDate: Date; filed: boolean };
  lwf: { status: string; dueDate: Date; filed: boolean };
}> {
  // PF due date: 15th of following month
  const pfDueDate = new Date(year, month, 15);
  const pfFiled = await PFECRFile.exists({
    tenantId,
    month,
    year,
    status: { $in: ['uploaded', 'approved'] }
  });

  // ESI due date: 15th of following month
  const esiDueDate = new Date(year, month, 15);
  const esiFiled = await ESIReturn.exists({
    tenantId,
    'contributionPeriod.from': { $lte: new Date(year, month - 1, 1) },
    'contributionPeriod.to': { $gte: new Date(year, month - 1, 1) },
    status: 'submitted'
  });

  // PT varies by state, using 15th as default
  const ptDueDate = new Date(year, month, 15);
  const ptFiled = await PTReturn.exists({
    tenantId,
    month,
    year,
    status: 'submitted'
  });

  // TDS quarterly (Q1: July 31, Q2: Oct 31, Q3: Jan 31, Q4: May 31)
  const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
  const tdsQuarterDueDates = {
    1: new Date(year, 6, 31),
    2: new Date(year, 9, 31),
    3: new Date(year + 1, 0, 31),
    4: new Date(year + 1, 4, 31)
  };
  const tdsFiled = await TDSReturn.exists({
    tenantId,
    quarter,
    financialYear: `${year}-${year + 1}`,
    status: 'filed'
  });

  // LWF varies by state
  const lwfDueDate = new Date(year, month + 1, 15);
  const lwfFiled = await LWFReturn.exists({
    tenantId,
    'period.from': { $lte: new Date(year, month - 1, 1) },
    status: 'submitted'
  });

  const now = new Date();

  return {
    pf: {
      status: pfFiled ? 'Completed' : (now > pfDueDate ? 'Overdue' : 'Pending'),
      dueDate: pfDueDate,
      filed: !!pfFiled
    },
    esi: {
      status: esiFiled ? 'Completed' : (now > esiDueDate ? 'Overdue' : 'Pending'),
      dueDate: esiDueDate,
      filed: !!esiFiled
    },
    pt: {
      status: ptFiled ? 'Completed' : (now > ptDueDate ? 'Overdue' : 'Pending'),
      dueDate: ptDueDate,
      filed: !!ptFiled
    },
    tds: {
      status: tdsFiled ? 'Completed' : (now > tdsQuarterDueDates[quarter] ? 'Overdue' : 'Pending'),
      dueDate: tdsQuarterDueDates[quarter],
      filed: !!tdsFiled
    },
    lwf: {
      status: lwfFiled ? 'Completed' : (now > lwfDueDate ? 'Overdue' : 'Pending'),
      dueDate: lwfDueDate,
      filed: !!lwfFiled
    }
  };
}

export async function getComplianceHistory(
  tenantId: string,
  financialYear: string,
  complianceType: 'pf' | 'esi' | 'pt' | 'tds' | 'lwf'
): Promise<any[]> {
  const yearParts = financialYear.split('-');
  const startYear = parseInt(yearParts[0]);

  switch (complianceType) {
    case 'pf':
      return PFECRFile.find({
        tenantId,
        $or: [
          { year: startYear, month: { $gte: 4 } },
          { year: startYear + 1, month: { $lte: 3 } }
        ]
      }).sort({ year: 1, month: 1 }).lean();

    case 'esi':
      return ESIReturn.find({
        tenantId,
        'contributionPeriod.from': {
          $gte: new Date(startYear, 3, 1),
          $lt: new Date(startYear + 1, 3, 1)
        }
      }).sort({ 'contributionPeriod.from': 1 }).lean();

    case 'pt':
      return PTReturn.find({
        tenantId,
        $or: [
          { year: startYear, month: { $gte: 4 } },
          { year: startYear + 1, month: { $lte: 3 } }
        ]
      }).sort({ year: 1, month: 1 }).lean();

    case 'tds':
      return TDSReturn.find({
        tenantId,
        financialYear
      }).sort({ quarter: 1 }).lean();

    case 'lwf':
      return LWFReturn.find({
        tenantId,
        'period.from': {
          $gte: new Date(startYear, 3, 1),
          $lt: new Date(startYear + 1, 3, 1)
        }
      }).sort({ 'period.from': 1 }).lean();

    default:
      return [];
  }
}

export async function calculatePFContributions(
  basicSalary: number,
  pfPercentage: number = 12,
  maxPfBasis: number = 15000
): Promise<{
  pfWages: number;
  employeeContribution: number;
  employerPfContribution: number;
  epsContribution: number;
  edliContribution: number;
  adminCharges: number;
}> {
  const pfWages = Math.min(basicSalary, maxPfBasis);
  const employeeContribution = Math.round(pfWages * (pfPercentage / 100));

  // Employer contribution breakdown:
  // 3.67% to EPF, 8.33% to EPS (max Rs. 1250), rest to EPF
  const epsContribution = Math.min(Math.round(pfWages * 0.0833), 1250);
  const employerPfContribution = Math.round(pfWages * (pfPercentage / 100));

  // EDLI: 0.5% of PF wages (max Rs. 15000)
  const edliContribution = Math.round(Math.min(basicSalary, 15000) * 0.005);

  // Admin charges: 0.5% + 0.01% EDLI admin
  const adminCharges = Math.round(pfWages * 0.0050) + Math.round(Math.min(basicSalary, 15000) * 0.0001);

  return {
    pfWages,
    employeeContribution,
    employerPfContribution,
    epsContribution,
    edliContribution,
    adminCharges
  };
}

export async function calculateESIContributions(
  grossSalary: number
): Promise<{
  isEligible: boolean;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
}> {
  // ESI applicable if gross salary <= 21000
  const isEligible = grossSalary <= 21000;

  if (!isEligible) {
    return {
      isEligible: false,
      employeeContribution: 0,
      employerContribution: 0,
      totalContribution: 0
    };
  }

  // Employee: 0.75%, Employer: 3.25%
  const employeeContribution = Math.round(grossSalary * 0.0075);
  const employerContribution = Math.round(grossSalary * 0.0325);

  return {
    isEligible: true,
    employeeContribution,
    employerContribution,
    totalContribution: employeeContribution + employerContribution
  };
}

export async function getProfessionalTaxSlabs(state: string): Promise<Array<{
  fromAmount: number;
  toAmount: number;
  taxAmount: number;
}>> {
  // Sample PT slabs for different states
  const slabs: Record<string, Array<{ fromAmount: number; toAmount: number; taxAmount: number }>> = {
    'maharashtra': [
      { fromAmount: 0, toAmount: 7500, taxAmount: 0 },
      { fromAmount: 7501, toAmount: 10000, taxAmount: 175 },
      { fromAmount: 10001, toAmount: Infinity, taxAmount: 200 }
    ],
    'karnataka': [
      { fromAmount: 0, toAmount: 15000, taxAmount: 0 },
      { fromAmount: 15001, toAmount: Infinity, taxAmount: 200 }
    ],
    'telangana': [
      { fromAmount: 0, toAmount: 15000, taxAmount: 0 },
      { fromAmount: 15001, toAmount: 20000, taxAmount: 150 },
      { fromAmount: 20001, toAmount: Infinity, taxAmount: 200 }
    ],
    'tamilnadu': [
      { fromAmount: 0, toAmount: 21000, taxAmount: 0 },
      { fromAmount: 21001, toAmount: 30000, taxAmount: 135 },
      { fromAmount: 30001, toAmount: 45000, taxAmount: 315 },
      { fromAmount: 45001, toAmount: 60000, taxAmount: 690 },
      { fromAmount: 60001, toAmount: 75000, taxAmount: 1025 },
      { fromAmount: 75001, toAmount: Infinity, taxAmount: 1250 }
    ],
    'default': [
      { fromAmount: 0, toAmount: 10000, taxAmount: 0 },
      { fromAmount: 10001, toAmount: Infinity, taxAmount: 200 }
    ]
  };

  return slabs[state.toLowerCase()] || slabs['default'];
}

export async function calculateProfessionalTax(
  state: string,
  grossSalary: number
): Promise<number> {
  const slabs = await getProfessionalTaxSlabs(state);

  for (const slab of slabs) {
    if (grossSalary >= slab.fromAmount && grossSalary <= slab.toAmount) {
      return slab.taxAmount;
    }
  }

  return 0;
}
