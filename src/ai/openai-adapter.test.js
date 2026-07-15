import { describe, it, expect, vi } from 'vitest';
import { createOpenAiCompatibleAdapter } from './openai-adapter.js';

function createAdapter(fetchImpl, overrides = {}) {
  return createOpenAiCompatibleAdapter({
    baseUrl: 'https://ai.example/v1',
    apiKey: 'test-key',
    model: 'test-model',
    fetch: fetchImpl,
    ...overrides,
  });
}

describe('createOpenAiCompatibleAdapter', () => {
  it('调用 OpenAI 兼容 chat completions 并返回内容', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'AI 内容' } }],
      }),
    }));
    const adapter = createAdapter(fetchImpl, {
      systemPrompt: '系统提示',
    });

    const result = await adapter.complete('用户提示');

    expect(result).toBe('AI 内容');
    expect(fetchImpl).toHaveBeenCalledWith('https://ai.example/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: expect.any(String),
    });

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toEqual({
      model: 'test-model',
      messages: [
        { role: 'system', content: '系统提示' },
        { role: 'user', content: '用户提示' },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    });
  });

  it('没有 systemPrompt 时只发送 user message', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [] }),
    }));
    const adapter = createAdapter(fetchImpl);

    const result = await adapter.complete('用户提示');

    expect(result).toBe('');
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.messages).toEqual([{ role: 'user', content: '用户提示' }]);
  });

  it('无 API key 时抛错且不发请求', async () => {
    const fetchImpl = vi.fn();
    const adapter = createAdapter(fetchImpl, { apiKey: '' });

    await expect(adapter.complete('用户提示')).rejects.toThrow('未配置AI API Key');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('HTTP 错误时抛出状态码与响应内容', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));
    const adapter = createAdapter(fetchImpl);

    await expect(adapter.complete('用户提示')).rejects.toThrow(
      'AI API 请求失败: 500 - Internal Server Error'
    );
  });
});
