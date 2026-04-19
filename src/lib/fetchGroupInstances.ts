/**
 * VRChat グループインスタンス一覧の取得 & Discord 向け整形。
 *
 * 背景: あ茶会グループが現在どのワールドで何個のインスタンスを
 *   立てているか、各インスタンスに何人いるかを Discord に流したい。
 *   `/api/1/users/{userId}/instances/groups/{groupId}` はユーザーの
 *   グループ権限から見える instance 一覧を返す（要認証）。
 *   ユーザーIDを指定しているのは「どのユーザーの視点で見える
 *   インスタンスか」を決めるためで、ボット用アカウント固定でよい。
 *
 * 呼び出し元: scripts/discord-group-instances-notify.ts (GitHub Actions)
 */

const USER_AGENT =
  'tweet-validator-for-achakai/1.0 (+https://github.com/tktcorporation/tweet-validator-for-achakai)';

/**
 * 整形処理で利用する最小限のインスタンス情報。
 * VRChat API のレスポンスは膨大なため、必要なフィールドだけを抽出した型で扱う。
 */
export interface GroupInstance {
  /** ワールド識別子 (wrld_...)。ワールドごとの集計キー */
  worldId: string;
  /** ワールド表示名。空文字なら worldId を表示フォールバック */
  worldName: string;
  /** インスタンスの displayName（オーナーが設定した名前）。空の場合は #name を表示 */
  displayName: string;
  /** インスタンス番号 (例: "51786")。displayName が空のときの表示に使う */
  name: string;
  /** 現在の人数 */
  userCount: number;
  /** 定員 */
  capacity: number;
  /** リージョン (jp/us/eu/...) */
  region: string;
}

/**
 * VRChat API のレスポンスから必要フィールドを抽出する。
 *
 * API は `{ fetchedAt, instance: {...}, world: {...} }` の配列を返す仕様だが、
 * 非公式 API のため一部フィールドが省略される可能性を考慮してオプショナル扱い。
 */
function extractInstance(raw: unknown): GroupInstance | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Record<string, unknown>;

  const inst = (entry.instance as Record<string, unknown> | undefined) ?? entry;
  if (!inst || typeof inst !== 'object') return null;

  const worldObj =
    (entry.world as Record<string, unknown> | undefined) ??
    (inst.world as Record<string, unknown> | undefined);

  const worldId =
    (typeof inst.worldId === 'string' ? inst.worldId : '') ||
    (worldObj && typeof worldObj.id === 'string' ? worldObj.id : '');
  if (!worldId) return null;

  const worldName =
    worldObj && typeof worldObj.name === 'string' ? worldObj.name : '';

  return {
    worldId,
    worldName,
    displayName: typeof inst.displayName === 'string' ? inst.displayName : '',
    name: typeof inst.name === 'string' ? inst.name : '',
    userCount:
      typeof inst.userCount === 'number'
        ? inst.userCount
        : // n_users は古い/別形式のレスポンスで現れるフィールド名。
          // どちらで来ても拾えるようフォールバックを用意する。
          typeof inst.n_users === 'number'
          ? inst.n_users
          : 0,
    capacity: typeof inst.capacity === 'number' ? inst.capacity : 0,
    region: typeof inst.region === 'string' ? inst.region : '',
  };
}

/**
 * fetchGroupInstances の入力。全て GitHub Secrets から供給する想定。
 *
 * - userId / groupId: `usr_...` / `grp_...` 形式の生ID
 * - authCookie: Cookie 値本体のみ（`auth=` プレフィックスは不要。`authcookie_...` の文字列）
 * - twoFactorAuthCookie: Cookie 値本体のみ（`twoFactorAuth=` プレフィックスは不要）
 *   JWT 形式で有効期限 ~30日。期限切れで 401 になったら手動で更新する運用
 */
export interface FetchGroupInstancesOptions {
  userId: string;
  groupId: string;
  authCookie: string;
  twoFactorAuthCookie: string;
}

/**
 * VRChat API から指定グループのインスタンス一覧を取得する。
 *
 * auth / twoFactorAuth Cookie は GitHub Secrets から渡す。twoFactorAuth は
 * 有効期限が約 30 日なので、期限切れで 401 になったら手動で更新する運用。
 */
export async function fetchGroupInstances(
  options: FetchGroupInstancesOptions,
): Promise<GroupInstance[]> {
  const { userId, groupId, authCookie, twoFactorAuthCookie } = options;

  // Cookie ヘッダ組み立て時にセミコロンが混入すると別の Cookie として解釈される。
  // Secrets の誤設定や仕様変更を早期検知するため、明示的にガードする。
  if (authCookie.includes(';') || twoFactorAuthCookie.includes(';')) {
    throw new Error('Cookie value must not contain ";"');
  }

  const url = `https://vrchat.com/api/1/users/${encodeURIComponent(userId)}/instances/groups/${encodeURIComponent(groupId)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      Cookie: `auth=${authCookie}; twoFactorAuth=${twoFactorAuthCookie}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `VRChat API failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
    );
  }

  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('VRChat API returned non-array response');
  }

  return data
    .map(extractInstance)
    .filter((i): i is GroupInstance => i !== null);
}

/**
 * Discord 向けメッセージを組み立てる。
 *
 * - 0 件 → "0件でした" を含むメッセージ
 * - 複数件 → ワールド別にグルーピングし、各インスタンスの人数/定員/リージョンを列挙
 * - Discord の `<t:UNIX:F>` 記法で閲覧者のローカル時刻として表示
 *
 * 呼び出し元: scripts/discord-group-instances-notify.ts
 */
export function formatGroupInstancesMessage(
  instances: GroupInstance[],
  currentDate: Date = new Date(),
): string {
  const unix = Math.floor(currentDate.getTime() / 1000);
  const header = `🫖 お茶会グループ インスタンス状況 <t:${unix}:F>`;

  if (instances.length === 0) {
    return `${header}\n\n0件でした`;
  }

  // ワールドIDでグループ化。Map は挿入順を保持するので API の順序が保たれる
  const groups = new Map<
    string,
    { worldName: string; items: GroupInstance[] }
  >();
  for (const inst of instances) {
    const existing = groups.get(inst.worldId);
    if (existing) {
      existing.items.push(inst);
    } else {
      groups.set(inst.worldId, {
        worldName: inst.worldName || inst.worldId,
        items: [inst],
      });
    }
  }

  const sections: string[] = [];
  for (const group of groups.values()) {
    const totalUsers = group.items.reduce((sum, i) => sum + i.userCount, 0);
    const lines: string[] = [
      `📍 ${group.worldName} — ${group.items.length} インスタンス / 合計 ${totalUsers} 人`,
    ];
    for (const inst of group.items) {
      const label = inst.displayName || `#${inst.name || '?'}`;
      const region = inst.region ? ` (${inst.region.toUpperCase()})` : '';
      lines.push(`• ${label} — ${inst.userCount}/${inst.capacity}${region}`);
    }
    sections.push(lines.join('\n'));
  }

  const full = `${header}\n\n${sections.join('\n\n')}`;
  return truncateForDiscord(full);
}

// Discord の `content` は 2000 文字を超えると 400 で拒否される。
// 超えた場合は黙って切り落とさず省略マーカー付きで渡す。
// 絵文字（🫖📍• 等）はサロゲートペアを含むため、コードポイント単位で長さを計算する。
const DISCORD_MAX_CONTENT = 2000;
const TRUNCATION_SUFFIX = '\n\n…(省略)';

function truncateForDiscord(text: string): string {
  const codepoints = [...text];
  if (codepoints.length <= DISCORD_MAX_CONTENT) return text;
  const suffixLen = [...TRUNCATION_SUFFIX].length;
  return (
    codepoints.slice(0, DISCORD_MAX_CONTENT - suffixLen).join('') +
    TRUNCATION_SUFFIX
  );
}
