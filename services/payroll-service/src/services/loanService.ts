import Loan, { ILoan, ILoanInstallment } from '../models/Loan';
import { createAuditLog } from './auditService';

function generateLoanNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LN-${timestamp}-${random}`;
}

function calculateEMI(principal: number, annualRate: number, tenureMonths: number, interestType: ILoan['interestType']): {
  emi: number;
  totalInterest: number;
  totalPayable: number;
  installments: ILoanInstallment[];
} {
  const installments: ILoanInstallment[] = [];
  let totalInterest = 0;
  let emi = 0;

  if (annualRate === 0) {
    emi = principal / tenureMonths;
    for (let i = 1; i <= tenureMonths; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      installments.push({
        installmentNumber: i,
        dueDate,
        principalAmount: emi,
        interestAmount: 0,
        totalAmount: emi,
        status: 'pending',
        paidAmount: 0
      });
    }
    return { emi: Math.round(emi), totalInterest: 0, totalPayable: principal, installments };
  }

  const monthlyRate = annualRate / 12 / 100;

  switch (interestType) {
    case 'flat': {
      totalInterest = principal * (annualRate / 100) * (tenureMonths / 12);
      const totalPayable = principal + totalInterest;
      emi = totalPayable / tenureMonths;
      const principalPerMonth = principal / tenureMonths;
      const interestPerMonth = totalInterest / tenureMonths;

      for (let i = 1; i <= tenureMonths; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        installments.push({
          installmentNumber: i,
          dueDate,
          principalAmount: Math.round(principalPerMonth),
          interestAmount: Math.round(interestPerMonth),
          totalAmount: Math.round(emi),
          status: 'pending',
          paidAmount: 0
        });
      }
      break;
    }

    case 'reducing':
    case 'compound': {
      emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
      let balance = principal;

      for (let i = 1; i <= tenureMonths; i++) {
        const interestAmount = balance * monthlyRate;
        const principalAmount = emi - interestAmount;
        totalInterest += interestAmount;
        balance -= principalAmount;

        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        installments.push({
          installmentNumber: i,
          dueDate,
          principalAmount: Math.round(principalAmount),
          interestAmount: Math.round(interestAmount),
          totalAmount: Math.round(emi),
          status: 'pending',
          paidAmount: 0
        });
      }
      break;
    }

    case 'simple': {
      totalInterest = principal * (annualRate / 100) * (tenureMonths / 12);
      const totalPayable = principal + totalInterest;
      emi = totalPayable / tenureMonths;
      const principalPerMonth = principal / tenureMonths;
      const interestPerMonth = totalInterest / tenureMonths;

      for (let i = 1; i <= tenureMonths; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        installments.push({
          installmentNumber: i,
          dueDate,
          principalAmount: Math.round(principalPerMonth),
          interestAmount: Math.round(interestPerMonth),
          totalAmount: Math.round(emi),
          status: 'pending',
          paidAmount: 0
        });
      }
      break;
    }
  }

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayable: Math.round(principal + totalInterest),
    installments
  };
}

export async function applyForLoan(
  tenantId: string,
  employeeId: string,
  data: {
    loanType: ILoan['loanType'];
    principalAmount: number;
    interestRate: number;
    interestType: ILoan['interestType'];
    tenure: number;
    tenureType: ILoan['tenureType'];
    purpose: string;
    guarantorDetails?: ILoan['guarantorDetails'];
    appliedBy: string;
  }
): Promise<ILoan> {
  const tenureMonths = data.tenureType === 'years' ? data.tenure * 12 : data.tenure;
  const { emi, totalInterest, totalPayable, installments } = calculateEMI(
    data.principalAmount,
    data.interestRate,
    tenureMonths,
    data.interestType
  );

  const firstEmiDate = new Date();
  firstEmiDate.setMonth(firstEmiDate.getMonth() + 1);
  const lastEmiDate = new Date();
  lastEmiDate.setMonth(lastEmiDate.getMonth() + tenureMonths);

  const loan = new Loan({
    tenantId,
    employeeId,
    loanNumber: generateLoanNumber(),
    ...data,
    emiAmount: emi,
    totalInterest,
    totalPayable,
    firstEmiDate,
    lastEmiDate,
    installments,
    remainingInstallments: tenureMonths,
    remainingAmount: totalPayable,
    status: 'pending_approval',
    appliedAt: new Date()
  });

  await loan.save();

  await createAuditLog({
    tenantId,
    entityType: 'loan',
    entityId: loan._id.toString(),
    action: 'create',
    performedBy: data.appliedBy,
    newState: loan.toObject(),
    metadata: {
      employeeId,
      amount: data.principalAmount,
      reason: data.purpose
    }
  });

  return loan;
}

export async function approveLoan(
  loanId: string,
  approverId: string,
  approved: boolean,
  comments?: string
): Promise<ILoan | null> {
  const loan = await Loan.findById(loanId);
  if (!loan) return null;

  const previousState = loan.toObject();

  loan.status = approved ? 'approved' : 'cancelled';
  loan.approvedBy = approverId;
  loan.approvedAt = new Date();

  if (loan.approvalWorkflow.length > 0) {
    const pendingLevel = loan.approvalWorkflow.find(w => w.status === 'pending');
    if (pendingLevel) {
      pendingLevel.status = approved ? 'approved' : 'rejected';
      pendingLevel.approverId = approverId;
      pendingLevel.comments = comments;
      pendingLevel.actionDate = new Date();
    }
  }

  await loan.save();

  await createAuditLog({
    tenantId: loan.tenantId,
    entityType: 'loan',
    entityId: loanId,
    action: approved ? 'approve' : 'reject',
    performedBy: approverId,
    previousState,
    newState: loan.toObject(),
    metadata: {
      employeeId: loan.employeeId,
      amount: loan.principalAmount,
      comments
    }
  });

  return loan;
}

export async function disburseLoan(
  loanId: string,
  disbursedBy: string,
  disbursementDate?: Date
): Promise<ILoan | null> {
  const loan = await Loan.findById(loanId);
  if (!loan || loan.status !== 'approved') return null;

  const previousState = loan.toObject();

  loan.status = 'active';
  loan.disbursedBy = disbursedBy;
  loan.disbursedAt = new Date();
  loan.disbursementDate = disbursementDate || new Date();

  // Recalculate installment due dates based on disbursement date
  loan.installments.forEach((inst, index) => {
    const dueDate = new Date(loan.disbursementDate!);
    dueDate.setMonth(dueDate.getMonth() + index + 1);
    inst.dueDate = dueDate;
  });

  loan.firstEmiDate = loan.installments[0].dueDate;
  loan.lastEmiDate = loan.installments[loan.installments.length - 1].dueDate;

  await loan.save();

  await createAuditLog({
    tenantId: loan.tenantId,
    entityType: 'loan',
    entityId: loanId,
    action: 'disburse',
    performedBy: disbursedBy,
    previousState,
    newState: loan.toObject(),
    metadata: {
      employeeId: loan.employeeId,
      amount: loan.principalAmount
    }
  });

  return loan;
}

export async function recordLoanPayment(
  loanId: string,
  installmentNumber: number,
  paidAmount: number,
  payrollId?: string
): Promise<ILoan | null> {
  const loan = await Loan.findById(loanId);
  if (!loan) return null;

  const installment = loan.installments.find(i => i.installmentNumber === installmentNumber);
  if (!installment) return null;

  installment.paidAmount += paidAmount;
  installment.paidDate = new Date();
  installment.payrollId = payrollId;

  if (installment.paidAmount >= installment.totalAmount) {
    installment.status = 'paid';
    loan.paidInstallments += 1;
  } else {
    installment.status = 'partial';
  }

  loan.paidAmount += paidAmount;
  loan.remainingAmount = loan.totalPayable - loan.paidAmount;
  loan.remainingInstallments = loan.installments.filter(i => i.status !== 'paid').length;

  if (loan.remainingAmount <= 0) {
    loan.status = 'closed';
    loan.closedAt = new Date();
    loan.closureType = 'normal';
  }

  await loan.save();

  await createAuditLog({
    tenantId: loan.tenantId,
    entityType: 'loan',
    entityId: loanId,
    action: 'pay',
    performedBy: 'system',
    newState: loan.toObject(),
    metadata: {
      employeeId: loan.employeeId,
      amount: paidAmount
    }
  });

  return loan;
}

export async function getEmployeeLoans(
  tenantId: string,
  employeeId: string,
  status?: ILoan['status']
): Promise<ILoan[]> {
  const query: any = { tenantId, employeeId };
  if (status) query.status = status;

  return Loan.find(query).sort({ appliedAt: -1 }).lean() as any;
}

export async function getActiveLoansForDeduction(
  tenantId: string,
  employeeId: string
): Promise<Array<{ loanId: string; loanNumber: string; emiAmount: number; installmentNumber: number }>> {
  const loans = await Loan.find({
    tenantId,
    employeeId,
    status: 'active',
    deductFromSalary: true
  }).lean();

  return loans.map(loan => {
    const nextInstallment = loan.installments.find(i => i.status === 'pending');
    return {
      loanId: loan._id.toString(),
      loanNumber: loan.loanNumber,
      emiAmount: nextInstallment?.totalAmount || loan.emiAmount,
      installmentNumber: nextInstallment?.installmentNumber || 0
    };
  }).filter(l => l.installmentNumber > 0);
}

export async function getLoanDetails(loanId: string): Promise<ILoan | null> {
  return Loan.findById(loanId).lean() as any;
}

export async function foreCloseLoan(
  loanId: string,
  closedBy: string,
  foreclosureAmount: number
): Promise<ILoan | null> {
  const loan = await Loan.findById(loanId);
  if (!loan || loan.status !== 'active') return null;

  const previousState = loan.toObject();

  loan.status = 'closed';
  loan.closedAt = new Date();
  loan.closureType = 'foreclosure';
  loan.paidAmount += foreclosureAmount;
  loan.remainingAmount = 0;

  // Mark all pending installments as paid
  loan.installments.forEach(inst => {
    if (inst.status === 'pending') {
      inst.status = 'paid';
      inst.paidDate = new Date();
    }
  });

  await loan.save();

  await createAuditLog({
    tenantId: loan.tenantId,
    entityType: 'loan',
    entityId: loanId,
    action: 'close',
    performedBy: closedBy,
    previousState,
    newState: loan.toObject(),
    metadata: {
      employeeId: loan.employeeId,
      amount: foreclosureAmount,
      reason: 'Foreclosure'
    }
  });

  return loan;
}

export async function getPendingLoanApprovals(tenantId: string): Promise<ILoan[]> {
  return Loan.find({ tenantId, status: 'pending_approval' })
    .sort({ appliedAt: -1 })
    .lean() as any;
}

export async function getLoanSummary(tenantId: string): Promise<{
  totalActiveLoans: number;
  totalDisbursedAmount: number;
  totalOutstandingAmount: number;
  totalCollectedAmount: number;
  loanTypeBreakdown: Record<string, { count: number; amount: number }>;
}> {
  const activeLoans = await Loan.find({ tenantId, status: 'active' }).lean();

  const loanTypeBreakdown: Record<string, { count: number; amount: number }> = {};

  let totalDisbursedAmount = 0;
  let totalOutstandingAmount = 0;
  let totalCollectedAmount = 0;

  activeLoans.forEach(loan => {
    totalDisbursedAmount += loan.principalAmount;
    totalOutstandingAmount += loan.remainingAmount;
    totalCollectedAmount += loan.paidAmount;

    if (!loanTypeBreakdown[loan.loanType]) {
      loanTypeBreakdown[loan.loanType] = { count: 0, amount: 0 };
    }
    loanTypeBreakdown[loan.loanType].count += 1;
    loanTypeBreakdown[loan.loanType].amount += loan.principalAmount;
  });

  return {
    totalActiveLoans: activeLoans.length,
    totalDisbursedAmount,
    totalOutstandingAmount,
    totalCollectedAmount,
    loanTypeBreakdown
  };
}
