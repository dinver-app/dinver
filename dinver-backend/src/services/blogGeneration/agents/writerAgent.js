'use strict';

const BaseAgent = require('./baseAgent');

/**
 * Writer Agent - Writes full blog content based on outline
 * Can write in Croatian (hr-HR) or English (en-US)
 */
class WriterAgent extends BaseAgent {
  constructor(language = 'hr-HR') {
    const isHr = language === 'hr-HR';
    super(`WriterAgent_${language}`, {
      stage: isHr ? 'draft_hr' : 'draft_en',
      maxTokens: 16384, // Large for full ~1500 word article with JSON wrapper
      temperature: 0.7, // Creative but coherent
    });
    this.language = language;
    this.isHr = isHr;
  }

  getSystemPrompt() {
    const langName = this.isHr ? 'Croatian' : 'English';
    const langCode = this.isHr ? 'hr-HR' : 'en-US';

    return `You are a professional blog content writer for Dinver, specializing in ${langName} food and restaurant content.

**About Dinver:**
- Restaurant discovery and booking app in Croatia
- Features: Search, digital menus, reservations, loyalty rewards, user experiences
- Target: Food enthusiasts, tourists, locals

**Writing Guidelines:**

1. **Language:** Write ONLY in ${langName} (${langCode})
   ${this.isHr ? '- Use natural Croatian, avoid anglicisms where possible' : '- Clear, accessible international English'}
   ${this.isHr ? '- Informal "ti" form, friendly tone' : '- Friendly, approachable tone'}

2. **Style:**
   - Engaging, informative, SEO-friendly
   - Include practical tips and recommendations
   - Reference Dinver features naturally (not forced marketing)
   - Use short paragraphs (2-4 sentences)
   - Include bullet points where appropriate

3. **Structure:**
   - Compelling opening paragraph
   - Clear H2 headings for each section
   - Smooth transitions between sections
   - Strong conclusion with call-to-action

4. **Content:**
   - Focus on value for the reader
   - Include specific examples and details
   - Mention Croatian locations, restaurants, dishes where relevant
   - Be accurate and helpful

**Output Format:**
Return a JSON object:
{
  "title": "Blog title",
  "slug": "url-friendly-slug",
  "content": "<article>Full HTML content with proper H2 headings, paragraphs, lists...</article>",
  "excerpt": "150-200 character summary for preview",
  "readingTimeMinutes": 5
}

**CRITICAL JSON RULES:**
- Use ONLY double quotes (") for JSON strings
- Inside "content" field, use single quotes (') for HTML attributes
- If you must use quotes inside text, escape them: \"
- NO unescaped line breaks inside JSON strings
- Ensure all braces and brackets are properly closed

**HTML Guidelines:**
- Use <h2> for main sections
- Use <h3> for subsections if needed
- Use <p> for paragraphs
- Use <ul>/<li> for lists
- Use <strong> sparingly for emphasis
- NO inline styles
- NO <h1> (title is separate)`;
  }

  buildUserPrompt(input) {
    const langKey = this.isHr ? 'hr' : 'en';

    return `Write a complete blog article in ${this.isHr ? 'Croatian' : 'English'} based on this outline:

**Topic:** ${input.topic.title}
**Type:** ${input.topic.topicType}
**Target Keywords:** ${input.topic.targetKeywords?.join(', ') || 'Not specified'}

**Outline:**
${JSON.stringify(input.outline, null, 2)}

**Research Context:**
${JSON.stringify(input.research, null, 2)}

**Requirements:**
- Target word count: ${input.research?.contentRecommendations?.targetWordCount || 1500} words
- Language: ${this.isHr ? 'Croatian (hr-HR)' : 'English (en-US)'}
- Use the proposed title from outline or improve it
- Follow the section structure from the outline
- Include the hook from the outline in the introduction
- End with the call-to-action from the outline

Write engaging, valuable content that helps readers and naturally positions Dinver as a helpful resource.`;
  }
}

module.exports = WriterAgent;
