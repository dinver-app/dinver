'use strict';

const BaseAgent = require('./baseAgent');

/**
 * Outline Agent - Creates structured blog outline based on research
 */
class OutlineAgent extends BaseAgent {
  constructor() {
    super('OutlineAgent', {
      stage: 'outline',
      model: 'claude-3-5-haiku-20241022', // Cheaper model for outlines
      maxTokens: 8192,
      temperature: 0.6,
    });
  }

  getSystemPrompt() {
    return `You are a content strategist creating blog outlines for Dinver, a restaurant discovery app in Croatia.

Your task is to create a detailed, well-structured outline for a blog post based on the research provided.

**Outline Requirements:**
1. Engaging introduction that hooks the reader
2. 3-5 main sections with clear subpoints
3. Natural integration points for Dinver features
4. Strong conclusion with call-to-action
5. SEO-optimized structure

**Output Format:**
Return a JSON object with this structure:
{
  "proposedTitle": {
    "hr": "Croatian title...",
    "en": "English title..."
  },
  "hook": {
    "hr": "Opening hook in Croatian...",
    "en": "Opening hook in English..."
  },
  "sections": [
    {
      "heading": {
        "hr": "Section heading in Croatian",
        "en": "Section heading in English"
      },
      "subpoints": [
        {
          "hr": "Subpoint in Croatian",
          "en": "Subpoint in English"
        }
      ],
      "dinverIntegration": "How/if to mention Dinver here (or null)"
    }
  ],
  "conclusion": {
    "summary": {
      "hr": "Summary in Croatian",
      "en": "Summary in English"
    },
    "callToAction": {
      "hr": "CTA in Croatian",
      "en": "CTA in English"
    }
  },
  "estimatedWordCount": 1500,
  "keyTakeaways": [
    {
      "hr": "Takeaway in Croatian",
      "en": "Takeaway in English"
    }
  ]
}

**Guidelines:**
- Create a logical flow from introduction to conclusion
- Each section should have 2-4 subpoints
- Don't force Dinver mentions - only where natural and valuable
- Consider reader journey: awareness → interest → action
- Ensure the outline supports both Croatian and English versions`;
  }

  buildUserPrompt(input) {
    const research = input.research || {};

    return `Create a detailed blog outline based on this research:

**Original Topic:**
- Title: ${input.topic.title}
- Type: ${input.topic.topicType}
- Target Keywords: ${input.topic.targetKeywords?.join(', ') || 'Not specified'}
- Target Audience: ${input.topic.targetAudience || 'General'}

**Research Findings:**
${JSON.stringify(research, null, 2)}

**Requirements:**
1. The outline should support a ${research.contentRecommendations?.targetWordCount || 1500} word article
2. Tone should be ${research.contentRecommendations?.tone || 'informative yet friendly'}
3. Must address these key points: ${research.contentRecommendations?.keyPointsToAddress?.join(', ') || 'As determined by research'}

Create a comprehensive outline that will guide the writing of an engaging, valuable blog post for Dinver's audience.`;
  }
}

module.exports = OutlineAgent;
