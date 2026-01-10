// src/components/AIChat.js
// COMPLETE VERSION: Firestore-only + Portfolio Context
'use client';

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
  };

  // 1. Build the updated list for the UI
  const updatedMessages = [...messages, userMessage];
  setMessages(updatedMessages);
  setInput('');
  setIsLoading(true);

    try {
// Before calling sendMessage, clean the history strictly:
const cleanedHistory = updatedMessages.map(msg => ({
  role: msg.role,
  // Ensure content is ALWAYS a string, never an object or array
  content: typeof msg.content === 'string' 
    ? msg.content 
    : Array.isArray(msg.content) 
      ? msg.content.map(c => c.text || '').join('\n')
      : JSON.stringify(msg.content)
}));

    let systemPrompt = portfolioContext ? generatePortfolioAwarePrompt(portfolioContext) : null;

    // 3. Pass ONLY the cleaned history to the service
    const result = await sendMessage(
      input.trim(), // The current message
      cleanedHistory.slice(0, -1), // Everything EXCEPT the current message
      systemPrompt
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
  /* h-full here fills the main area exactly */
  <div className="flex flex-col h-[calc(100vh-144px)] bg-gray-50 relative overflow-hidden">
    
    {/* 1. Context Header (Fixed at top) */}
    {portfolioContext && (
      <div className="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-20 shrink-0">
        <div className="flex items-center justify-between text-xs">
           <span className="text-gray-700">Portfolio Balance: <strong className="text-blue-600">{portfolioContext.balanceScore.score}/100</strong></span>
           <span className="text-gray-500">{portfolioContext.activeProjects} active projects</span>
        </div>
      </div>
    )}

    {/* 2. Messages Area (The only part that scrolls) 
        We use flex-1 to take up all available middle space.
    */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border shadow-sm'}`}>
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>

    {/* 3. Input Area - STICKY BOTTOM 
        This z-index and sticky bottom-0 keep it visible 
        even when layout.js is trying to scroll the whole page.
    */}
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shrink-0 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex gap-2 max-w-2xl mx-auto items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything..."
          rows="1"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none resize-none max-h-32 text-sm"
        />
        <button 
          onClick={handleSend}
          className="bg-blue-600 text-white p-3 rounded-full shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
);
};

export default AIChat;
