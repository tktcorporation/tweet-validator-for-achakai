/**
 * Discord 週次お茶会通知スクリプト。
 *
 * 背景: 毎週水曜20時(JST)に今週の日曜のお茶会予定を Discord に通知する。
 * スプレッドシートの確定チェック状態に応じてメッセージを出し分ける。
 *
 * 実行方法: npx tsx scripts/discord-weekly-notify.ts
 * 環境変数: DISCORD_WEBHOOK_URL (必須)
 */

import {
  fetchScheduleFromSheet,
  generateDiscordWeeklyMessage,
} from '../src/lib/fetchSheetSchedule.js';

async function main() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL が設定されていません');
    process.exit(1);
  }

  console.log('スプレッドシートからスケジュールを取得中...');
  const entries = await fetchScheduleFromSheet();
  console.log(`${entries.length} 件のエントリを取得`);

  const message = generateDiscordWeeklyMessage(entries);
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

main();
