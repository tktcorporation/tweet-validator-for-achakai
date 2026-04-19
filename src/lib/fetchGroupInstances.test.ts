import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type GroupInstance,
  fetchGroupInstances,
  formatGroupInstancesMessage,
} from './fetchGroupInstances';

describe('fetchGroupInstances', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const baseOptions = {
    userId: 'usr_abc',
    groupId: 'grp_xyz',
    authCookie: 'authcookie_val',
    twoFactorAuthCookie: 'twofa_val',
  };

  it('VRChat API を Cookie 付きで叩き、必要フィールドを抽出する', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            fetchedAt: '2026-04-19T06:45:00Z',
            instance: {
              worldId: 'wrld_1',
              displayName: 'Untitled Tea Party',
              name: '51786',
              userCount: 18,
              capacity: 64,
              region: 'jp',
              world: { id: 'wrld_1', name: 'Ever-changing City v5' },
            },
          },
        ]),
        { status: 200 },
      ),
    );

    const result = await fetchGroupInstances(baseOptions);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://vrchat.com/api/1/users/usr_abc/instances/groups/grp_xyz',
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: 'auth=authcookie_val; twoFactorAuth=twofa_val',
        }),
      }),
    );
    expect(result).toEqual<GroupInstance[]>([
      {
        worldId: 'wrld_1',
        worldName: 'Ever-changing City v5',
        displayName: 'Untitled Tea Party',
        name: '51786',
        userCount: 18,
        capacity: 64,
        region: 'jp',
      },
    ]);
  });

  it('instance.worldId が無くても entry.world.id からフォールバック取得する', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            world: { id: 'wrld_from_entry', name: 'From Entry World' },
            instance: {
              name: '42',
              userCount: 3,
              capacity: 32,
              region: 'eu',
            },
          },
        ]),
        { status: 200 },
      ),
    );
    const result = await fetchGroupInstances(baseOptions);
    expect(result).toEqual<GroupInstance[]>([
      {
        worldId: 'wrld_from_entry',
        worldName: 'From Entry World',
        displayName: '',
        name: '42',
        userCount: 3,
        capacity: 32,
        region: 'eu',
      },
    ]);
  });

  it('Cookie 値にセミコロンが含まれていたら例外を投げる', async () => {
    await expect(
      fetchGroupInstances({ ...baseOptions, authCookie: 'bad;value' }),
    ).rejects.toThrow(/Cookie value must not contain/);
    // セミコロンチェックは fetch 前で行う
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('worldId を持たないエントリは除外する', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { instance: { name: '1', userCount: 1 } },
          {
            instance: {
              worldId: 'wrld_ok',
              name: '2',
              userCount: 2,
              capacity: 16,
              world: { id: 'wrld_ok', name: 'OK World' },
            },
          },
        ]),
        { status: 200 },
      ),
    );

    const result = await fetchGroupInstances(baseOptions);
    expect(result).toHaveLength(1);
    expect(result[0].worldId).toBe('wrld_ok');
  });

  it('非 2xx は例外を投げる', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('unauthorized', { status: 401 }),
    );

    await expect(fetchGroupInstances(baseOptions)).rejects.toThrow(/401/);
  });

  it('配列以外が返ったら例外を投げる', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'nope' }), { status: 200 }),
    );

    await expect(fetchGroupInstances(baseOptions)).rejects.toThrow(/non-array/);
  });

  it('ユーザーID・グループIDを URL エンコードする', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await fetchGroupInstances({
      ...baseOptions,
      userId: 'usr a/b',
      groupId: 'grp x',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://vrchat.com/api/1/users/usr%20a%2Fb/instances/groups/grp%20x',
      expect.any(Object),
    );
  });
});

describe('formatGroupInstancesMessage', () => {
  const fixed = new Date('2026-04-19T06:45:00Z');

  it('0 件なら「0件でした」を含む', () => {
    const msg = formatGroupInstancesMessage([], fixed);
    expect(msg).toContain('0件でした');
    expect(msg).toContain('<t:');
  });

  it('複数インスタンスをワールド別にグルーピングする', () => {
    const instances: GroupInstance[] = [
      {
        worldId: 'wrld_1',
        worldName: 'Ever-changing City v5',
        displayName: 'Untitled Tea Party',
        name: '51786',
        userCount: 18,
        capacity: 64,
        region: 'jp',
      },
      {
        worldId: 'wrld_1',
        worldName: 'Ever-changing City v5',
        displayName: '',
        name: '33690',
        userCount: 21,
        capacity: 64,
        region: 'jp',
      },
      {
        worldId: 'wrld_2',
        worldName: 'Another World',
        displayName: '',
        name: '99999',
        userCount: 5,
        capacity: 32,
        region: 'us',
      },
    ];

    const msg = formatGroupInstancesMessage(instances, fixed);

    expect(msg).toContain(
      'Ever-changing City v5 — 2 インスタンス / 合計 39 人',
    );
    expect(msg).toContain('• Untitled Tea Party — 18/64 (JP)');
    expect(msg).toContain('• #33690 — 21/64 (JP)');
    expect(msg).toContain('Another World — 1 インスタンス / 合計 5 人');
    expect(msg).toContain('• #99999 — 5/32 (US)');
  });

  it('displayName が空なら #name をフォールバックに使う', () => {
    const msg = formatGroupInstancesMessage(
      [
        {
          worldId: 'wrld_1',
          worldName: 'W',
          displayName: '',
          name: '12345',
          userCount: 1,
          capacity: 16,
          region: 'jp',
        },
      ],
      fixed,
    );
    expect(msg).toContain('• #12345');
  });

  it('Discord タイムスタンプ記法を含む', () => {
    const msg = formatGroupInstancesMessage([], fixed);
    const unix = Math.floor(fixed.getTime() / 1000);
    expect(msg).toContain(`<t:${unix}:F>`);
  });

  it('Discord 2000文字制限を超えたら省略マーカー付きで切り詰める', () => {
    // 20ワールド × 各10インスタンスで確実に 2000 超
    const instances: GroupInstance[] = [];
    for (let w = 0; w < 20; w++) {
      for (let i = 0; i < 10; i++) {
        instances.push({
          worldId: `wrld_${w}`,
          worldName: `World Name Number ${w}`,
          displayName: `Some Long Instance Display Name ${w}-${i}`,
          name: String(10000 + i),
          userCount: 10,
          capacity: 64,
          region: 'jp',
        });
      }
    }
    const msg = formatGroupInstancesMessage(instances, fixed);
    expect([...msg].length).toBeLessThanOrEqual(2000);
    expect(msg).toMatch(/…\(省略\)$/);
  });
});
