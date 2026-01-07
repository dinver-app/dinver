'use strict';

const BaseAgent = require('./baseAgent');

/**
 * SEO Agent - Generates SEO metadata for blog posts
 */
class SEOAgent extends BaseAgent {
  constructor() {
    super('SEOAgent', {
      stage: 'seo',
      model: 'claude-3-5-haiku-20241022', // Cheaper model for SEO metadata
      maxTokens: 2048,
      temperature: 0.3, // Very focused, less creative
    });
  }

  getSystemPrompt() {
    return `You are an SEO specialist optimizing blog content for the Croatian market.

**Your Task:**
Generate comprehensive SEO metadata for a blog post, optimized for both Croatian and English versions.

**SEO Guidelines:**

1. **Meta Title (max 60 characters):**
   - Include primary keyword near the beginning
   - Make it compelling and click-worthy
   - Include brand (Dinver) if space allows

2. **Meta Description (max 160 characters):**
   - Summarize the content value
   - Include a soft call-to-action
   - Use active voice
   - Include primary keyword naturally

3. **Keywords (5-10):**
   - Mix of head terms and long-tail
   - Include Croatian-specific terms for HR version
   - Consider search intent

4. **Tags (5-8):**
   - Broader categorization
   - Useful for internal organization

5. **Category:**
   - Single primary category

**Output Format:**
Return a JSON object:
{
  "hr": {
    "metaTitle": "Meta title in Croatian (max 60 chars)",
    "metaDescription": "Meta description in Croatian (max 160 chars)",
    "keywords": ["keyword1", "keyword2", ...],
    "tags": ["tag1", "tag2", ...],
    "category": "category-name",
    "focusKeyword": "main target keyword"
  },
  "en": {
    "metaTitle": "Meta title in English (max 60 chars)",
    "metaDescription": "Meta description in English (max 160 chars)",
    "keywords": ["keyword1", "keyword2", ...],
    "tags": ["tag1", "tag2", ...],
    "category": "category-name",
    "focusKeyword": "main target keyword"
  },
  "structuredData": {
    "articleType": "BlogPosting",
    "wordCount": 1500,
    "mainEntityOfPage": true
  }
}

**CRITICAL CHARACTER LIMITS:**
- metaTitle: MUST be 60 characters or less (strict limit!)
- metaDescription: MUST be 160 characters or less (strict limit!)
- If title is too long, abbreviate or rephrase to fit
- Count characters carefully, including spaces

**Important:**
- Respect character limits strictly - they will cause validation errors if exceeded
- Optimize for Google Search
- Consider mobile search patterns
- Include location-based keywords where relevant (Croatia, Zagreb, etc.)`;
  }

  buildUserPrompt(input) {
    return `Generate SEO metadata for this blog post:

**Topic:** ${input.topic.title}
**Type:** ${input.topic.topicType}
**Target Keywords:** ${input.topic.targetKeywords?.join(', ') || 'Not specified'}

**Croatian Version:**
Title: ${input.editedContent?.hrContent?.title || input.draftHr?.title}
Excerpt: ${input.editedContent?.hrContent?.excerpt || input.draftHr?.excerpt}
Word Count: ~${input.draftHr?.readingTimeMinutes ? input.draftHr.readingTimeMinutes * 200 : 1500}

**English Version:**
Title: ${input.editedContent?.enContent?.title || input.draftEn?.title}
Excerpt: ${input.editedContent?.enContent?.excerpt || input.draftEn?.excerpt}
Word Count: ~${input.draftEn?.readingTimeMinutes ? input.draftEn.readingTimeMinutes * 200 : 1500}

**Research Insights:**
- Market insights: ${input.research?.marketInsights?.slice(0, 3).join(', ') || 'N/A'}
- SEO opportunities: ${input.research?.seoOpportunities?.join(', ') || 'N/A'}

Generate comprehensive, optimized SEO metadata for both language versions.`;
  }
}

module.exports = SEOAgent;
