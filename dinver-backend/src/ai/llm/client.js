'use strict';

const OpenAI = require('openai');

/**
 * AI Client - wrapper for OpenAI API with strict JSON output
 * Handles both router (JSON mode) and agent (function calling) scenarios
 */

class AIClient {
  constructor(config = {}) {
    const timeout = config.timeout || parseInt(process.env.AI_TIMEOUT_MS) || 15000;

    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      timeout: timeout, // Set timeout on the client level
    });
    this.model = config.model || process.env.AI_MODEL || "gpt-4o-mini";
  }

  /**
   * Get strict JSON response from the model
   * Used for router intent classification
   * @param {string} systemPrompt - System instructions
   * @param {string} userMessage - User message
   * @param {object} schema - Zod schema for validation (optional)
   * @param {Array} conversationHistory - Previous messages for context (optional)
   * @returns {Promise<object>} Parsed and validated JSON
   */
  async getJSON(systemPrompt, userMessage, schema = null, conversationHistory = []) {
    try {
      // Build messages array with conversation history
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Empty response from AI');
      }

      const parsed = JSON.parse(content);

      // Validate with Zod schema if provided
      if (schema) {
        return schema.parse(parsed);
      }

      return parsed;
    } catch (error) {
      if (error.name === 'ZodError') {
        console.error('Schema validation error:', error.errors);
        throw new Error(`Invalid AI response format: ${error.message}`);
      }
      console.error('AIClient getJSON error:', error);
      throw error;
    }
  }

  /**
   * Get response with function calling capability
   * Used for agent tool selection and execution
   * @param {string} systemPrompt - System instructions
   * @param {Array} messages - Conversation messages
   * @param {Array} tools - Available tools in OpenAI format
   * @param {string} toolChoice - 'auto' | 'none' | specific tool
   * @returns {Promise<object>} Completion response with potential tool calls
   */
  async getChatCompletion(systemPrompt, messages, tools = null, toolChoice = 'auto') {
    try {
      const params = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.3,
      };

      if (tools && tools.length > 0) {
        params.tools = tools;
        params.tool_choice = toolChoice;
      }

      const completion = await this.client.chat.completions.create(params);
      return completion;
    } catch (error) {
      console.error('AIClient getChatCompletion error:', error);
      throw error;
    }
  }

  /**
   * Get streaming response (future enhancement for real-time UX)
   * @param {string} systemPrompt
   * @param {Array} messages
   * @returns {Promise<Stream>}
   */
  async getStreamingCompletion(systemPrompt, messages) {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.3,
        stream: true,
      });

      return stream;
    } catch (error) {
      console.error('AIClient streaming error:', error);
      throw error;
    }
  }

  /**
   * Get plain text response (for response generation)
   * @param {string} systemPrompt - System instructions
   * @param {string} userMessage - User message with context
   * @returns {Promise<string>} Generated text response
   */
  async getText(systemPrompt, userMessage) {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4, // Slightly higher for more natural responses
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Empty response from AI');
      }

      return content;
    } catch (error) {
      console.error('AIClient getText error:', error);
      throw error;
    }
  }
}

module.exports = AIClient;
