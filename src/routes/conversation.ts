import { Router } from 'express';
import {
  startConversation,
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  reportConversation
} from '../controllers/conversation.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

/**
 * POST /api/conversations
 * Starts (or resumes) a 1:1 conversation with another user.
 * Body: { recipientId }
 */
router.post('/', authenticate, startConversation);

/**
 * GET /api/conversations
 * Lists the caller's conversations, most recently active first.
 * Query: limit (default 20), page (default 1)
 */
router.get('/', authenticate, listConversations);

/**
 * GET /api/conversations/:conversationId/messages
 * Lists a conversation's messages, newest first.
 * Query: limit (default 20), page (default 1)
 */
router.get('/:conversationId/messages', authenticate, listMessages);

/**
 * POST /api/conversations/:conversationId/messages
 * Sends a message in the conversation.
 * Body: { body, attachments?: string[] }
 */
router.post('/:conversationId/messages', authenticate, sendMessage);

/**
 * PATCH /api/conversations/:conversationId/read
 * Marks the conversation's unread messages (from the other participant) as read.
 */
router.patch('/:conversationId/read', authenticate, markConversationRead);

/**
 * POST /api/conversations/:conversationId/report
 * Flags the conversation for admin moderation.
 */
router.post('/:conversationId/report', authenticate, reportConversation);

export default router;
