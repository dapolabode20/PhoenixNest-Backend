import { Request, Response } from 'express';
import Joi from 'joi';
import { ValidationHelper } from '../helpers/validation.helper';
import { conversationRepository } from '../repositories/conversation.repository';
import { messageRepository } from '../repositories/message.repository';
import { usersRepository } from '../repositories/users.repository';
import { createErrorResponse, createSuccessResponse } from '../helpers/response.utils';
import { httpStatus } from '../helpers/httpStatus.utils';
import { IConversation } from '../models/conversation.model';
import { getIO } from '../sockets/io';

type StartConversationBody = {
  recipientId: string;
};

type ListQuery = {
  limit: number;
  page: number;
};

type ConversationParams = {
  conversationId: string;
};

type SendMessageBody = {
  body: string;
  attachments?: string[];
};

const startConversationSchema = Joi.object<StartConversationBody>({
  recipientId: Joi.string().required()
});

const listQuerySchema = Joi.object<ListQuery>({
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1)
});

const conversationParamsSchema = Joi.object<ConversationParams>({
  conversationId: Joi.string().required()
});

const sendMessageSchema = Joi.object<SendMessageBody>({
  body: Joi.string().trim().min(1).max(5000).required(),
  attachments: Joi.array().items(Joi.string().uri()).max(10).optional()
});

// Confirms the conversation exists and the caller is one of its two
// participants. Used by every endpoint below that targets a specific
// conversation, so a user can never read or act on someone else's chat.
async function loadConversationForParticipant(
  conversationId: string,
  userId: string,
  res: Response
): Promise<IConversation | null> {
  const result = await conversationRepository.findById(conversationId);
  if (result.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(result.err.message));
    return null;
  }
  if (!result.value) {
    res.status(httpStatus.notFound).json(createErrorResponse('Conversation not found.'));
    return null;
  }

  const isParticipant = result.value.participants.some((id) => id.toString() === userId);
  if (!isParticipant) {
    res.status(httpStatus.forbidden).json(createErrorResponse('You are not part of this conversation.'));
    return null;
  }

  return result.value;
}

// ---------------------------------------------------------------------------
// POST /api/conversations
// Authenticated. Starts (or resumes) a 1:1 conversation with another user.
// Body: { recipientId }
// ---------------------------------------------------------------------------
export const startConversation = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  const validation = ValidationHelper.validateObject(req.body, startConversationSchema);
  if (validation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }
  if (!validation.value) {
    res.status(httpStatus.badRequest).json(createErrorResponse('Invalid request.'));
    return;
  }
  const { recipientId } = validation.value;

  if (recipientId === userId) {
    res.status(httpStatus.badRequest).json(createErrorResponse('You cannot start a conversation with yourself.'));
    return;
  }

  const recipientResult = await usersRepository.findById(recipientId);
  if (recipientResult.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(recipientResult.err.message));
    return;
  }
  if (!recipientResult.value) {
    res.status(httpStatus.notFound).json(createErrorResponse('Recipient not found.'));
    return;
  }

  const conversationResult = await conversationRepository.findOrCreateBetween(userId, recipientId);
  if (conversationResult.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(conversationResult.err.message));
    return;
  }

  res.status(httpStatus.ok).json(createSuccessResponse(conversationResult.value));
};

// ---------------------------------------------------------------------------
// GET /api/conversations
// Authenticated. Lists the caller's conversations, most recently active first.
// Query: limit (default 20), page (default 1)
// ---------------------------------------------------------------------------
export const listConversations = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  const validation = ValidationHelper.validateObject(req.query, listQuerySchema);
  if (validation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }
  if (!validation.value) {
    res.status(httpStatus.badRequest).json(createErrorResponse('Invalid request.'));
    return;
  }
  const { limit, page } = validation.value;

  const result = await conversationRepository.findForUser(userId, limit, page);
  if (result.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(result.err.message));
    return;
  }

  res.status(httpStatus.ok).json(createSuccessResponse(result.value));
};

// ---------------------------------------------------------------------------
// GET /api/conversations/:conversationId/messages
// Authenticated, must be a participant. Returns messages newest-first.
// Query: limit (default 20), page (default 1)
// ---------------------------------------------------------------------------
export const listMessages = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  const paramsValidation = ValidationHelper.validateObject(req.params, conversationParamsSchema);
  if (paramsValidation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(paramsValidation.err.message, paramsValidation.err));
    return;
  }
  if (!paramsValidation.value) {
    res.status(httpStatus.badRequest).json(createErrorResponse('Invalid request.'));
    return;
  }
  const queryValidation = ValidationHelper.validateObject(req.query, listQuerySchema);
  if (queryValidation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(queryValidation.err.message, queryValidation.err));
    return;
  }
  if (!queryValidation.value) {
    res.status(httpStatus.badRequest).json(createErrorResponse('Invalid request.'));
    return;
  }

  const { conversationId } = paramsValidation.value;
  const conversation = await loadConversationForParticipant(conversationId, userId, res);
  if (!conversation) return; // response already sent

  const { limit, page } = queryValidation.value;
  const result = await messageRepository.findByConversation(conversationId, limit, page);
  if (result.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(result.err.message));
    return;
  }

  res.status(httpStatus.ok).json(createSuccessResponse(result.value));
};

// ---------------------------------------------------------------------------
// POST /api/conversations/:conversationId/messages
// Authenticated, must be a participant. Sends a message.
// Body: { body, attachments? }
// ---------------------------------------------------------------------------
export const sendMessage = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  const paramsValidation = ValidationHelper.validateObject(req.params, conversationParamsSchema);
  if (paramsValidation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(paramsValidation.err.message, paramsValidation.err));
    return;
  }
  if (!paramsValidation.value) {
    res.status(httpStatus.badRequest).json(createErrorResponse('Invalid request.'));
    return;
  }
  const bodyValidation = ValidationHelper.validateObject(req.body, sendMessageSchema);
  if (bodyValidation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(bodyValidation.err.message, bodyValidation.err));
    return;
  }
  if (!bodyValidation.value) {
    res.status(httpStatus.badRequest).json(createErrorResponse('Invalid request.'));
    return;
  }

  const { conversationId } = paramsValidation.value;
  const conversation = await loadConversationForParticipant(conversationId, userId, res);
  if (!conversation) return; // response already sent

  const { body, attachments } = bodyValidation.value;
  const messageResult = await messageRepository.createMessage({
    conversationId: conversation._id,
    senderId: userId,
    body,
    attachments: attachments ?? []
  });
  if (messageResult.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(messageResult.err.message));
    return;
  }
  if (!messageResult.value) {
    res.status(httpStatus.serverError).json(createErrorResponse('Failed to create message.'));
    return;
  }

  await conversationRepository.recordNewMessage(conversationId, messageResult.value.createdAt);

  // Tell anyone currently viewing this conversation, plus the other
  // participant on any of their other open tabs, that a message just
  // arrived — this is what makes the chat update live, no refresh needed.
  const otherParticipantId = conversation.participants
    .map((id) => id.toString())
    .find((id) => id !== userId);

  const io = getIO();
  if (io && otherParticipantId) {
    io.to([`conversation:${conversationId}`, `user:${otherParticipantId}`]).emit('message:new', messageResult.value);
  }

  res.status(httpStatus.created).json(createSuccessResponse(messageResult.value));
};

// ---------------------------------------------------------------------------
// PATCH /api/conversations/:conversationId/read
// Authenticated, must be a participant. Marks the other person's messages
// as read by the caller.
// ---------------------------------------------------------------------------
export const markConversationRead = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  const paramsValidation = ValidationHelper.validateObject(req.params, conversationParamsSchema);
  if (paramsValidation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(paramsValidation.err.message, paramsValidation.err));
    return;
  }
  if (!paramsValidation.value) {
    res.status(httpStatus.badRequest).json(createErrorResponse('Invalid request.'));
    return;
  }

  const { conversationId } = paramsValidation.value;
  const conversation = await loadConversationForParticipant(conversationId, userId, res);
  if (!conversation) return; // response already sent

  const result = await messageRepository.markConversationRead(conversationId, userId);
  if (result.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(result.err.message));
    return;
  }
  if (result.value === undefined) {
    res.status(httpStatus.serverError).json(createErrorResponse('Failed to mark conversation as read.'));
    return;
  }

  // Let the sender's open thread (if any) flip their messages to "seen"
  // live, instead of only finding out next time they reload.
  const io = getIO();
  if (io && result.value > 0) {
    io.to(`conversation:${conversationId}`).emit('conversation:read', {
      conversationId,
      readerId: userId,
      readAt: new Date()
    });
  }

  res.status(httpStatus.ok).json(createSuccessResponse({ markedRead: result.value }));
};

// ---------------------------------------------------------------------------
// POST /api/conversations/:conversationId/report
// Authenticated, must be a participant. Flags the conversation for admin
// moderation (PRD section 31) — does not delete or hide anything yet.
// ---------------------------------------------------------------------------
export const reportConversation = async (req: Request, res: Response) => {
  const { userId } = req.auth;

  const paramsValidation = ValidationHelper.validateObject(req.params, conversationParamsSchema);
  if (paramsValidation.err) {
    res.status(httpStatus.badRequest).json(createErrorResponse(paramsValidation.err.message, paramsValidation.err));
    return;
  }
  if (!paramsValidation.value) {
    res.status(httpStatus.badRequest).json(createErrorResponse('Invalid request.'));
    return;
  }

  const { conversationId } = paramsValidation.value;
  const conversation = await loadConversationForParticipant(conversationId, userId, res);
  if (!conversation) return; // response already sent

  const result = await conversationRepository.markReported(conversationId);
  if (result.err) {
    res.status(httpStatus.serverError).json(createErrorResponse(result.err.message));
    return;
  }

  res.status(httpStatus.ok).json(createSuccessResponse(result.value));
};
