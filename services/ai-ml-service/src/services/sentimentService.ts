import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  confidence: number;
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    trust: number;
  };
  topics: Array<{ topic: string; sentiment: string; score: number }>;
  keyPhrases: string[];
  actionItems: string[];
}

interface FeedbackAnalysis {
  overallSentiment: SentimentResult;
  themes: Array<{
    theme: string;
    frequency: number;
    sentiment: string;
    examples: string[];
  }>;
  insights: string[];
  recommendations: string[];
  urgentIssues: string[];
}

// Sentiment word lists
const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
  'happy', 'pleased', 'satisfied', 'love', 'enjoy', 'appreciate', 'helpful',
  'supportive', 'productive', 'efficient', 'innovative', 'collaborative',
  'growth', 'opportunity', 'success', 'achievement', 'recognition', 'rewarding',
  'flexible', 'balanced', 'inclusive', 'transparent', 'fair', 'respectful'
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'poor', 'terrible', 'awful', 'horrible', 'disappointing', 'frustrated',
  'unhappy', 'dissatisfied', 'hate', 'dislike', 'problem', 'issue', 'concern',
  'stressful', 'overwhelming', 'burnout', 'exhausted', 'undervalued', 'ignored',
  'unfair', 'biased', 'toxic', 'micromanaged', 'overworked', 'underpaid',
  'unclear', 'confusing', 'lack', 'missing', 'never', 'impossible', 'difficult'
]);

const EMOTION_PATTERNS = {
  joy: ['happy', 'excited', 'thrilled', 'delighted', 'pleased', 'grateful', 'proud', 'love', 'enjoy'],
  sadness: ['sad', 'disappointed', 'unhappy', 'depressed', 'down', 'miss', 'regret', 'sorry'],
  anger: ['angry', 'frustrated', 'annoyed', 'irritated', 'furious', 'mad', 'hate', 'unfair'],
  fear: ['worried', 'anxious', 'scared', 'nervous', 'uncertain', 'afraid', 'stressed', 'concerned'],
  surprise: ['surprised', 'shocked', 'amazed', 'unexpected', 'suddenly', 'wow'],
  trust: ['trust', 'reliable', 'confident', 'believe', 'depend', 'honest', 'transparent', 'supportive']
};

const HR_TOPICS = {
  'work_life_balance': ['balance', 'overtime', 'flexible', 'remote', 'hours', 'time off', 'vacation', 'personal'],
  'compensation': ['salary', 'pay', 'bonus', 'benefits', 'compensation', 'raise', 'underpaid', 'market'],
  'career_growth': ['growth', 'promotion', 'career', 'opportunity', 'learning', 'development', 'advancement', 'stuck'],
  'management': ['manager', 'leadership', 'boss', 'supervisor', 'direction', 'support', 'feedback', 'micromanage'],
  'culture': ['culture', 'environment', 'team', 'collaboration', 'inclusive', 'toxic', 'values', 'diversity'],
  'workload': ['workload', 'busy', 'overwhelmed', 'stressed', 'resources', 'capacity', 'deadline', 'pressure'],
  'communication': ['communication', 'transparent', 'updates', 'meetings', 'information', 'clarity', 'unclear'],
  'recognition': ['recognition', 'appreciated', 'valued', 'acknowledged', 'ignored', 'invisible', 'credit']
};

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  // Try AI analysis first
  if (process.env.OPENAI_API_KEY) {
    try {
      const aiResult = await analyzeWithAI(text);
      if (aiResult) return aiResult;
    } catch (error) {
      console.error('[Sentiment Service] AI analysis failed, using rule-based:', error);
    }
  }

  // Fallback to rule-based analysis
  return analyzeWithRules(text);
}

async function analyzeWithAI(text: string): Promise<SentimentResult | null> {
  const prompt = `Analyze the sentiment of this employee feedback text. Return JSON only:

Text: "${text.substring(0, 2000)}"

Return this exact JSON structure:
{
  "sentiment": "positive" or "neutral" or "negative",
  "score": number from -1 (very negative) to 1 (very positive),
  "confidence": number from 0 to 1,
  "emotions": {
    "joy": 0-1, "sadness": 0-1, "anger": 0-1,
    "fear": 0-1, "surprise": 0-1, "trust": 0-1
  },
  "topics": [{"topic": "string", "sentiment": "positive/negative/neutral", "score": -1 to 1}],
  "keyPhrases": ["important phrases"],
  "actionItems": ["suggested actions for HR"]
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1000
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[Sentiment Service] Failed to parse AI response');
  }

  return null;
}

function analyzeWithRules(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = words.length;

  // Count sentiment words
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
  }

  // Calculate sentiment score
  const totalSentimentWords = positiveCount + negativeCount;
  let score = 0;
  if (totalSentimentWords > 0) {
    score = (positiveCount - negativeCount) / totalSentimentWords;
  }

  // Determine sentiment category
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (score > 0.2) sentiment = 'positive';
  else if (score < -0.2) sentiment = 'negative';

  // Calculate emotions
  const emotions = calculateEmotions(text);

  // Extract topics
  const topics = extractTopics(text);

  // Extract key phrases
  const keyPhrases = extractKeyPhrases(text);

  // Generate action items
  const actionItems = generateActionItems(sentiment, topics);

  // Calculate confidence based on word count and sentiment word density
  const confidence = Math.min(0.9, 0.5 + (totalSentimentWords / wordCount) + (wordCount > 50 ? 0.2 : 0));

  return {
    sentiment,
    score: Math.round(score * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    emotions,
    topics,
    keyPhrases,
    actionItems
  };
}

function calculateEmotions(text: string): SentimentResult['emotions'] {
  const lowerText = text.toLowerCase();
  const emotions: SentimentResult['emotions'] = {
    joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, trust: 0
  };

  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    const matchCount = patterns.filter(p => lowerText.includes(p)).length;
    emotions[emotion as keyof typeof emotions] = Math.min(1, matchCount / 3);
  }

  return emotions;
}

function extractTopics(text: string): SentimentResult['topics'] {
  const lowerText = text.toLowerCase();
  const topics: SentimentResult['topics'] = [];

  for (const [topic, keywords] of Object.entries(HR_TOPICS)) {
    const matchCount = keywords.filter(k => lowerText.includes(k)).length;
    if (matchCount > 0) {
      // Calculate topic-specific sentiment
      const topicSentences = text.split(/[.!?]/).filter(s =>
        keywords.some(k => s.toLowerCase().includes(k))
      );

      let topicScore = 0;
      for (const sentence of topicSentences) {
        const words = sentence.toLowerCase().split(/\s+/);
        const pos = words.filter(w => POSITIVE_WORDS.has(w)).length;
        const neg = words.filter(w => NEGATIVE_WORDS.has(w)).length;
        if (pos + neg > 0) {
          topicScore += (pos - neg) / (pos + neg);
        }
      }
      topicScore = topicSentences.length > 0 ? topicScore / topicSentences.length : 0;

      topics.push({
        topic: topic.replace(/_/g, ' '),
        sentiment: topicScore > 0.2 ? 'positive' : topicScore < -0.2 ? 'negative' : 'neutral',
        score: Math.round(topicScore * 100) / 100
      });
    }
  }

  return topics.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
}

function extractKeyPhrases(text: string): string[] {
  const phrases: string[] = [];
  const sentences = text.split(/[.!?]/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 10 && trimmed.length < 100) {
      // Check if sentence contains sentiment words
      const hasPositive = [...POSITIVE_WORDS].some(w => trimmed.toLowerCase().includes(w));
      const hasNegative = [...NEGATIVE_WORDS].some(w => trimmed.toLowerCase().includes(w));
      if (hasPositive || hasNegative) {
        phrases.push(trimmed);
      }
    }
  }

  return phrases.slice(0, 5);
}

function generateActionItems(sentiment: string, topics: SentimentResult['topics']): string[] {
  const actions: string[] = [];

  if (sentiment === 'negative') {
    actions.push('Schedule follow-up discussion to understand concerns');
  }

  for (const topic of topics) {
    if (topic.sentiment === 'negative') {
      switch (topic.topic) {
        case 'work life balance':
          actions.push('Review workload and consider flexible arrangements');
          break;
        case 'compensation':
          actions.push('Conduct compensation review against market rates');
          break;
        case 'career growth':
          actions.push('Discuss career development plan and growth opportunities');
          break;
        case 'management':
          actions.push('Address management concerns and provide feedback channels');
          break;
        case 'culture':
          actions.push('Investigate culture concerns and consider team interventions');
          break;
        case 'workload':
          actions.push('Assess resource allocation and workload distribution');
          break;
      }
    }
  }

  return [...new Set(actions)].slice(0, 5);
}

export async function analyzeBatchFeedback(feedbackItems: Array<{ id: string; text: string; metadata?: any }>): Promise<FeedbackAnalysis> {
  const results: Array<SentimentResult & { id: string }> = [];

  for (const item of feedbackItems) {
    const sentiment = await analyzeSentiment(item.text);
    results.push({ ...sentiment, id: item.id });
  }

  // Calculate overall sentiment
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const overallSentiment: SentimentResult = {
    sentiment: avgScore > 0.2 ? 'positive' : avgScore < -0.2 ? 'negative' : 'neutral',
    score: Math.round(avgScore * 100) / 100,
    confidence: 0.8,
    emotions: aggregateEmotions(results.map(r => r.emotions)),
    topics: aggregateTopics(results.flatMap(r => r.topics)),
    keyPhrases: results.flatMap(r => r.keyPhrases).slice(0, 10),
    actionItems: [...new Set(results.flatMap(r => r.actionItems))].slice(0, 10)
  };

  // Extract themes
  const themes = extractThemes(results);

  // Generate insights
  const insights = generateInsights(results, themes);

  // Generate recommendations
  const recommendations = generateRecommendations(themes, overallSentiment);

  // Identify urgent issues
  const urgentIssues = results
    .filter(r => r.sentiment === 'negative' && r.score < -0.5)
    .map(r => r.keyPhrases[0])
    .filter(Boolean)
    .slice(0, 5);

  return {
    overallSentiment,
    themes,
    insights,
    recommendations,
    urgentIssues
  };
}

function aggregateEmotions(emotionsList: SentimentResult['emotions'][]): SentimentResult['emotions'] {
  const result: SentimentResult['emotions'] = { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, trust: 0 };

  for (const emotions of emotionsList) {
    for (const key of Object.keys(result) as Array<keyof typeof result>) {
      result[key] += emotions[key];
    }
  }

  const count = emotionsList.length;
  for (const key of Object.keys(result) as Array<keyof typeof result>) {
    result[key] = Math.round((result[key] / count) * 100) / 100;
  }

  return result;
}

function aggregateTopics(topics: SentimentResult['topics']): SentimentResult['topics'] {
  const topicMap = new Map<string, { scores: number[]; count: number }>();

  for (const topic of topics) {
    const existing = topicMap.get(topic.topic);
    if (existing) {
      existing.scores.push(topic.score);
      existing.count++;
    } else {
      topicMap.set(topic.topic, { scores: [topic.score], count: 1 });
    }
  }

  return Array.from(topicMap.entries())
    .map(([topic, data]) => ({
      topic,
      sentiment: data.scores.reduce((a, b) => a + b, 0) / data.scores.length > 0.2 ? 'positive' :
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length < -0.2 ? 'negative' : 'neutral',
      score: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100
    }))
    .sort((a, b) => b.score - a.score);
}

function extractThemes(results: Array<SentimentResult & { id: string }>): FeedbackAnalysis['themes'] {
  const themeMap = new Map<string, { frequency: number; sentiments: string[]; examples: string[] }>();

  for (const result of results) {
    for (const topic of result.topics) {
      const existing = themeMap.get(topic.topic);
      if (existing) {
        existing.frequency++;
        existing.sentiments.push(topic.sentiment);
        if (result.keyPhrases[0] && existing.examples.length < 3) {
          existing.examples.push(result.keyPhrases[0]);
        }
      } else {
        themeMap.set(topic.topic, {
          frequency: 1,
          sentiments: [topic.sentiment],
          examples: result.keyPhrases[0] ? [result.keyPhrases[0]] : []
        });
      }
    }
  }

  return Array.from(themeMap.entries())
    .map(([theme, data]) => {
      const negativeSentiments = data.sentiments.filter(s => s === 'negative').length;
      const positiveSentiments = data.sentiments.filter(s => s === 'positive').length;
      return {
        theme,
        frequency: data.frequency,
        sentiment: negativeSentiments > positiveSentiments ? 'negative' :
          positiveSentiments > negativeSentiments ? 'positive' : 'mixed',
        examples: data.examples
      };
    })
    .sort((a, b) => b.frequency - a.frequency);
}

function generateInsights(results: Array<SentimentResult>, themes: FeedbackAnalysis['themes']): string[] {
  const insights: string[] = [];
  const totalCount = results.length;

  // Overall sentiment insight
  const negativePercent = Math.round((results.filter(r => r.sentiment === 'negative').length / totalCount) * 100);
  const positivePercent = Math.round((results.filter(r => r.sentiment === 'positive').length / totalCount) * 100);

  if (negativePercent > 40) {
    insights.push(`${negativePercent}% of feedback is negative - requires immediate attention`);
  } else if (positivePercent > 60) {
    insights.push(`${positivePercent}% of feedback is positive - employees are generally satisfied`);
  }

  // Theme insights
  const topNegativeThemes = themes.filter(t => t.sentiment === 'negative').slice(0, 2);
  if (topNegativeThemes.length > 0) {
    insights.push(`Top concerns: ${topNegativeThemes.map(t => t.theme).join(', ')}`);
  }

  // Emotion insights
  const avgEmotions = aggregateEmotions(results.map(r => r.emotions));
  if (avgEmotions.anger > 0.3) {
    insights.push('High levels of frustration detected across feedback');
  }
  if (avgEmotions.fear > 0.3) {
    insights.push('Employees expressing anxiety or uncertainty');
  }

  return insights;
}

function generateRecommendations(themes: FeedbackAnalysis['themes'], overall: SentimentResult): string[] {
  const recommendations: string[] = [];

  if (overall.sentiment === 'negative') {
    recommendations.push('Conduct town hall to address widespread concerns');
    recommendations.push('Consider anonymous follow-up survey for more detail');
  }

  for (const theme of themes.filter(t => t.sentiment === 'negative').slice(0, 3)) {
    switch (theme.theme) {
      case 'work life balance':
        recommendations.push('Review overtime policies and implement flex time options');
        break;
      case 'compensation':
        recommendations.push('Conduct market compensation analysis');
        break;
      case 'career growth':
        recommendations.push('Launch career development program and mentorship initiatives');
        break;
      case 'management':
        recommendations.push('Implement management training and 360 feedback');
        break;
      case 'culture':
        recommendations.push('Organize team building activities and culture workshops');
        break;
    }
  }

  return [...new Set(recommendations)].slice(0, 7);
}
