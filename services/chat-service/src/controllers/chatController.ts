import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ChatRoom from '../models/ChatRoom';
import ChatMessage from '../models/ChatMessage';
import { publishToQueue } from '../config/rabbitmq';

// Create a new chat room
export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { name, type, description, participants, departmentId, isPrivate, settings } = req.body;

    // For direct messages, check if room already exists
    if (type === 'direct' && participants.length === 2) {
      const existingRoom = await ChatRoom.findOne({
        tenantId,
        type: 'direct',
        'participants.userId': { $all: participants.map((p: any) => new mongoose.Types.ObjectId(p.userId)) },
      });

      if (existingRoom) {
        res.json({ success: true, data: existingRoom });
        return;
      }
    }

    const room = new ChatRoom({
      tenantId,
      name,
      type,
      description,
      participants: participants.map((p: any) => ({
        ...p,
        userId: new mongoose.Types.ObjectId(p.userId),
        employeeId: p.employeeId ? new mongoose.Types.ObjectId(p.employeeId) : undefined,
        role: p.userId === userId ? 'admin' : 'member',
        joinedAt: new Date(),
      })),
      departmentId: departmentId ? new mongoose.Types.ObjectId(departmentId) : undefined,
      isPrivate: isPrivate ?? true,
      createdBy: new mongoose.Types.ObjectId(userId),
      settings: settings || {},
    });

    await room.save();

    // Notify participants via WebSocket
    await publishToQueue('chat', 'room.created', {
      type: 'room:created',
      tenantId,
      data: room,
    });

    res.status(201).json({ success: true, data: room });
  } catch (error: any) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's chat rooms
export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { type, page = 1, limit = 20 } = req.query;

    const query: any = {
      tenantId,
      'participants.userId': new mongoose.Types.ObjectId(userId),
    };

    if (type) {
      query.type = type;
    }

    const rooms = await ChatRoom.find(query)
      .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await ChatRoom.countDocuments(query);

    // Get unread counts for each room
    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const participant = room.participants.find(
          (p: any) => p.userId.toString() === userId
        );
        const lastRead = participant?.lastRead || new Date(0);

        const unreadCount = await ChatMessage.countDocuments({
          roomId: room._id,
          createdAt: { $gt: lastRead },
          senderId: { $ne: new mongoose.Types.ObjectId(userId) },
          isDeleted: false,
        });

        return { ...room, unreadCount };
      })
    );

    res.json({
      success: true,
      data: roomsWithUnread,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error getting chat rooms:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get room details
export const getRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { roomId } = req.params;

    const room = await ChatRoom.findOne({
      _id: roomId,
      tenantId,
      'participants.userId': new mongoose.Types.ObjectId(userId),
    });

    if (!room) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }

    res.json({ success: true, data: room });
  } catch (error: any) {
    console.error('Error getting chat room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send a message
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { roomId } = req.params;
    const { content, type, attachments, mentions, replyTo } = req.body;

    // Verify user is a participant
    const room = await ChatRoom.findOne({
      _id: roomId,
      tenantId,
      'participants.userId': new mongoose.Types.ObjectId(userId),
    });

    if (!room) {
      res.status(404).json({ success: false, message: 'Room not found or access denied' });
      return;
    }

    const participant = room.participants.find(
      (p) => p.odId.toString() === userId
    );

    const message = new ChatMessage({
      tenantId,
      roomId: new mongoose.Types.ObjectId(roomId),
      senderId: new mongoose.Types.ObjectId(userId),
      senderName: participant?.name || 'Unknown',
      type: type || 'text',
      content,
      attachments,
      mentions,
      replyTo,
    });

    await message.save();

    // Update room's last message
    room.lastMessage = {
      content: content.substring(0, 100),
      senderId: new mongoose.Types.ObjectId(userId),
      senderName: participant?.name || 'Unknown',
      timestamp: new Date(),
    };
    await room.save();

    // Publish to WebSocket via RabbitMQ
    await publishToQueue('chat', 'message.new', {
      type: 'chat:message',
      tenantId,
      roomId,
      data: message,
    });

    // Send notifications to mentioned users
    if (mentions && mentions.length > 0) {
      for (const mention of mentions) {
        await publishToQueue('notifications', 'notification.create', {
          type: 'notification:new',
          tenantId,
          userId: mention.userId.toString(),
          data: {
            type: 'chat_mention',
            title: 'You were mentioned',
            message: `${participant?.name} mentioned you in ${room.name}`,
            metadata: {
              roomId,
              messageId: message._id,
            },
          },
        });
      }
    }

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get messages in a room
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { roomId } = req.params;
    const { page = 1, limit = 50, before, after } = req.query;

    // Verify user is a participant
    const room = await ChatRoom.findOne({
      _id: roomId,
      tenantId,
      'participants.userId': new mongoose.Types.ObjectId(userId),
    });

    if (!room) {
      res.status(404).json({ success: false, message: 'Room not found or access denied' });
      return;
    }

    const query: any = {
      roomId: new mongoose.Types.ObjectId(roomId),
      tenantId,
      isDeleted: false,
    };

    if (before) {
      query.createdAt = { $lt: new Date(before as string) };
    }

    if (after) {
      query.createdAt = { ...query.createdAt, $gt: new Date(after as string) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await ChatMessage.countDocuments(query);

    // Update last read for user
    await ChatRoom.updateOne(
      { _id: roomId, 'participants.userId': new mongoose.Types.ObjectId(userId) },
      { $set: { 'participants.$.lastRead': new Date() } }
    );

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Edit a message
export const editMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await ChatMessage.findOne({
      _id: messageId,
      tenantId,
      senderId: new mongoose.Types.ObjectId(userId),
    });

    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found or not authorized' });
      return;
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Notify via WebSocket
    await publishToQueue('chat', 'message.edited', {
      type: 'chat:message:edited',
      tenantId,
      roomId: message.roomId.toString(),
      data: message,
    });

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error editing message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a message
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { messageId } = req.params;

    const message = await ChatMessage.findOne({
      _id: messageId,
      tenantId,
      senderId: new mongoose.Types.ObjectId(userId),
    });

    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found or not authorized' });
      return;
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    await message.save();

    // Notify via WebSocket
    await publishToQueue('chat', 'message.deleted', {
      type: 'chat:message:deleted',
      tenantId,
      roomId: message.roomId.toString(),
      data: { messageId, roomId: message.roomId },
    });

    res.json({ success: true, message: 'Message deleted' });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add reaction to message
export const addReaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await ChatMessage.findOne({ _id: messageId, tenantId });

    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (reactionIndex >= 0) {
      const reaction = message.reactions[reactionIndex];
      const userIndex = reaction.userIds.findIndex((id) => id.equals(userObjectId));

      if (userIndex >= 0) {
        // Remove reaction
        reaction.userIds.splice(userIndex, 1);
        reaction.count--;
        if (reaction.count === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      } else {
        // Add user to existing reaction
        reaction.userIds.push(userObjectId);
        reaction.count++;
      }
    } else {
      // Add new reaction
      message.reactions.push({
        emoji,
        userIds: [userObjectId],
        count: 1,
      });
    }

    await message.save();

    // Notify via WebSocket
    await publishToQueue('chat', 'message.reaction', {
      type: 'chat:reaction',
      tenantId,
      roomId: message.roomId.toString(),
      data: { messageId, reactions: message.reactions },
    });

    res.json({ success: true, data: message.reactions });
  } catch (error: any) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Pin/Unpin message
export const togglePinMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { messageId } = req.params;

    const message = await ChatMessage.findOne({ _id: messageId, tenantId });

    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    // Check if user is admin of the room
    const room = await ChatRoom.findOne({
      _id: message.roomId,
      tenantId,
      participants: {
        $elemMatch: {
          odId: new mongoose.Types.ObjectId(userId),
          role: 'admin',
        },
      },
    });

    if (!room) {
      res.status(403).json({ success: false, message: 'Only room admins can pin messages' });
      return;
    }

    message.isPinned = !message.isPinned;
    await message.save();

    // Update room's pinned messages
    if (message.isPinned) {
      room.pinnedMessages.push(message._id as mongoose.Types.ObjectId);
    } else {
      room.pinnedMessages = room.pinnedMessages.filter(
        (id) => !id.equals(message._id as mongoose.Types.ObjectId)
      );
    }
    await room.save();

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add participants to room
export const addParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { roomId } = req.params;
    const { participants } = req.body;

    const room = await ChatRoom.findOne({
      _id: roomId,
      tenantId,
      participants: {
        $elemMatch: {
          odId: new mongoose.Types.ObjectId(userId),
          role: 'admin',
        },
      },
    });

    if (!room) {
      res.status(403).json({ success: false, message: 'Only room admins can add participants' });
      return;
    }

    if (room.type === 'direct') {
      res.status(400).json({ success: false, message: 'Cannot add participants to direct messages' });
      return;
    }

    const newParticipants = participants.map((p: any) => ({
      userId: new mongoose.Types.ObjectId(p.userId),
      employeeId: p.employeeId ? new mongoose.Types.ObjectId(p.employeeId) : undefined,
      name: p.name,
      role: 'member',
      joinedAt: new Date(),
    }));

    room.participants.push(...newParticipants);
    await room.save();

    // Add system message
    const systemMessage = new ChatMessage({
      tenantId,
      roomId: room._id,
      senderId: new mongoose.Types.ObjectId(userId),
      senderName: 'System',
      type: 'system',
      content: `${participants.map((p: any) => p.name).join(', ')} joined the conversation`,
    });
    await systemMessage.save();

    res.json({ success: true, data: room });
  } catch (error: any) {
    console.error('Error adding participants:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Leave room
export const leaveRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { roomId } = req.params;

    const room = await ChatRoom.findOne({
      _id: roomId,
      tenantId,
      'participants.userId': new mongoose.Types.ObjectId(userId),
    });

    if (!room) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }

    if (room.type === 'direct') {
      res.status(400).json({ success: false, message: 'Cannot leave direct messages' });
      return;
    }

    const participant = room.participants.find(
      (p) => p.odId.toString() === userId
    );

    room.participants = room.participants.filter(
      (p) => p.odId.toString() !== userId
    );

    if (room.participants.length === 0) {
      await room.deleteOne();
    } else {
      await room.save();

      // Add system message
      const systemMessage = new ChatMessage({
        tenantId,
        roomId: room._id,
        senderId: new mongoose.Types.ObjectId(userId),
        senderName: 'System',
        type: 'system',
        content: `${participant?.name || 'A user'} left the conversation`,
      });
      await systemMessage.save();
    }

    res.json({ success: true, message: 'Left the room' });
  } catch (error: any) {
    console.error('Error leaving room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search messages
export const searchMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { query, roomId, page = 1, limit = 20 } = req.query;

    // Get user's rooms
    const userRooms = await ChatRoom.find({
      tenantId,
      'participants.userId': new mongoose.Types.ObjectId(userId),
    }).select('_id');

    const roomIds = userRooms.map((r) => r._id);

    const searchQuery: any = {
      tenantId,
      roomId: roomId ? new mongoose.Types.ObjectId(roomId as string) : { $in: roomIds },
      isDeleted: false,
      $text: { $search: query as string },
    };

    const messages = await ChatMessage.find(searchQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('roomId', 'name type')
      .lean();

    const total = await ChatMessage.countDocuments(searchQuery);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error searching messages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
