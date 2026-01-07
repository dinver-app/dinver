'use strict';

const BaseAgent = require('./baseAgent');

/**
 * LinkedIn Agent - Creates short LinkedIn posts from blog content
 */
class LinkedInAgent extends BaseAgent {
  constructor(language = 'hr-HR') {
    const isHr = language === 'hr-HR';
    super(`LinkedInAgent_${language}`, {
      stage: isHr ? 'linkedin_hr' : 'linkedin_en',
      maxTokens: 1024,
      temperature: 0.6,
    });
    this.language = language;
    this.isHr = isHr;
  }

  getSystemPrompt() {
    const langName = this.isHr ? 'Croatian' : 'English';

    return `You are a social media specialist creating LinkedIn posts for Dinver, a restaurant discovery app.

**Your Task:**
Create an engaging LinkedIn post to promote a blog article in ${langName}.

**LinkedIn Post Guidelines:**

1. **Length:** 200-300 words (LinkedIn sweet spot)
2. **Structure:**
   - Hook (first 2-3 lines visible before "...see more")
   - Value proposition
   - Key insight or statistic
   - Call-to-action

3. **Tone:**
   - Professional but approachable
   - Industry-relevant
   - Thought leadership angle
   - ${this.isHr ? 'Natural Croatian, avoid corporate jargon' : 'Clear international English'}

4. **Formatting:**
   - Use line breaks for readability
   - Can use emojis sparingly (1-3 max)
   - No markdown (LinkedIn doesn't support it)

5. **Hashtags:**
   - 3-5 relevant hashtags
   - Mix of popular and niche
   - ${this.isHr ? 'Croatian hashtags where appropriate' : 'English hashtags'}

**Output Format:**
Return a JSON object:
{
  "post": "Full LinkedIn post text with line breaks...",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "callToAction": "Link to read the full article on Dinver blog",
  "targetAudience": "Who this post targets"
}

**Important:**
- Focus on value for the reader
- Position Dinver as a thought leader in the restaurant/food space
- Make people want to read the full article
- Keep it professional yet engaging`;
  }

  buildUserPrompt(input) {
    const content = this.isHr ? input.editedContent?.hrContent : input.editedContent?.enContent;
    const draft = this.isHr ? input.draftHr : input.draftEn;

    const title = content?.title || draft?.title || input.topic.title;
    const excerpt = content?.excerpt || draft?.excerpt || '';

    return `Create a LinkedIn post to promote this blog article:

**Blog Title:** ${title}
**Blog Excerpt:** ${excerpt}

**Topic Type:** ${input.topic.topicType}
**Target Audience:** ${input.topic.targetAudience || 'Food enthusiasts, restaurant owners, tourism professionals'}

**Key Points from the Article:**
${input.research?.keyFacts?.slice(0, 3).join('\n- ') || 'Quality restaurant content'}

**Market Insights:**
${input.research?.marketInsights?.slice(0, 2).join('\n- ') || 'Croatian dining trends'}

Create an engaging LinkedIn post in ${this.isHr ? 'Croatian' : 'English'} that will:
1. Grab attention in the first 2 lines
2. Provide value even without reading the full article
3. Encourage clicks to read the full blog post
4. Position Dinver as an authority in the restaurant/food space`;
  }
}

module.exports = LinkedInAgent;
