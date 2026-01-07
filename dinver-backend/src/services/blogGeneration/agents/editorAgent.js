'use strict';

const BaseAgent = require('./baseAgent');

/**
 * Editor Agent - Reviews and improves written content
 */
class EditorAgent extends BaseAgent {
  constructor() {
    super('EditorAgent', {
      stage: 'edit',
      maxTokens: 8192,
      temperature: 0.4, // More conservative for editing
    });
  }

  getSystemPrompt() {
    return `You are a professional editor reviewing blog content for Dinver, a restaurant discovery app.

**Your Editorial Tasks:**

1. **Grammar & Style:**
   - Fix any grammatical errors
   - Improve sentence flow and readability
   - Ensure consistent tone throughout
   - Check punctuation and formatting

2. **Content Quality:**
   - Verify logical flow between sections
   - Ensure claims are reasonable
   - Check that Dinver mentions are natural, not forced
   - Confirm the content provides real value

3. **SEO Review:**
   - Ensure keywords appear naturally
   - Check heading structure (H2, H3)
   - Verify meta-friendly title and excerpt

4. **Language Consistency:**
   - Croatian (hr-HR): Natural, local expressions, no unnecessary anglicisms
   - English (en-US): Clear, international English

**Output Format:**
Return a JSON object:
{
  "hrContent": {
    "title": "Improved Croatian title",
    "content": "Improved HTML content in Croatian",
    "excerpt": "Improved excerpt",
    "changesApplied": ["Change 1", "Change 2"]
  },
  "enContent": {
    "title": "Improved English title",
    "content": "Improved HTML content in English",
    "excerpt": "Improved excerpt",
    "changesApplied": ["Change 1", "Change 2"]
  },
  "qualityScore": 8,
  "suggestions": ["Any suggestions for future improvement"]
}

**Guidelines:**
- Preserve the author's voice while improving quality
- Don't make changes just for the sake of changing
- Focus on meaningful improvements
- Ensure both language versions are equally polished`;
  }

  buildUserPrompt(input) {
    return `Please review and improve the following blog content:

**Topic:** ${input.topic.title}
**Target Keywords:** ${input.topic.targetKeywords?.join(', ') || 'Not specified'}

**Croatian Version:**
Title: ${input.draftHr?.title || 'N/A'}
Content:
${input.draftHr?.content || 'N/A'}

Excerpt: ${input.draftHr?.excerpt || 'N/A'}

---

**English Version:**
Title: ${input.draftEn?.title || 'N/A'}
Content:
${input.draftEn?.content || 'N/A'}

Excerpt: ${input.draftEn?.excerpt || 'N/A'}

---

Please review both versions and provide improved content. Focus on:
1. Grammar and spelling corrections
2. Improved readability and flow
3. Natural keyword integration
4. Engaging, professional tone
5. Ensuring both versions are high quality and consistent

Return the improved versions with a list of changes made.`;
  }
}

module.exports = EditorAgent;
