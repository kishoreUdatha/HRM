import { Router } from 'express';
import * as chatbotController from '../controllers/chatbotController';

const router = Router();

// Chat endpoints
router.post('/:tenantId/chat', chatbotController.chat);
router.get('/:tenantId/conversations/:sessionId', chatbotController.getConversation);
router.get('/:tenantId/employees/:employeeId/conversations', chatbotController.getConversationHistory);
router.post('/:tenantId/conversations/:sessionId/feedback/:messageId', chatbotController.submitFeedback);
router.post('/:tenantId/conversations/:sessionId/escalate', chatbotController.escalateConversation);
router.post('/:tenantId/conversations/:sessionId/end', chatbotController.endConversation);

// Knowledge Base endpoints
router.post('/:tenantId/knowledge', chatbotController.createKnowledgeArticle);
router.get('/:tenantId/knowledge', chatbotController.getKnowledgeArticles);
router.put('/:tenantId/knowledge/:articleId', chatbotController.updateKnowledgeArticle);
router.delete('/:tenantId/knowledge/:articleId', chatbotController.deleteKnowledgeArticle);

// Intent Management endpoints
router.post('/:tenantId/intents', chatbotController.createIntent);
router.get('/:tenantId/intents', chatbotController.getIntents);
router.put('/:tenantId/intents/:intentId', chatbotController.updateIntent);

// Analytics endpoints
router.get('/:tenantId/analytics', chatbotController.getChatbotAnalytics);

export default router;
