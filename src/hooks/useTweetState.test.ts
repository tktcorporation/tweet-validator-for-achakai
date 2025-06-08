import { describe, it, expect } from 'vitest';
import { parseStructuredFields, buildStructuredTweet } from './useTweetState';

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
});

describe('buildStructuredTweet', () => {
  it('replaces placeholders and emoji', () => {
    const result = buildStructuredTweet(template, 'test', 'World', 'Creator', '🎹');
    expect(result).toContain('第210回 🎹題名のないお茶会');
    expect(result).toContain('【場所】World By Creator');
    expect(result.startsWith('test #あ茶会')).toBe(true);
  });
});
