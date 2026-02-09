import { describe, it, expect } from 'vitest';
import {
  parseStructuredFields,
  buildStructuredTweet,
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

  describe('year calculation', () => {
    it('correctly identifies Dec 21 2025 as Sunday and meeting #253', () => {
      // Dec 21, 2025 is a Sunday, meeting #253 (reference)
      const tweet =
        'テスト #あ茶会\n\n第253回 🎸題名のないお茶会🏘️\n【日時】12月21日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2025-12-20');
      const result = validateTweet(tweet, new Date('2025-12-21'), 253, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(253);
      expect(result.isCorrectMeeting).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('correctly calculates meeting #254 for Jan 11 2026 (skipping 12/28 and 1/4)', () => {
      // Jan 11, 2026 is a Sunday
      // Weeks from Dec 21 to Jan 11 = 3 weeks
      // Expected: 253 + 3 - 2 (Dec 28 + Jan 4 skips) = 254
      const tweet =
        'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】1月11日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-01-10');
      const result = validateTweet(tweet, new Date('2025-12-21'), 253, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(254);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('correctly calculates meeting #255 for Jan 18 2026', () => {
      // Jan 18, 2026 is a Sunday
      // Weeks from Dec 21 to Jan 18 = 4 weeks
      // Expected: 253 + 4 - 2 (Dec 28 + Jan 4 skips) = 255
      const tweet =
        'テスト #あ茶会\n\n第255回 🎸題名のないお茶会🏘️\n【日時】1月18日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-01-12');
      const result = validateTweet(tweet, new Date('2025-12-21'), 253, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(255);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('accounts for all skipped meetings (12/28, 1/4, 1/25)', () => {
      // Feb 1, 2026 is a Sunday
      // Weeks from Dec 21 to Feb 1 = 6 weeks
      // Expected: 253 + 6 - 3 (Dec 28, Jan 4, Jan 25 skips) = 256
      const tweet =
        'テスト #あ茶会\n\n第256回 🎸題名のないお茶会🏘️\n【日時】2月1日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-01-26');
      const result = validateTweet(tweet, new Date('2025-12-21'), 253, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(256);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('correctly calculates meeting #259 for Mar 1 2026 (skipping 2/22)', () => {
      // Mar 1, 2026 is a Sunday
      // Weeks from Dec 21 to Mar 1 = 10 weeks
      // Expected: 253 + 10 - 4 (Dec 28, Jan 4, Jan 25, Feb 22 skips) = 259
      const tweet =
        'テスト #あ茶会\n\n第259回 🎸題名のないお茶会🏘️\n【日時】3月1日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-02-23');
      const result = validateTweet(tweet, new Date('2025-12-21'), 253, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(259);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('correctly calculates meeting #260 for Mar 15 2026 (skipping 2/22 and 3/8)', () => {
      // Mar 15, 2026 is a Sunday
      // Weeks from Dec 21 to Mar 15 = 12 weeks
      // Expected: 253 + 12 - 5 (Dec 28, Jan 4, Jan 25, Feb 22, Mar 8 skips) = 260
      const tweet =
        'テスト #あ茶会\n\n第260回 🎸題名のないお茶会🏘️\n【日時】3月15日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-03-09');
      const result = validateTweet(tweet, new Date('2025-12-21'), 253, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(260);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('correctly calculates meeting #264 for May 3 2026 (skipping 4/26 for リアルあ茶会)', () => {
      // May 3, 2026 is a Sunday
      // Weeks from Dec 21 to May 3 = 19 weeks
      // Expected: 253 + 19 - 6 (Dec 28, Jan 4, Jan 25, Feb 22, Mar 8, Apr 26 skips) = 266
      const tweet =
        'テスト #あ茶会\n\n第266回 🎸題名のないお茶会🏘️\n【日時】5月3日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-04-27');
      const result = validateTweet(tweet, new Date('2025-12-21'), 253, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(266);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('uses next year for dates that have passed this year', () => {
      // If current date is Dec 2025, and tweet says "1月11日(日)", it should use Jan 11, 2026
      const tweet =
        'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】1月11日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2025-12-20');
      const result = validateTweet(tweet, new Date('2025-12-21'), 253, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(254);
      expect(result.isCorrectMeeting).toBe(true);
    });
  });
});
