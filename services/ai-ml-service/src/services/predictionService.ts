import Prediction from '../models/Prediction';

interface EmployeeData {
  employeeId: string;
  tenure: number;
  salary: number;
  avgSalary: number;
  lastPromotionMonths: number;
  performanceScore: number;
  engagementScore: number;
  trainingHours: number;
  overtimeHours: number;
  absenteeismRate: number;
  teamSize: number;
  managerRating: number;
  workLifeBalance: number;
  jobSatisfaction: number;
  age: number;
  distanceFromHome: number;
  numCompaniesWorked: number;
}

interface AttritionPrediction {
  risk: number;
  probability: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    name: string;
    value: any;
    impact: number;
    direction: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    expectedImpact: number;
    category: string;
  }>;
}

interface PerformancePrediction {
  predictedScore: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  factors: Array<{
    name: string;
    value: any;
    impact: number;
    direction: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  recommendations: string[];
}

// Feature weights for attrition model (simplified logistic regression coefficients)
const ATTRITION_WEIGHTS = {
  tenure: -0.05,
  salaryRatio: -0.3,
  lastPromotionMonths: 0.02,
  performanceScore: -0.15,
  engagementScore: -0.25,
  trainingHours: -0.01,
  overtimeHours: 0.03,
  absenteeismRate: 0.15,
  managerRating: -0.2,
  workLifeBalance: -0.2,
  jobSatisfaction: -0.3,
  age: -0.01,
  distanceFromHome: 0.02,
  numCompaniesWorked: 0.1
};

export function predictAttrition(employee: EmployeeData): AttritionPrediction {
  const factors: AttritionPrediction['factors'] = [];
  let logOdds = 0;

  // Calculate salary ratio
  const salaryRatio = employee.salary / (employee.avgSalary || employee.salary);

  // Tenure factor
  const tenureFactor = calculateFactor('tenure', employee.tenure, ATTRITION_WEIGHTS.tenure,
    employee.tenure < 1 ? 'negative' : employee.tenure > 3 ? 'positive' : 'neutral',
    employee.tenure < 1 ? 'Short tenure increases flight risk' : 'Longer tenure reduces attrition risk');
  factors.push(tenureFactor);
  logOdds += tenureFactor.impact;

  // Salary factor
  const salaryFactor = calculateFactor('salaryRatio', salaryRatio, ATTRITION_WEIGHTS.salaryRatio,
    salaryRatio < 0.9 ? 'negative' : salaryRatio > 1.1 ? 'positive' : 'neutral',
    salaryRatio < 0.9 ? 'Below market compensation' : 'Competitive salary');
  factors.push(salaryFactor);
  logOdds += salaryFactor.impact;

  // Promotion factor
  const promotionFactor = calculateFactor('lastPromotionMonths', employee.lastPromotionMonths, ATTRITION_WEIGHTS.lastPromotionMonths,
    employee.lastPromotionMonths > 36 ? 'negative' : employee.lastPromotionMonths < 12 ? 'positive' : 'neutral',
    employee.lastPromotionMonths > 36 ? 'Long time since last promotion' : 'Recent career progression');
  factors.push(promotionFactor);
  logOdds += promotionFactor.impact;

  // Performance factor
  const perfFactor = calculateFactor('performanceScore', employee.performanceScore, ATTRITION_WEIGHTS.performanceScore,
    employee.performanceScore < 3 ? 'negative' : employee.performanceScore > 4 ? 'positive' : 'neutral',
    employee.performanceScore > 4 ? 'High performers may seek opportunities elsewhere' : 'Performance level');
  factors.push(perfFactor);
  logOdds += perfFactor.impact;

  // Engagement factor
  const engageFactor = calculateFactor('engagementScore', employee.engagementScore, ATTRITION_WEIGHTS.engagementScore,
    employee.engagementScore < 60 ? 'negative' : employee.engagementScore > 80 ? 'positive' : 'neutral',
    employee.engagementScore < 60 ? 'Low engagement is a significant risk factor' : 'Good engagement level');
  factors.push(engageFactor);
  logOdds += engageFactor.impact;

  // Work-life balance factor
  const wlbFactor = calculateFactor('workLifeBalance', employee.workLifeBalance, ATTRITION_WEIGHTS.workLifeBalance,
    employee.workLifeBalance < 3 ? 'negative' : employee.workLifeBalance > 4 ? 'positive' : 'neutral',
    employee.workLifeBalance < 3 ? 'Poor work-life balance' : 'Good work-life balance');
  factors.push(wlbFactor);
  logOdds += wlbFactor.impact;

  // Job satisfaction factor
  const satFactor = calculateFactor('jobSatisfaction', employee.jobSatisfaction, ATTRITION_WEIGHTS.jobSatisfaction,
    employee.jobSatisfaction < 3 ? 'negative' : employee.jobSatisfaction > 4 ? 'positive' : 'neutral',
    employee.jobSatisfaction < 3 ? 'Low job satisfaction' : 'Good job satisfaction');
  factors.push(satFactor);
  logOdds += satFactor.impact;

  // Overtime factor
  const otFactor = calculateFactor('overtimeHours', employee.overtimeHours, ATTRITION_WEIGHTS.overtimeHours,
    employee.overtimeHours > 20 ? 'negative' : employee.overtimeHours < 5 ? 'positive' : 'neutral',
    employee.overtimeHours > 20 ? 'Excessive overtime may cause burnout' : 'Reasonable work hours');
  factors.push(otFactor);
  logOdds += otFactor.impact;

  // Convert log odds to probability
  const probability = 1 / (1 + Math.exp(-logOdds));
  const risk = Math.round(probability * 100);
  const confidence = calculateConfidence(factors);

  // Determine risk level
  const riskLevel = risk > 70 ? 'critical' : risk > 50 ? 'high' : risk > 30 ? 'medium' : 'low';

  // Generate recommendations
  const recommendations = generateAttritionRecommendations(factors, employee);

  return {
    risk,
    probability,
    confidence,
    riskLevel,
    factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 5),
    recommendations
  };
}

export function predictPerformance(employee: EmployeeData, historicalScores: number[]): PerformancePrediction {
  const factors: PerformancePrediction['factors'] = [];

  // Calculate trend from historical scores
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (historicalScores.length >= 2) {
    const recentAvg = historicalScores.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const olderAvg = historicalScores.slice(0, -2).reduce((a, b) => a + b, 0) / Math.max(1, historicalScores.length - 2);
    if (recentAvg > olderAvg + 0.2) trend = 'improving';
    else if (recentAvg < olderAvg - 0.2) trend = 'declining';
  }

  // Base prediction on current performance and factors
  let predictedScore = employee.performanceScore;

  // Engagement impact
  if (employee.engagementScore > 80) {
    predictedScore += 0.2;
    factors.push({
      name: 'High Engagement',
      value: employee.engagementScore,
      impact: 0.2,
      direction: 'positive',
      description: 'High engagement correlates with better performance'
    });
  } else if (employee.engagementScore < 50) {
    predictedScore -= 0.3;
    factors.push({
      name: 'Low Engagement',
      value: employee.engagementScore,
      impact: -0.3,
      direction: 'negative',
      description: 'Low engagement may negatively impact performance'
    });
  }

  // Training impact
  if (employee.trainingHours > 40) {
    predictedScore += 0.15;
    factors.push({
      name: 'Training Investment',
      value: employee.trainingHours,
      impact: 0.15,
      direction: 'positive',
      description: 'Significant training investment shows commitment to growth'
    });
  }

  // Overtime impact (burnout risk)
  if (employee.overtimeHours > 30) {
    predictedScore -= 0.2;
    factors.push({
      name: 'Burnout Risk',
      value: employee.overtimeHours,
      impact: -0.2,
      direction: 'negative',
      description: 'Excessive overtime may lead to burnout and decreased performance'
    });
  }

  // Manager relationship
  if (employee.managerRating > 4) {
    predictedScore += 0.1;
    factors.push({
      name: 'Strong Manager Relationship',
      value: employee.managerRating,
      impact: 0.1,
      direction: 'positive',
      description: 'Good relationship with manager supports performance'
    });
  }

  predictedScore = Math.max(1, Math.min(5, predictedScore));

  const recommendations: string[] = [];
  if (trend === 'declining') {
    recommendations.push('Schedule a performance discussion to understand challenges');
    recommendations.push('Consider additional coaching or mentoring support');
  }
  if (employee.engagementScore < 60) {
    recommendations.push('Focus on improving engagement through recognition and feedback');
  }
  if (employee.trainingHours < 20) {
    recommendations.push('Invest in skill development and training opportunities');
  }

  return {
    predictedScore: Math.round(predictedScore * 10) / 10,
    confidence: 0.75,
    trend,
    factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    recommendations
  };
}

export function predictEngagement(employee: EmployeeData): number {
  let score = 70; // Base score

  // Positive factors
  if (employee.jobSatisfaction > 4) score += 10;
  if (employee.workLifeBalance > 4) score += 8;
  if (employee.managerRating > 4) score += 7;
  if (employee.trainingHours > 30) score += 5;
  if (employee.lastPromotionMonths < 18) score += 5;

  // Negative factors
  if (employee.overtimeHours > 25) score -= 10;
  if (employee.absenteeismRate > 5) score -= 8;
  if (employee.jobSatisfaction < 3) score -= 15;
  if (employee.lastPromotionMonths > 48) score -= 7;

  return Math.max(0, Math.min(100, score));
}

export function predictSalaryRange(role: string, experience: number, skills: string[], location: string): {
  min: number;
  median: number;
  max: number;
  marketComparison: string;
} {
  // Base salaries by role level
  const baseSalaries: Record<string, number> = {
    'junior': 50000,
    'mid': 75000,
    'senior': 100000,
    'lead': 130000,
    'manager': 120000,
    'director': 160000,
    'vp': 200000
  };

  // Determine level from role
  let level = 'mid';
  const roleLower = role.toLowerCase();
  if (roleLower.includes('junior') || roleLower.includes('entry')) level = 'junior';
  else if (roleLower.includes('senior') || roleLower.includes('sr')) level = 'senior';
  else if (roleLower.includes('lead') || roleLower.includes('principal')) level = 'lead';
  else if (roleLower.includes('manager')) level = 'manager';
  else if (roleLower.includes('director')) level = 'director';
  else if (roleLower.includes('vp') || roleLower.includes('vice president')) level = 'vp';

  let baseSalary = baseSalaries[level] || 75000;

  // Experience adjustment
  baseSalary *= (1 + Math.min(experience, 20) * 0.03);

  // Skills premium
  const premiumSkills = ['machine learning', 'ai', 'blockchain', 'cloud architecture', 'kubernetes', 'security'];
  const hasPremuimSkills = skills.some(s => premiumSkills.some(ps => s.toLowerCase().includes(ps)));
  if (hasPremuimSkills) baseSalary *= 1.15;

  // Location adjustment
  const locationMultipliers: Record<string, number> = {
    'san francisco': 1.4,
    'new york': 1.35,
    'seattle': 1.25,
    'boston': 1.2,
    'austin': 1.1,
    'denver': 1.05,
    'remote': 1.0
  };
  const locationMultiplier = locationMultipliers[location.toLowerCase()] || 1.0;
  baseSalary *= locationMultiplier;

  const median = Math.round(baseSalary);
  const min = Math.round(median * 0.85);
  const max = Math.round(median * 1.2);

  return {
    min,
    median,
    max,
    marketComparison: 'Competitive with market rates'
  };
}

export function predictPromotionReadiness(employee: EmployeeData): {
  readinessScore: number;
  timeToReadiness: string;
  gaps: string[];
  strengths: string[];
} {
  let readinessScore = 50;
  const gaps: string[] = [];
  const strengths: string[] = [];

  // Performance
  if (employee.performanceScore >= 4.5) {
    readinessScore += 20;
    strengths.push('Exceptional performance record');
  } else if (employee.performanceScore >= 4) {
    readinessScore += 10;
    strengths.push('Strong performance');
  } else if (employee.performanceScore < 3.5) {
    readinessScore -= 15;
    gaps.push('Performance needs improvement');
  }

  // Tenure in current role
  if (employee.lastPromotionMonths >= 24 && employee.lastPromotionMonths <= 48) {
    readinessScore += 10;
    strengths.push('Appropriate time in current role');
  } else if (employee.lastPromotionMonths < 18) {
    readinessScore -= 10;
    gaps.push('Need more experience in current role');
  }

  // Training and development
  if (employee.trainingHours > 40) {
    readinessScore += 10;
    strengths.push('Strong commitment to learning');
  } else if (employee.trainingHours < 10) {
    gaps.push('Consider additional training and certifications');
  }

  // Leadership indicators
  if (employee.teamSize > 0) {
    readinessScore += 15;
    strengths.push('Leadership experience');
  }

  if (employee.engagementScore > 80) {
    readinessScore += 5;
    strengths.push('High engagement and motivation');
  }

  readinessScore = Math.max(0, Math.min(100, readinessScore));

  let timeToReadiness = 'Ready now';
  if (readinessScore < 60) timeToReadiness = '12-18 months';
  else if (readinessScore < 75) timeToReadiness = '6-12 months';
  else if (readinessScore < 90) timeToReadiness = '3-6 months';

  return { readinessScore, timeToReadiness, gaps, strengths };
}

function calculateFactor(name: string, value: any, weight: number, direction: 'positive' | 'negative' | 'neutral', description: string) {
  const normalizedValue = typeof value === 'number' ? value : 0;
  const impact = normalizedValue * weight;

  return {
    name,
    value,
    impact: Math.round(impact * 100) / 100,
    direction,
    description
  };
}

function calculateConfidence(factors: Array<{ impact: number }>): number {
  const totalImpact = factors.reduce((sum, f) => sum + Math.abs(f.impact), 0);
  return Math.min(0.95, 0.6 + (totalImpact * 0.05));
}

function generateAttritionRecommendations(factors: AttritionPrediction['factors'], employee: EmployeeData): AttritionPrediction['recommendations'] {
  const recommendations: AttritionPrediction['recommendations'] = [];

  // Compensation-related
  if (employee.salary / employee.avgSalary < 0.95) {
    recommendations.push({
      priority: 'high',
      action: 'Salary Review',
      description: 'Conduct compensation review - salary below market average',
      expectedImpact: 20,
      category: 'compensation'
    });
  }

  // Career development
  if (employee.lastPromotionMonths > 30) {
    recommendations.push({
      priority: 'high',
      action: 'Career Discussion',
      description: 'Schedule career development discussion - no promotion in 2.5+ years',
      expectedImpact: 15,
      category: 'career'
    });
  }

  // Engagement
  if (employee.engagementScore < 60) {
    recommendations.push({
      priority: 'high',
      action: 'Engagement Intervention',
      description: 'Implement engagement initiatives - score below threshold',
      expectedImpact: 25,
      category: 'engagement'
    });
  }

  // Work-life balance
  if (employee.overtimeHours > 20 || employee.workLifeBalance < 3) {
    recommendations.push({
      priority: 'medium',
      action: 'Workload Assessment',
      description: 'Review workload distribution and work-life balance',
      expectedImpact: 15,
      category: 'wellbeing'
    });
  }

  // Manager relationship
  if (employee.managerRating < 3) {
    recommendations.push({
      priority: 'medium',
      action: 'Manager Training',
      description: 'Consider management coaching or team restructuring',
      expectedImpact: 10,
      category: 'management'
    });
  }

  // Training
  if (employee.trainingHours < 10) {
    recommendations.push({
      priority: 'low',
      action: 'Learning Opportunities',
      description: 'Offer training and development programs',
      expectedImpact: 8,
      category: 'development'
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
