// src/components/AIChat.js
// COMPLETE VERSION: Firestore-only + Portfolio Context
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Brain, Loader } from 'lucide-react';
import { sendMessage } from '@/services/aiService';
import { createConversation, getConversations, updateConversation } from '@/db/unifiedDB';
import { usePortfolioContext } from '@/hooks/usePortfolioContext';
import { generatePortfolioAwarePrompt } from '@/lib/ai-prompt-generator';
import { auth, db } from '@/config/firebase'; 
import { doc, setDoc } from 'firebase/firestore';

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Portfolio context for AI
  const { portfolioContext, loading: contextLoading } = usePortfolioContext();

  const hasProcessedPrompt = useRef(false);

const handleSend = async (overrideText = null) => {
  // Use the override if provided, otherwise fall back to the input state
  const textToSend = (typeof overrideText === 'string' ? overrideText : input).trim();
  
  if (!textToSend || isLoading) return;

  const userMessage = {
    role: 'user',
    content: textToSend,
    timestamp: new Date().toISOString(),
  };

  // 1. Build the updated list for the UI
  const updatedMessages = [...messages, userMessage];
  setMessages(updatedMessages);
  setInput('');
  setIsLoading(true);

    try {
// 🔥 THE DEEP CLEAN: Filter out empty messages and ensure content is a string
    const cleanedHistory = updatedMessages
      .filter(msg => msg.content && String(msg.content).trim() !== "") // Remove empty messages
      .map(msg => ({
        role: msg.role,
        // If content is an object (like a tool result), stringify it
        content: typeof msg.content === 'string' 
          ? msg.content 
          : JSON.stringify(msg.content)
      }));
    // let systemPrompt = portfolioContext ? generatePortfolioAwarePrompt(portfolioContext) : null;

console.log(`🧹 History cleaned. Sending ${cleanedHistory.length} valid messages.`);

    const result = await sendMessage(
      textToSend,
      cleanedHistory.slice(-15, -1), // Send history except the message we just added
      portfolioContext ? generatePortfolioAwarePrompt(portfolioContext) : null
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


  useEffect(() => {
    loadOrCreateConversation();
  }, []);

useEffect(() => {
  const timer = setTimeout(() => {
    scrollToBottom();
  }, 100);
  return () => clearTimeout(timer);
}, [messages]);

// The Updated Auto-Trigger Effect

useEffect(() => {
  // Only run if we have a conversation ID, are not loading context, 
  // and haven't processed a prompt this session
  if (!currentConversationId || contextLoading || hasProcessedPrompt.current) return;

  const params = new URLSearchParams(window.location.search);
  const promptText = params.get('prompt');

  if (promptText) {
    console.log("🚀 Found prompt in URL, initiating synthesis...");
    hasProcessedPrompt.current = true; // Mark as handled immediately
    
    // Clear URL parameters for a clean experience
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Set the visible input so the user sees the request
    setInput(promptText);
    
    // Execute the send with a direct argument to bypass state lag
    const timer = setTimeout(() => {
      handleSend(promptText); 
    }, 1000); // 1-second delay for stability

    return () => clearTimeout(timer);
  }
}, [currentConversationId, contextLoading]);


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
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 300);

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

const saveConversation = useCallback(async (msgs) => {
  const user = auth.currentUser; // Use Firebase auth directly
  
  if (!user || !currentConversationId) {
    console.warn("⚠️ Save postponed: No User or Conversation ID ready.");
    return;
  }

  try {
    const chatRef = doc(db, `users/${user.uid}/conversations`, currentConversationId);
    await setDoc(chatRef, {
      messages: msgs,
      updatedAt: new Date().toISOString(),
      lastPreview: msgs[msgs.length - 1].content.substring(0, 100) + "..."
    }, { merge: true });
    
    console.log("✅ Synthesis archived to history.");
  } catch (e) {
    console.error("❌ Error saving chat:", e);
  }
}, [currentConversationId]); // Only depend on the ID





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
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      style={{ overscrollBehaviorY: 'contain' }}
    >
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border shadow-sm'}`}>
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium italic">Thinking...</span>
            </div>
          </div>
        </div>
      )}

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
