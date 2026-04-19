import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractVRChatWorldId, fetchVRChatWorldInfo } from './fetchVRChatWorld';

describe('extractVRChatWorldId', () => {
  it('標準的なVRChat URLからワールドIDを抽出する', () => {
    const url =
      'https://vrchat.com/home/world/wrld_12345678-1234-1234-1234-123456789abc';
    expect(extractVRChatWorldId(url)).toBe(
      'wrld_12345678-1234-1234-1234-123456789abc',
    );
  });

  it('vrchat.com 以外のURLは null を返す', () => {
    expect(
      extractVRChatWorldId('https://example.com/world/wrld_abc'),
    ).toBeNull();
  });

  it('ワールドID形式でないURLは null を返す', () => {
    expect(
      extractVRChatWorldId('https://vrchat.com/home/user/usr_abc'),
    ).toBeNull();
  });

  it('空文字は null を返す', () => {
    expect(extractVRChatWorldId('')).toBeNull();
  });
});

describe('fetchVRChatWorldInfo', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('Netlify Function 経由でワールド情報を取得する', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: 'Test World',
          description: 'desc',
          imageUrl: 'https://example.com/img.png',
          authorName: 'Author',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const info = await fetchVRChatWorldInfo('wrld_abc-123');

    expect(mockFetch).toHaveBeenCalledWith(
      '/.netlify/functions/vrchat-world?id=wrld_abc-123',
      expect.any(Object),
    );
    expect(info).toEqual({
      name: 'Test World',
      description: 'desc',
      imageUrl: 'https://example.com/img.png',
      authorName: 'Author',
    });
  });

  it('Function が非 2xx を返したら null', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('', { status: 502 }),
    );
    expect(await fetchVRChatWorldInfo('wrld_abc')).toBeNull();
  });

  it('fetch が throw したら null', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError('network'));
    expect(await fetchVRChatWorldInfo('wrld_abc')).toBeNull();
  });

  it('ワールドIDは URL エンコードされる', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    await fetchVRChatWorldInfo('wrld_abc def');
    expect(mockFetch).toHaveBeenCalledWith(
      '/.netlify/functions/vrchat-world?id=wrld_abc%20def',
      expect.any(Object),
    );
  });
});
