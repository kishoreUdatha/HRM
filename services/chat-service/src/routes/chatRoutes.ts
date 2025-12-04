import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as chatController from '../controllers/chatController';

const router = Router();

// Validation middleware
const validateRoom = [
  body('name').trim().notEmpty().withMessage('Room name is required'),
  body('type').isIn(['direct', 'group', 'channel', 'department']).withMessage('Invalid room type'),
  body('participants').isArray({ min: 1 }).withMessage('At least one participant is required'),
];

const validateMessage = [
  body('content').trim().notEmpty().withMessage('Message content is required'),
];

// Chat Room Routes
router.post('/rooms', validateRoom, chatController.createRoom);
router.get('/rooms', chatController.getRooms);
router.get('/rooms/:roomId', param('roomId').isMongoId(), chatController.getRoom);
router.post('/rooms/:roomId/participants', param('roomId').isMongoId(), chatController.addParticipants);
router.delete('/rooms/:roomId/leave', param('roomId').isMongoId(), chatController.leaveRoom);

// Message Routes
router.post('/rooms/:roomId/messages', param('roomId').isMongoId(), validateMessage, chatController.sendMessage);
router.get('/rooms/:roomId/messages', param('roomId').isMongoId(), chatController.getMessages);
router.put('/messages/:messageId', param('messageId').isMongoId(), chatController.editMessage);
router.delete('/messages/:messageId', param('messageId').isMongoId(), chatController.deleteMessage);

// Reactions
router.post('/messages/:messageId/reactions', param('messageId').isMongoId(), chatController.addReaction);

// Pin messages
router.post('/messages/:messageId/pin', param('messageId').isMongoId(), chatController.togglePinMessage);

// Search
router.get('/search', query('query').notEmpty(), chatController.searchMessages);

export default router;
