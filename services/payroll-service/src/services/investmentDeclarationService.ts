import {
  InvestmentDeclaration, IInvestmentDeclaration,
  ISection80CInvestment, ISection80DInvestment,
  ISection80CCDInvestment, IHRAExemption, IOtherExemption
} from '../models/InvestmentDeclaration';
import { createAuditLog } from './auditService';

function generateDeclarationNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${timestamp}-${random}`;
}

// ==================== INVESTMENT DECLARATION ====================

export async function createInvestmentDeclaration(
  tenantId: string,
  employeeId: string,
  financialYear: string
): Promise<IInvestmentDeclaration> {
  // Check if declaration already exists for this year
  const existing = await InvestmentDeclaration.findOne({
    tenantId,
    employeeId,
    financialYear,
    status: { $ne: 'rejected' }
  });

  if (existing) {
    return existing;
  }

  const declaration = new InvestmentDeclaration({
    tenantId,
    employeeId,
    financialYear,
    declarationNumber: generateDeclarationNumber(),
    section80C: [],
    section80D: [],
    section80CCD: [],
    hra: null,
    otherExemptions: [],
    totalDeclaredAmount: 0,
    totalVerifiedAmount: 0,
    status: 'draft'
  });

  await declaration.save();
  return declaration;
}

export async function addSection80CInvestment(
  declarationId: string,
  investment: ISection80CInvestment
): Promise<IInvestmentDeclaration | null> {
  const declaration = await InvestmentDeclaration.findById(declarationId);
  if (!declaration || declaration.status === 'verified') return null;

  // Check 80C limit (1.5 lakh)
  const current80CTotal = declaration.section80C.reduce((sum, i) => sum + i.declaredAmount, 0);
  const maxAllowed = Math.min(investment.declaredAmount, 150000 - current80CTotal);

  if (maxAllowed <= 0) return declaration;

  declaration.section80C.push({
    ...investment,
    declaredAmount: maxAllowed,
    verifiedAmount: 0,
    proofStatus: 'pending'
  });

  declaration.totalDeclaredAmount = calculateTotalDeclared(declaration);
  await declaration.save();

  return declaration;
}

export async function addSection80DInvestment(
  declarationId: string,
  investment: ISection80DInvestment
): Promise<IInvestmentDeclaration | null> {
  const declaration = await InvestmentDeclaration.findById(declarationId);
  if (!declaration || declaration.status === 'verified') return null;

  // Limits: Self/Family - 25k (50k for senior citizens), Parents - 25k (50k for senior citizen parents)
  const selfLimit = investment.isSeniorCitizen ? 50000 : 25000;
  const parentLimit = investment.isParentSeniorCitizen ? 50000 : 25000;
  const preventiveHealthLimit = 5000;

  const maxAmount = Math.min(
    investment.declaredAmount,
    investment.type === 'self_family' ? selfLimit :
    investment.type === 'parents' ? parentLimit : preventiveHealthLimit
  );

  declaration.section80D.push({
    ...investment,
    declaredAmount: maxAmount,
    verifiedAmount: 0,
    proofStatus: 'pending'
  });

  declaration.totalDeclaredAmount = calculateTotalDeclared(declaration);
  await declaration.save();

  return declaration;
}

export async function addSection80CCDInvestment(
  declarationId: string,
  investment: ISection80CCDInvestment
): Promise<IInvestmentDeclaration | null> {
  const declaration = await InvestmentDeclaration.findById(declarationId);
  if (!declaration || declaration.status === 'verified') return null;

  // 80CCD(1B) additional limit - 50k
  // 80CCD(2) employer contribution - 10% of salary
  const limit = investment.type === '80CCD_1B' ? 50000 : Infinity;
  const maxAmount = Math.min(investment.declaredAmount, limit);

  declaration.section80CCD.push({
    ...investment,
    declaredAmount: maxAmount,
    verifiedAmount: 0,
    proofStatus: 'pending'
  });

  declaration.totalDeclaredAmount = calculateTotalDeclared(declaration);
  await declaration.save();

  return declaration;
}

export async function setHRAExemption(
  declarationId: string,
  hra: IHRAExemption
): Promise<IInvestmentDeclaration | null> {
  const declaration = await InvestmentDeclaration.findById(declarationId);
  if (!declaration || declaration.status === 'verified') return null;

  declaration.hra = {
    ...hra,
    verifiedAmount: 0,
    proofStatus: 'pending'
  };

  declaration.totalDeclaredAmount = calculateTotalDeclared(declaration);
  await declaration.save();

  return declaration;
}

export async function addOtherExemption(
  declarationId: string,
  exemption: IOtherExemption
): Promise<IInvestmentDeclaration | null> {
  const declaration = await InvestmentDeclaration.findById(declarationId);
  if (!declaration || declaration.status === 'verified') return null;

  declaration.otherExemptions.push({
    ...exemption,
    verifiedAmount: 0,
    proofStatus: 'pending'
  });

  declaration.totalDeclaredAmount = calculateTotalDeclared(declaration);
  await declaration.save();

  return declaration;
}

function calculateTotalDeclared(declaration: IInvestmentDeclaration): number {
  let total = 0;

  total += declaration.section80C.reduce((sum, i) => sum + i.declaredAmount, 0);
  total += declaration.section80D.reduce((sum, i) => sum + i.declaredAmount, 0);
  total += declaration.section80CCD.reduce((sum, i) => sum + i.declaredAmount, 0);
  if (declaration.hra) {
    total += declaration.hra.monthlyRentPaid * 12;
  }
  total += declaration.otherExemptions.reduce((sum, e) => sum + e.declaredAmount, 0);

  return total;
}

function calculateTotalVerified(declaration: IInvestmentDeclaration): number {
  let total = 0;

  total += declaration.section80C.reduce((sum, i) => sum + (i.verifiedAmount || 0), 0);
  total += declaration.section80D.reduce((sum, i) => sum + (i.verifiedAmount || 0), 0);
  total += declaration.section80CCD.reduce((sum, i) => sum + (i.verifiedAmount || 0), 0);
  if (declaration.hra) {
    total += declaration.hra.verifiedAmount || 0;
  }
  total += declaration.otherExemptions.reduce((sum, e) => sum + (e.verifiedAmount || 0), 0);

  return total;
}

export async function submitDeclaration(
  declarationId: string,
  submittedBy: string
): Promise<IInvestmentDeclaration | null> {
  const declaration = await InvestmentDeclaration.findById(declarationId);
  if (!declaration || declaration.status !== 'draft') return null;

  declaration.status = 'submitted';
  declaration.submittedAt = new Date();
  await declaration.save();

  await createAuditLog({
    tenantId: declaration.tenantId,
    entityType: 'investment_declaration',
    entityId: declarationId,
    action: 'submit',
    performedBy: submittedBy,
    metadata: {
      employeeId: declaration.employeeId,
      totalDeclared: declaration.totalDeclaredAmount
    }
  });

  return declaration;
}

export async function verifyInvestmentProof(
  declarationId: string,
  section: 'section80C' | 'section80D' | 'section80CCD' | 'hra' | 'otherExemptions',
  index: number,
  verified: boolean,
  verifiedAmount: number,
  verifiedBy: string,
  remarks?: string
): Promise<IInvestmentDeclaration | null> {
  const declaration = await InvestmentDeclaration.findById(declarationId);
  if (!declaration) return null;

  if (section === 'hra' && declaration.hra) {
    declaration.hra.proofStatus = verified ? 'verified' : 'rejected';
    declaration.hra.verifiedAmount = verified ? verifiedAmount : 0;
    declaration.hra.verificationRemarks = remarks;
  } else if (section !== 'hra') {
    const investments = declaration[section] as any[];
    if (index >= 0 && index < investments.length) {
      investments[index].proofStatus = verified ? 'verified' : 'rejected';
      investments[index].verifiedAmount = verified ? verifiedAmount : 0;
      investments[index].verificationRemarks = remarks;
    }
  }

  declaration.totalVerifiedAmount = calculateTotalVerified(declaration);
  await declaration.save();

  return declaration;
}

export async function finalizeVerification(
  declarationId: string,
  verifiedBy: string
): Promise<IInvestmentDeclaration | null> {
  const declaration = await InvestmentDeclaration.findById(declarationId);
  if (!declaration) return null;

  declaration.status = 'verified';
  declaration.verifiedBy = verifiedBy;
  declaration.verifiedAt = new Date();
  declaration.totalVerifiedAmount = calculateTotalVerified(declaration);
  await declaration.save();

  await createAuditLog({
    tenantId: declaration.tenantId,
    entityType: 'investment_declaration',
    entityId: declarationId,
    action: 'verify',
    performedBy: verifiedBy,
    metadata: {
      employeeId: declaration.employeeId,
      totalVerified: declaration.totalVerifiedAmount
    }
  });

  return declaration;
}

export async function getEmployeeDeclaration(
  tenantId: string,
  employeeId: string,
  financialYear: string
): Promise<IInvestmentDeclaration | null> {
  return InvestmentDeclaration.findOne({
    tenantId,
    employeeId,
    financialYear,
    status: { $ne: 'rejected' }
  }).lean();
}

export async function getPendingVerifications(tenantId: string): Promise<IInvestmentDeclaration[]> {
  return InvestmentDeclaration.find({
    tenantId,
    status: 'submitted'
  }).sort({ submittedAt: 1 }).lean();
}

export async function calculateHRAExemption(
  basicSalary: number,
  hraReceived: number,
  rentPaid: number,
  isMetroCity: boolean
): Promise<{
  exemption1: number;
  exemption2: number;
  exemption3: number;
  maxExemption: number;
}> {
  // HRA Exemption is minimum of:
  // 1. Actual HRA received
  // 2. 50% of basic (metro) or 40% of basic (non-metro)
  // 3. Rent paid - 10% of basic

  const exemption1 = hraReceived;
  const exemption2 = basicSalary * (isMetroCity ? 0.5 : 0.4);
  const exemption3 = Math.max(0, rentPaid - (basicSalary * 0.1));

  return {
    exemption1,
    exemption2,
    exemption3,
    maxExemption: Math.min(exemption1, exemption2, exemption3)
  };
}

export async function getDeclarationSummary(
  tenantId: string,
  financialYear: string
): Promise<{
  totalDeclarations: number;
  draftCount: number;
  submittedCount: number;
  verifiedCount: number;
  totalDeclaredAmount: number;
  totalVerifiedAmount: number;
  section80CSummary: { count: number; amount: number };
  section80DSummary: { count: number; amount: number };
  hraSummary: { count: number; amount: number };
}> {
  const declarations = await InvestmentDeclaration.find({ tenantId, financialYear }).lean();

  let section80CTotal = 0;
  let section80DTotal = 0;
  let hraCount = 0;
  let hraTotal = 0;

  declarations.forEach(d => {
    section80CTotal += d.section80C.reduce((sum, i) => sum + i.declaredAmount, 0);
    section80DTotal += d.section80D.reduce((sum, i) => sum + i.declaredAmount, 0);
    if (d.hra) {
      hraCount++;
      hraTotal += d.hra.monthlyRentPaid * 12;
    }
  });

  return {
    totalDeclarations: declarations.length,
    draftCount: declarations.filter(d => d.status === 'draft').length,
    submittedCount: declarations.filter(d => d.status === 'submitted').length,
    verifiedCount: declarations.filter(d => d.status === 'verified').length,
    totalDeclaredAmount: declarations.reduce((sum, d) => sum + d.totalDeclaredAmount, 0),
    totalVerifiedAmount: declarations.reduce((sum, d) => sum + d.totalVerifiedAmount, 0),
    section80CSummary: {
      count: declarations.filter(d => d.section80C.length > 0).length,
      amount: section80CTotal
    },
    section80DSummary: {
      count: declarations.filter(d => d.section80D.length > 0).length,
      amount: section80DTotal
    },
    hraSummary: {
      count: hraCount,
      amount: hraTotal
    }
  };
}

export async function lockDeclarationsForYear(
  tenantId: string,
  financialYear: string,
  lockedBy: string
): Promise<number> {
  const result = await InvestmentDeclaration.updateMany(
    { tenantId, financialYear, status: 'verified' },
    { isLocked: true }
  );

  await createAuditLog({
    tenantId,
    entityType: 'investment_declaration',
    entityId: financialYear,
    action: 'lock',
    performedBy: lockedBy,
    metadata: { count: result.modifiedCount }
  });

  return result.modifiedCount;
}

export async function getInvestmentDeductionsForTax(
  tenantId: string,
  employeeId: string,
  financialYear: string
): Promise<{
  section80C: number;
  section80D: number;
  section80CCD_1B: number;
  section80CCD_2: number;
  hra: number;
  otherExemptions: number;
  total: number;
}> {
  const declaration = await InvestmentDeclaration.findOne({
    tenantId,
    employeeId,
    financialYear,
    status: 'verified'
  }).lean();

  if (!declaration) {
    return {
      section80C: 0,
      section80D: 0,
      section80CCD_1B: 0,
      section80CCD_2: 0,
      hra: 0,
      otherExemptions: 0,
      total: 0
    };
  }

  const section80C = Math.min(
    declaration.section80C.reduce((sum, i) => sum + (i.verifiedAmount || 0), 0),
    150000
  );

  const section80D = declaration.section80D.reduce((sum, i) => sum + (i.verifiedAmount || 0), 0);

  const section80CCD_1B = declaration.section80CCD
    .filter(i => i.type === '80CCD_1B')
    .reduce((sum, i) => sum + (i.verifiedAmount || 0), 0);

  const section80CCD_2 = declaration.section80CCD
    .filter(i => i.type === '80CCD_2')
    .reduce((sum, i) => sum + (i.verifiedAmount || 0), 0);

  const hra = declaration.hra?.verifiedAmount || 0;

  const otherExemptions = declaration.otherExemptions
    .reduce((sum, e) => sum + (e.verifiedAmount || 0), 0);

  const total = section80C + section80D + section80CCD_1B + section80CCD_2 + hra + otherExemptions;

  return {
    section80C,
    section80D,
    section80CCD_1B,
    section80CCD_2,
    hra,
    otherExemptions,
    total
  };
}
