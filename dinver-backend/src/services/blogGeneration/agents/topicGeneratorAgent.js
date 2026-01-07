'use strict';

const BaseAgent = require('./baseAgent');

/**
 * Topic Generator Agent - Generates blog topic details from a simple prompt
 * Takes a rough idea and creates structured topic data
 */
class TopicGeneratorAgent extends BaseAgent {
  constructor() {
    super('TopicGeneratorAgent', {
      stage: 'topic_generation',
      model: 'claude-3-5-haiku-20241022', // Cheap and fast for this task
      maxTokens: 2048,
      temperature: 0.7,
    });
  }

  getSystemPrompt() {
    return `You are a content strategist for Dinver, a restaurant discovery and booking app in Croatia.

**Your Task:**
Given a rough idea or description from the user, generate a complete, structured blog topic with all necessary details.

**About Dinver:**
- Mobile app for discovering restaurants in Croatia
- Features: Restaurant search, digital menus, table reservations, loyalty rewards
- Target audience: Food lovers, tourists, locals looking for dining experiences
- Blog serves both Croatian and international audiences

**Topic Types Available:**
- restaurant_guide: Lists and recommendations of restaurants
- food_culture: Croatian food traditions, cuisine history
- travel_food: Food tourism, destination dining
- tips_tricks: Practical dining advice, reservation tips
- news: Industry news, Dinver updates
- seasonal: Holiday specials, seasonal menus

**Output Format:**
Return a JSON object:
{
  "title": "Compelling blog title in Croatian",
  "titleEn": "English version of the title",
  "topicType": "one of the topic types above",
  "description": "2-3 sentence description of what the blog will cover",
  "targetKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "targetAudience": "Who this blog is for",
  "primaryLanguage": "hr-HR",
  "generateBothLanguages": true,
  "priority": 5,
  "suggestedAngle": "Unique perspective or hook for this topic",
  "estimatedValue": "Why this topic matters to Dinver's audience"
}

**Guidelines:**
- Create SEO-friendly, engaging titles
- Keywords should be realistic search terms in Croatian
- Consider what would rank well and attract readers
- Think about Dinver's brand and how the topic connects to the app
- Priority 1-10 (1=urgent, 10=low priority, default 5)`;
  }

  buildUserPrompt(input) {
    return `Generate a complete blog topic based on this idea:

"${input.prompt}"

Create a well-structured topic that would:
1. Attract readers interested in Croatian dining/food
2. Have good SEO potential
3. Naturally connect to Dinver's restaurant discovery features
4. Be valuable and engaging content

Return the complete topic details as JSON.`;
  }

  /**
   * Simple execute without logging to BlogGenerationLog
   * since this is just for topic creation, not blog generation
   */
  async generate(prompt) {
    console.log(`[${this.name}] Generating topic from prompt...`);
    const startTime = Date.now();

    try {
      const response = await this.callLLMDirect({ prompt });
      const duration = Date.now() - startTime;
      console.log(`[${this.name}] Generated topic in ${duration}ms`);
      return response;
    } catch (error) {
      console.error(`[${this.name}] Failed to generate topic:`, error.message);
      throw error;
    }
  }

  /**
   * Direct LLM call without database logging
   */
  async callLLMDirect(input) {
    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    let content = textContent.text.trim();

    // Remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try to parse JSON
    try {
      return JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON object
      const jsonMatch = this.extractJsonObject(content);
      if (jsonMatch) {
        return JSON.parse(jsonMatch);
      }
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }
  }
}

module.exports = TopicGeneratorAgent;
