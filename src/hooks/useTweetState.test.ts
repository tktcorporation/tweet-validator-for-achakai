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
    '今夜のライブは最高でした！ #あ茶会\n\n第208回 🎸題名のないお茶会🏘️\n【日時】2月2日(日) 14:30〜16:00\n【場所】MyWorld By Jeb\n【参加方法】Group＋「題名のないお茶会」にjoin';
  it('detects night word', () => {
    const result = validateTweet(validTweet);
    expect(result.hasNightWord).toBe(true);
  });

  it('does not detect night word in regular tweet', () => {
    const text = validTweet.replace('今夜の', '今日の');
    const result = validateTweet(text);
    expect(result.hasNightWord).toBe(false);
  });
});
