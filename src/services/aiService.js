// src/services/aiService.js
import db from '@/db/database';
import { getAllProjects } from '@/db/projects';
import { subDays, format } from 'date-fns';

// Get API key from environment variable (production) or settings (development)
const getApiKey = async () => {
  // In production (Vercel), use environment variable
  // - - - REACT_APP_ANTHROPIC_API_KEY
  if (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
    return process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  }

    return process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;  
  // In development, fall back to settings
//  const settings = await db.settings.get('user_settings');
//  return settings?.ai?.apiKey || null;
};

// Agentic tools that Claude can use
const AGENTIC_TOOLS = [
  {
    name: 'get_recent_activity',
    description: 'Get user activity and time logs from the past N days',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 7)'
        }
      }
    }
  },
  {
    name: 'search_journal',
    description: 'Search through journal entries for topics, keywords, themes, or get recent entries. Can search by content, titles, tags, or entry types. If user asks what they\'ve been reflecting on, thinking about, or writing about, use this tool.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query, keywords, or topic. Can be broad (e.g., "reflecting") or specific (e.g., "RetireWise milestone"). Leave empty to get most recent entries.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)'
        }
      }
    }
  },
  {
    name: 'analyze_patterns',
    description: 'Analyze patterns in time allocation, energy levels, and project engagement',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_project_details',
    description: 'Get detailed information about a specific project',
    input_schema: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project to get details for'
        }
      },
      required: ['projectName']
    }
  }
];

// Execute agentic tool functions
const executeToolFunction = async (toolName, toolInput) => {
  console.log(`🔧 Executing tool: ${toolName}`, toolInput);

  switch (toolName) {
    case 'get_recent_activity':
      return await getRecentActivity(toolInput.days || 7);
    
    case 'search_journal':
      return await searchJournal(toolInput.query, toolInput.limit || 5);
    
    case 'analyze_patterns':
      return await analyzePatterns();
    
    case 'get_project_details':
      return await getProjectDetails(toolInput.projectName);
    
    default:
      return { error: 'Unknown tool' };
  }
};

// Tool implementations
const getRecentActivity = async (days) => {
  const sinceDate = subDays(new Date(), days);
  
  const timeLogs = await db.timeLogs
    .where('date')
    .above(sinceDate.toISOString())
    .toArray();
  
  const projects = await getAllProjects();
  
  // Aggregate by project
  const activityByProject = {};
  timeLogs.forEach(log => {
    if (!activityByProject[log.projectId]) {
      const project = projects.find(p => p.id === log.projectId);
      activityByProject[log.projectId] = {
        projectName: project?.name || 'Unknown',
        totalHours: 0,
        sessions: 0,
        activities: []
      };
    }
    activityByProject[log.projectId].totalHours += log.duration;
    activityByProject[log.projectId].sessions += 1;
    activityByProject[log.projectId].activities.push({
      date: format(new Date(log.date), 'MMM d'),
      hours: log.duration,
      activity: log.activityType,
      description: log.description
    });
  });
  
  return {
    period: `Last ${days} days`,
    totalHours: timeLogs.reduce((sum, log) => sum + log.duration, 0),
    projectBreakdown: Object.values(activityByProject),
    daysActive: new Set(timeLogs.map(l => format(new Date(l.date), 'yyyy-MM-dd'))).size
  };
};

const searchJournal = async (query, limit) => {
  const allEntries = await db.journalEntries.toArray();
  
  // If no specific query, return most recent entries
  if (!query || query.trim() === '') {
    const recent = allEntries
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
    
    return {
      query: 'recent entries',
      resultsFound: recent.length,
      entries: recent.map(entry => ({
        date: format(new Date(entry.date), 'MMM d, yyyy'),
        title: entry.title || 'Untitled',
        entryType: entry.entryType,
        excerpt: entry.content.substring(0, 300),
        sentiment: entry.sentiment,
        projectId: entry.projectId,
        tags: entry.tags
      }))
    };
  }
  
  // Smart search: break query into keywords and search flexibly
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(k => k.length > 2);
  
  const scoredEntries = allEntries.map(entry => {
    let score = 0;
    const contentLower = entry.content.toLowerCase();
    const titleLower = (entry.title || '').toLowerCase();
    
    // Exact phrase match (highest priority)
    if (contentLower.includes(queryLower) || titleLower.includes(queryLower)) {
      score += 10;
    }
    
    // Individual keyword matches
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword)) score += 3;
      if (titleLower.includes(keyword)) score += 5;
      if (entry.tags?.some(tag => tag.toLowerCase().includes(keyword))) score += 4;
      if (entry.entryType.toLowerCase().includes(keyword)) score += 2;
    });
    
    // Recent entries get slight boost
    const daysOld = Math.floor((new Date() - new Date(entry.date)) / (1000 * 60 * 60 * 24));
    if (daysOld < 7) score += 1;
    
    return { ...entry, score };
  });
  
  const matches = scoredEntries
    .filter(entry => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, limit);
  
  // If no matches found, return most recent entries as fallback
  if (matches.length === 0) {
    const recent = allEntries
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, Math.min(3, limit));
    
    return {
      query,
      resultsFound: 0,
      fallbackResults: recent.length,
      entries: recent.map(entry => ({
        date: format(new Date(entry.date), 'MMM d, yyyy'),
        title: entry.title || 'Untitled',
        entryType: entry.entryType,
        excerpt: entry.content.substring(0, 300),
        sentiment: entry.sentiment,
        projectId: entry.projectId,
        tags: entry.tags
      }))
    };
  }
  
  return {
    query,
    resultsFound: matches.length,
    entries: matches.map(entry => ({
      date: format(new Date(entry.date), 'MMM d, yyyy'),
      title: entry.title || 'Untitled',
      entryType: entry.entryType,
      excerpt: entry.content.substring(0, 300),
      sentiment: entry.sentiment,
      projectId: entry.projectId,
      tags: entry.tags,
      relevanceScore: entry.score
    }))
  };
};

const analyzePatterns = async () => {
  const projects = await getAllProjects();
  const allTimeLogs = await db.timeLogs.toArray();
  
  // Calculate time distribution by project type
  const typeDistribution = {};
  projects.forEach(project => {
    if (!typeDistribution[project.type]) {
      typeDistribution[project.type] = 0;
    }
    typeDistribution[project.type] += project.totalHoursLogged;
  });
  
  const totalHours = Object.values(typeDistribution).reduce((sum, h) => sum + h, 0);
  
  // Find most engaged project (by hours and recency)
  const activeProjects = projects
    .filter(p => p.totalHoursLogged > 0)
    .sort((a, b) => {
      const aRecent = a.lastWorkedAt ? new Date(a.lastWorkedAt).getTime() : 0;
      const bRecent = b.lastWorkedAt ? new Date(b.lastWorkedAt).getTime() : 0;
      return bRecent - aRecent;
    });
  
  // Identify dormant projects
  const dormantProjects = projects.filter(p => {
    if (!p.lastWorkedAt) return true;
    const daysSinceWork = Math.floor(
      (new Date() - new Date(p.lastWorkedAt)) / (1000 * 60 * 60 * 24)
    );
    return daysSinceWork > 14 && p.status === 'active';
  });
  
  return {
    totalProjects: projects.length,
    totalHoursLogged: totalHours,
    typeDistribution: Object.entries(typeDistribution).map(([type, hours]) => ({
      type,
      hours,
      percentage: ((hours / totalHours) * 100).toFixed(1)
    })),
    mostEngagedProject: activeProjects[0]?.name || 'None',
    dormantProjects: dormantProjects.map(p => ({
      name: p.name,
      daysSinceWork: p.lastWorkedAt 
        ? Math.floor((new Date() - new Date(p.lastWorkedAt)) / (1000 * 60 * 60 * 24))
        : null
    })),
    overallMomentum: activeProjects.length > 0 ? 'Active' : 'Low'
  };
};

const getProjectDetails = async (projectName) => {
  const projects = await getAllProjects();
  const project = projects.find(p => 
    p.name.toLowerCase() === projectName.toLowerCase()
  );
  
  if (!project) {
    return { error: `Project "${projectName}" not found` };
  }
  
  const timeLogs = await db.timeLogs
    .where('projectId')
    .equals(project.id)
    .toArray();
  
  const journalEntries = await db.journalEntries
    .where('projectId')
    .equals(project.id)
    .toArray();
  
  return {
    name: project.name,
    type: project.type,
    status: project.status,
    description: project.description,
    motivation: project.motivation,
    goals: project.goals,
    totalHours: project.totalHoursLogged,
    targetHours: project.targetHours,
    timeLogCount: timeLogs.length,
    journalEntryCount: journalEntries.length,
    lastWorked: project.lastWorkedAt 
      ? format(new Date(project.lastWorkedAt), 'MMM d, yyyy')
      : 'Never',
    recentActivity: timeLogs
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3)
      .map(log => ({
        date: format(new Date(log.date), 'MMM d'),
        hours: log.duration,
        activity: log.activityType
      }))
  };
};

// Main chat function
export const sendMessage = async (userMessage, conversationHistory = []) => {
  try {
    // Get API key from settings
  //  const apiKey = await getApiKey();
  //  
  //  if (!apiKey) {
  //    throw new Error('No API key configured. Please add your Claude API key in Settings.');
  //  }
    
    // Build messages array for Claude
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    // System prompt that defines the AI's role
    const systemPrompt = `You are RetireWise AI, an intelligent advisor helping a retired person manage their portfolio of projects and activities.

The user retired 2 years ago and is experimenting with different activities including building projects, learning new skills, considering consulting, and exploring wildcards. They track their time, journal entries, and progress across multiple projects.

Your role is to:
- Help them think through decisions about where to focus
- Identify patterns in their activity and engagement
- Provide encouragement and constructive insights
- Ask thoughtful questions to help clarify their thinking
- Be friendly, supportive, and practical

You have access to tools that let you retrieve their actual data. Use these tools proactively when relevant to provide data-driven insights.

Keep responses conversational and concise (2-3 paragraphs max unless asked for more detail).`;

    // First API call - may result in tool use
    console.log('🤖 Calling Claude API...');


// Determine API endpoint
// replaced - - const API_ENDPOINT = process.env.NODE_ENV === 'development'
// const API_ENDPOINT = process.env.NODE_ENV === 'development'
//  ? 'http://localhost:3001/api/chat'  // Your local proxy
//  : '/api/chat';  // Vercel serverless function

const API_ENDPOINT = '/api/chat';
  
// First API call
const response = await fetch(API_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: messages,
    tools: AGENTIC_TOOLS,
    system: systemPrompt
  })
});

// ADD THESE LOGS:
console.log('📥 Response status:', response.status);
// const data = await response.json();
// console.log('📥 Response data:', data);


    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 Claude response:', data);

    // Check if Claude wants to use tools
    if (data.stop_reason === 'tool_use') {
      
      const toolUses = data.content.filter(block => block.type === 'tool_use');
      console.log('🔧 Claude wants to use tools:', toolUses.length);
      
      // Execute all tool calls
      const toolResults = await Promise.all(
        toolUses.map(async (toolUse) => {
          const result = await executeToolFunction(toolUse.name, toolUse.input);
          return {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
          };
        })
      );
      
      // Build the assistant message with tool uses
      const assistantMessage = {
        role: 'assistant',
        content: data.content
      };
      
      // Build the user message with tool results
      const userMessage = {
        role: 'user',
        content: toolResults
      };
      
      // Second API call with tool results
      console.log('🤖 Calling Claude API with tool results...');

// Second API call (similar change)
const finalResponse = await fetch(API_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      ...messages,
      assistantMessage,
      userMessage
    ],
    system: systemPrompt
  })
});


      if (!finalResponse.ok) {
        const errorData = await finalResponse.json();
        console.error('❌ Claude API error on tool result:', errorData);
        throw new Error('Claude API error on second call');
      }

      const finalData = await finalResponse.json();
      console.log('📥 Final Claude response:', finalData);
      console.log('📝 Final response content:', finalData.content);
      
      // Extract text response - handle both single text and multiple content blocks
      const textContent = finalData.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
      
      console.log('✅ Extracted text:', textContent);
      
      if (!textContent || textContent.trim() === '') {
        console.error('⚠️ No text content in response!');
        return {
          response: 'I analyzed the data but had trouble formatting the response. Let me try again - what would you like to know about your patterns?',
          toolsUsed: toolUses.map(t => t.name),
          contextUsed: toolResults.map(r => JSON.parse(r.content))
        };
      }
      
      return {
        response: textContent,
        toolsUsed: toolUses.map(t => t.name),
        contextUsed: toolResults.map(r => JSON.parse(r.content))
      };
    }
    
    // No tool use - direct response
    const textContent = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    
    return {
      response: textContent,
      toolsUsed: [],
      contextUsed: null
    };
    
  } catch (error) {
    console.error('❌ AI Service Error:', error);
    throw error;
  }
};

export default { sendMessage };