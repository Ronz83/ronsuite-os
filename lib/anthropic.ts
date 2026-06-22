// lib/anthropic.ts — Duck-typed OpenRouter client wrapper mapping to Anthropic API patterns.
// This allows transparent routing of all Claude/Haiku/Opus calls through OpenRouter.

// Helper to map model names to OpenRouter
function mapModel(modelName: string): string {
  const modelLower = modelName.toLowerCase();
  if (modelLower.includes('claude-3.5-sonnet') || modelLower.includes('claude-3-5-sonnet') || modelLower.includes('sonnet-latest') || modelLower.includes('sonnet-4.6')) {
    return 'anthropic/claude-sonnet-4.6';
  }
  if (modelLower.includes('haiku')) {
    return 'anthropic/claude-3.5-haiku';
  }
  if (modelLower.includes('opus')) {
    return 'anthropic/claude-opus-4.8';
  }
  if (modelLower.includes('qwen')) {
    return 'qwen/qwen3.7-max';
  }
  if (
    modelLower.startsWith('anthropic/') ||
    modelLower.startsWith('qwen/') ||
    modelLower.startsWith('google/') ||
    modelLower.startsWith('meta-llama/')
  ) {
    return modelName;
  }
  return 'anthropic/claude-sonnet-4.6';
}

// Map Anthropic-style messages array (which might contain block content arrays) to OpenAI-style message format
function mapMessagesToOpenAi(messages: any[]): any[] {
  const mapped: any[] = [];
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      mapped.push({ role: msg.role, content: msg.content });
      continue;
    }

    if (Array.isArray(msg.content)) {
      let text = '';
      const toolCalls: any[] = [];
      const toolResults: any[] = [];
      const imageBlocks: any[] = [];

      for (const block of msg.content) {
        if (block.type === 'text') {
          text += block.text;
        } else if (block.type === 'image_url') {
          imageBlocks.push(block);
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: typeof block.input === 'string' ? block.input : JSON.stringify(block.input)
            }
          });
        } else if (block.type === 'tool_result') {
          toolResults.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content)
          });
        }
      }

      if (imageBlocks.length > 0) {
        const contentArray = [];
        if (text) {
          contentArray.push({ type: 'text', text });
        }
        contentArray.push(...imageBlocks);

        const item: any = { role: msg.role, content: contentArray };
        if (toolCalls.length > 0) {
          item.tool_calls = toolCalls;
        }
        mapped.push(item);
      } else if (toolResults.length > 0) {
        for (const tr of toolResults) {
          // Find function name from previous messages
          let name = '';
          for (let i = mapped.length - 1; i >= 0; i--) {
            if (mapped[i].tool_calls) {
              const matched = mapped[i].tool_calls.find((tc: any) => tc.id === tr.tool_call_id);
              if (matched) {
                name = matched.function.name;
                break;
              }
            }
          }
          mapped.push({ ...tr, name: name || 'tool' });
        }
      } else {
        const item: any = { role: msg.role };
        if (text) {
          item.content = text;
        }
        if (toolCalls.length > 0) {
          item.tool_calls = toolCalls;
        }
        mapped.push(item);
      }
    } else if (typeof msg.content === 'object' && msg.content !== null) {
      mapped.push({ role: msg.role, content: msg.content });
    } else {
      mapped.push({ role: msg.role, content: String(msg.content) });
    }
  }
  return mapped;
}

// Simple Async Generator to mimic Anthropic stream
async function* streamOpenRouter(messages: any[], model: string, maxTokens: number, system?: string, tools?: any[]) {
  const isHermes = !!process.env.HERMES_ENDPOINT;
  const baseUrl = process.env.HERMES_ENDPOINT || 'https://openrouter.ai/api/v1';
  const apiKey = isHermes ? process.env.HERMES_API_KEY : process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(`API key missing for ${isHermes ? 'Hermes Agent' : 'OpenRouter'}.`);
  }

  const payload: any = {
    model,
    messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
    max_tokens: maxTokens,
    temperature: 0.7,
    stream: true
  };

  if (tools && tools.length > 0) {
    payload.tools = tools.map((t: any) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema
      }
    }));
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  if (!isHermes) {
    headers['HTTP-Referer'] = 'https://ronsuite-os.local';
    headers['X-Title'] = 'RonSuite OS';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter stream error ${response.status}: ${text}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let activeToolCall = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;

            if (delta?.content) {
              yield {
                type: 'content_block_delta',
                index: 0,
                delta: {
                  type: 'text_delta',
                  text: delta.content
                }
              };
            }

            if (delta?.tool_calls && delta.tool_calls.length > 0) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name) {
                  activeToolCall = true;
                  yield {
                    type: 'content_block_start',
                    index: 0,
                    content_block: {
                      type: 'tool_use',
                      id: tc.id || `call_${Math.random().toString(36).slice(2)}`,
                      name: tc.function.name
                    }
                  };
                }
                if (tc.function?.arguments) {
                  yield {
                    type: 'content_block_delta',
                    index: 0,
                    delta: {
                      type: 'input_json_delta',
                      partial_json: tc.function.arguments
                    }
                  };
                }
              }
            }
          } catch (e) {
            // Ignore JSON parse errors for incomplete/split chunks
          }
        }
      }
    }

    if (activeToolCall) {
      yield {
        type: 'content_block_stop',
        index: 0
      };
    }
  } finally {
    reader.releaseLock();
  }
}

async function createNonStream(messages: any[], model: string, maxTokens: number, system?: string, tools?: any[]) {
  const isHermes = !!process.env.HERMES_ENDPOINT;
  const baseUrl = process.env.HERMES_ENDPOINT || 'https://openrouter.ai/api/v1';
  const apiKey = isHermes ? process.env.HERMES_API_KEY : process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(`API key missing for ${isHermes ? 'Hermes Agent' : 'OpenRouter'}.`);
  }

  const payload: any = {
    model,
    messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
    max_tokens: maxTokens,
    temperature: 0.7
  };

  if (tools && tools.length > 0) {
    payload.tools = tools.map((t: any) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema
      }
    }));
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  if (!isHermes) {
    headers['HTTP-Referer'] = 'https://ronsuite-os.local';
    headers['X-Title'] = 'RonSuite OS';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${text}`);
  }

  const data = await response.json() as any;
  const choice = data.choices?.[0];
  const responseMessage = choice?.message;
  const textContent = responseMessage?.content || '';

  const anthropicContent: any[] = [];
  if (textContent) {
    anthropicContent.push({
      type: 'text',
      text: textContent
    });
  }

  if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
    for (const tc of responseMessage.tool_calls) {
      anthropicContent.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments || '{}')
      });
    }
  }

  return {
    id: data.id || `msg_${Math.random().toString(36).slice(2)}`,
    model,
    role: 'assistant',
    content: anthropicContent,
    stop_reason: choice?.finish_reason === 'tool_calls' ? 'tool_use' : choice?.finish_reason,
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0
    }
  };
}

export const anthropic = {
  messages: {
    async create(options: {
      model: string;
      max_tokens?: number;
      messages: any[];
      system?: string;
      tools?: any[];
      stream?: boolean;
    }): Promise<any> {
      const model = mapModel(options.model);
      const mappedMessages = mapMessagesToOpenAi(options.messages);
      const maxTokens = options.max_tokens || 4000;

      if (options.stream) {
        return streamOpenRouter(mappedMessages, model, maxTokens, options.system, options.tools);
      } else {
        return createNonStream(mappedMessages, model, maxTokens, options.system, options.tools);
      }
    }
  }
};

export const MODEL = 'anthropic/claude-3.5-sonnet';
export const MAX_TOKENS = 4000;
