import Intent from '../models/Intent';
import KnowledgeArticle from '../models/KnowledgeBase';

interface DetectedIntent {
  name: string;
  confidence: number;
  entities: Record<string, any>;
}

interface NLPResult {
  intent: DetectedIntent;
  entities: Record<string, any>;
  sentiment: 'positive' | 'neutral' | 'negative';
  language: string;
  tokens: string[];
}

// Common HR-related patterns
const HR_PATTERNS: Record<string, RegExp[]> = {
  'leave.check_balance': [
    /how many (leave|days|holidays)/i,
    /leave balance/i,
    /remaining leave/i,
    /available leave/i,
    /check.*(leave|pto|vacation)/i
  ],
  'leave.apply': [
    /apply.*(leave|pto|vacation|time off)/i,
    /request.*(leave|pto|vacation|time off)/i,
    /take.*(leave|day off|time off)/i,
    /book.*(leave|holiday)/i,
    /want.*(leave|day off)/i
  ],
  'leave.status': [
    /leave.*status/i,
    /status.*leave/i,
    /leave.*approved/i,
    /pending.*leave/i
  ],
  'attendance.check_in': [
    /check.?in/i,
    /clock.?in/i,
    /start.*(work|day|shift)/i,
    /punch.?in/i
  ],
  'attendance.check_out': [
    /check.?out/i,
    /clock.?out/i,
    /end.*(work|day|shift)/i,
    /punch.?out/i
  ],
  'attendance.status': [
    /attendance.*status/i,
    /my attendance/i,
    /attendance.*today/i,
    /working hours/i
  ],
  'payroll.salary': [
    /salary/i,
    /pay.?slip/i,
    /pay.?check/i,
    /compensation/i,
    /earnings/i
  ],
  'payroll.tax': [
    /tax.*deduction/i,
    /income.*tax/i,
    /tax.*details/i,
    /tax.*statement/i
  ],
  'employee.profile': [
    /my profile/i,
    /personal.*details/i,
    /update.*information/i,
    /employee.*details/i
  ],
  'employee.directory': [
    /find.*employee/i,
    /employee.*directory/i,
    /contact.*colleague/i,
    /who is/i
  ],
  'policy.general': [
    /company.*policy/i,
    /hr.*policy/i,
    /what.*policy/i,
    /guidelines/i
  ],
  'benefits.info': [
    /benefits/i,
    /insurance/i,
    /health.*plan/i,
    /perks/i
  ],
  'help.general': [
    /help/i,
    /what can you do/i,
    /how.*work/i,
    /assist/i
  ],
  'greeting': [
    /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
    /^(howdy|greetings)/i
  ],
  'farewell': [
    /^(bye|goodbye|see you|thank you|thanks)/i,
    /^(that'?s all|done)/i
  ]
};

// Entity extraction patterns
const ENTITY_PATTERNS: Record<string, RegExp> = {
  date: /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|today|tomorrow|yesterday|next week|this week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
  number: /\b(\d+)\b/g,
  leave_type: /(sick|casual|annual|maternity|paternity|unpaid|comp.?off|bereavement|medical)/gi,
  duration: /(\d+)\s*(day|days|week|weeks|hour|hours)/gi,
  month: /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)/gi
};

export async function processMessage(
  message: string,
  tenantId: string,
  context?: Record<string, any>
): Promise<NLPResult> {
  const normalizedMessage = message.toLowerCase().trim();
  const tokens = tokenize(normalizedMessage);
  const entities = extractEntities(message);
  const sentiment = analyzeSentiment(normalizedMessage);

  // Try pattern-based intent detection first
  let detectedIntent = detectIntentFromPatterns(normalizedMessage);

  // If no pattern match, try knowledge base lookup
  if (detectedIntent.confidence < 0.5) {
    const kbIntent = await searchKnowledgeBase(tenantId, normalizedMessage);
    if (kbIntent && kbIntent.confidence > detectedIntent.confidence) {
      detectedIntent = kbIntent;
    }
  }

  // Check custom intents from database
  const customIntent = await matchCustomIntent(tenantId, normalizedMessage);
  if (customIntent && customIntent.confidence > detectedIntent.confidence) {
    detectedIntent = customIntent;
  }

  // Apply context for better understanding
  if (context?.currentIntent && detectedIntent.confidence < 0.7) {
    detectedIntent = applyContext(detectedIntent, context);
  }

  return {
    intent: detectedIntent,
    entities,
    sentiment,
    language: detectLanguage(message),
    tokens
  };
}

function tokenize(text: string): string[] {
  return text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

function detectIntentFromPatterns(message: string): DetectedIntent {
  let bestMatch: DetectedIntent = { name: 'unknown', confidence: 0, entities: {} };

  for (const [intentName, patterns] of Object.entries(HR_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        const confidence = calculatePatternConfidence(message, pattern);
        if (confidence > bestMatch.confidence) {
          bestMatch = { name: intentName, confidence, entities: {} };
        }
      }
    }
  }

  return bestMatch;
}

function calculatePatternConfidence(message: string, pattern: RegExp): number {
  const match = message.match(pattern);
  if (!match) return 0;

  const matchLength = match[0].length;
  const messageLength = message.length;
  const baseConfidence = 0.6;
  const lengthBonus = Math.min(0.3, (matchLength / messageLength) * 0.5);

  return Math.min(0.95, baseConfidence + lengthBonus);
}

function extractEntities(message: string): Record<string, any> {
  const entities: Record<string, any> = {};

  for (const [entityType, pattern] of Object.entries(ENTITY_PATTERNS)) {
    const matches = message.match(pattern);
    if (matches) {
      entities[entityType] = matches.length === 1 ? matches[0] : matches;
    }
  }

  // Parse relative dates
  if (entities.date) {
    entities.parsedDate = parseRelativeDate(
      Array.isArray(entities.date) ? entities.date[0] : entities.date
    );
  }

  return entities;
}

function parseRelativeDate(dateStr: string): Date | null {
  const today = new Date();
  const lower = dateStr.toLowerCase();

  if (lower === 'today') return today;
  if (lower === 'tomorrow') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (lower === 'yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }

  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };

  if (dayMap[lower] !== undefined) {
    const d = new Date(today);
    const diff = dayMap[lower] - today.getDay();
    d.setDate(d.getDate() + (diff <= 0 ? diff + 7 : diff));
    return d;
  }

  // Try parsing as date string
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['thanks', 'great', 'good', 'excellent', 'happy', 'pleased', 'appreciate', 'helpful', 'wonderful', 'amazing'];
  const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'unhappy', 'frustrated', 'angry', 'disappointed', 'problem', 'issue', 'urgent', 'asap'];

  const words = message.split(/\s+/);
  let score = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) score++;
    if (negativeWords.includes(word)) score--;
  });

  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function detectLanguage(message: string): string {
  // Simple detection - default to English
  return 'en';
}

async function searchKnowledgeBase(tenantId: string, query: string): Promise<DetectedIntent | null> {
  try {
    const results = await KnowledgeArticle.find({
      tenantId,
      status: 'published',
      $text: { $search: query }
    }, {
      score: { $meta: 'textScore' }
    }).sort({ score: { $meta: 'textScore' } }).limit(1);

    if (results.length > 0 && results[0]) {
      const score = (results[0] as any)._doc?.score || 0;
      return {
        name: results[0].intent,
        confidence: Math.min(0.9, score / 10),
        entities: {}
      };
    }
  } catch (error) {
    // Text index might not exist yet
  }
  return null;
}

async function matchCustomIntent(tenantId: string, message: string): Promise<DetectedIntent | null> {
  const intents = await Intent.find({ tenantId, isActive: true });

  let bestMatch: DetectedIntent | null = null;
  let highestScore = 0;

  for (const intent of intents) {
    for (const phrase of intent.trainingPhrases) {
      const similarity = calculateSimilarity(message, phrase.toLowerCase());
      if (similarity > highestScore && similarity > 0.5) {
        highestScore = similarity;
        bestMatch = {
          name: intent.name,
          confidence: similarity,
          entities: {}
        };
      }
    }
  }

  return bestMatch;
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function applyContext(intent: DetectedIntent, context: Record<string, any>): DetectedIntent {
  // If in a leave application flow and message contains confirmation
  if (context.currentIntent === 'leave.apply') {
    const confirmPatterns = [/yes/i, /confirm/i, /okay/i, /sure/i, /submit/i];
    if (confirmPatterns.some(p => p.test(intent.name))) {
      return { ...intent, name: 'leave.confirm', confidence: 0.85 };
    }
  }

  return intent;
}

export function generateResponse(intent: string, entities: Record<string, any>, context?: Record<string, any>): string {
  const responses: Record<string, string | ((e: Record<string, any>) => string)> = {
    'greeting': 'Hello! I\'m your HR Assistant. I can help you with leave requests, attendance, payroll queries, company policies, and more. How can I assist you today?',
    'farewell': 'Goodbye! Feel free to reach out anytime you need help. Have a great day!',
    'help.general': 'I can help you with:\n• Leave management (check balance, apply for leave)\n• Attendance (check-in/out, view records)\n• Payroll queries (salary, tax details)\n• Company policies and benefits\n• Employee directory\n\nJust ask me anything!',
    'leave.check_balance': 'Let me check your leave balance. I\'ll fetch the details from the leave management system.',
    'leave.apply': (e) => `I can help you apply for leave${e.leave_type ? ` (${e.leave_type})` : ''}${e.date ? ` starting ${e.date}` : ''}. Please provide the leave type, start date, and end date.`,
    'leave.status': 'I\'ll check the status of your recent leave requests.',
    'attendance.check_in': 'I\'ll mark your attendance check-in for today.',
    'attendance.check_out': 'I\'ll mark your attendance check-out. Have a great evening!',
    'attendance.status': 'Let me fetch your attendance records.',
    'payroll.salary': 'I\'ll retrieve your salary details and payslip information.',
    'payroll.tax': 'Let me get your tax deduction details.',
    'employee.profile': 'I\'ll show you your profile information.',
    'employee.directory': 'I can help you find employee contact information. Who are you looking for?',
    'policy.general': 'I can provide information about company policies. Which policy would you like to know about?',
    'benefits.info': 'Let me share information about employee benefits and perks.',
    'unknown': 'I\'m not sure I understand. Could you please rephrase your question? You can ask me about leaves, attendance, payroll, or company policies.'
  };

  const response = responses[intent] || responses['unknown'];
  return typeof response === 'function' ? response(entities) : response;
}
