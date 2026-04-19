/**
 * VRChat API ワールド情報プロキシ。
 *
 * 背景: ブラウザから https://vrchat.com/api/1/worlds/{id} を直接呼ぶと
 * - CORS で弾かれる（vrchat.com オリジンにしか Access-Control-Allow-Origin が付かない）
 * - ブラウザは User-Agent を上書きできないが、VRChat API は適切な UA がないと 403 を返す
 * という二重の理由でレスポンスを読めない。同一オリジンのこの Netlify Function を挟むことで
 * サーバーサイドから UA 付きで呼び、結果をフロントへ返す。
 *
 * 呼び出し元: src/lib/fetchVRChatWorld.ts
 * デプロイ先: /.netlify/functions/vrchat-world
 */

const WORLD_ID_PATTERN = /^wrld_[a-zA-Z0-9-]+$/;

// VRChat 非公式 API では連絡先（リポジトリ URL）を UA に載せるのが慣例
const USER_AGENT =
  'tweet-validator-for-achakai/1.0 (+https://github.com/tktcorporation/tweet-validator-for-achakai)';

export default async (req: Request): Promise<Response> => {
  const worldId = new URL(req.url).searchParams.get('id');

  if (!worldId || !WORLD_ID_PATTERN.test(worldId)) {
    return jsonResponse({ error: 'invalid world id' }, 400);
  }

  try {
    const upstream = await fetch(`https://vrchat.com/api/1/worlds/${worldId}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!upstream.ok) {
      return jsonResponse(
        { error: 'upstream error', status: upstream.status },
        upstream.status,
      );
    }

    const data = await upstream.json();
    return jsonResponse(data, 200, {
      // ワールド情報は頻繁には変わらないため 1 時間ブラウザ/エッジキャッシュ
      'Cache-Control': 'public, max-age=3600',
    });
  } catch {
    // ネットワーク障害・DNS 失敗等。呼び出し元は 502 を !ok として null フォールバックする。
    // 内部エラー詳細はレスポンスに載せない（インフラ情報の漏洩防止）
    return jsonResponse({ error: 'fetch failed' }, 502);
  }
};

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}
