import {
  PayrollPolicy, IPayrollPolicy, ISalaryComponentRule,
  PayrollPolicyAssignment, IPayrollPolicyAssignment
} from '../models/PayrollPolicy';
import { createAuditLog } from './auditService';

// ==================== PAYROLL POLICY ====================

export async function createPayrollPolicy(
  tenantId: string,
  data: Partial<IPayrollPolicy>,
  createdBy: string
): Promise<IPayrollPolicy> {
  const policy = new PayrollPolicy({
    tenantId,
    ...data,
    createdBy,
    version: 1
  });

  await policy.save();

  await createAuditLog({
    tenantId,
    entityType: 'payroll',
    entityId: policy._id.toString(),
    action: 'create',
    performedBy: createdBy
  });

  return policy;
}

export async function getPayrollPolicies(
  tenantId: string,
  includeInactive: boolean = false
): Promise<IPayrollPolicy[]> {
  const query: any = { tenantId };
  if (!includeInactive) query.isActive = true;

  return PayrollPolicy.find(query).sort({ createdAt: -1 }).lean();
}

export async function getPayrollPolicyById(policyId: string): Promise<IPayrollPolicy | null> {
  return PayrollPolicy.findById(policyId).lean();
}

export async function updatePayrollPolicy(
  policyId: string,
  updates: Partial<IPayrollPolicy>,
  updatedBy: string
): Promise<IPayrollPolicy | null> {
  const policy = await PayrollPolicy.findById(policyId);
  if (!policy) return null;

  const previousState = policy.toObject();

  Object.assign(policy, updates);
  policy.version += 1;
  await policy.save();

  await createAuditLog({
    tenantId: policy.tenantId,
    entityType: 'payroll',
    entityId: policyId,
    action: 'update',
    performedBy: updatedBy,
    previousState,
    newState: policy.toObject()
  });

  return policy;
}

export async function setDefaultPolicy(
  tenantId: string,
  policyId: string,
  setBy: string
): Promise<IPayrollPolicy | null> {
  // Remove default from all other policies
  await PayrollPolicy.updateMany(
    { tenantId, isDefault: true },
    { isDefault: false }
  );

  const policy = await PayrollPolicy.findByIdAndUpdate(
    policyId,
    { isDefault: true },
    { new: true }
  );

  if (policy) {
    await createAuditLog({
      tenantId,
      entityType: 'payroll',
      entityId: policyId,
      action: 'update',
      performedBy: setBy,
      metadata: { reason: 'Set as default policy' }
    });
  }

  return policy;
}

export async function getDefaultPolicy(tenantId: string): Promise<IPayrollPolicy | null> {
  return PayrollPolicy.findOne({ tenantId, isDefault: true, isActive: true }).lean();
}

// ==================== SALARY COMPONENT RULES ====================

export async function addSalaryComponentRule(
  policyId: string,
  rule: ISalaryComponentRule,
  addedBy: string
): Promise<IPayrollPolicy | null> {
  const policy = await PayrollPolicy.findById(policyId);
  if (!policy) return null;

  policy.salaryComponents.push(rule);
  policy.version += 1;
  await policy.save();

  await createAuditLog({
    tenantId: policy.tenantId,
    entityType: 'payroll',
    entityId: policyId,
    action: 'update',
    performedBy: addedBy,
    metadata: { reason: `Added salary component: ${rule.componentCode}` }
  });

  return policy;
}

export async function updateSalaryComponentRule(
  policyId: string,
  componentCode: string,
  updates: Partial<ISalaryComponentRule>,
  updatedBy: string
): Promise<IPayrollPolicy | null> {
  const policy = await PayrollPolicy.findById(policyId);
  if (!policy) return null;

  const componentIndex = policy.salaryComponents.findIndex(c => c.componentCode === componentCode);
  if (componentIndex === -1) return null;

  Object.assign(policy.salaryComponents[componentIndex], updates);
  policy.version += 1;
  await policy.save();

  return policy;
}

export async function removeSalaryComponentRule(
  policyId: string,
  componentCode: string,
  removedBy: string
): Promise<IPayrollPolicy | null> {
  const policy = await PayrollPolicy.findById(policyId);
  if (!policy) return null;

  policy.salaryComponents = policy.salaryComponents.filter(c => c.componentCode !== componentCode);
  policy.version += 1;
  await policy.save();

  await createAuditLog({
    tenantId: policy.tenantId,
    entityType: 'payroll',
    entityId: policyId,
    action: 'update',
    performedBy: removedBy,
    metadata: { reason: `Removed salary component: ${componentCode}` }
  });

  return policy;
}

// ==================== POLICY ASSIGNMENT ====================

export async function assignPolicyToEmployee(
  tenantId: string,
  employeeId: string,
  policyId: string,
  effectiveFrom: Date,
  assignedBy: string
): Promise<IPayrollPolicyAssignment> {
  // Deactivate existing assignments
  await PayrollPolicyAssignment.updateMany(
    { tenantId, employeeId, isActive: true },
    { isActive: false, effectiveTo: new Date() }
  );

  const assignment = new PayrollPolicyAssignment({
    tenantId,
    employeeId,
    policyId,
    effectiveFrom,
    isActive: true,
    assignedBy
  });

  await assignment.save();

  await createAuditLog({
    tenantId,
    entityType: 'payroll',
    entityId: assignment._id.toString(),
    action: 'create',
    performedBy: assignedBy,
    metadata: { employeeId, reason: 'Policy assigned' }
  });

  return assignment;
}

export async function bulkAssignPolicy(
  tenantId: string,
  employeeIds: string[],
  policyId: string,
  effectiveFrom: Date,
  assignedBy: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const employeeId of employeeIds) {
    try {
      await assignPolicyToEmployee(tenantId, employeeId, policyId, effectiveFrom, assignedBy);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

export async function getEmployeePolicyAssignment(
  tenantId: string,
  employeeId: string
): Promise<IPayrollPolicyAssignment | null> {
  return PayrollPolicyAssignment.findOne({ tenantId, employeeId, isActive: true }).lean();
}

export async function getEmployeePolicy(
  tenantId: string,
  employeeId: string
): Promise<IPayrollPolicy | null> {
  const assignment = await getEmployeePolicyAssignment(tenantId, employeeId);
  if (assignment) {
    return PayrollPolicy.findById(assignment.policyId).lean();
  }

  // Return default policy if no assignment
  return getDefaultPolicy(tenantId);
}

// ==================== SALARY CALCULATION ====================

export function evaluateCondition(
  condition: { field: string; operator: string; value: any },
  context: Record<string, any>
): boolean {
  const fieldValue = context[condition.field];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'not_equals':
      return fieldValue !== condition.value;
    case 'greater_than':
      return fieldValue > condition.value;
    case 'less_than':
      return fieldValue < condition.value;
    case 'greater_than_or_equal':
      return fieldValue >= condition.value;
    case 'less_than_or_equal':
      return fieldValue <= condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
    case 'contains':
      return String(fieldValue).includes(String(condition.value));
    case 'starts_with':
      return String(fieldValue).startsWith(String(condition.value));
    case 'ends_with':
      return String(fieldValue).endsWith(String(condition.value));
    default:
      return true;
  }
}

export function evaluateConditions(
  conditions: Array<{ field: string; operator: string; value: any; logicalOperator?: string }>,
  context: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  let result = evaluateCondition(conditions[0], context);

  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i];
    const conditionResult = evaluateCondition(condition, context);

    if (conditions[i - 1].logicalOperator === 'OR') {
      result = result || conditionResult;
    } else {
      result = result && conditionResult;
    }
  }

  return result;
}

export function calculateComponentAmount(
  rule: ISalaryComponentRule,
  salaryDetails: { basic: number; gross: number; ctc: number },
  context: Record<string, any> = {}
): number {
  // Check conditions first
  if (rule.conditions && !evaluateConditions(rule.conditions, context)) {
    return 0;
  }

  let amount = 0;

  switch (rule.calculationType) {
    case 'fixed':
      amount = rule.calculationValue || 0;
      break;
    case 'percentage_of_basic':
      amount = salaryDetails.basic * ((rule.calculationValue || 0) / 100);
      break;
    case 'percentage_of_gross':
      amount = salaryDetails.gross * ((rule.calculationValue || 0) / 100);
      break;
    case 'percentage_of_ctc':
      amount = salaryDetails.ctc * ((rule.calculationValue || 0) / 100);
      break;
    case 'formula':
      // Simple formula evaluation (can be extended)
      // For now, just return 0 for formula type
      amount = 0;
      break;
  }

  // Apply min/max limits
  if (rule.minAmount !== undefined) {
    amount = Math.max(amount, rule.minAmount);
  }
  if (rule.maxAmount !== undefined) {
    amount = Math.min(amount, rule.maxAmount);
  }

  return Math.round(amount);
}

export async function calculateSalaryFromPolicy(
  policy: IPayrollPolicy,
  basicSalary: number,
  context: Record<string, any> = {}
): Promise<{
  basic: number;
  earnings: Array<{ code: string; name: string; amount: number; taxable: boolean }>;
  deductions: Array<{ code: string; name: string; amount: number }>;
  gross: number;
  netSalary: number;
  ctc: number;
}> {
  const earnings: Array<{ code: string; name: string; amount: number; taxable: boolean }> = [];
  const deductions: Array<{ code: string; name: string; amount: number }> = [];

  // First pass - calculate earnings to get gross
  let grossEarnings = basicSalary;

  for (const rule of policy.salaryComponents.filter(c => c.componentType === 'earning' && c.isActive)) {
    const amount = calculateComponentAmount(rule, { basic: basicSalary, gross: 0, ctc: 0 }, context);
    if (amount > 0) {
      earnings.push({
        code: rule.componentCode,
        name: rule.componentName,
        amount,
        taxable: rule.taxable
      });
      if (rule.partOfGross) {
        grossEarnings += amount;
      }
    }
  }

  // Second pass - calculate deductions
  let totalDeductions = 0;

  for (const rule of policy.salaryComponents.filter(c => c.componentType === 'deduction' && c.isActive)) {
    const amount = calculateComponentAmount(rule, { basic: basicSalary, gross: grossEarnings, ctc: 0 }, context);
    if (amount > 0) {
      deductions.push({
        code: rule.componentCode,
        name: rule.componentName,
        amount
      });
      totalDeductions += amount;
    }
  }

  // Calculate CTC (Gross + Employer contributions)
  let ctc = grossEarnings;
  // Add employer PF contribution to CTC
  if (policy.deductionRules.pfApplicable) {
    const pfBasis = policy.deductionRules.pfCalculationBasis === 'basic' ? basicSalary : basicSalary;
    const maxPfBasis = Math.min(pfBasis, policy.deductionRules.pfMaxLimit || 15000);
    ctc += maxPfBasis * (policy.deductionRules.pfEmployerPercentage / 100);
  }

  return {
    basic: basicSalary,
    earnings,
    deductions,
    gross: grossEarnings,
    netSalary: grossEarnings - totalDeductions,
    ctc
  };
}

export async function clonePolicy(
  policyId: string,
  newCode: string,
  newName: string,
  clonedBy: string
): Promise<IPayrollPolicy | null> {
  const sourcePolicy = await PayrollPolicy.findById(policyId);
  if (!sourcePolicy) return null;

  const newPolicy = new PayrollPolicy({
    ...sourcePolicy.toObject(),
    _id: undefined,
    code: newCode,
    name: newName,
    isDefault: false,
    version: 1,
    createdBy: clonedBy,
    createdAt: undefined,
    updatedAt: undefined
  });

  await newPolicy.save();

  await createAuditLog({
    tenantId: newPolicy.tenantId,
    entityType: 'payroll',
    entityId: newPolicy._id.toString(),
    action: 'create',
    performedBy: clonedBy,
    metadata: { reason: `Cloned from policy: ${sourcePolicy.code}` }
  });

  return newPolicy;
}
