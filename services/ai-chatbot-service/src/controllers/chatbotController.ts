import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Conversation from '../models/Conversation';
import KnowledgeArticle from '../models/KnowledgeBase';
import Intent from '../models/Intent';
import { processMessage, generateResponse } from '../services/nlpService';
import { generateAIResponse } from '../services/aiService';
import { executeAction } from '../services/actionService';

// Start or continue a conversation
export const chat = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { sessionId, message, employeeId, channel = 'web', metadata } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const convSessionId = sessionId || uuidv4();
    let conversation = await Conversation.findOne({ sessionId: convSessionId });

    if (!conversation) {
      conversation = new Conversation({
        tenantId,
        sessionId: convSessionId,
        employeeId,
        channel,
        metadata,
        messages: [],
        context: {},
        analytics: { messageCount: 0, avgResponseTime: 0, intentsDetected: [], resolutionStatus: 'unresolved' }
      });
    }

    const startTime = Date.now();

    // Process the message through NLP
    const nlpResult = await processMessage(message, tenantId, conversation.context);

    // Add user message to conversation
    const userMessage = {
      id: uuidv4(),
      role: 'user' as const,
      content: message,
      intent: nlpResult.intent.name,
      entities: nlpResult.entities,
      confidence: nlpResult.intent.confidence,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    // Generate response
    let responseText: string;
    let suggestedActions: any[] = [];
    let actionResult: any = null;

    // For high confidence intents, execute actions if applicable
    if (nlpResult.intent.confidence > 0.7 && isActionableIntent(nlpResult.intent.name)) {
      actionResult = await executeAction(
        nlpResult.intent.name,
        nlpResult.entities,
        { tenantId, employeeId: employeeId || '', token: req.headers.authorization?.replace('Bearer ', '') }
      );
      responseText = actionResult.message;
    } else if (nlpResult.intent.confidence > 0.6) {
      responseText = generateResponse(nlpResult.intent.name, nlpResult.entities, conversation.context);
    } else {
      // Use AI for complex or unclear queries
      const conversationHistory = conversation.messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));
      const aiResponse = await generateAIResponse(message, conversationHistory, {
        employeeData: { id: employeeId }
      });
      responseText = aiResponse.content;
      suggestedActions = aiResponse.suggestedActions || [];
    }

    const responseTime = Date.now() - startTime;

    // Add assistant message to conversation
    const assistantMessage = {
      id: uuidv4(),
      role: 'assistant' as const,
      content: responseText,
      intent: nlpResult.intent.name,
      confidence: nlpResult.intent.confidence,
      actions: actionResult ? [{
        type: nlpResult.intent.name,
        data: nlpResult.entities,
        executed: actionResult.success,
        result: actionResult.data
      }] : undefined,
      timestamp: new Date()
    };
    conversation.messages.push(assistantMessage);

    // Update conversation context and analytics
    conversation.context.currentIntent = nlpResult.intent.name;
    conversation.context.lastTopic = nlpResult.intent.name.split('.')[0];
    conversation.analytics.messageCount += 2;
    conversation.analytics.avgResponseTime =
      (conversation.analytics.avgResponseTime * (conversation.analytics.messageCount - 2) + responseTime) /
      conversation.analytics.messageCount;
    if (!conversation.analytics.intentsDetected.includes(nlpResult.intent.name)) {
      conversation.analytics.intentsDetected.push(nlpResult.intent.name);
    }

    await conversation.save();

    res.json({
      success: true,
      data: {
        sessionId: convSessionId,
        response: {
          text: responseText,
          intent: nlpResult.intent.name,
          confidence: nlpResult.intent.confidence,
          entities: nlpResult.entities,
          sentiment: nlpResult.sentiment,
          suggestedActions,
          actionExecuted: actionResult?.success || false
        },
        context: {
          currentIntent: conversation.context.currentIntent,
          lastTopic: conversation.context.lastTopic
        }
      }
    });
  } catch (error) {
    console.error('[Chatbot Controller] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to process message', error });
  }
};

// Get conversation history
export const getConversation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const conversation = await Conversation.findOne({ sessionId });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversation', error });
  }
};

// Get user's conversation history
export const getConversationHistory = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.find({ tenantId, employeeId })
      .sort({ updatedAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .select('sessionId status startedAt endedAt analytics.messageCount analytics.resolutionStatus');

    const total = await Conversation.countDocuments({ tenantId, employeeId });

    res.json({
      success: true,
      data: conversations,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch history', error });
  }
};

// Submit feedback for a message
export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { sessionId, messageId } = req.params;
    const { helpful, rating, comment } = req.body;

    const conversation = await Conversation.findOne({ sessionId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const message = conversation.messages.find(m => m.id === messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.feedback = { helpful, rating, comment };

    if (rating) {
      conversation.analytics.satisfactionScore = rating;
    }
    if (helpful) {
      conversation.analytics.resolutionStatus = 'resolved';
    }

    await conversation.save();

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit feedback', error });
  }
};

// Escalate conversation to human HR
export const escalateConversation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { reason, escalateTo } = req.body;

    const conversation = await Conversation.findOne({ sessionId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    conversation.status = 'escalated';
    conversation.escalation = {
      reason,
      escalatedTo: escalateTo || 'hr_team',
      escalatedAt: new Date(),
      resolved: false
    };

    // Add system message
    conversation.messages.push({
      id: uuidv4(),
      role: 'system',
      content: `Conversation escalated to HR team. Reason: ${reason}. A human representative will respond shortly.`,
      timestamp: new Date()
    });

    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation escalated to HR team',
      data: { escalation: conversation.escalation }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to escalate conversation', error });
  }
};

// End conversation
export const endConversation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const conversation = await Conversation.findOneAndUpdate(
      { sessionId },
      { status: 'closed', endedAt: new Date() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, message: 'Conversation ended', data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to end conversation', error });
  }
};

// Knowledge Base Management
export const createKnowledgeArticle = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const article = new KnowledgeArticle({ ...req.body, tenantId });
    await article.save();
    res.status(201).json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create article', error });
  }
};

export const getKnowledgeArticles = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { category, status, search, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) query.$text = { $search: search as string };

    const articles = await KnowledgeArticle.find(query)
      .sort({ 'metadata.priority': -1, createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await KnowledgeArticle.countDocuments(query);

    res.json({
      success: true,
      data: articles,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch articles', error });
  }
};

export const updateKnowledgeArticle = async (req: Request, res: Response) => {
  try {
    const article = await KnowledgeArticle.findByIdAndUpdate(
      req.params.articleId,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    );
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update article', error });
  }
};

export const deleteKnowledgeArticle = async (req: Request, res: Response) => {
  try {
    const article = await KnowledgeArticle.findByIdAndDelete(req.params.articleId);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete article', error });
  }
};

// Intent Management
export const createIntent = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const intent = new Intent({ ...req.body, tenantId });
    await intent.save();
    res.status(201).json({ success: true, data: intent });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create intent', error });
  }
};

export const getIntents = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { category, isActive } = req.query;

    const query: any = { tenantId };
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const intents = await Intent.find(query).sort({ priority: -1, name: 1 });
    res.json({ success: true, data: intents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch intents', error });
  }
};

export const updateIntent = async (req: Request, res: Response) => {
  try {
    const intent = await Intent.findByIdAndUpdate(req.params.intentId, req.body, { new: true });
    if (!intent) return res.status(404).json({ success: false, message: 'Intent not found' });
    res.json({ success: true, data: intent });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update intent', error });
  }
};

// Analytics
export const getChatbotAnalytics = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) dateFilter.$lte = new Date(endDate as string);

    const matchStage: any = { tenantId };
    if (Object.keys(dateFilter).length > 0) {
      matchStage.startedAt = dateFilter;
    }

    const [stats] = await Conversation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: '$analytics.messageCount' },
          avgResponseTime: { $avg: '$analytics.avgResponseTime' },
          avgSatisfaction: { $avg: '$analytics.satisfactionScore' },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$analytics.resolutionStatus', 'resolved'] }, 1, 0] }
          },
          escalatedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] }
          }
        }
      }
    ]);

    const topIntents = await Conversation.aggregate([
      { $match: matchStage },
      { $unwind: '$analytics.intentsDetected' },
      { $group: { _id: '$analytics.intentsDetected', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const channelDistribution = await Conversation.aggregate([
      { $match: matchStage },
      { $group: { _id: '$channel', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalConversations: stats?.totalConversations || 0,
          totalMessages: stats?.totalMessages || 0,
          avgResponseTime: Math.round(stats?.avgResponseTime || 0),
          avgSatisfaction: stats?.avgSatisfaction?.toFixed(1) || 'N/A',
          resolutionRate: stats?.totalConversations
            ? ((stats.resolvedCount / stats.totalConversations) * 100).toFixed(1)
            : 0,
          escalationRate: stats?.totalConversations
            ? ((stats.escalatedCount / stats.totalConversations) * 100).toFixed(1)
            : 0
        },
        topIntents: topIntents.map(i => ({ intent: i._id, count: i.count })),
        channelDistribution: channelDistribution.map(c => ({ channel: c._id, count: c.count }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error });
  }
};

function isActionableIntent(intent: string): boolean {
  const actionableIntents = [
    'leave.check_balance',
    'leave.apply',
    'leave.status',
    'attendance.check_in',
    'attendance.check_out',
    'attendance.status',
    'payroll.salary',
    'payroll.payslip',
    'employee.profile',
    'employee.search'
  ];
  return actionableIntents.includes(intent);
}
