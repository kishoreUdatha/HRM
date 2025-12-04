import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

const HR_SYSTEM_PROMPT = `You are an AI HR Assistant for an enterprise Human Resource Management system. You help employees with:

1. Leave Management: Check leave balances, apply for leaves, track leave status
2. Attendance: Check-in/out, view attendance records, working hours
3. Payroll: Salary details, payslips, tax information, deductions
4. Company Policies: HR policies, guidelines, procedures
5. Benefits: Insurance, perks, wellness programs
6. Employee Directory: Find colleagues, contact information
7. General HR Queries: Onboarding, performance reviews, training

Guidelines:
- Be professional, friendly, and helpful
- Provide accurate information based on company policies
- If you don't know something, say so and suggest contacting HR
- Protect employee privacy - don't share sensitive information
- For complex issues, recommend escalating to HR team
- Keep responses concise but informative
- Use bullet points for lists
- Include relevant follow-up suggestions`;

interface AIResponse {
  content: string;
  suggestedActions?: Array<{
    type: string;
    label: string;
    data: Record<string, any>;
  }>;
  followUpQuestions?: string[];
  confidence: number;
}

export async function generateAIResponse(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: Record<string, any>
): Promise<AIResponse> {
  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    return generateFallbackResponse(message, context);
  }

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: HR_SYSTEM_PROMPT }
    ];

    // Add context if available
    if (context?.employeeData) {
      messages.push({
        role: 'system',
        content: `Current user context: Employee ID: ${context.employeeData.id}, Department: ${context.employeeData.department}, Role: ${context.employeeData.role}`
      });
    }

    // Add conversation history (last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });

    // Add current message
    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const responseContent = completion.choices[0]?.message?.content || '';

    return {
      content: responseContent,
      suggestedActions: extractSuggestedActions(responseContent, message),
      followUpQuestions: generateFollowUpQuestions(message),
      confidence: 0.9
    };
  } catch (error) {
    console.error('[AI Service] OpenAI error:', error);
    return generateFallbackResponse(message, context);
  }
}

function generateFallbackResponse(message: string, context?: Record<string, any>): AIResponse {
  // Rule-based fallback responses
  const lowerMessage = message.toLowerCase();

  const fallbackResponses: Array<{ patterns: RegExp[]; response: string; actions?: any[] }> = [
    {
      patterns: [/leave.*balance/i, /how many.*leave/i, /remaining.*leave/i],
      response: 'To check your leave balance, I can fetch it from the leave management system. Your current balance shows:\n\n• Annual Leave: Available\n• Sick Leave: Available\n• Casual Leave: Available\n\nWould you like to apply for leave or see detailed balance?',
      actions: [
        { type: 'api_call', label: 'View Leave Balance', data: { endpoint: '/leaves/balance' } },
        { type: 'navigate', label: 'Apply for Leave', data: { route: '/leave/apply' } }
      ]
    },
    {
      patterns: [/apply.*leave/i, /request.*leave/i, /take.*leave/i],
      response: 'I can help you apply for leave. Please provide:\n\n1. Type of leave (Annual, Sick, Casual, etc.)\n2. Start date\n3. End date\n4. Reason (optional)\n\nOr you can use the quick leave application form.',
      actions: [
        { type: 'form', label: 'Quick Leave Form', data: { formType: 'leave_application' } }
      ]
    },
    {
      patterns: [/salary|payslip|pay.*slip/i],
      response: 'I can help you access your salary information:\n\n• View latest payslip\n• Download salary statement\n• Check tax deductions\n• View salary history\n\nWhat would you like to see?',
      actions: [
        { type: 'api_call', label: 'View Payslip', data: { endpoint: '/payroll/payslip' } },
        { type: 'navigate', label: 'Salary History', data: { route: '/payroll/history' } }
      ]
    },
    {
      patterns: [/check.?in|clock.?in|punch.?in/i],
      response: 'I\'ll mark your attendance check-in. Would you like me to proceed with recording your check-in time now?',
      actions: [
        { type: 'api_call', label: 'Confirm Check-In', data: { endpoint: '/attendance/check-in', method: 'POST' } }
      ]
    },
    {
      patterns: [/check.?out|clock.?out|punch.?out/i],
      response: 'I\'ll mark your attendance check-out. Would you like me to proceed with recording your check-out time now?',
      actions: [
        { type: 'api_call', label: 'Confirm Check-Out', data: { endpoint: '/attendance/check-out', method: 'POST' } }
      ]
    },
    {
      patterns: [/policy|policies|guideline/i],
      response: 'I can provide information about various company policies:\n\n• Leave Policy\n• Attendance Policy\n• Code of Conduct\n• Remote Work Policy\n• Expense Policy\n• IT Security Policy\n\nWhich policy would you like to learn about?'
    },
    {
      patterns: [/benefit|insurance|perk/i],
      response: 'Here are the employee benefits available:\n\n• Health Insurance\n• Life Insurance\n• Retirement Plans\n• Wellness Programs\n• Learning & Development\n• Employee Discounts\n\nWould you like details on any specific benefit?'
    },
    {
      patterns: [/holiday|public.*holiday|company.*holiday/i],
      response: 'I can show you the list of upcoming holidays. Would you like to see:\n\n• This month\'s holidays\n• All holidays for the year\n• Regional holidays\n\nPlease let me know your preference.'
    },
    {
      patterns: [/help|what can you do|assist/i],
      response: 'I\'m your HR Assistant! I can help you with:\n\n📋 **Leave Management**\n• Check leave balance\n• Apply for leave\n• Track leave status\n\n⏰ **Attendance**\n• Check-in/Check-out\n• View attendance records\n\n💰 **Payroll**\n• View payslips\n• Tax information\n\n📖 **Policies & Benefits**\n• Company policies\n• Employee benefits\n\nJust ask me anything!'
    },
    {
      patterns: [/hi|hello|hey|good morning|good afternoon/i],
      response: 'Hello! 👋 I\'m your HR Assistant. How can I help you today?\n\nYou can ask me about:\n• Leave balance & applications\n• Attendance\n• Payroll & salary\n• Company policies\n• Employee benefits'
    }
  ];

  for (const { patterns, response, actions } of fallbackResponses) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return {
          content: response,
          suggestedActions: actions,
          followUpQuestions: generateFollowUpQuestions(lowerMessage),
          confidence: 0.75
        };
      }
    }
  }

  // Default response
  return {
    content: 'I\'m not sure I understand your request. I can help you with:\n\n• Leave management\n• Attendance tracking\n• Payroll queries\n• Company policies\n• Employee benefits\n\nCould you please rephrase your question or select one of these topics?',
    suggestedActions: [
      { type: 'quick_reply', label: 'Check Leave Balance', data: { message: 'Check my leave balance' } },
      { type: 'quick_reply', label: 'View Attendance', data: { message: 'Show my attendance' } },
      { type: 'quick_reply', label: 'View Payslip', data: { message: 'Show my payslip' } },
      { type: 'quick_reply', label: 'Talk to HR', data: { message: 'Connect me to HR' } }
    ],
    followUpQuestions: [],
    confidence: 0.3
  };
}

function extractSuggestedActions(response: string, originalMessage: string): Array<{ type: string; label: string; data: Record<string, any> }> {
  const actions: Array<{ type: string; label: string; data: Record<string, any> }> = [];

  // Extract action suggestions based on response content
  if (response.toLowerCase().includes('leave')) {
    actions.push({ type: 'navigate', label: 'Go to Leaves', data: { route: '/leaves' } });
  }
  if (response.toLowerCase().includes('payslip') || response.toLowerCase().includes('salary')) {
    actions.push({ type: 'navigate', label: 'View Payslip', data: { route: '/payroll' } });
  }
  if (response.toLowerCase().includes('attendance')) {
    actions.push({ type: 'navigate', label: 'View Attendance', data: { route: '/attendance' } });
  }

  return actions;
}

function generateFollowUpQuestions(message: string): string[] {
  const followUps: string[] = [];
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('leave')) {
    followUps.push('Would you like to apply for leave?');
    followUps.push('Do you want to see your leave history?');
  }
  if (lowerMessage.includes('salary') || lowerMessage.includes('pay')) {
    followUps.push('Would you like to download your payslip?');
    followUps.push('Do you have questions about deductions?');
  }
  if (lowerMessage.includes('attendance')) {
    followUps.push('Would you like to see your attendance summary?');
  }

  return followUps.slice(0, 3);
}

export async function analyzeQueryForHRInsights(
  tenantId: string,
  query: string
): Promise<{ category: string; priority: string; suggestedAssignee?: string }> {
  // Analyze HR queries for routing and prioritization
  const urgentKeywords = ['urgent', 'asap', 'emergency', 'immediately', 'critical'];
  const isUrgent = urgentKeywords.some(k => query.toLowerCase().includes(k));

  let category = 'general';
  if (/leave|pto|vacation/i.test(query)) category = 'leave';
  else if (/salary|pay|compensation/i.test(query)) category = 'payroll';
  else if (/attendance|check.?in|check.?out/i.test(query)) category = 'attendance';
  else if (/policy|guideline/i.test(query)) category = 'policy';
  else if (/benefit|insurance/i.test(query)) category = 'benefits';
  else if (/complain|harass|discriminat/i.test(query)) category = 'sensitive';

  return {
    category,
    priority: isUrgent || category === 'sensitive' ? 'high' : 'normal',
    suggestedAssignee: category === 'sensitive' ? 'hr_manager' : undefined
  };
}
