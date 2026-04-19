/**
 * VRChat API からワールド情報を取得するユーティリティ。
 *
 * 背景: スプレッドシートのURL欄に記録された VRChat ワールドURLから
 * ワールドの説明文・サムネイル等を取得し、画面に表示する。
 * ブラウザから VRChat API を直接叩くと CORS と UA 要件で失敗するため、
 * 同一オリジンの Netlify Function (netlify/functions/vrchat-world.ts) 経由で呼ぶ。
 * 取得に失敗した場合は null を返し、呼び出し元はシート記載の説明にフォールバックする。
 */

export interface VRChatWorldInfo {
  /** ワールド名（スプレッドシートの値と一致確認用） */
  name: string;
  /** ワールドの説明文 */
  description: string;
  /** サムネイル画像URL */
  imageUrl: string;
  /** 作者の表示名 */
  authorName: string;
}

/**
 * VRChat ワールドURL からワールドIDを抽出する。
 * 対応URL形式: https://vrchat.com/home/world/wrld_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *
 * 削除判断: fetchVRChatWorldInfo が不要になれば一緒に削除可能。
 */
export function extractVRChatWorldId(url: string): string | null {
  const match = url.match(/vrchat\.com\/home\/world\/(wrld_[a-zA-Z0-9-]+)/);
  return match?.[1] ?? null;
}

/**
 * VRChat API からワールド情報を取得する。
 *
 * 実体のリクエストは同一オリジンの Netlify Function が行う
 * （直接叩くと CORS/UA 要件で失敗するため。詳細は netlify/functions/vrchat-world.ts）。
 * プロキシが 4xx/5xx を返すか、ローカル dev 等で Function が存在しない場合は null を返す。
 *
 * 呼び出し元: src/hooks/useTweetState.ts (thisWeekEntry.worldUrl 変化時)
 */
export async function fetchVRChatWorldInfo(
  worldId: string,
): Promise<VRChatWorldInfo | null> {
  try {
    const res = await fetch(
      `/.netlify/functions/vrchat-world?id=${encodeURIComponent(worldId)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.name ?? '',
      description: data.description ?? '',
      imageUrl: data.imageUrl ?? '',
      authorName: data.authorName ?? '',
    };
  } catch {
    // Function 未デプロイ/ネットワーク障害等はすべて null で返し、シート値へフォールバック
    return null;
  }
}
