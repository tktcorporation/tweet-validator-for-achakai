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
    it('correctly identifies Jan 11 2026 as Sunday and meeting #254', () => {
      // Jan 11, 2026 is a Sunday, meeting #254 (new reference)
      const tweet =
        'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】1月11日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-01-10');
      const result = validateTweet(tweet, new Date('2026-01-11'), 254, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(254);
      expect(result.isCorrectMeeting).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('correctly calculates meeting #255 for Jan 18 2026', () => {
      // Jan 18, 2026 is a Sunday, one week after reference
      const tweet =
        'テスト #あ茶会\n\n第255回 🎸題名のないお茶会🏘️\n【日時】1月18日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-01-12');
      const result = validateTweet(tweet, new Date('2026-01-11'), 254, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(255);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('accounts for skipped meeting on Jan 25 2026', () => {
      // Feb 1, 2026 is a Sunday
      // Weeks from Jan 11 to Feb 1 = 3 weeks
      // Expected: 254 + 3 - 1 (Jan 25 skip) = 256
      const tweet =
        'テスト #あ茶会\n\n第256回 🎸題名のないお茶会🏘️\n【日時】2月1日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2026-01-26');
      const result = validateTweet(tweet, new Date('2026-01-11'), 254, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(256);
      expect(result.isCorrectMeeting).toBe(true);
    });

    it('uses next year for dates that have passed this year', () => {
      // If current date is Dec 2025, and tweet says "1月11日(日)", it should use Jan 11, 2026
      const tweet =
        'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】1月11日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2025-12-20');
      const result = validateTweet(tweet, new Date('2026-01-11'), 254, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.expectedMeetingNumber).toBe(254);
      expect(result.isCorrectMeeting).toBe(true);
    });
  });
});
