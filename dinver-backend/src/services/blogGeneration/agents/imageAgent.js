'use strict';

const BaseAgent = require('./baseAgent');
const OpenAI = require('openai');
const { uploadBufferToS3 } = require('../../../../utils/s3Upload');
const { v4: uuidv4 } = require('uuid');

/**
 * Image Agent - Generates featured images using DALL-E 3
 */
class ImageAgent extends BaseAgent {
  constructor() {
    super('ImageAgent', {
      stage: 'image',
      maxTokens: 1024,
      temperature: 0.6,
    });

    // Initialize OpenAI client for DALL-E
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Override execute to handle both prompt generation and image creation
   */
  async execute(input, blogTopicId) {
    const { BlogGenerationLog } = require('../../../../models');

    // Create log entry
    const log = await BlogGenerationLog.create({
      blogTopicId,
      stage: this.stage,
      agentName: this.name,
      inputData: this.sanitizeForLogging(input),
      status: 'started',
      startedAt: new Date(),
    });

    const startTime = Date.now();

    try {
      // Step 1: Generate DALL-E prompt using Claude
      console.log(`[${this.name}] Generating DALL-E prompt...`);
      const promptResult = await this.generateDallePrompt(input);

      // Step 2: Generate image with DALL-E 3
      console.log(`[${this.name}] Generating image with DALL-E 3...`);
      const imageUrl = await this.generateImage(promptResult.dallePrompt);

      // Step 3: Download and upload to S3
      console.log(`[${this.name}] Uploading to S3...`);
      const s3Key = await this.uploadToS3(imageUrl, blogTopicId);

      const duration = Date.now() - startTime;

      const output = {
        dallePrompt: promptResult.dallePrompt,
        altText: promptResult.altText,
        s3Key,
        imageUrl: s3Key, // For compatibility
      };

      // Update log
      await log.update({
        outputData: output,
        durationMs: duration,
        modelUsed: 'dall-e-3 + claude-sonnet',
        status: 'completed',
        completedAt: new Date(),
      });

      console.log(`[${this.name}] Completed in ${duration}ms`);
      return output;
    } catch (error) {
      const duration = Date.now() - startTime;

      await log.update({
        status: 'failed',
        errorMessage: error.message,
        durationMs: duration,
        completedAt: new Date(),
      });

      console.error(`[${this.name}] Failed:`, error.message);
      throw error;
    }
  }

  /**
   * Generate optimized DALL-E prompt using Claude
   */
  async generateDallePrompt(input) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: this.getSystemPrompt(),
      messages: [{ role: 'user', content: this.buildUserPrompt(input) }],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    let content = textContent.text.trim();

    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(content);
  }

  /**
   * Generate image using DALL-E 3
   */
  async generateImage(prompt) {
    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1792x1024', // Landscape for blog headers
      quality: 'hd',
      style: 'natural',
    });

    return response.data[0].url;
  }

  /**
   * Download image and upload to S3
   */
  async uploadToS3(imageUrl, blogTopicId) {
    // Download image from DALL-E URL
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const filename = `${blogTopicId}-${uuidv4()}-featured.jpg`;
    const s3Key = `blog_images/generated/${filename}`;

    // Upload to S3
    await uploadBufferToS3(buffer, s3Key, 'image/jpeg');

    return s3Key;
  }

  getSystemPrompt() {
    return `You are an expert at creating DALL-E 3 prompts for food and restaurant blog featured images.

**Your Task:**
Create an optimized DALL-E 3 prompt that will generate a beautiful, professional featured image for a blog post.

**Image Requirements:**
- Professional food/restaurant photography style
- Warm, inviting lighting
- High quality, editorial feel
- NO text, logos, or watermarks
- NO people's faces (to avoid AI face issues)
- NO copyrighted elements or brand names
- Landscape orientation (16:9 ratio)
- Suitable as blog header/featured image

**DALL-E Prompt Best Practices:**
- Be specific about composition, lighting, and mood
- Describe the scene, not just objects
- Include technical photography terms
- Specify "no text" to avoid text generation

**Output Format:**
Return a JSON object:
{
  "dallePrompt": "Detailed DALL-E 3 prompt (max 400 characters)...",
  "altText": {
    "hr": "Croatian alt text for accessibility",
    "en": "English alt text for accessibility"
  },
  "imageDescription": "Brief description of what the image will show"
}

**Important:**
- Keep prompt focused and specific
- Emphasize appetizing, professional quality
- Avoid anything that could be rejected by content policy`;
  }

  buildUserPrompt(input) {
    const hrTitle = input.editedContent?.hrContent?.title || input.draftHr?.title || input.topic.title;
    const enTitle = input.editedContent?.enContent?.title || input.draftEn?.title || input.topic.title;

    return `Create a DALL-E 3 prompt for a featured image for this blog:

**Topic:** ${input.topic.title}
**Type:** ${input.topic.topicType}

**Croatian Title:** ${hrTitle}
**English Title:** ${enTitle}

**Content Summary:**
${input.draftHr?.excerpt || input.editedContent?.hrContent?.excerpt || 'N/A'}

**Key Themes from Research:**
${input.research?.marketInsights?.slice(0, 2).join(', ') || 'Food, restaurants, dining'}

Create a prompt that will generate a stunning, professional featured image that captures the essence of this blog topic. The image should be appetizing, inviting, and perfect for a food/restaurant blog.`;
  }
}

module.exports = ImageAgent;
