// src/components/AIChat.js
// COMPLETE VERSION: Firestore-only + Portfolio Context
import React, { useState, useEffect, useRef } from 'react';
import { Send, Brain, Loader } from 'lucide-react';
import { sendMessage } from '@/services/aiService';
import { createConversation, getConversations, updateConversation } from '@/db/unifiedDB';
import { usePortfolioContext } from '@/hooks/usePortfolioContext';
import { generatePortfolioAwarePrompt } from '@/lib/ai-prompt-generator';

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Portfolio context for AI
  const { portfolioContext, loading: contextLoading } = usePortfolioContext();

  useEffect(() => {
    loadOrCreateConversation();
  }, []);

useEffect(() => {
  const timer = setTimeout(() => {
    scrollToBottom();
  }, 100);
  return () => clearTimeout(timer);
}, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOrCreateConversation = async () => {
    try {
      // Get most recent conversation from Firestore
      const conversations = await getConversations();

      if (conversations.length > 0) {
        const conv = conversations[0];
        setCurrentConversationId(conv.id);
        setMessages(conv.messages || []);

        // Force scroll to bottom after loading conversation
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);

      } else {
        // Create initial conversation with welcome message
        const welcomeMessage = {
          role: 'assistant',
          content: "Hello! I'm your RetireWise AI advisor. I can help you think through your retirement activities, analyze patterns in your projects, and provide insights based on your portfolio data.\n\nTry asking me things like:\n• How balanced is my portfolio right now?\n• What should I focus on today?\n• Analyze my recent activity patterns\n• Which projects need attention?",
          timestamp: new Date().toISOString(),
          contextUsed: null
        };

        const conversationData = {
          title: 'New Conversation',
          messages: [welcomeMessage],
          conversationType: 'general'
        };

        const conversationId = await createConversation(conversationData);
        setCurrentConversationId(conversationId);
        setMessages([welcomeMessage]);
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);

      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const saveConversation = async (updatedMessages) => {
    if (!currentConversationId) return;

    try {
      await updateConversation(currentConversationId, {
        messages: updatedMessages,
        messageCount: updatedMessages.length
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      contextUsed: null
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for Claude (only role and content)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Generate portfolio-aware system prompt if context is available
      let systemPrompt = null;
      if (portfolioContext) {
        systemPrompt = generatePortfolioAwarePrompt(portfolioContext);
        console.log('📊 Using portfolio-aware system prompt');
      }

      // Call AI service with portfolio context
      const result = await sendMessage(
        input.trim(), 
        conversationHistory,
        systemPrompt // Custom system prompt with portfolio data
      );

      const assistantMessage = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        contextUsed: {
          toolsUsed: result.toolsUsed || [],
          data: result.contextUsed,
          portfolioContext: portfolioContext ? {
            balanceScore: portfolioContext.balanceScore.score,
            grade: portfolioContext.balanceScore.grade
          } : null
        }
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await saveConversation(finalMessages);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date().toISOString(),
        contextUsed: null,
        isError: true
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    'How balanced is my portfolio?',
    'What should I focus on today?',
    'Analyze my recent patterns',
    'Which projects need attention?'
  ];

  // Show loading state while fetching portfolio context
  if (contextLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading your portfolio context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Portfolio Context Header */}
      {portfolioContext && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">
                Portfolio Balance: <strong className="text-blue-600">
                  {portfolioContext.balanceScore.score}/100
                </strong> (Grade: {portfolioContext.balanceScore.grade})
              </span>
            </div>
            <span className="text-gray-500 text-xs">
              {portfolioContext.totalHours}h tracked • {portfolioContext.activeProjects} active projects
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : msg.isError
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              
              {/* Show tools used */}
              {msg.contextUsed && msg.contextUsed.toolsUsed && msg.contextUsed.toolsUsed.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Brain className="w-3 h-3" />
                    <span className="font-medium">Tools used:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {msg.contextUsed.toolsUsed.map((tool, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Show portfolio context badge */}
              {msg.contextUsed?.portfolioContext && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>📊 Portfolio-aware response</span>
                  </div>
                </div>
              )}
              
              <p className="text-xs opacity-70 mt-2">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setInput(prompt)}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-xs rounded-full whitespace-nowrap hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your portfolio..."
            disabled={isLoading}
            rows="1"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
