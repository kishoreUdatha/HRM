import TaxConfiguration, { ITaxConfiguration, ITaxSlab, IStatutoryDeduction } from '../models/TaxConfiguration';

// Default tax configurations for different countries
export const defaultTaxConfigs = {
  IN: {
    country: 'India',
    countryCode: 'IN',
    financialYearStart: { month: 4, day: 1 },
    financialYearEnd: { month: 3, day: 31 },
    currency: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    taxSlabs: [
      { minIncome: 0, maxIncome: 300000, rate: 0, fixedAmount: 0 },
      { minIncome: 300001, maxIncome: 600000, rate: 5, fixedAmount: 0 },
      { minIncome: 600001, maxIncome: 900000, rate: 10, fixedAmount: 15000 },
      { minIncome: 900001, maxIncome: 1200000, rate: 15, fixedAmount: 45000 },
      { minIncome: 1200001, maxIncome: 1500000, rate: 20, fixedAmount: 90000 },
      { minIncome: 1500001, maxIncome: Infinity, rate: 30, fixedAmount: 150000 }
    ],
    standardDeduction: 50000,
    statutoryDeductions: [
      { code: 'PF', name: 'Provident Fund', type: 'percentage', employeeContribution: 12, employerContribution: 12, maxLimit: 21000, applicableOn: 'basic', isOptional: false },
      { code: 'ESI', name: 'Employee State Insurance', type: 'percentage', employeeContribution: 0.75, employerContribution: 3.25, maxLimit: 21000, applicableOn: 'gross', isOptional: false, slabs: [{ minSalary: 0, maxSalary: 21000, rate: 0.75 }] },
      { code: 'PT', name: 'Professional Tax', type: 'slab', employeeContribution: 200, employerContribution: 0, maxLimit: 2500, applicableOn: 'gross', isOptional: false, slabs: [{ minSalary: 0, maxSalary: 10000, rate: 0 }, { minSalary: 10001, maxSalary: 15000, rate: 150 }, { minSalary: 15001, maxSalary: Infinity, rate: 200 }] },
      { code: 'LWF', name: 'Labour Welfare Fund', type: 'fixed', employeeContribution: 2, employerContribution: 5, applicableOn: 'gross', isOptional: false }
    ],
    surcharge: { slabs: [{ minIncome: 5000000, maxIncome: 10000000, rate: 10 }, { minIncome: 10000001, maxIncome: 20000000, rate: 15 }, { minIncome: 20000001, maxIncome: 50000000, rate: 25 }, { minIncome: 50000001, maxIncome: Infinity, rate: 37 }] },
    cess: { rate: 4, name: 'Health & Education Cess' }
  },
  US: {
    country: 'United States',
    countryCode: 'US',
    financialYearStart: { month: 1, day: 1 },
    financialYearEnd: { month: 12, day: 31 },
    currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    taxSlabs: [
      { minIncome: 0, maxIncome: 11000, rate: 10, fixedAmount: 0 },
      { minIncome: 11001, maxIncome: 44725, rate: 12, fixedAmount: 1100 },
      { minIncome: 44726, maxIncome: 95375, rate: 22, fixedAmount: 5147 },
      { minIncome: 95376, maxIncome: 182100, rate: 24, fixedAmount: 16290 },
      { minIncome: 182101, maxIncome: 231250, rate: 32, fixedAmount: 37104 },
      { minIncome: 231251, maxIncome: 578125, rate: 35, fixedAmount: 52832 },
      { minIncome: 578126, maxIncome: Infinity, rate: 37, fixedAmount: 174238 }
    ],
    standardDeduction: 13850,
    statutoryDeductions: [
      { code: 'FICA-SS', name: 'Social Security', type: 'percentage', employeeContribution: 6.2, employerContribution: 6.2, maxLimit: 160200, applicableOn: 'gross', isOptional: false },
      { code: 'FICA-MED', name: 'Medicare', type: 'percentage', employeeContribution: 1.45, employerContribution: 1.45, applicableOn: 'gross', isOptional: false },
      { code: '401K', name: '401(k) Retirement', type: 'percentage', employeeContribution: 0, employerContribution: 0, maxLimit: 22500, applicableOn: 'gross', isOptional: true }
    ],
    surcharge: { slabs: [] },
    cess: { rate: 0, name: '' }
  },
  UK: {
    country: 'United Kingdom',
    countryCode: 'UK',
    financialYearStart: { month: 4, day: 6 },
    financialYearEnd: { month: 4, day: 5 },
    currency: { code: 'GBP', symbol: '£', name: 'British Pound' },
    taxSlabs: [
      { minIncome: 0, maxIncome: 12570, rate: 0, fixedAmount: 0 },
      { minIncome: 12571, maxIncome: 50270, rate: 20, fixedAmount: 0 },
      { minIncome: 50271, maxIncome: 125140, rate: 40, fixedAmount: 7540 },
      { minIncome: 125141, maxIncome: Infinity, rate: 45, fixedAmount: 37488 }
    ],
    standardDeduction: 0,
    statutoryDeductions: [
      { code: 'NI', name: 'National Insurance', type: 'percentage', employeeContribution: 12, employerContribution: 13.8, applicableOn: 'gross', isOptional: false, slabs: [{ minSalary: 0, maxSalary: 12570, rate: 0 }, { minSalary: 12571, maxSalary: 50270, rate: 12 }, { minSalary: 50271, maxSalary: Infinity, rate: 2 }] },
      { code: 'PENSION', name: 'Workplace Pension', type: 'percentage', employeeContribution: 5, employerContribution: 3, applicableOn: 'gross', isOptional: false }
    ],
    surcharge: { slabs: [] },
    cess: { rate: 0, name: '' }
  }
};

export function calculateIncomeTax(annualIncome: number, taxSlabs: ITaxSlab[], standardDeduction: number): { tax: number; breakdown: { slab: ITaxSlab; taxAmount: number }[] } {
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);
  let remainingIncome = taxableIncome;
  let totalTax = 0;
  const breakdown: { slab: ITaxSlab; taxAmount: number }[] = [];

  for (const slab of taxSlabs) {
    if (remainingIncome <= 0) break;
    const slabIncome = Math.min(remainingIncome, slab.maxIncome - slab.minIncome + 1);
    const taxAmount = slabIncome * (slab.rate / 100);
    totalTax += taxAmount;
    breakdown.push({ slab, taxAmount });
    remainingIncome -= slabIncome;
  }

  return { tax: Math.round(totalTax), breakdown };
}

export function calculateStatutoryDeductions(basicSalary: number, grossSalary: number, ctc: number, deductions: IStatutoryDeduction[]): { deductions: { code: string; name: string; employeeAmount: number; employerAmount: number }[]; totalEmployee: number; totalEmployer: number } {
  const result: { code: string; name: string; employeeAmount: number; employerAmount: number }[] = [];
  let totalEmployee = 0;
  let totalEmployer = 0;

  for (const deduction of deductions) {
    let baseAmount = basicSalary;
    if (deduction.applicableOn === 'gross') baseAmount = grossSalary;
    if (deduction.applicableOn === 'ctc') baseAmount = ctc;

    let employeeAmount = 0;
    let employerAmount = 0;

    if (deduction.type === 'percentage') {
      employeeAmount = baseAmount * (deduction.employeeContribution / 100);
      employerAmount = baseAmount * (deduction.employerContribution / 100);
    } else if (deduction.type === 'fixed') {
      employeeAmount = deduction.employeeContribution;
      employerAmount = deduction.employerContribution;
    } else if (deduction.type === 'slab' && deduction.slabs) {
      const applicableSlab = deduction.slabs.find(s => baseAmount >= s.minSalary && baseAmount <= s.maxSalary);
      if (applicableSlab) {
        employeeAmount = applicableSlab.rate;
        employerAmount = deduction.employerContribution;
      }
    }

    if (deduction.maxLimit) {
      employeeAmount = Math.min(employeeAmount, deduction.maxLimit * (deduction.employeeContribution / 100));
      employerAmount = Math.min(employerAmount, deduction.maxLimit * (deduction.employerContribution / 100));
    }

    result.push({ code: deduction.code, name: deduction.name, employeeAmount: Math.round(employeeAmount), employerAmount: Math.round(employerAmount) });
    totalEmployee += employeeAmount;
    totalEmployer += employerAmount;
  }

  return { deductions: result, totalEmployee: Math.round(totalEmployee), totalEmployer: Math.round(totalEmployer) };
}

export function calculateSurcharge(tax: number, annualIncome: number, surchargeSlabs: { minIncome: number; maxIncome: number; rate: number }[]): number {
  const applicableSlab = surchargeSlabs.find(s => annualIncome >= s.minIncome && annualIncome <= s.maxIncome);
  return applicableSlab ? Math.round(tax * (applicableSlab.rate / 100)) : 0;
}

export function calculateCess(taxWithSurcharge: number, cessRate: number): number {
  return Math.round(taxWithSurcharge * (cessRate / 100));
}

export async function getTaxConfiguration(tenantId: string, countryCode: string): Promise<ITaxConfiguration | null> {
  return TaxConfiguration.findOne({ tenantId, countryCode, isActive: true }).lean() as unknown as ITaxConfiguration | null;
}

export async function createDefaultTaxConfiguration(tenantId: string, countryCode: string): Promise<ITaxConfiguration> {
  const defaultConfig = defaultTaxConfigs[countryCode as keyof typeof defaultTaxConfigs];
  if (!defaultConfig) throw new Error(`No default tax configuration for country: ${countryCode}`);

  const config = new TaxConfiguration({ ...defaultConfig, tenantId, effectiveFrom: new Date() });
  await config.save();
  return config;
}
