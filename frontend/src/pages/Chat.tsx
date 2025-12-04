import React, { useState, useEffect, useRef } from 'react';
import {
  HiChat,
  HiPaperAirplane,
  HiUserGroup,
  HiPlus,
  HiSearch,
  HiDotsVertical,
  HiUsers,
} from 'react-icons/hi';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';

interface ChatRoom {
  _id: string;
  name: string;
  type: 'direct' | 'group' | 'department';
  participants: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  }[];
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  createdAt: string;
}

interface ChatMessage {
  _id: string;
  chatRoom: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  content: string;
  type: 'text' | 'file' | 'image';
  createdAt: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: { name: string };
}

const Chat: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [roomType, setRoomType] = useState<'direct' | 'group'>('direct');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    fetchRooms();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom._id);
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get('/chat/rooms');
      setRooms(response.data.data?.rooms || response.data.rooms || []);
    } catch (error) {
      console.error('Failed to fetch chat rooms:', error);
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await api.get(`/chat/rooms/${roomId}/messages`);
      setMessages(response.data.data?.messages || response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees?limit=100');
      setEmployees(response.data.data?.employees || response.data.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      const response = await api.post(`/chat/rooms/${selectedRoom._id}/messages`, {
        content: newMessage,
        type: 'text',
      });
      const sentMessage = response.data.data?.message || response.data.message;
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParticipants.length === 0) return;

    try {
      const payload: { participants: string[]; type: string; name?: string } = {
        participants: selectedParticipants,
        type: roomType,
      };
      if (roomType === 'group' && newRoomName) {
        payload.name = newRoomName;
      }

      const response = await api.post('/chat/rooms', payload);
      const newRoom = response.data.data?.room || response.data.room;
      setRooms((prev) => [newRoom, ...prev]);
      setSelectedRoom(newRoom);
      setIsNewRoomModalOpen(false);
      setSelectedParticipants([]);
      setNewRoomName('');
      setRoomType('direct');
    } catch (error) {
      console.error('Failed to create chat room:', error);
    }
  };

  const getRoomName = (room: ChatRoom) => {
    if (room.name) return room.name;
    if (room.type === 'direct' && room.participants) {
      const otherParticipant = room.participants.find((p) => p._id !== user?._id);
      return otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Unknown';
    }
    return 'Group Chat';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      (emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchQuery.toLowerCase())) &&
      emp._id !== user?._id
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary-200 rounded w-1/4" />
        <div className="h-[600px] bg-secondary-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Messages</h1>
          <p className="text-secondary-500">Chat with your colleagues</p>
        </div>
        <button
          onClick={() => setIsNewRoomModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <HiPlus className="w-5 h-5" />
          New Chat
        </button>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 h-[600px] flex overflow-hidden">
        {/* Sidebar - Chat Rooms */}
        <div className="w-80 border-r border-secondary-200 flex flex-col">
          <div className="p-4 border-b border-secondary-200">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <HiChat className="w-12 h-12 text-secondary-300 mb-4" />
                <p className="text-secondary-500">No conversations yet</p>
                <p className="text-sm text-secondary-400">Start a new chat!</p>
              </div>
            ) : (
              rooms.map((room) => (
                <button
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-secondary-50 transition-colors ${
                    selectedRoom?._id === room._id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {room.type === 'group' || room.type === 'department' ? (
                      <HiUserGroup className="w-5 h-5 text-primary-600" />
                    ) : (
                      <span className="text-primary-600 font-semibold">
                        {getRoomName(room).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-secondary-900 truncate">
                        {getRoomName(room)}
                      </p>
                      {room.lastMessage && (
                        <span className="text-xs text-secondary-400">
                          {formatTime(room.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {room.lastMessage && (
                      <p className="text-sm text-secondary-500 truncate">
                        {room.lastMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-secondary-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    {selectedRoom.type === 'group' || selectedRoom.type === 'department' ? (
                      <HiUserGroup className="w-5 h-5 text-primary-600" />
                    ) : (
                      <span className="text-primary-600 font-semibold">
                        {getRoomName(selectedRoom).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">{getRoomName(selectedRoom)}</p>
                    <p className="text-sm text-secondary-500">
                      {selectedRoom.participants?.length || 0} participants
                    </p>
                  </div>
                </div>
                <button className="p-2 hover:bg-secondary-100 rounded-lg transition-colors">
                  <HiDotsVertical className="w-5 h-5 text-secondary-500" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <HiChat className="w-12 h-12 text-secondary-300 mb-4" />
                    <p className="text-secondary-500">No messages yet</p>
                    <p className="text-sm text-secondary-400">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.sender?._id === user?._id;
                    const showDate =
                      index === 0 ||
                      formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);

                    return (
                      <React.Fragment key={message._id}>
                        {showDate && (
                          <div className="flex items-center justify-center">
                            <span className="px-3 py-1 bg-secondary-100 text-secondary-500 text-xs rounded-full">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[70%] ${
                              isOwn
                                ? 'bg-primary-600 text-white rounded-l-xl rounded-tr-xl'
                                : 'bg-secondary-100 text-secondary-900 rounded-r-xl rounded-tl-xl'
                            } px-4 py-2`}
                          >
                            {!isOwn && (
                              <p className="text-xs font-medium mb-1 text-primary-600">
                                {message.sender?.firstName} {message.sender?.lastName}
                              </p>
                            )}
                            <p>{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? 'text-primary-200' : 'text-secondary-400'
                              }`}
                            >
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-secondary-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <HiPaperAirplane className="w-5 h-5 transform rotate-90" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <HiChat className="w-16 h-16 text-secondary-300 mb-4" />
              <p className="text-xl font-medium text-secondary-900">Welcome to Chat</p>
              <p className="text-secondary-500 mt-2">
                Select a conversation or start a new one
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {isNewRoomModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-4">New Conversation</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Chat Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRoomType('direct')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      roomType === 'direct'
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                    }`}
                  >
                    Direct Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomType('group')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      roomType === 'group'
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                    }`}
                  >
                    Group Chat
                  </button>
                </div>
              </div>

              {roomType === 'group' && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter group name"
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Select Participants
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employees..."
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                />
                <div className="max-h-48 overflow-y-auto border border-secondary-200 rounded-lg">
                  {filteredEmployees.map((emp) => (
                    <label
                      key={emp._id}
                      className="flex items-center gap-3 p-3 hover:bg-secondary-50 cursor-pointer"
                    >
                      <input
                        type={roomType === 'direct' ? 'radio' : 'checkbox'}
                        name="participant"
                        checked={selectedParticipants.includes(emp._id)}
                        onChange={(e) => {
                          if (roomType === 'direct') {
                            setSelectedParticipants([emp._id]);
                          } else {
                            if (e.target.checked) {
                              setSelectedParticipants([...selectedParticipants, emp._id]);
                            } else {
                              setSelectedParticipants(
                                selectedParticipants.filter((id) => id !== emp._id)
                              );
                            }
                          }
                        }}
                        className="w-4 h-4 text-primary-600"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-sm">
                            {emp.firstName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-secondary-500">
                            {emp.department?.name || 'No department'}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewRoomModalOpen(false);
                    setSelectedParticipants([]);
                    setSearchQuery('');
                    setNewRoomName('');
                  }}
                  className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedParticipants.length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
