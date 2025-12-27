'use client';

import React, { useState, useEffect } from 'react';
import { Lightbulb, X, CheckCircle, ThumbsUp, ThumbsDown, AlertTriangle, TrendingUp, Star, Target } from 'lucide-react';
import { getActiveInsights, dismissInsight, markInsightActedOn, provideFeedback } from '@/db/unifiedDB';
import * as unifiedDB from '@/db/unifiedDB';


const InsightsPanel = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    console.log('InsightsPanel mounted');
    loadInsights();
  }, []);

  const loadInsights = async () => {
    console.log('Loading insights...');
    try {
      const activeInsights = await getActiveInsights();
      console.log('Loaded insights:', activeInsights);
      console.log('Number of insights:', activeInsights.length);
      setInsights(activeInsights);
      setLoading(false);
    } catch (error) {
      console.error('Error loading insights:', error);
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    setGenerating(true);
    try {
      const newInsights = await unifiedDB.generateInsights();
      console.log(`✅ Generated ${newInsights.length} new insights`);
      await loadInsights();
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (insightId, reason = null) => {
    try {
      await dismissInsight(insightId, reason);
      await loadInsights();
    } catch (error) {
      console.error('Error dismissing insight:', error);
    }
  };

  const handleActedOn = async (insightId) => {
    try {
      await markInsightActedOn(insightId);
      await loadInsights();
    } catch (error) {
      console.error('Error marking insight:', error);
    }
  };

  const handleFeedback = async (insightId, feedback) => {
    try {
      await provideFeedback(insightId, feedback);
      // Don't reload, just update locally
      setInsights(prev => prev.map(insight => 
        insight.id === insightId 
          ? { ...insight, userFeedback: feedback }
          : insight
      ));
    } catch (error) {
      console.error('Error providing feedback:', error);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'pattern': return TrendingUp;
      case 'achievement': return Star;
      case 'suggestion': return Lightbulb;
      case 'alert': return AlertTriangle;
      case 'milestone': return Target;
      default: return Lightbulb;
    }
  };

  const getInsightColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      case 'low': return 'border-blue-300 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700'
    };
    return colors[priority] || colors.low;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">


      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Lightbulb className="w-7 h-7 text-yellow-500" />
            Insights
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered recommendations based on your activity
          </p>
        </div>
        <button
          onClick={handleGenerateInsights}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate New'}
        </button>
      </div>

      {/* Insights List */}
      {insights.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            No insights yet. Click "Generate New" to analyze your activity and get personalized recommendations.
          </p>
          <button
            onClick={handleGenerateInsights}
            disabled={generating}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            {generating ? 'Generating...' : 'Generate Insights'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => {
            const Icon = getInsightIcon(insight.type);
            
            return (
              <div 
                key={insight.id}
                className={`border-2 rounded-xl p-5 shadow-sm ${getInsightColor(insight.priority)}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      insight.priority === 'high' ? 'bg-red-100' :
                      insight.priority === 'medium' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800">{insight.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(insight.priority)}`}>
                          {insight.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{insight.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(insight.id)}
                    className="p-1 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Suggested Actions */}
                {insight.actionable && insight.suggestedActions.length > 0 && (
                  <div className="mb-3 pl-11">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Suggested actions:</p>
                    <ul className="space-y-1">
                      {insight.suggestedActions.map((action, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600 mt-1">→</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pl-11">
                  {insight.actionable && !insight.actedOn && (
                    <button
                      onClick={() => handleActedOn(insight.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Done
                    </button>
                  )}
                  
                  {insight.actedOn && (
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Acted on
                    </span>
                  )}

                  {/* Feedback */}
                  {!insight.userFeedback && (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-xs text-gray-500 mr-1">Helpful?</span>
                      <button
                        onClick={() => handleFeedback(insight.id, 'helpful')}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleFeedback(insight.id, 'not-helpful')}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors"
                      >
                        <ThumbsDown className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  )}

                  {insight.userFeedback === 'helpful' && (
                    <span className="text-xs text-green-600 ml-auto flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      Marked helpful
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="mt-3 pt-3 border-t border-gray-200/50 flex items-center justify-between text-xs text-gray-500 pl-11">
                  <span>
                    Generated {new Date(insight.generatedAt).toLocaleDateString()}
                  </span>
                  <span>
                    {Math.round(insight.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">💡 About Insights</p>
        <p>
          Insights are automatically generated based on your projects, time logs, and journal entries. 
          They help you notice patterns, stay on track, and make better decisions about where to focus your energy.
        </p>
      </div>
    </div>
  );
};

export default InsightsPanel;