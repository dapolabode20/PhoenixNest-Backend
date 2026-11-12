import { Request, Response } from 'express';
import Joi from 'joi';
import { Types } from 'mongoose';
import { ValidationHelper, objectId } from '../helpers/validation.helper';
import { conversationRepository } from '../repositories/conversation.repository';
import { messageRepository } from '../repositories/message.repository';
import { usersRepository } from '../repositories/users.repository';
import { startUpProfileRepository } from '../repositories/startUpProfile.repository';
import { investorProfileRepository } from '../repositories/investorProfile.repository';
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

type MessagesQuery = {
  limit: number;
  before?: Date;
};

type ConversationParams = {
  conversationId: string;
};

type SendMessageBody = {
  body: string;
  attachments?: string[];
};

const startConversationSchema = Joi.object<StartConversationBody>({
  recipientId: objectId.required()
});

const listQuerySchema = Joi.object<ListQuery>({
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1)
});

const messagesQuerySchema = Joi.object<MessagesQuery>({
  limit: Joi.number().integer().min(1).max(100).default(20),
  before: Joi.date().iso().optional()
});

const conversationParamsSchema = Joi.object<ConversationParams>({
  conversationId: objectId.required()
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

// What `findForUser` populates each participant with.
type PopulatedParticipant = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  profile: 'business_owner' | 'investor';
} | null; // null if that user's account has since been deleted

// The other person's firm (investor) or company (startup), and their picture.
// If the profile is missing or the lookup fails, these are just null — they
// are display details, so they shouldn't fail the whole inbox.
async function findOrganization(userId: string, profile: string) {
  if (profile === 'investor') {
    const result = await investorProfileRepository.findByUserId(userId);
    return { organizationName: result.value?.firmName ?? null, imageUrl: result.value?.avatarUrl ?? null };
  }
  const result = await startUpProfileRepository.findByUserId(userId);
  return { organizationName: result.value?.companyName ?? null, imageUrl: result.value?.logoUrl ?? null };
}

// Turns a conversation into what one inbox row needs: who it's with, a
// preview of the latest message, and how many messages are unread.
async function toInboxItem(conversation: IConversation, userId: string) {
  const conversationId = String(conversation._id);
  const participants = conversation.participants as unknown as PopulatedParticipant[];
  const other = participants.find((p) => p && p._id.toString() !== userId);

  const [organization, latestResult, unreadResult] = await Promise.all([
    other
      ? findOrganization(other._id.toString(), other.profile)
      : Promise.resolve({ organizationName: null, imageUrl: null }),
    messageRepository.findLatest(conversationId),
    messageRepository.countUnread(conversationId, userId)
  ]);
  const latest = latestResult.value;

  return {
    _id: conversation._id,
    counterparty: other
      ? { _id: other._id, firstName: other.firstName, lastName: other.lastName, profile: other.profile, ...organization }
      : null,
    lastMessage: latest
      ? { preview: latest.body.slice(0, 100), senderId: latest.senderId, createdAt: latest.createdAt }
      : null,
    unreadCount: unreadResult.value ?? 0,
    messageCount: conversation.messageCount,
    lastMessageAt: conversation.lastMessageAt ?? null,
    reported: conversation.reported,
    createdAt: conversation.createdAt
  };
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
// Authenticated. Lists the caller's conversations, most recently active first,
// each with who it's with, a last-message preview and an unread count.
// Query: limit (default 20), page (default 1)
// Response data: { data, page, limit, total } (PRD §37 list format)
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

  const [result, countResult] = await Promise.all([
    conversationRepository.findForUser(userId, limit, page),
    conversationRepository.countForUser(userId)
  ]);
  if (result.err || !result.value || countResult.err || countResult.value === undefined) {
    res.status(httpStatus.serverError).json(createErrorResponse('Failed to retrieve conversations.'));
    return;
  }

  const conversations = await Promise.all(
    result.value.map((conversation) => toInboxItem(conversation, userId))
  );

  res.status(httpStatus.ok).json(createSuccessResponse({
    data: conversations,
    page,
    limit,
    total: countResult.value
  }));
};

// ---------------------------------------------------------------------------
// GET /api/conversations/:conversationId/messages
// Authenticated, must be a participant. Returns messages newest-first.
// Query: limit (default 20), before (optional — createdAt of the oldest
// message already loaded, to fetch the ones older than it)
// Response data: { messages, hasMore }
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
  const queryValidation = ValidationHelper.validateObject(req.query, messagesQuerySchema);
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

  // Ask for one more than requested: if it comes back, there are older
  // messages to load — no separate count query needed.
  const { limit, before } = queryValidation.value;
  const result = await messageRepository.findByConversation(conversationId, limit + 1, before);
  if (result.err || !result.value) {
    res.status(httpStatus.serverError).json(createErrorResponse('Failed to retrieve messages.'));
    return;
  }

  res.status(httpStatus.ok).json(createSuccessResponse({
    messages: result.value.slice(0, limit),
    hasMore: result.value.length > limit
  }));
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
