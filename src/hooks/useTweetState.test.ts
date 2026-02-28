import { describe, it, expect } from 'vitest';
import {
  parseStructuredFields,
  buildStructuredTweet,
  extractLocation,
  validateTweet,
} from './useTweetState';

const template = [
  '自由文 #あ茶会',
  '',
  '第210回 🎸題名のないお茶会🏘️',
  '【日時】1月1日(日) 14:30〜16:00',
  '【場所】ワールド名 By クリエイター名',
  '【参加方法】Group＋「題名のないお茶会」にjoin',
];

describe('parseStructuredFields', () => {
  it('extracts instrument emoji', () => {
    const text = template.join('\n').replace('🎸', '🥁');
    const result = parseStructuredFields(text);
    expect(result?.instrument).toBe('🥁');
  });

  it('extracts suffix emoji', () => {
    const text = template.join('\n').replace('🏘️', '🎪');
    const result = parseStructuredFields(text);
    expect(result?.suffix).toBe('🎪');
  });

  it('handles multi-line free text', () => {
    const multi = template.join('\n').replace('自由文', 'line1\nline2');
    const result = parseStructuredFields(multi);
    expect(result?.freeText).toBe('line1\nline2');
  });
});

describe('buildStructuredTweet', () => {
  it('replaces placeholders and emoji', () => {
    const result = buildStructuredTweet(template, 'test', 'World', 'Creator', '🎹', '🎪');
    expect(result).toContain('第210回 🎹題名のないお茶会');
    expect(result).toContain('題名のないお茶会🎪');
    expect(result).toContain('【場所】World By Creator');
    expect(result.startsWith('test #あ茶会')).toBe(true);
  });

  it('supports multi-line free text', () => {
    const result = buildStructuredTweet(template, 'line1\nline2', 'World', 'Creator', '🎻', '🏠');
    expect(result.startsWith('line1\nline2 #あ茶会')).toBe(true);
  });

  it('does not duplicate lines when world name contains newlines', () => {
    // Simulate a template generated with a multiline world name from a spreadsheet
    const multilineWorld = 'DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ）';
    const creator = 'MetasukaVR';
    const templateWithMultiline = [
      '自由文 #あ茶会',
      '',
      '第261回 🎷題名のないお茶会🍫',
      '【日時】3月1日(日) 14:30〜16:00',
      `【場所】DOBUITA ＆ MIKASA WORLD`,
      `（メタバースヨコスカ） By MetasukaVR`,
      '【参加方法】Group＋「題名のないお茶会」にjoin',
    ];
    const result = buildStructuredTweet(
      templateWithMultiline, 'test', multilineWorld, creator, '🎷', '🍫',
    );
    const occurrences = result.split('（メタバースヨコスカ）').length - 1;
    expect(occurrences).toBe(1);
    expect(result).toContain(`【場所】DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ） By MetasukaVR`);
    expect(result).toContain('【参加方法】');
  });
});

describe('extractLocation', () => {
  it('extracts single-line location', () => {
    const text = '【場所】MyWorld By Creator\n【参加方法】join';
    const result = extractLocation(text);
    expect(result).toEqual({ world: 'MyWorld', creator: 'Creator' });
  });

  it('extracts multiline location', () => {
    const text = '【場所】DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ） By MetasukaVR\n【参加方法】join';
    const result = extractLocation(text);
    expect(result?.world).toBe('DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ）');
    expect(result?.creator).toBe('MetasukaVR');
  });

  it('returns null when no location section', () => {
    expect(extractLocation('no location here')).toBeNull();
  });

  it('returns null when no By separator', () => {
    expect(extractLocation('【場所】WorldOnly\n【参加方法】join')).toBeNull();
  });
});

describe('validateTweet', () => {
  const validTweet =
    '今夜のライブは最高でした！ #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】1月11日(日) 14:30〜16:00\n【場所】MyWorld By Jeb\n【参加方法】Group＋「題名のないお茶会」にjoin';
  it('detects night word', () => {
    const currentDate = new Date('2026-01-10');
    const result = validateTweet(validTweet, undefined, undefined, currentDate);
    expect(result.hasNightWord).toBe(true);
  });

  it('does not detect night word in regular tweet', () => {
    const text = validTweet.replace('今夜の', '今日の');
    const currentDate = new Date('2026-01-10');
    const result = validateTweet(text, undefined, undefined, currentDate);
    expect(result.hasNightWord).toBe(false);
  });

  it('validates tweet with multiline location', () => {
    const tweet =
      'テスト #あ茶会\n\n第261回 🎸題名のないお茶会🏘️\n【日時】3月1日(日) 14:30〜16:00\n【場所】DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ） By MetasukaVR\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2026-02-23');
    const result = validateTweet(tweet, undefined, undefined, currentDate);
    expect(result.hasValidLocation).toBe(true);
    expect(result.extractedInfo.worldName).toBe('DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ）');
    expect(result.extractedInfo.creator).toBe('MetasukaVR');
    expect(result.isValid).toBe(true);
  });

  describe('year calculation', () => {
    it('correctly identifies Mar 1 2026 as reference point (#261)', () => {
      // Mar 1, 2026 is a Sunday, meeting #261 (reference)
      const tweet =
        'テスト #あ茶会\n\n第261回 🎸題名のないお茶会🏘️\n【日時】3月1日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-02-23');
      const result = validateTweet(tweet, undefined, undefined, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(261);
      expect(result.isCorrectMeeting).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('correctly calculates meeting #262 for Mar 15 2026 (skipping 3/8)', () => {
      // Mar 15, 2026 is a Sunday
      // Weeks from Mar 1 to Mar 15 = 2 weeks
      // Expected: 261 + 2 - 1 (Mar 8 skip) = 262
      const tweet =
        'テスト #あ茶会\n\n第262回 🎸題名のないお茶会🏘️\n【日時】3月15日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-03-09');
      const result = validateTweet(tweet, undefined, undefined, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(262);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('correctly calculates meeting #268 for May 3 2026 (skipping 3/8 and 4/26)', () => {
      // May 3, 2026 is a Sunday
      // Weeks from Mar 1 to May 3 = 9 weeks
      // Expected: 261 + 9 - 2 (Mar 8, Apr 26 skips) = 268
      const tweet =
        'テスト #あ茶会\n\n第268回 🎸題名のないお茶会🏘️\n【日時】5月3日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-04-27');
      const result = validateTweet(tweet, undefined, undefined, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(268);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('uses next year for dates that have passed this year', () => {
      // If current date is Feb 2026, and tweet says "3月1日(日)", it should use Mar 1, 2026
      // (the date hasn't passed yet, just verifying forward resolution)
      const tweet =
        'テスト #あ茶会\n\n第261回 🎸題名のないお茶会🏘️\n【日時】3月1日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-02-23');
      const result = validateTweet(tweet, undefined, undefined, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(261);
      expect(result.isCorrectMeeting).toBe(true);
    });
  });
});
