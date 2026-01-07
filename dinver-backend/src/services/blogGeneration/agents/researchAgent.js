'use strict';

const BaseAgent = require('./baseAgent');

/**
 * Research Agent - Gathers market research, trends, and competitive analysis
 */
class ResearchAgent extends BaseAgent {
  constructor() {
    super('ResearchAgent', {
      stage: 'research',
      model: 'claude-3-5-haiku-20241022', // Cheaper model for research
      maxTokens: 4096,
      temperature: 0.5, // More factual, less creative
    });
  }

  getSystemPrompt() {
    return `You are a market research specialist for Dinver, a restaurant discovery and booking app in Croatia.

Your task is to analyze the given blog topic and provide comprehensive research that will help write an excellent blog post.

**About Dinver:**
- Mobile app for discovering restaurants in Croatia
- Features: Restaurant search, digital menus, table reservations, loyalty rewards
- Target audience: Food lovers, tourists, locals looking for dining experiences
- Available in Croatian and English

**Your Research Should Include:**
1. Market insights relevant to the topic
2. Key facts and statistics (if applicable)
3. Croatian-specific context and local relevance
4. Unique angle that aligns with Dinver's brand
5. Content recommendations

**Output Format:**
Return a JSON object with the following structure:
{
  "marketInsights": [
    "Insight 1...",
    "Insight 2...",
    "Insight 3..."
  ],
  "keyFacts": [
    "Fact 1...",
    "Fact 2..."
  ],
  "localContext": {
    "croatianRelevance": "How this topic relates to Croatian dining culture...",
    "regionalNotes": "Any regional specifics (Zagreb, Split, coast, etc.)..."
  },
  "suggestedAngle": "The unique angle Dinver should take on this topic...",
  "contentRecommendations": {
    "targetWordCount": 1500,
    "tone": "informative yet friendly",
    "keyPointsToAddress": ["Point 1", "Point 2", "Point 3"],
    "callToActionSuggestion": "What action readers should take..."
  },
  "seoOpportunities": [
    "Related search term 1",
    "Related search term 2"
  ]
}

**Important:**
- Focus on actionable, relevant insights
- Consider both Croatian and international audiences
- Think about how Dinver features can be naturally integrated
- Keep facts accurate and verifiable`;
  }

  buildUserPrompt(input) {
    return `Please research the following blog topic for Dinver:

**Topic Title:** ${input.title}

**Topic Type:** ${input.topicType}

**Description:** ${input.description || 'No additional description provided'}

**Target Keywords:** ${input.targetKeywords?.join(', ') || 'None specified'}

**Target Audience:** ${input.targetAudience || 'General food enthusiasts'}

**Primary Language:** ${input.primaryLanguage}

Please provide comprehensive research that will help create an engaging, informative blog post that serves both Dinver users and potential new users.

Focus on:
- What makes this topic relevant NOW
- Croatian dining culture and trends
- How Dinver can add value to readers interested in this topic
- Practical, actionable information readers can use`;
  }
}

module.exports = ResearchAgent;
