/**
 * VRChat API からワールド情報を取得するユーティリティ。
 *
 * 背景: スプレッドシートのURL欄に記録された VRChat ワールドURLから
 * ワールドの説明文・サムネイル等を取得し、画面に表示する。
 * VRChat API は認証が必要なため、ブラウザから直接アクセスできない場合がある。
 * その際は null を返してフォールバック表示に任せる。
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
 * VRChat API (api.vrchat.cloud) は認証Cookie が必要。
 * credentials: 'include' で VRChat ウェブのセッションを利用できる場合がある。
 * CORS またはセッション未ログイン時は null を返す（呼び出し元が適切に処理すること）。
 *
 * 呼び出し元: src/hooks/useTweetState.ts (thisWeekEntry.worldUrl 変化時)
 */
export async function fetchVRChatWorldInfo(
  worldId: string,
): Promise<VRChatWorldInfo | null> {
  try {
    const res = await fetch(
      `https://api.vrchat.cloud/api/1/worlds/${worldId}`,
      {
        // VRChat ウェブでログイン済みであれば Cookie が送信される
        credentials: 'include',
        headers: { Accept: 'application/json' },
      },
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
    // CORS エラー・ネットワークエラー等はすべて null で返す
    return null;
  }
}
