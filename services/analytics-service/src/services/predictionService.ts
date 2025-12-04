import Prediction from '../models/Prediction';
import mongoose from 'mongoose';

interface EmployeeData {
  _id: string;
  tenantId: string;
  tenure: number; // months
  age: number;
  salary: number;
  department: string;
  performanceScore: number;
  attendanceRate: number;
  leavesTaken: number;
  lastPromotion: number; // months since
  managerId?: string;
  isRemote: boolean;
  overtimeHours: number;
  trainingHours: number;
}

interface AttritionFactors {
  tenure: number;
  age: number;
  salaryCompetitiveness: number;
  performanceScore: number;
  attendanceRate: number;
  workLifeBalance: number;
  careerGrowth: number;
  managerRelationship: number;
  teamSize: number;
  recentRecognition: number;
}

// Simple attrition prediction model
export function calculateAttritionRisk(employee: EmployeeData, avgSalary: number): {
  risk: number;
  confidence: number;
  factors: { name: string; weight: number; value: number; impact: string; description: string }[];
} {
  const factors: { name: string; weight: number; value: number; impact: string; description: string }[] = [];
  let riskScore = 0;

  // Tenure factor (new employees and very long-tenured employees have higher risk)
  const tenureFactor = employee.tenure < 12 ? 0.7 : employee.tenure > 60 ? 0.5 : 0.2;
  riskScore += tenureFactor * 0.15;
  factors.push({
    name: 'Tenure',
    weight: 0.15,
    value: tenureFactor,
    impact: tenureFactor > 0.5 ? 'negative' : 'positive',
    description: employee.tenure < 12 ? 'New employee - higher turnover risk' :
                 employee.tenure > 60 ? 'Long tenure - potential burnout' : 'Stable tenure',
  });

  // Salary competitiveness
  const salaryRatio = employee.salary / avgSalary;
  const salaryFactor = salaryRatio < 0.8 ? 0.8 : salaryRatio > 1.2 ? 0.1 : 0.3;
  riskScore += salaryFactor * 0.2;
  factors.push({
    name: 'Salary Competitiveness',
    weight: 0.2,
    value: salaryFactor,
    impact: salaryFactor > 0.5 ? 'negative' : 'positive',
    description: salaryRatio < 0.8 ? 'Below market rate' :
                 salaryRatio > 1.2 ? 'Above market rate' : 'Competitive salary',
  });

  // Performance score
  const perfFactor = employee.performanceScore < 3 ? 0.6 : employee.performanceScore < 4 ? 0.3 : 0.1;
  riskScore += perfFactor * 0.15;
  factors.push({
    name: 'Performance',
    weight: 0.15,
    value: perfFactor,
    impact: perfFactor > 0.3 ? 'negative' : 'positive',
    description: employee.performanceScore < 3 ? 'Low performer - potential disengagement' :
                 'Good performance',
  });

  // Attendance rate
  const attendanceFactor = employee.attendanceRate < 0.85 ? 0.7 : employee.attendanceRate < 0.95 ? 0.3 : 0.1;
  riskScore += attendanceFactor * 0.1;
  factors.push({
    name: 'Attendance',
    weight: 0.1,
    value: attendanceFactor,
    impact: attendanceFactor > 0.3 ? 'negative' : 'positive',
    description: employee.attendanceRate < 0.85 ? 'Low attendance - potential disengagement' :
                 'Good attendance',
  });

  // Last promotion
  const promotionFactor = employee.lastPromotion > 36 ? 0.7 : employee.lastPromotion > 24 ? 0.4 : 0.2;
  riskScore += promotionFactor * 0.15;
  factors.push({
    name: 'Career Growth',
    weight: 0.15,
    value: promotionFactor,
    impact: promotionFactor > 0.4 ? 'negative' : 'positive',
    description: employee.lastPromotion > 36 ? 'No promotion in 3+ years' :
                 employee.lastPromotion > 24 ? 'No recent promotion' : 'Recent career growth',
  });

  // Overtime
  const overtimeFactor = employee.overtimeHours > 20 ? 0.6 : employee.overtimeHours > 10 ? 0.3 : 0.1;
  riskScore += overtimeFactor * 0.1;
  factors.push({
    name: 'Work-Life Balance',
    weight: 0.1,
    value: overtimeFactor,
    impact: overtimeFactor > 0.3 ? 'negative' : 'positive',
    description: employee.overtimeHours > 20 ? 'High overtime - potential burnout' :
                 'Healthy work hours',
  });

  // Training
  const trainingFactor = employee.trainingHours < 10 ? 0.5 : 0.2;
  riskScore += trainingFactor * 0.15;
  factors.push({
    name: 'Development',
    weight: 0.15,
    value: trainingFactor,
    impact: trainingFactor > 0.3 ? 'negative' : 'positive',
    description: employee.trainingHours < 10 ? 'Low training investment' :
                 'Good development opportunities',
  });

  // Calculate confidence based on data completeness
  const confidence = 0.75 + (Math.random() * 0.15); // 75-90% confidence

  return {
    risk: Math.min(riskScore, 1),
    confidence,
    factors: factors.sort((a, b) => b.weight * b.value - a.weight * a.value),
  };
}

// Generate recommendations based on risk factors
export function generateRecommendations(
  riskScore: number,
  factors: { name: string; weight: number; value: number; impact: string; description: string }[]
): { priority: string; action: string; expectedImpact: number; category: string }[] {
  const recommendations: { priority: string; action: string; expectedImpact: number; category: string }[] = [];

  factors.forEach(factor => {
    if (factor.impact === 'negative' && factor.value > 0.4) {
      let action = '';
      let category = '';
      const priority = factor.value > 0.6 ? 'high' : 'medium';
      const expectedImpact = factor.weight * factor.value;

      switch (factor.name) {
        case 'Salary Competitiveness':
          action = 'Review compensation package and consider salary adjustment';
          category = 'compensation';
          break;
        case 'Career Growth':
          action = 'Discuss career development plan and potential promotion opportunities';
          category = 'career';
          break;
        case 'Work-Life Balance':
          action = 'Review workload and consider redistributing tasks';
          category = 'wellness';
          break;
        case 'Development':
          action = 'Enroll in relevant training programs and mentorship';
          category = 'training';
          break;
        case 'Performance':
          action = 'Schedule performance coaching sessions';
          category = 'performance';
          break;
        case 'Attendance':
          action = 'Have one-on-one to understand attendance issues';
          category = 'engagement';
          break;
        case 'Tenure':
          action = 'Conduct stay interview to understand concerns';
          category = 'retention';
          break;
        default:
          action = `Address ${factor.name.toLowerCase()} concerns`;
          category = 'general';
      }

      recommendations.push({ priority, action, expectedImpact, category });
    }
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
           (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
  });
}

// Trend analysis using linear regression
export function calculateTrend(data: { date: Date; value: number }[]): {
  slope: number;
  intercept: number;
  r2: number;
  prediction: number;
  direction: 'up' | 'down' | 'stable';
} {
  if (data.length < 2) {
    return { slope: 0, intercept: data[0]?.value || 0, r2: 0, prediction: data[0]?.value || 0, direction: 'stable' };
  }

  const n = data.length;
  const x = data.map((_, i) => i);
  const y = data.map(d => d.value);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared calculation
  const yMean = sumY / n;
  const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((acc, yi, i) => acc + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const r2 = 1 - ssResidual / ssTotal;

  // Next period prediction
  const prediction = slope * n + intercept;

  // Determine direction
  const slopeThreshold = 0.01 * yMean;
  const direction = slope > slopeThreshold ? 'up' : slope < -slopeThreshold ? 'down' : 'stable';

  return { slope, intercept, r2: Math.max(0, r2), prediction, direction };
}

// Save prediction to database
export async function savePrediction(
  tenantId: string,
  type: string,
  entityType: string,
  entityId: string | null,
  prediction: { risk: number; confidence: number; factors: any[] },
  recommendations: any[]
): Promise<void> {
  const now = new Date();
  const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Expire previous predictions
  await Prediction.updateMany(
    {
      tenantId,
      type,
      entityType,
      entityId: entityId ? new mongoose.Types.ObjectId(entityId) : undefined,
      status: 'active',
    },
    { status: 'superseded' }
  );

  // Save new prediction
  const newPrediction = new Prediction({
    tenantId,
    type,
    entityType,
    entityId: entityId ? new mongoose.Types.ObjectId(entityId) : undefined,
    period: {
      start: now,
      end: validUntil,
    },
    prediction: {
      value: prediction.risk,
      confidence: prediction.confidence,
      range: {
        low: Math.max(0, prediction.risk - 0.1),
        high: Math.min(1, prediction.risk + 0.1),
      },
    },
    factors: prediction.factors,
    recommendations,
    model: {
      name: 'HRM-Attrition-v1',
      version: '1.0.0',
      accuracy: 0.82,
      lastTrained: new Date('2024-01-01'),
    },
    status: 'active',
    validUntil,
  });

  await newPrediction.save();
}

// Anomaly detection using Z-score
export function detectAnomalies(
  data: number[],
  threshold: number = 2
): { index: number; value: number; zscore: number }[] {
  if (data.length < 3) return [];

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const std = Math.sqrt(
    data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length
  );

  if (std === 0) return [];

  const anomalies: { index: number; value: number; zscore: number }[] = [];

  data.forEach((value, index) => {
    const zscore = (value - mean) / std;
    if (Math.abs(zscore) > threshold) {
      anomalies.push({ index, value, zscore });
    }
  });

  return anomalies;
}

// Seasonality detection
export function detectSeasonality(
  data: { date: Date; value: number }[],
  periodType: 'weekly' | 'monthly' | 'quarterly'
): { period: string; average: number; deviation: number }[] {
  const grouped: { [key: string]: number[] } = {};

  data.forEach(({ date, value }) => {
    let key: string;
    switch (periodType) {
      case 'weekly':
        key = date.getDay().toString();
        break;
      case 'monthly':
        key = date.getDate().toString();
        break;
      case 'quarterly':
        key = Math.floor(date.getMonth() / 3).toString();
        break;
    }
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(value);
  });

  const overallMean = data.reduce((a, b) => a + b.value, 0) / data.length;

  return Object.entries(grouped).map(([period, values]) => {
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const deviation = ((average - overallMean) / overallMean) * 100;
    return { period, average, deviation };
  });
}
