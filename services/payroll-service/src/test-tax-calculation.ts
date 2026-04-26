/**
 * Tax Calculation Test Script - FY 2025-26
 * Run with: npx ts-node src/test-tax-calculation.ts
 */

import {
  NEW_REGIME_SLABS_2025_26,
  OLD_REGIME_SLABS_2025_26,
  TAX_CONSTANTS_2025_26,
  calculateIncomeTax
} from './services/taxService';

interface TaxResult {
  regime: string;
  grossSalary: number;
  standardDeduction: number;
  taxableIncome: number;
  grossTax: number;
  rebate87A: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  effectiveTaxRate: string;
  monthlyTDS: number;
}

function calculateTax(
  grossSalary: number,
  regime: 'old' | 'new',
  deductions?: { section80C?: number; section80D?: number; hra?: number }
): TaxResult {
  const constants = regime === 'new'
    ? TAX_CONSTANTS_2025_26.newRegime
    : TAX_CONSTANTS_2025_26.oldRegime;

  const slabs = regime === 'new' ? NEW_REGIME_SLABS_2025_26 : OLD_REGIME_SLABS_2025_26;

  // Calculate exemptions
  let totalExemptions = constants.standardDeduction;

  if (regime === 'old' && deductions) {
    // Old regime allows additional deductions
    totalExemptions += Math.min(150000, deductions.section80C || 0);
    totalExemptions += Math.min(100000, deductions.section80D || 0);
    totalExemptions += deductions.hra || 0;
  }

  // Calculate taxable income
  const taxableIncome = Math.max(0, grossSalary - totalExemptions);

  // Calculate tax using slabs
  const { tax: grossTax } = calculateIncomeTax(taxableIncome, slabs, 0);

  // Apply rebate 87A
  let rebate87A = 0;
  let taxAfterRebate = grossTax;

  if (taxableIncome <= constants.rebate87A.incomeLimit) {
    rebate87A = Math.min(grossTax, constants.rebate87A.maxRebate);
    taxAfterRebate = Math.max(0, grossTax - rebate87A);
  }

  // Calculate surcharge
  let surcharge = 0;
  if (taxableIncome > 5000000) {
    const surchargeSlabs = [
      { min: 5000000, max: 10000000, rate: 10 },
      { min: 10000001, max: 20000000, rate: 15 },
      { min: 20000001, max: 50000000, rate: 25 },
      { min: 50000001, max: Infinity, rate: constants.maxSurchargeRate }
    ];
    const slab = surchargeSlabs.find(s => taxableIncome >= s.min && taxableIncome <= s.max);
    if (slab) {
      surcharge = taxAfterRebate * (slab.rate / 100);
    }
  }

  // Calculate cess (4%)
  const cess = (taxAfterRebate + surcharge) * (TAX_CONSTANTS_2025_26.cess / 100);

  // Total tax
  const totalTax = Math.round(taxAfterRebate + surcharge + cess);

  return {
    regime: regime.toUpperCase(),
    grossSalary,
    standardDeduction: constants.standardDeduction,
    taxableIncome,
    grossTax: Math.round(grossTax),
    rebate87A: Math.round(rebate87A),
    taxAfterRebate: Math.round(taxAfterRebate),
    surcharge: Math.round(surcharge),
    cess: Math.round(cess),
    totalTax,
    effectiveTaxRate: ((totalTax / grossSalary) * 100).toFixed(2) + '%',
    monthlyTDS: Math.round(totalTax / 12)
  };
}

function printResult(result: TaxResult, deductions?: any) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`REGIME: ${result.regime}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Gross Annual Salary:     ₹${result.grossSalary.toLocaleString('en-IN')}`);
  console.log(`Standard Deduction:      ₹${result.standardDeduction.toLocaleString('en-IN')}`);
  if (deductions && result.regime === 'OLD') {
    console.log(`Section 80C:             ₹${(deductions.section80C || 0).toLocaleString('en-IN')}`);
    console.log(`Section 80D:             ₹${(deductions.section80D || 0).toLocaleString('en-IN')}`);
    console.log(`HRA Exemption:           ₹${(deductions.hra || 0).toLocaleString('en-IN')}`);
  }
  console.log(`${'─'.repeat(60)}`);
  console.log(`Taxable Income:          ₹${result.taxableIncome.toLocaleString('en-IN')}`);
  console.log(`Gross Tax:               ₹${result.grossTax.toLocaleString('en-IN')}`);
  if (result.rebate87A > 0) {
    console.log(`Rebate u/s 87A:         -₹${result.rebate87A.toLocaleString('en-IN')}`);
  }
  console.log(`Tax After Rebate:        ₹${result.taxAfterRebate.toLocaleString('en-IN')}`);
  if (result.surcharge > 0) {
    console.log(`Surcharge:               ₹${result.surcharge.toLocaleString('en-IN')}`);
  }
  console.log(`Health & Education Cess: ₹${result.cess.toLocaleString('en-IN')}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`TOTAL TAX:               ₹${result.totalTax.toLocaleString('en-IN')}`);
  console.log(`Effective Tax Rate:      ${result.effectiveTaxRate}`);
  console.log(`Monthly TDS:             ₹${result.monthlyTDS.toLocaleString('en-IN')}`);
}

function compareRegimes(grossSalary: number, deductions?: any) {
  console.log(`\n${'#'.repeat(70)}`);
  console.log(`  TAX COMPARISON - FY 2025-26 (AY 2026-27)`);
  console.log(`  Gross Annual Salary: ₹${grossSalary.toLocaleString('en-IN')}`);
  console.log(`${'#'.repeat(70)}`);

  const newRegimeResult = calculateTax(grossSalary, 'new');
  const oldRegimeResult = calculateTax(grossSalary, 'old', deductions);

  printResult(newRegimeResult);
  printResult(oldRegimeResult, deductions);

  const savings = Math.abs(newRegimeResult.totalTax - oldRegimeResult.totalTax);
  const betterRegime = newRegimeResult.totalTax <= oldRegimeResult.totalTax ? 'NEW' : 'OLD';

  console.log(`\n${'*'.repeat(60)}`);
  console.log(`  RECOMMENDATION: ${betterRegime} REGIME`);
  console.log(`  Tax Savings: ₹${savings.toLocaleString('en-IN')} per year`);
  console.log(`               ₹${Math.round(savings/12).toLocaleString('en-IN')} per month`);
  console.log(`${'*'.repeat(60)}`);
}

// ===================== TEST CASES =====================

console.log('\n' + '█'.repeat(70));
console.log('  INDIA INCOME TAX CALCULATOR - FY 2025-26');
console.log('  (As per Union Budget 2025)');
console.log('█'.repeat(70));

// Test Case 1: ₹6 Lakh - Should be tax-free under new regime
console.log('\n\n📊 TEST CASE 1: Entry Level Salary');
compareRegimes(600000);

// Test Case 2: ₹10 Lakh with deductions
console.log('\n\n📊 TEST CASE 2: Mid-Level Salary with Deductions');
compareRegimes(1000000, {
  section80C: 150000,
  section80D: 25000,
  hra: 120000
});

// Test Case 3: ₹12 Lakh - Boundary case for new regime rebate
console.log('\n\n📊 TEST CASE 3: ₹12 Lakh (New Regime Rebate Boundary)');
compareRegimes(1200000, {
  section80C: 150000,
  section80D: 50000,
  hra: 150000
});

// Test Case 4: ₹15 Lakh
console.log('\n\n📊 TEST CASE 4: Senior Professional');
compareRegimes(1500000, {
  section80C: 150000,
  section80D: 75000,
  hra: 200000
});

// Test Case 5: ₹20 Lakh
console.log('\n\n📊 TEST CASE 5: Senior Management');
compareRegimes(2000000, {
  section80C: 150000,
  section80D: 100000,
  hra: 300000
});

// Test Case 6: ₹50 Lakh - High income with surcharge
console.log('\n\n📊 TEST CASE 6: High Income (with Surcharge)');
compareRegimes(5000000, {
  section80C: 150000,
  section80D: 100000,
  hra: 500000
});

// Test Case 7: ₹12.75 Lakh - Max tax-free under new regime
console.log('\n\n📊 TEST CASE 7: ₹12.75 Lakh (Max Tax-Free in New Regime)');
console.log('  (₹12L taxable + ₹75K standard deduction)');
compareRegimes(1275000, {
  section80C: 150000,
  section80D: 50000,
  hra: 180000
});

console.log('\n\n' + '═'.repeat(70));
console.log('  KEY HIGHLIGHTS - FY 2025-26:');
console.log('═'.repeat(70));
console.log('  ✓ New Regime Standard Deduction: ₹75,000');
console.log('  ✓ New Regime Rebate 87A: ₹60,000 (income up to ₹12 lakh)');
console.log('  ✓ Income up to ₹12.75 lakh is TAX-FREE under New Regime');
console.log('  ✓ Old Regime Standard Deduction: ₹50,000');
console.log('  ✓ Old Regime Rebate 87A: ₹12,500 (income up to ₹5 lakh)');
console.log('  ✓ New Regime is DEFAULT from FY 2023-24');
console.log('═'.repeat(70) + '\n');
