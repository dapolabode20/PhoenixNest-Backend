import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../helpers/verifyAccessToken';
import { conversationRepository } from '../repositories/conversation.repository';

// ---------------------------------------------------------------------------
// Frontend contract — read this before wiring up the chat UI.
//
// socket.io-client reconnects automatically after a dropped connection (wifi
// blip, laptop sleep, etc.) — no backend changes needed for that. But room
// membership does NOT survive a reconnect; a reconnect is a brand new
// connection as far as the server is concerned, so `conversation:join` must
// be re-emitted for whichever conversation is currently open, every time the
// client's 'connect' event fires (including the very first time).
//
// This is low-stakes either way: the socket is only a "something changed"
// nudge, never the source of truth. MongoDB is. So the frontend should
// always load/refresh a conversation's messages via
// GET /api/conversations/:id/messages when opening (or reopening) it —
// a missed live nudge during a disconnect just means catching up on the
// next fetch instead of seeing it instantly, never actual data loss.
// ---------------------------------------------------------------------------

let io: Server | null = null;

// Called once at startup (see src/index.ts) with the raw HTTP server.
// Wires up authentication and the two room types every connection uses.
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  // Runs once per connection attempt, before 'connection' fires. The
  // browser sends its access token as `auth: { token }` when it connects —
  // this is the socket equivalent of the Authorization header on a REST
  // request, checked with the exact same rules (see verifyAccessToken).
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Access token is missing'));
      return;
    }

    const result = await verifyAccessToken(token);
    if (!result.ok) {
      next(new Error(result.reason));
      return;
    }

    socket.data.userId = result.payload.userId;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;

    // Every tab/device this user has open joins their personal room, so we
    // can notify all of them ("new message somewhere") regardless of which
    // conversation, if any, is currently on screen.
    socket.join(`user:${userId}`);

    // The frontend joins a conversation's room the moment it opens that
    // thread, and leaves when it closes it — that's what makes the message
    // text itself only reach people actually looking at that conversation.
    //
    // Security check: a valid login token alone is NOT enough to join any
    // conversation's room — the connecting user must actually be one of its
    // two participants, same rule as every REST endpoint on this resource.
    // Without this check, anyone logged in could listen to any conversation
    // just by knowing (or guessing) its id.
    socket.on('conversation:join', async (conversationId: string) => {
      const result = await conversationRepository.findById(conversationId);
      if (result.err || !result.value) return;

      const isParticipant = result.value.participants.some((id) => id.toString() === userId);
      if (!isParticipant) {
        socket.emit('error', { event: 'conversation:join', reason: 'You are not part of this conversation.' });
        return;
      }

      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });
  });

  return io;
}

// Lets other files (like the message controller) reach the same Socket.io
// instance to broadcast events, without creating an import cycle with index.ts.
// Returns null if Socket.io hasn't started yet (e.g. in tests that exercise
// the REST layer directly) — callers treat broadcasting as best-effort,
// since saving a message must never fail just because nobody's listening live.
export function getIO(): Server | null {
  return io;
}
