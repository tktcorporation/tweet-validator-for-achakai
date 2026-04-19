/**
 * Discord グループインスタンス状況通知スクリプト。
 *
 * 背景: 毎週日曜 15:45 JST に、あ茶会グループが現在立てている
 *   ワールドとインスタンス人数を Discord に通知する。
 *   VRChat API は認証必須のため Cookie を GitHub Secrets から渡す。
 *
 * 実行方法: npx tsx scripts/discord-group-instances-notify.ts
 * 環境変数（全て必須）:
 *   - DISCORD_WEBHOOK_URL
 *   - VRCHAT_USER_ID       (usr_... 形式。bot アカウントの ID)
 *   - VRCHAT_GROUP_ID      (grp_... 形式)
 *   - VRCHAT_AUTH_COOKIE   (authcookie_... の値のみ)
 *   - VRCHAT_TWOFA_COOKIE  (twoFactorAuth JWT の値のみ、~30日で失効)
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
  const twoFactorAuthCookie = requireEnv('VRCHAT_TWOFA_COOKIE');

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
    body: JSON.stringify({ content: message }),
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
