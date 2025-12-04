import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage extends Document {
  tenantId: string;
  roomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderAvatar?: string;
  type: 'text' | 'file' | 'image' | 'video' | 'audio' | 'system' | 'announcement';
  content: string;
  attachments?: {
    type: string;
    url: string;
    name: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
  }[];
  mentions?: {
    userId: mongoose.Types.ObjectId;
    name: string;
    position: { start: number; end: number };
  }[];
  replyTo?: {
    messageId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    senderName: string;
    content: string;
  };
  reactions: {
    emoji: string;
    userIds: mongoose.Types.ObjectId[];
    count: number;
  }[];
  readBy: {
    odId: mongoose.Types.ObjectId;
    readAt: Date;
  }[];
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  isPinned: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderAvatar: {
      type: String,
    },
    type: {
      type: String,
      enum: ['text', 'file', 'image', 'video', 'audio', 'system', 'announcement'],
      default: 'text',
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    attachments: [
      {
        type: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        mimeType: {
          type: String,
          required: true,
        },
        thumbnailUrl: {
          type: String,
        },
      },
    ],
    mentions: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        position: {
          start: Number,
          end: Number,
        },
      },
    ],
    replyTo: {
      messageId: {
        type: Schema.Types.ObjectId,
      },
      senderId: {
        type: Schema.Types.ObjectId,
      },
      senderName: {
        type: String,
      },
      content: {
        type: String,
      },
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        userIds: [{
          type: Schema.Types.ObjectId,
        }],
        count: {
          type: Number,
          default: 0,
        },
      },
    ],
    readBy: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ChatMessageSchema.index({ tenantId: 1, roomId: 1, createdAt: -1 });
ChatMessageSchema.index({ tenantId: 1, senderId: 1 });
ChatMessageSchema.index({ tenantId: 1, 'mentions.userId': 1 });
ChatMessageSchema.index({ content: 'text' }); // Text search

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
