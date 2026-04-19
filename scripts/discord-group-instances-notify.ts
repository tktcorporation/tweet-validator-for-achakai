/**
 * Discord グループインスタンス状況通知スクリプト。
 *
 * 背景: 毎週日曜 15:45 JST に、あ茶会グループが現在立てている
 *   ワールドとインスタンス人数を Discord に通知する。
 *   VRChat API は認証必須のため Cookie を GitHub Secrets から渡す。
 *
 * 実行方法: npx tsx scripts/discord-group-instances-notify.ts
 * 環境変数:
 *   - DISCORD_WEBHOOK_URL  (必須)
 *   - VRCHAT_USER_ID       (必須。usr_... 形式、bot アカウントの ID)
 *   - VRCHAT_GROUP_ID      (必須。grp_... 形式)
 *   - VRCHAT_AUTH_COOKIE   (必須。authcookie_... の値本体のみ)
 *   - VRCHAT_TWOFA_COOKIE  (任意。twoFactorAuth Cookie の JWT 値。
 *     Cookie 取得元と叩く IP が離れる環境では付けないと 401 になる)
 */

import {
  fetchGroupInstances,
  formatGroupInstancesMessage,
} from '../src/lib/fetchGroupInstances.js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} が設定されていません`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const webhookUrl = requireEnv('DISCORD_WEBHOOK_URL');
  const userId = requireEnv('VRCHAT_USER_ID');
  const groupId = requireEnv('VRCHAT_GROUP_ID');
  const authCookie = requireEnv('VRCHAT_AUTH_COOKIE');
  // 未設定 secret は `''` に展開される。fetchGroupInstances のスキーマは
  // 空文字列を「未指定扱い」として受け入れるため、そのまま渡してよい。
  const twoFactorAuthCookie = process.env.VRCHAT_TWOFA_COOKIE ?? '';

  console.log('VRChat グループインスタンス一覧を取得中...');
  const instances = await fetchGroupInstances({
    userId,
    groupId,
    authCookie,
    twoFactorAuthCookie,
  });
  console.log(`${instances.length} 件のインスタンスを取得`);

  const message = formatGroupInstancesMessage(instances);
  console.log('送信メッセージ:');
  console.log(message);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // message は VRChat の world / instance 名 (ユーザー生成) を含むため、
    // `@everyone` などが混入しても実際のメンションが飛ばないよう
    // allowed_mentions を空にしてパースを無効化する。
    body: JSON.stringify({
      content: message,
      allowed_mentions: { parse: [] },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Discord webhook 送信失敗: ${response.status} ${body}`);
    process.exit(1);
  }

  console.log('Discord に通知を送信しました');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
