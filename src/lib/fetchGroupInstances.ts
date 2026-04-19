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

import { z } from 'zod';

const USER_AGENT =
  'tweet-validator-for-achakai/1.0 (+https://github.com/tktcorporation/tweet-validator-for-achakai)';

// VRChat の識別子は `<prefix>_<UUID>` の形式で、UUID は 8-4-4-4-12 の hex。
// 非公式 API のため将来変わる可能性はあるが、2026-04 現在この形式で統一されている。
// Zod schema で形式を縛ることで、誤った Secrets を登録したときに fetch 前に検知する。
const UUID_HEX =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

const VRChatUserIdSchema = z
  .string()
  .regex(new RegExp(`^usr_${UUID_HEX}$`), 'userId must be usr_<uuid>');

const VRChatGroupIdSchema = z
  .string()
  .regex(new RegExp(`^grp_${UUID_HEX}$`), 'groupId must be grp_<uuid>');

const VRChatAuthCookieSchema = z
  .string()
  .regex(
    new RegExp(`^authcookie_${UUID_HEX}$`),
    'authCookie must be authcookie_<uuid> (raw value only, no "auth=" prefix)',
  );

// twoFactorAuth Cookie は VRChat が発行する JWT。
// base64url 文字 + `.` 2 つで構成される 3 セグメント形式を許容する。
// 各セグメントの末尾 `=` パディングは RFC 7515 では禁止だが、
// ブラウザから値をコピーしてくる経路で紛れ込む可能性があるので通す。
const JwtSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9_-]+=*\.[A-Za-z0-9_-]+=*\.[A-Za-z0-9_-]+=*$/,
    'twoFactorAuthCookie must be a JWT (three base64url segments separated by ".")',
  );

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
 * instances 配列の 1 要素から必要フィールドを抽出する。
 *
 * 実 API の各要素はフラット形式: `{ worldId, world: {...}, displayName, name,
 * userCount, n_users, capacity, region, ... }`。非公式 API のため一部フィールドが
 * 欠ける可能性を考慮してオプショナル扱いし、worldId が取れない要素は null で除外。
 */
function extractInstance(raw: unknown): GroupInstance | null {
  if (!raw || typeof raw !== 'object') return null;
  const inst = raw as Record<string, unknown>;

  const worldObj = inst.world as Record<string, unknown> | undefined;

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
 * fetchGroupInstances の入力スキーマ。全て GitHub Secrets から供給する想定。
 *
 * - userId / groupId: `usr_<uuid>` / `grp_<uuid>` の VRChat 識別子
 * - authCookie: `auth` Cookie の値本体（`authcookie_<uuid>`。`auth=` プレフィックス不要）
 * - twoFactorAuthCookie (任意): `twoFactorAuth` Cookie の JWT 値。
 *   空文字列は未指定と同義で Cookie ヘッダに追加しない
 *   （GitHub Actions の未設定 secret は `''` に展開されるため）
 *
 * `twoFactorAuth` Cookie は運用上付けることを推奨する。
 * 同一 IP から叩く限りは `auth` 単独でも 200 が返るが、GitHub Actions runner
 * のように Cookie 取得元と IP が大きく離れた環境では `auth` 単独で
 * "Missing Credentials" (401) が返るケースを確認している。
 * JWT (30 日失効) を付与すると IP が変わっても検証に通る。
 */
export const FetchGroupInstancesOptionsSchema = z.object({
  userId: VRChatUserIdSchema,
  groupId: VRChatGroupIdSchema,
  authCookie: VRChatAuthCookieSchema,
  // z.literal('') を union に含めることで「未設定 secret が '' で渡る」ケースを
  // 型の上で明示的に許容する。呼び出し側で `|| undefined` 変換しなくてもよい。
  twoFactorAuthCookie: z.union([JwtSchema, z.literal('')]).optional(),
});

export type FetchGroupInstancesOptions = z.infer<
  typeof FetchGroupInstancesOptionsSchema
>;

/**
 * VRChat API から指定グループのインスタンス一覧を取得する。
 *
 * auth Cookie は GitHub Secrets から渡す。
 * レスポンスは `{ fetchedAt, instances: [...] }` のラッパー形式。
 */
export async function fetchGroupInstances(
  options: FetchGroupInstancesOptions,
): Promise<GroupInstance[]> {
  // Parse, Don't Validate: 誤った Secrets を登録すると fetch 前に具体的な
  // フィールド名付きで失敗するので、401/400 と比べて切り分けが容易になる。
  const parsed = FetchGroupInstancesOptionsSchema.safeParse(options);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid fetchGroupInstances options: ${issues}`);
  }
  const { userId, groupId, authCookie, twoFactorAuthCookie } = parsed.data;

  const cookieParts = [`auth=${authCookie}`];
  if (twoFactorAuthCookie) {
    cookieParts.push(`twoFactorAuth=${twoFactorAuthCookie}`);
  }

  // vrchat.com は api.vrchat.cloud へ 307 リダイレクトする。
  // Node の fetch は cross-origin リダイレクト時に Cookie ヘッダを落とすため、
  // リダイレクト先を直接叩く（ブラウザ DevTools でも同一ホストとして動く）。
  const url = `https://api.vrchat.cloud/api/1/users/${encodeURIComponent(userId)}/instances/groups/${encodeURIComponent(groupId)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      Cookie: cookieParts.join('; '),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `VRChat API failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
    );
  }

  const data: unknown = await res.json();
  const instancesArr = extractInstancesArray(data);
  if (instancesArr === null) {
    throw new Error('VRChat API returned unexpected response shape');
  }

  return instancesArr
    .map(extractInstance)
    .filter((i): i is GroupInstance => i !== null);
}

/**
 * 実レスポンスは `{fetchedAt, instances: [...]}` のラッパー形式だが、
 * VRChat 非公式 API の仕様変更に備えて top-level 配列形式もフォールバック許容する。
 */
function extractInstancesArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const instances = (data as Record<string, unknown>).instances;
    if (Array.isArray(instances)) return instances;
  }
  return null;
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
