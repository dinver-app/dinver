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
      console.error(`[${this.name}] Failed to parse JSON response:`, content.substring(0, 500));
      throw new Error(`Invalid JSON response from Claude: ${parseError.message}`);
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
