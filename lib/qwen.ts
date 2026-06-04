export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QwenCompletionOptions {
  model?: string;
  messages: QwenMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface QwenCompletionResponse {
  content: { type: 'text'; text: string }[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export class QwenClient {
  private apiKey: string;
  private baseUrl: string;
  private isOpenRouter: boolean = false;

  constructor() {
    this.apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
    this.isOpenRouter = this.apiKey.startsWith('sk-or-');
    
    this.baseUrl = process.env.DASHSCOPE_BASE_URL || 
      (this.isOpenRouter 
        ? 'https://openrouter.ai/api/v1' 
        : 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1');
  }

  async createCompletion(options: QwenCompletionOptions): Promise<QwenCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY environment variable is not defined.');
    }

    // Adapt model naming convention between DashScope and OpenRouter
    const defaultModel = this.isOpenRouter ? 'qwen/qwen3.7-max' : 'qwen-3.7-max';
    const model = options.model === 'qwen-3.7-max' ? defaultModel : (options.model || defaultModel);
    const messages = options.messages;
    const max_tokens = options.max_tokens || 4000;
    const temperature = options.temperature ?? 0.7;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    // OpenRouter requirements
    if (this.isOpenRouter) {
      headers['HTTP-Referer'] = 'https://ronsuite-os.local';
      headers['X-Title'] = 'RonSuite OS';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Qwen API error ${response.status}: ${text}`);
    }

    const data = await response.json() as any;
    const textContent = data.choices?.[0]?.message?.content || '';
    
    return {
      content: [{ type: 'text', text: textContent }],
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      }
    };
  }
}

export const qwen = new QwenClient();
