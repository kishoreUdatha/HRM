import React, { useState, useEffect, useRef } from 'react';
import {
  HiChat,
  HiX,
  HiPaperAirplane,
  HiChevronDown,
  HiLightBulb,
  HiSupport,
} from 'react-icons/hi';
import api from '../../services/api';

interface Message {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface QuickAction {
  label: string;
  query: string;
}

const quickActions: QuickAction[] = [
  { label: 'Leave Balance', query: 'What is my leave balance?' },
  { label: 'Payslip', query: 'How can I download my payslip?' },
  { label: 'Holidays', query: 'What are the upcoming holidays?' },
  { label: 'Benefits', query: 'What benefits am I enrolled in?' },
  { label: 'Help Desk', query: 'How do I contact HR support?' },
];

const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message
      setMessages([
        {
          _id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm your HR Assistant. I can help you with leave requests, payroll queries, benefits information, and more. How can I assist you today?",
          timestamp: new Date(),
          suggestions: ['Check leave balance', 'View payslip', 'HR policies'],
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      _id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.post('/chatbot/message', {
        message: content,
        conversationId,
      });

      const data = response.data.data || response.data;

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        _id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || data.message || "I'm sorry, I couldn't process that request. Please try again.",
        timestamp: new Date(),
        suggestions: data.suggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);

      // Fallback response
      const fallbackMessage: Message = {
        _id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting to the server right now. Please try again later or contact HR directly for urgent matters.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleQuickAction = (query: string) => {
    handleSendMessage(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleEscalate = async () => {
    try {
      await api.post('/chatbot/escalate', { conversationId });
      const escalateMessage: Message = {
        _id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I've escalated your request to our HR team. Someone will reach out to you shortly via email or internal message. Is there anything else I can help you with in the meantime?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, escalateMessage]);
    } catch (error) {
      console.error('Failed to escalate:', error);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-105 flex items-center justify-center z-50"
        title="HR Assistant"
      >
        <HiChat className="w-7 h-7" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-secondary-200 z-50 transition-all ${
        isMinimized ? 'h-14' : 'h-[500px]'
      } flex flex-col overflow-hidden`}
    >
      {/* Header */}
      <div
        className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <HiLightBulb className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">HR Assistant</p>
            {!isMinimized && (
              <p className="text-xs text-primary-200">Always here to help</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <HiChevronDown className={`w-5 h-5 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="px-4 py-3 border-b border-secondary-200 bg-secondary-50">
              <p className="text-xs text-secondary-500 mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.query)}
                    className="px-3 py-1.5 text-xs bg-white border border-secondary-200 rounded-full hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white rounded-l-xl rounded-tr-xl'
                      : 'bg-secondary-100 text-secondary-900 rounded-r-xl rounded-tl-xl'
                  } px-4 py-2`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-primary-200' : 'text-secondary-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-2 py-1 text-xs bg-white/10 rounded hover:bg-white/20 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary-100 rounded-r-xl rounded-tl-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Escalate Option */}
          {messages.length > 3 && (
            <div className="px-4 py-2 border-t border-secondary-100 bg-secondary-50">
              <button
                onClick={handleEscalate}
                className="w-full flex items-center justify-center gap-2 text-sm text-secondary-600 hover:text-primary-600 transition-colors"
              >
                <HiSupport className="w-4 h-4" />
                Talk to HR Representative
              </button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-secondary-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiPaperAirplane className="w-5 h-5 transform rotate-90" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatbotWidget;
