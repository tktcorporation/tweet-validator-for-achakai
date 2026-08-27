import { describe, expect, it } from 'vitest';
import { generateSnsReminderMessage } from './discordSnsReminder';

describe('generateSnsReminderMessage', () => {
  it('SNS投稿を促す文言を含む', () => {
    const msg = generateSnsReminderMessage();
    expect(msg).toContain('SNS');
  });

  it('ワールド情報を含まない（URLを含まない）', () => {
    const msg = generateSnsReminderMessage();
    expect(msg).not.toContain('http');
  });
});
