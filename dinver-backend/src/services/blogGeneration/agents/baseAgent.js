'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { BlogGenerationLog } = require('../../../../models');

/**
 * Base Agent class for all blog generation agents
 * Provides common functionality for Claude API calls, logging, and error handling
 */
class BaseAgent {
  constructor(name, options = {}) {
    this.name = name;
    this.stage = options.stage;
    this.model = options.model || 'claude-sonnet-4-5-20250929';
    this.maxTokens = options.maxTokens || 4096;
    this.temperature = options.temperature || 0.7;

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: process.env.AI_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Execute the agent with input data
   * @param {Object} input - Input data for the agent
   * @param {string} blogTopicId - Blog topic ID for logging
   * @returns {Promise<Object>} - Agent output
   */
  async execute(input, blogTopicId) {
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
      // Call Claude API
      const response = await this.callLLM(input);
      const duration = Date.now() - startTime;

      // Update log with success
      await log.update({
        outputData: this.sanitizeForLogging(response.output),
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        durationMs: duration,
        modelUsed: this.model,
        status: 'completed',
        completedAt: new Date(),
      });

      console.log(`[${this.name}] Completed in ${duration}ms, tokens: ${response.usage?.input_tokens || 0} in / ${response.usage?.output_tokens || 0} out`);

      return response.output;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Update log with failure
      await log.update({
        status: 'failed',
        errorMessage: error.message,
        durationMs: duration,
        completedAt: new Date(),
      });

      console.error(`[${this.name}] Failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Call Claude API with the given input
   * @param {Object} input - Input data
   * @returns {Promise<{output: Object, usage: Object}>}
   */
  async callLLM(input) {
    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    console.log(`[${this.name}] Calling Claude API...`);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text content
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    // Parse JSON from response
    let content = textContent.text.trim();

    // Remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let output;
    try {
      output = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON object from the response if there's extra text
      console.log(`[${this.name}] Initial JSON parse failed, attempting extraction...`);

      // Find the first { and match to its closing }
      const jsonMatch = this.extractJsonObject(content);
      if (jsonMatch) {
        try {
          output = JSON.parse(jsonMatch);
          console.log(`[${this.name}] Successfully extracted JSON from response`);
        } catch (extractError) {
          // Log the problematic area for debugging
          const errorPos = extractError.message.match(/position (\d+)/)?.[1];
          if (errorPos) {
            const pos = parseInt(errorPos);
            const context = jsonMatch.substring(Math.max(0, pos - 100), Math.min(jsonMatch.length, pos + 100));
            console.error(`[${this.name}] JSON error at position ${pos}:`, context);
          }
          console.error(`[${this.name}] Failed to parse extracted JSON:`, jsonMatch.substring(0, 500));
          throw new Error(`Invalid JSON response from Claude: ${extractError.message}`);
        }
      } else {
        console.error(`[${this.name}] Failed to parse JSON response:`, content.substring(0, 500));
        throw new Error(`Invalid JSON response from Claude: ${parseError.message}`);
      }
    }

    return {
      output,
      usage: response.usage,
    };
  }

  /**
   * Get the system prompt for this agent
   * Override in subclasses
   * @returns {string}
   */
  getSystemPrompt() {
    throw new Error('getSystemPrompt must be implemented by subclass');
  }

  /**
   * Build the user prompt from input data
   * Override in subclasses
   * @param {Object} input
   * @returns {string}
   */
  buildUserPrompt(input) {
    throw new Error('buildUserPrompt must be implemented by subclass');
  }

  /**
   * Extract JSON object from text that may contain extra content
   * @param {string} text - Text that may contain a JSON object
   * @returns {string|null} - Extracted JSON string or null
   */
  extractJsonObject(text) {
    const startIndex = text.indexOf('{');
    if (startIndex === -1) return null;

    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            return text.substring(startIndex, i + 1);
          }
        }
      }
    }

    return null;
  }

  /**
   * Sanitize data for logging (remove very large content)
   * @param {Object} data
   * @returns {Object}
   */
  sanitizeForLogging(data) {
    if (!data) return data;

    const sanitized = { ...data };

    // Truncate very long strings
    for (const key of Object.keys(sanitized)) {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 10000) {
        sanitized[key] = sanitized[key].substring(0, 10000) + '... [truncated]';
      }
    }

    return sanitized;
  }
}

module.exports = BaseAgent;
