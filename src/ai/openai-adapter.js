const DEFAULT_SYSTEM_PROMPT = '';

/**
 * OpenAI 兼容接口 adapter
 */
export function createOpenAiCompatibleAdapter({
  baseUrl,
  apiKey,
  model,
  fetch: fetchImpl = globalThis.fetch,
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
}) {
  return {
    async complete(prompt) {
      if (!apiKey) {
        throw new Error('未配置AI API Key，请在 .env 文件中设置 AI_API_KEY');
      }

      if (!fetchImpl) {
        throw new Error('当前运行环境不支持 fetch');
      }

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API 请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    },
  };
}
