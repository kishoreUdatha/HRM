import mongoose, { Document, Schema } from 'mongoose';

export interface IChatRoom extends Document {
  tenantId: string;
  name: string;
  type: 'direct' | 'group' | 'channel' | 'department';
  description?: string;
  participants: {
    odId: mongoose.Types.ObjectId;
    odEmployeeId: mongoose.Types.ObjectId;
    name: string;
    role: 'admin' | 'member';
    joinedAt: Date;
    lastRead?: Date;
  }[];
  departmentId?: mongoose.Types.ObjectId;
  isPrivate: boolean;
  createdBy: mongoose.Types.ObjectId;
  avatar?: string;
  settings: {
    muteNotifications: boolean;
    allowReactions: boolean;
    allowFileSharing: boolean;
    allowVoiceCalls: boolean;
  };
  lastMessage?: {
    content: string;
    senderId: mongoose.Types.ObjectId;
    senderName: string;
    timestamp: Date;
  };
  pinnedMessages: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomSchema = new Schema<IChatRoom>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ['direct', 'group', 'channel', 'department'],
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    participants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        employeeId: {
          type: Schema.Types.ObjectId,
        },
        name: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        lastRead: {
          type: Date,
        },
      },
    ],
    departmentId: {
      type: Schema.Types.ObjectId,
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    avatar: {
      type: String,
    },
    settings: {
      muteNotifications: {
        type: Boolean,
        default: false,
      },
      allowReactions: {
        type: Boolean,
        default: true,
      },
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      allowVoiceCalls: {
        type: Boolean,
        default: true,
      },
    },
    lastMessage: {
      content: String,
      senderId: Schema.Types.ObjectId,
      senderName: String,
      timestamp: Date,
    },
    pinnedMessages: [{
      type: Schema.Types.ObjectId,
      ref: 'ChatMessage',
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
ChatRoomSchema.index({ tenantId: 1, 'participants.userId': 1 });
ChatRoomSchema.index({ tenantId: 1, type: 1 });
ChatRoomSchema.index({ tenantId: 1, departmentId: 1 });

export default mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema);
