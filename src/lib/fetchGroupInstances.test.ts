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

  // Zod スキーマが usr_/grp_/authcookie_ + UUID(8-4-4-4-12 hex) の形式を要求するため、
  // テストでも有効な UUID 形式のダミー値を使用する。
  const baseOptions = {
    userId: 'usr_abcdef01-2345-6789-abcd-ef0123456789',
    groupId: 'grp_abcdef01-2345-6789-abcd-ef0123456789',
    authCookie: 'authcookie_abcdef01-2345-6789-abcd-ef0123456789',
  };
  const AUTH_COOKIE_HEADER = `auth=${baseOptions.authCookie}`;

  // 実 API のレスポンス形状を再現した mock helper。
  // 2026-04 時点で VRChat API が返す top-level は `{fetchedAt, instances: [...]}`
  // で、各 instance は worldId / world / displayName / name / userCount / capacity
  // / region / n_users などがフラットに並ぶ。
  const realResponse = (instances: unknown[]) => ({
    fetchedAt: '2026-04-19T06:45:00Z',
    instances,
  });

  it('VRChat API を auth Cookie 付きで叩き、実レスポンス形式から必要フィールドを抽出する', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          realResponse([
            {
              worldId: 'wrld_1',
              displayName: 'Untitled Tea Party',
              name: '51786',
              userCount: 18,
              n_users: 18,
              capacity: 64,
              region: 'jp',
              world: { id: 'wrld_1', name: 'Ever-changing City v5' },
            },
          ]),
        ),
        { status: 200 },
      ),
    );

    const result = await fetchGroupInstances(baseOptions);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.vrchat.cloud/api/1/users/${baseOptions.userId}/instances/groups/${baseOptions.groupId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: AUTH_COOKIE_HEADER,
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

  it('instances が空配列なら空リストを返す', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(realResponse([])), { status: 200 }),
    );
    expect(await fetchGroupInstances(baseOptions)).toEqual([]);
  });

  it('userCount が無い場合は n_users にフォールバックする', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          realResponse([
            {
              worldId: 'wrld_x',
              name: '1',
              n_users: 7,
              capacity: 16,
              region: 'us',
              world: { id: 'wrld_x', name: 'X' },
            },
          ]),
        ),
        { status: 200 },
      ),
    );
    const [inst] = await fetchGroupInstances(baseOptions);
    expect(inst.userCount).toBe(7);
  });

  it('top-level が配列の古い形式もフォールバックで受け入れる', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            worldId: 'wrld_legacy',
            name: '1',
            userCount: 1,
            capacity: 16,
            region: 'jp',
            world: { id: 'wrld_legacy', name: 'Legacy' },
          },
        ]),
        { status: 200 },
      ),
    );
    const result = await fetchGroupInstances(baseOptions);
    expect(result[0].worldId).toBe('wrld_legacy');
  });

  it('userId が VRChat の形式でなければ fetch 前にスキーマエラーを投げる', async () => {
    await expect(
      fetchGroupInstances({ ...baseOptions, userId: 'usr_abc' }),
    ).rejects.toThrow(/Invalid fetchGroupInstances options.*userId/);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('groupId が VRChat の形式でなければ fetch 前にスキーマエラーを投げる', async () => {
    await expect(
      fetchGroupInstances({ ...baseOptions, groupId: 'grp_xyz' }),
    ).rejects.toThrow(/Invalid fetchGroupInstances options.*groupId/);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('authCookie が authcookie_<uuid> 形式でなければ fetch 前にスキーマエラーを投げる', async () => {
    await expect(
      fetchGroupInstances({ ...baseOptions, authCookie: 'bad;value' }),
    ).rejects.toThrow(/Invalid fetchGroupInstances options.*authCookie/);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  // Cookie の値本体だけを登録する運用のため、`auth=` を含めて登録する
  // よくある設定ミスをスキーマ段階で弾けることを保証する
  it('authCookie に "auth=" プレフィックスが含まれていたら fetch 前にスキーマエラーを投げる', async () => {
    await expect(
      fetchGroupInstances({
        ...baseOptions,
        authCookie: `auth=${baseOptions.authCookie}`,
      }),
    ).rejects.toThrow(/Invalid fetchGroupInstances options.*authCookie/);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  // prefix ごとスキーマを分けているので、userId と groupId を取り違えた secret 登録は
  // runtime Zod で弾かれる（branded types の代替として働く）
  it('userId に grp_ プレフィックスの値を渡すと fetch 前にスキーマエラーを投げる', async () => {
    await expect(
      fetchGroupInstances({
        ...baseOptions,
        userId: baseOptions.groupId,
      }),
    ).rejects.toThrow(/Invalid fetchGroupInstances options.*userId/);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('groupId に usr_ プレフィックスの値を渡すと fetch 前にスキーマエラーを投げる', async () => {
    await expect(
      fetchGroupInstances({
        ...baseOptions,
        groupId: baseOptions.userId,
      }),
    ).rejects.toThrow(/Invalid fetchGroupInstances options.*groupId/);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('twoFactorAuthCookie を JWT で渡すと Cookie ヘッダに併送される', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(realResponse([])), { status: 200 }),
    );

    const jwt = 'aGVhZGVy.cGF5bG9hZA.c2ln';
    await fetchGroupInstances({
      ...baseOptions,
      twoFactorAuthCookie: jwt,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: `${AUTH_COOKIE_HEADER}; twoFactorAuth=${jwt}`,
        }),
      }),
    );
  });

  // ブラウザから Cookie をコピーしてくると base64url の末尾 `=` パディングが
  // 混入するケースがある。regex が `=*` で許容することを契約として固定しておく。
  it('twoFactorAuthCookie の各セグメントに = パディングがあっても許容する', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(realResponse([])), { status: 200 }),
    );

    const paddedJwt = 'aGVhZGVy==.cGF5bG9hZA==.c2ln==';
    await fetchGroupInstances({
      ...baseOptions,
      twoFactorAuthCookie: paddedJwt,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: `${AUTH_COOKIE_HEADER}; twoFactorAuth=${paddedJwt}`,
        }),
      }),
    );
  });

  it('twoFactorAuthCookie が未指定なら auth のみ送る', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(realResponse([])), { status: 200 }),
    );

    await fetchGroupInstances(baseOptions);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: AUTH_COOKIE_HEADER,
        }),
      }),
    );
  });

  it('twoFactorAuthCookie が空文字列なら auth のみ送る（未設定 secret の展開値を許容）', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(realResponse([])), { status: 200 }),
    );

    await fetchGroupInstances({ ...baseOptions, twoFactorAuthCookie: '' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: AUTH_COOKIE_HEADER }),
      }),
    );
  });

  it('twoFactorAuthCookie が JWT 形式でなければ fetch 前にスキーマエラーを投げる', async () => {
    await expect(
      fetchGroupInstances({
        ...baseOptions,
        twoFactorAuthCookie: 'bad;jwt',
      }),
    ).rejects.toThrow(
      /Invalid fetchGroupInstances options.*twoFactorAuthCookie/,
    );
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('worldId を持たないエントリは除外する', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          realResponse([
            { name: '1', userCount: 1 },
            {
              worldId: 'wrld_ok',
              name: '2',
              userCount: 2,
              capacity: 16,
              world: { id: 'wrld_ok', name: 'OK World' },
            },
          ]),
        ),
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

  it('想定外の形状（配列でも instances キーでもない）は例外を投げる', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'nope' }), { status: 200 }),
    );

    await expect(fetchGroupInstances(baseOptions)).rejects.toThrow(
      /unexpected response shape/,
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
