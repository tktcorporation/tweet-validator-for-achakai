/**
 * Discord SNS投稿リマインドスクリプト。
 *
 * 背景: 毎週水曜21時(JST)に、SNS投稿を促す軽いリマインドを Discord に通知する。
 * 火曜の予定通知（discord-weekly-notify.ts）と異なり、スプレッドシートの
 * ワールド情報等は載せない固定文言。
 *
 * 実行方法: npx tsx scripts/discord-sns-reminder-notify.ts
 * 環境変数: DISCORD_WEBHOOK_URL (必須)
 */

import { generateSnsReminderMessage } from '../src/lib/discordSnsReminder.js';

async function main() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL が設定されていません');
    process.exit(1);
  }

  const message = generateSnsReminderMessage();
  console.log('送信メッセージ:');
  console.log(message);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
