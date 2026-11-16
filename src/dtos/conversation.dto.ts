export type StartConversationBody = {
  recipientId: string;
};

export type ListQuery = {
  limit: number;
  page: number;
};

export type MessagesQuery = {
  limit: number;
  before?: Date;
};

export type ConversationParams = {
  conversationId: string;
};

export type SendMessageBody = {
  body: string;
  attachments?: string[];
};
