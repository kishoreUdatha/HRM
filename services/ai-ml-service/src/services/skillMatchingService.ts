import SkillTaxonomy from '../models/SkillTaxonomy';

interface JobRequirement {
  title: string;
  requiredSkills: Array<{ skill: string; level: 'beginner' | 'intermediate' | 'advanced' | 'expert'; weight: number }>;
  preferredSkills: Array<{ skill: string; level: string; weight: number }>;
  experienceYears: { min: number; max: number };
  education: string[];
}

interface CandidateProfile {
  skills: Array<{ skill: string; level: string; yearsOfExperience?: number }>;
  experienceYears: number;
  education: Array<{ degree: string; field: string }>;
  certifications: string[];
}

interface MatchResult {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  matchedSkills: Array<{ skill: string; candidateLevel: string; requiredLevel: string; match: 'exact' | 'above' | 'below' }>;
  missingSkills: string[];
  additionalSkills: string[];
  recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match';
  gapAnalysis: Array<{ skill: string; gap: string; trainingRecommendation: string }>;
}

const LEVEL_VALUES: Record<string, number> = {
  'beginner': 1,
  'intermediate': 2,
  'advanced': 3,
  'expert': 4
};

// Skill synonyms/aliases for matching
const SKILL_ALIASES: Record<string, string[]> = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
  'typescript': ['ts'],
  'python': ['py', 'python3'],
  'react': ['reactjs', 'react.js'],
  'node': ['nodejs', 'node.js'],
  'angular': ['angularjs', 'angular.js'],
  'vue': ['vuejs', 'vue.js'],
  'postgresql': ['postgres', 'psql'],
  'mongodb': ['mongo'],
  'kubernetes': ['k8s'],
  'amazon web services': ['aws'],
  'google cloud platform': ['gcp'],
  'microsoft azure': ['azure'],
  'ci/cd': ['continuous integration', 'continuous deployment'],
  'machine learning': ['ml'],
  'artificial intelligence': ['ai'],
  'natural language processing': ['nlp']
};

export function matchCandidateToJob(candidate: CandidateProfile, job: JobRequirement): MatchResult {
  const matchedSkills: MatchResult['matchedSkills'] = [];
  const missingSkills: string[] = [];
  const additionalSkills: string[] = [];
  const gapAnalysis: MatchResult['gapAnalysis'] = [];

  // Normalize candidate skills
  const candidateSkillMap = new Map<string, { level: string; yearsOfExperience?: number }>();
  for (const skill of candidate.skills) {
    const normalizedSkill = normalizeSkill(skill.skill);
    candidateSkillMap.set(normalizedSkill, { level: skill.level, yearsOfExperience: skill.yearsOfExperience });
  }

  // Match required skills
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const req of job.requiredSkills) {
    const normalizedReq = normalizeSkill(req.skill);
    totalWeight += req.weight;

    const candidateSkill = findSkillMatch(normalizedReq, candidateSkillMap);

    if (candidateSkill) {
      const candidateLevel = LEVEL_VALUES[candidateSkill.level.toLowerCase()] || 2;
      const requiredLevel = LEVEL_VALUES[req.level] || 2;

      let matchType: 'exact' | 'above' | 'below' = 'exact';
      let matchScore = 1;

      if (candidateLevel > requiredLevel) {
        matchType = 'above';
        matchScore = 1;
      } else if (candidateLevel < requiredLevel) {
        matchType = 'below';
        matchScore = candidateLevel / requiredLevel;

        gapAnalysis.push({
          skill: req.skill,
          gap: `${req.level} required, candidate has ${candidateSkill.level}`,
          trainingRecommendation: getTrainingRecommendation(req.skill, req.level)
        });
      }

      matchedSkills.push({
        skill: req.skill,
        candidateLevel: candidateSkill.level,
        requiredLevel: req.level,
        match: matchType
      });

      matchedWeight += req.weight * matchScore;
    } else {
      missingSkills.push(req.skill);
      gapAnalysis.push({
        skill: req.skill,
        gap: 'Skill not found in candidate profile',
        trainingRecommendation: getTrainingRecommendation(req.skill, req.level)
      });
    }
  }

  // Match preferred skills (bonus)
  for (const pref of job.preferredSkills) {
    const normalizedPref = normalizeSkill(pref.skill);
    const candidateSkill = findSkillMatch(normalizedPref, candidateSkillMap);

    if (candidateSkill) {
      matchedWeight += pref.weight * 0.5; // Preferred skills count for 50%
      totalWeight += pref.weight * 0.5;
    }
  }

  // Find additional skills candidate has
  for (const [skill] of candidateSkillMap) {
    const isRequired = job.requiredSkills.some(r => normalizeSkill(r.skill) === skill);
    const isPreferred = job.preferredSkills.some(p => normalizeSkill(p.skill) === skill);
    if (!isRequired && !isPreferred) {
      additionalSkills.push(skill);
    }
  }

  // Calculate scores
  const skillsScore = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
  const experienceScore = calculateExperienceScore(candidate.experienceYears, job.experienceYears);
  const educationScore = calculateEducationScore(candidate.education, candidate.certifications, job.education);

  const overallScore = Math.round(
    skillsScore * 0.5 + experienceScore * 0.3 + educationScore * 0.2
  );

  // Determine recommendation
  let recommendation: MatchResult['recommendation'];
  if (overallScore >= 85) recommendation = 'strong_match';
  else if (overallScore >= 70) recommendation = 'good_match';
  else if (overallScore >= 50) recommendation = 'partial_match';
  else recommendation = 'weak_match';

  return {
    overallScore,
    skillsScore,
    experienceScore,
    educationScore,
    matchedSkills,
    missingSkills,
    additionalSkills,
    recommendation,
    gapAnalysis
  };
}

export function findBestCandidates(
  candidates: Array<CandidateProfile & { id: string; name: string }>,
  job: JobRequirement,
  limit: number = 10
): Array<{ candidate: any; match: MatchResult }> {
  const results = candidates.map(candidate => ({
    candidate: { id: candidate.id, name: candidate.name },
    match: matchCandidateToJob(candidate, job)
  }));

  return results
    .sort((a, b) => b.match.overallScore - a.match.overallScore)
    .slice(0, limit);
}

export function findBestJobsForCandidate(
  candidate: CandidateProfile,
  jobs: Array<JobRequirement & { id: string }>,
  limit: number = 10
): Array<{ job: any; match: MatchResult }> {
  const results = jobs.map(job => ({
    job: { id: job.id, title: job.title },
    match: matchCandidateToJob(candidate, job)
  }));

  return results
    .sort((a, b) => b.match.overallScore - a.match.overallScore)
    .slice(0, limit);
}

export function analyzeSkillGaps(
  teamSkills: Array<{ employeeId: string; skills: string[] }>,
  requiredSkills: string[]
): {
  teamCoverage: Record<string, number>;
  gaps: Array<{ skill: string; coverage: number; criticalGap: boolean }>;
  recommendations: string[];
} {
  const teamCoverage: Record<string, number> = {};

  // Count skill coverage
  for (const skill of requiredSkills) {
    const normalizedSkill = normalizeSkill(skill);
    const count = teamSkills.filter(member =>
      member.skills.some(s => normalizeSkill(s) === normalizedSkill)
    ).length;
    teamCoverage[skill] = count;
  }

  // Identify gaps
  const gaps = requiredSkills
    .map(skill => ({
      skill,
      coverage: teamCoverage[skill] || 0,
      criticalGap: (teamCoverage[skill] || 0) === 0
    }))
    .filter(g => g.coverage < 2)
    .sort((a, b) => a.coverage - b.coverage);

  // Generate recommendations
  const recommendations: string[] = [];
  const criticalGaps = gaps.filter(g => g.criticalGap);
  const lowCoverage = gaps.filter(g => !g.criticalGap);

  if (criticalGaps.length > 0) {
    recommendations.push(`Critical skill gaps: ${criticalGaps.map(g => g.skill).join(', ')} - Consider hiring or urgent training`);
  }
  if (lowCoverage.length > 0) {
    recommendations.push(`Low coverage skills: ${lowCoverage.map(g => g.skill).join(', ')} - Consider cross-training team members`);
  }

  return { teamCoverage, gaps, recommendations };
}

export function generateLearningPath(
  currentSkills: Array<{ skill: string; level: string }>,
  targetSkills: Array<{ skill: string; level: string }>,
  careerGoal?: string
): Array<{
  skill: string;
  currentLevel: string;
  targetLevel: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  resources: Array<{ type: string; name: string; provider: string }>;
}> {
  const learningPath: Array<{
    skill: string;
    currentLevel: string;
    targetLevel: string;
    priority: 'high' | 'medium' | 'low';
    estimatedHours: number;
    resources: Array<{ type: string; name: string; provider: string }>;
  }> = [];

  const currentSkillMap = new Map(currentSkills.map(s => [normalizeSkill(s.skill), s.level]));

  for (const target of targetSkills) {
    const normalizedSkill = normalizeSkill(target.skill);
    const currentLevel = currentSkillMap.get(normalizedSkill) || 'none';
    const currentValue = LEVEL_VALUES[currentLevel.toLowerCase()] || 0;
    const targetValue = LEVEL_VALUES[target.level.toLowerCase()] || 2;

    if (currentValue < targetValue) {
      const levelDiff = targetValue - currentValue;
      const estimatedHours = levelDiff * 40; // 40 hours per level

      learningPath.push({
        skill: target.skill,
        currentLevel: currentLevel || 'None',
        targetLevel: target.level,
        priority: levelDiff >= 2 ? 'high' : levelDiff >= 1 ? 'medium' : 'low',
        estimatedHours,
        resources: getResourceRecommendations(target.skill, target.level)
      });
    }
  }

  return learningPath.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function normalizeSkill(skill: string): string {
  const normalized = skill.toLowerCase().trim();

  // Check aliases
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.includes(normalized) || canonical === normalized) {
      return canonical;
    }
  }

  return normalized;
}

function findSkillMatch(
  targetSkill: string,
  candidateSkills: Map<string, { level: string; yearsOfExperience?: number }>
): { level: string; yearsOfExperience?: number } | null {
  // Direct match
  if (candidateSkills.has(targetSkill)) {
    return candidateSkills.get(targetSkill)!;
  }

  // Check aliases
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (canonical === targetSkill || aliases.includes(targetSkill)) {
      if (candidateSkills.has(canonical)) {
        return candidateSkills.get(canonical)!;
      }
      for (const alias of aliases) {
        if (candidateSkills.has(alias)) {
          return candidateSkills.get(alias)!;
        }
      }
    }
  }

  return null;
}

function calculateExperienceScore(candidateYears: number, required: { min: number; max: number }): number {
  if (candidateYears >= required.min && candidateYears <= required.max) {
    return 100;
  } else if (candidateYears > required.max) {
    // Overqualified - slight penalty
    return Math.max(70, 100 - (candidateYears - required.max) * 5);
  } else {
    // Under-qualified
    const ratio = candidateYears / required.min;
    return Math.round(ratio * 100);
  }
}

function calculateEducationScore(
  education: Array<{ degree: string; field: string }>,
  certifications: string[],
  required: string[]
): number {
  let score = 50; // Base score

  const degreeValues: Record<string, number> = {
    'phd': 30,
    'doctorate': 30,
    'master': 25,
    'mba': 25,
    'bachelor': 20,
    'associate': 10
  };

  for (const edu of education) {
    const degreeLower = edu.degree.toLowerCase();
    for (const [degree, value] of Object.entries(degreeValues)) {
      if (degreeLower.includes(degree)) {
        score += value;
        break;
      }
    }
  }

  // Certifications bonus
  score += Math.min(20, certifications.length * 5);

  return Math.min(100, score);
}

function getTrainingRecommendation(skill: string, targetLevel: string): string {
  const recommendations: Record<string, string> = {
    'beginner': `Start with introductory ${skill} courses and tutorials`,
    'intermediate': `Take hands-on ${skill} projects and intermediate courses`,
    'advanced': `Complete advanced ${skill} certifications and real-world projects`,
    'expert': `Pursue ${skill} expert certifications and mentorship programs`
  };

  return recommendations[targetLevel] || `Develop ${skill} skills through training and practice`;
}

function getResourceRecommendations(skill: string, level: string): Array<{ type: string; name: string; provider: string }> {
  // Simplified resource recommendations
  return [
    { type: 'course', name: `${skill} ${level} Course`, provider: 'Coursera' },
    { type: 'certification', name: `${skill} Certification`, provider: 'Vendor' },
    { type: 'tutorial', name: `${skill} Hands-on Tutorial`, provider: 'YouTube/Udemy' }
  ];
}
