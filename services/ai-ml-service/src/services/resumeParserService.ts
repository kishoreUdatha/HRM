import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

interface ParsedResume {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience: Array<{
    company: string;
    title: string;
    duration: string;
    startDate?: string;
    endDate?: string;
    description: string;
    skills: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year?: string;
    gpa?: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    certifications: string[];
  };
  totalExperienceYears: number;
}

// Regex patterns for extraction
const PATTERNS = {
  email: /[\w.-]+@[\w.-]+\.\w+/gi,
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  linkedin: /linkedin\.com\/in\/[\w-]+/gi,
  github: /github\.com\/[\w-]+/gi,
  year: /\b(19|20)\d{2}\b/g,
  duration: /(\d+)\s*(?:year|yr|month|mo)s?/gi
};

const TECHNICAL_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'rails', '.net',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'gitlab', 'github actions',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'graphql', 'rest api', 'microservices',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'computer vision',
  'git', 'agile', 'scrum', 'jira', 'confluence', 'ci/cd', 'devops', 'linux', 'unix'
];

const SOFT_SKILLS = [
  'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
  'time management', 'adaptability', 'creativity', 'emotional intelligence', 'negotiation',
  'presentation', 'mentoring', 'collaboration', 'decision making', 'conflict resolution',
  'project management', 'strategic planning', 'analytical', 'attention to detail'
];

const CERTIFICATIONS = [
  'aws certified', 'azure certified', 'gcp certified', 'pmp', 'scrum master', 'cissp',
  'cka', 'ckad', 'comptia', 'ccna', 'ccnp', 'ceh', 'itil', 'six sigma', 'prince2',
  'google certified', 'microsoft certified', 'oracle certified', 'salesforce certified'
];

export async function parseResume(text: string): Promise<ParsedResume> {
  const startTime = Date.now();

  // Try AI-powered parsing first
  if (process.env.OPENAI_API_KEY) {
    try {
      const aiResult = await parseWithAI(text);
      if (aiResult) return aiResult;
    } catch (error) {
      console.error('[Resume Parser] AI parsing failed, falling back to rule-based:', error);
    }
  }

  // Fallback to rule-based parsing
  return parseWithRules(text);
}

async function parseWithAI(text: string): Promise<ParsedResume | null> {
  const prompt = `Parse the following resume and extract information in JSON format:

Resume Text:
${text.substring(0, 8000)}

Extract and return a JSON object with this structure:
{
  "name": "Full name",
  "email": "Email address",
  "phone": "Phone number",
  "location": "City, State/Country",
  "summary": "Professional summary (2-3 sentences)",
  "experience": [
    {
      "company": "Company name",
      "title": "Job title",
      "duration": "e.g., Jan 2020 - Present",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "description": "Brief description of responsibilities",
      "skills": ["skill1", "skill2"]
    }
  ],
  "education": [
    {
      "institution": "University/College name",
      "degree": "Degree type (BS, MS, etc.)",
      "field": "Field of study",
      "year": "Graduation year"
    }
  ],
  "skills": {
    "technical": ["programming languages, frameworks, tools"],
    "soft": ["soft skills"],
    "languages": ["spoken languages"],
    "certifications": ["certifications"]
  },
  "totalExperienceYears": number
}

Return ONLY valid JSON, no explanation.`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2000
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[Resume Parser] Failed to parse AI response as JSON');
  }

  return null;
}

function parseWithRules(text: string): ParsedResume {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const lowerText = text.toLowerCase();

  // Extract basic info
  const emails = text.match(PATTERNS.email) || [];
  const phones = text.match(PATTERNS.phone) || [];

  // Extract name (usually first non-empty line that's not an email/phone)
  let name = '';
  for (const line of lines.slice(0, 5)) {
    if (!line.match(PATTERNS.email) && !line.match(PATTERNS.phone) && line.length < 50) {
      name = line;
      break;
    }
  }

  // Extract skills
  const technicalSkills = TECHNICAL_SKILLS.filter(skill =>
    lowerText.includes(skill.toLowerCase())
  );
  const softSkills = SOFT_SKILLS.filter(skill =>
    lowerText.includes(skill.toLowerCase())
  );
  const certifications = CERTIFICATIONS.filter(cert =>
    lowerText.includes(cert.toLowerCase())
  );

  // Extract experience sections
  const experience = extractExperience(text);
  const education = extractEducation(text);

  // Calculate total experience
  const totalExperienceYears = calculateTotalExperience(experience);

  return {
    name,
    email: emails[0],
    phone: phones[0],
    location: extractLocation(text),
    summary: extractSummary(text),
    experience,
    education,
    skills: {
      technical: technicalSkills,
      soft: softSkills,
      languages: extractLanguages(text),
      certifications
    },
    totalExperienceYears
  };
}

function extractExperience(text: string): ParsedResume['experience'] {
  const experiences: ParsedResume['experience'] = [];
  const sections = text.split(/(?:experience|work history|employment)/i);

  if (sections.length < 2) return experiences;

  const expSection = sections[1].split(/(?:education|skills|projects|certifications)/i)[0];
  const lines = expSection.split('\n').filter(l => l.trim());

  let currentExp: any = null;

  for (const line of lines) {
    // Detect new job entry (usually has company name and date range)
    if (line.match(/\b(19|20)\d{2}\b.*(-|to|–).*(\b(19|20)\d{2}\b|present|current)/i)) {
      if (currentExp) experiences.push(currentExp);
      currentExp = {
        company: '',
        title: '',
        duration: line.match(/\b(19|20)\d{2}\b.*(-|to|–).*(\b(19|20)\d{2}\b|present|current)/i)?.[0] || '',
        description: '',
        skills: []
      };
    } else if (currentExp) {
      if (!currentExp.company && line.length < 60) {
        currentExp.company = line;
      } else if (!currentExp.title && line.length < 60) {
        currentExp.title = line;
      } else {
        currentExp.description += line + ' ';
      }
    }
  }

  if (currentExp) experiences.push(currentExp);

  return experiences.slice(0, 10);
}

function extractEducation(text: string): ParsedResume['education'] {
  const education: ParsedResume['education'] = [];
  const sections = text.split(/(?:education|academic|qualification)/i);

  if (sections.length < 2) return education;

  const eduSection = sections[1].split(/(?:experience|skills|projects|certifications)/i)[0];

  const degreePatterns = [
    /(?:bachelor|master|phd|doctorate|associate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|b\.?e\.?|m\.?e\.?|mba|b\.?tech|m\.?tech)/gi
  ];

  const lines = eduSection.split('\n').filter(l => l.trim());

  for (const line of lines) {
    for (const pattern of degreePatterns) {
      if (line.match(pattern)) {
        const years = line.match(/\b(19|20)\d{2}\b/g);
        education.push({
          institution: extractInstitution(line),
          degree: line.match(pattern)?.[0] || '',
          field: '',
          year: years?.[years.length - 1]
        });
        break;
      }
    }
  }

  return education.slice(0, 5);
}

function extractInstitution(line: string): string {
  const universityKeywords = ['university', 'college', 'institute', 'school'];
  for (const keyword of universityKeywords) {
    const idx = line.toLowerCase().indexOf(keyword);
    if (idx !== -1) {
      const start = Math.max(0, line.lastIndexOf(' ', idx - 20));
      const end = Math.min(line.length, line.indexOf(' ', idx + keyword.length + 10));
      return line.substring(start, end > start ? end : line.length).trim();
    }
  }
  return line.split(/[,|]/)[0].trim();
}

function extractLocation(text: string): string {
  const locationPatterns = [
    /(?:location|address|based in|residing in)[:\s]*([^\n,]+(?:,\s*[^\n]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}(?:\s+\d{5})?)/
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return '';
}

function extractSummary(text: string): string {
  const summaryPatterns = [
    /(?:summary|objective|profile|about)[:\s]*([^\n]+(?:\n[^\n]+){0,3})/i
  ];

  for (const pattern of summaryPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim().substring(0, 500);
  }

  return '';
}

function extractLanguages(text: string): string[] {
  const commonLanguages = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'korean', 'hindi', 'arabic', 'portuguese', 'russian', 'italian'];
  const lowerText = text.toLowerCase();
  return commonLanguages.filter(lang => lowerText.includes(lang));
}

function calculateTotalExperience(experience: ParsedResume['experience']): number {
  let totalMonths = 0;

  for (const exp of experience) {
    const duration = exp.duration?.toLowerCase() || '';

    // Try to extract years
    const yearsMatch = duration.match(/(\d+)\s*(?:year|yr)s?/i);
    if (yearsMatch) totalMonths += parseInt(yearsMatch[1]) * 12;

    // Try to extract months
    const monthsMatch = duration.match(/(\d+)\s*(?:month|mo)s?/i);
    if (monthsMatch) totalMonths += parseInt(monthsMatch[1]);

    // If "present" or "current", estimate
    if (duration.includes('present') || duration.includes('current')) {
      const startYear = duration.match(/\b(20\d{2})\b/);
      if (startYear) {
        const years = new Date().getFullYear() - parseInt(startYear[1]);
        totalMonths += years * 12;
      }
    }
  }

  return Math.round(totalMonths / 12 * 10) / 10;
}

export function analyzeResume(parsed: ParsedResume): any {
  const skillsScore = calculateSkillsScore(parsed.skills);
  const experienceScore = calculateExperienceScore(parsed.experience, parsed.totalExperienceYears);
  const educationScore = calculateEducationScore(parsed.education);

  const overallScore = Math.round(
    skillsScore * 0.4 + experienceScore * 0.4 + educationScore * 0.2
  );

  return {
    skillsScore,
    experienceScore,
    educationScore,
    overallScore,
    strengths: identifyStrengths(parsed),
    weaknesses: identifyWeaknesses(parsed),
    recommendations: generateRecommendations(parsed),
    cultureFitScore: 70,
    leadershipPotential: calculateLeadershipPotential(parsed)
  };
}

function calculateSkillsScore(skills: ParsedResume['skills']): number {
  const techCount = skills.technical.length;
  const softCount = skills.soft.length;
  const certCount = skills.certifications.length;

  let score = Math.min(40, techCount * 4) + Math.min(30, softCount * 5) + Math.min(30, certCount * 10);
  return Math.min(100, score);
}

function calculateExperienceScore(experience: ParsedResume['experience'], totalYears: number): number {
  let score = Math.min(50, totalYears * 5);
  score += Math.min(30, experience.length * 6);
  score += experience.some(e => e.title?.toLowerCase().includes('senior') || e.title?.toLowerCase().includes('lead')) ? 20 : 0;
  return Math.min(100, score);
}

function calculateEducationScore(education: ParsedResume['education']): number {
  let score = 50;
  for (const edu of education) {
    const degree = edu.degree?.toLowerCase() || '';
    if (degree.includes('phd') || degree.includes('doctorate')) score += 30;
    else if (degree.includes('master') || degree.includes('mba') || degree.includes('m.s')) score += 20;
    else if (degree.includes('bachelor') || degree.includes('b.s') || degree.includes('b.tech')) score += 15;
  }
  return Math.min(100, score);
}

function identifyStrengths(parsed: ParsedResume): string[] {
  const strengths: string[] = [];
  if (parsed.skills.technical.length >= 10) strengths.push('Strong technical skill set');
  if (parsed.totalExperienceYears >= 5) strengths.push('Solid professional experience');
  if (parsed.skills.certifications.length >= 2) strengths.push('Industry certifications');
  if (parsed.education.some(e => e.degree?.toLowerCase().includes('master'))) strengths.push('Advanced education');
  if (parsed.skills.soft.length >= 5) strengths.push('Good soft skills profile');
  return strengths;
}

function identifyWeaknesses(parsed: ParsedResume): string[] {
  const weaknesses: string[] = [];
  if (parsed.skills.technical.length < 5) weaknesses.push('Limited technical skills listed');
  if (parsed.totalExperienceYears < 2) weaknesses.push('Early career professional');
  if (parsed.skills.certifications.length === 0) weaknesses.push('No certifications mentioned');
  if (!parsed.summary) weaknesses.push('Missing professional summary');
  return weaknesses;
}

function generateRecommendations(parsed: ParsedResume): string[] {
  const recs: string[] = [];
  if (!parsed.summary) recs.push('Add a professional summary highlighting key achievements');
  if (parsed.skills.certifications.length === 0) recs.push('Consider obtaining relevant industry certifications');
  if (parsed.skills.technical.length < 5) recs.push('Expand technical skills section with specific technologies');
  if (parsed.experience.some(e => !e.description)) recs.push('Add detailed descriptions of responsibilities and achievements');
  return recs;
}

function calculateLeadershipPotential(parsed: ParsedResume): number {
  let score = 50;
  const titles = parsed.experience.map(e => e.title?.toLowerCase() || '');
  if (titles.some(t => t.includes('manager') || t.includes('director') || t.includes('head'))) score += 25;
  if (titles.some(t => t.includes('lead') || t.includes('senior'))) score += 15;
  if (parsed.skills.soft.some(s => s.toLowerCase().includes('leadership'))) score += 10;
  return Math.min(100, score);
}
