/** 水曜21時の Discord SNS投稿リマインド用メッセージを生成する。
 *  スケジュール確定状況に依存しない固定文言（ワールド情報等は含めない）。
 *
 *  呼び出し元: scripts/discord-sns-reminder-notify.ts (GitHub Actions から実行)
 */
export function generateSnsReminderMessage(): string {
  return '📣 SNS投稿のリマインドです\n\nそろそろ今週のあ茶会をSNSに投稿しましょう〜';
}
