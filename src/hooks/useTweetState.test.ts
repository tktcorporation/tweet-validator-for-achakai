import { describe, it, expect } from 'vitest';
import {
  parseStructuredFields,
  buildStructuredTweet,
  extractLocation,
  extractTrailingWorldUrl,
  validateTweet,
  countTweetLength,
} from './useTweetState';
import { DEFAULT_EVENT_TIME } from '../lib/tweetTemplate';

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

  it('extracts a trailing world URL and strips it from textWithoutUrl', () => {
    const url = 'https://vrchat.com/home/world/wrld_1234';
    const text = `${template.join('\n')}\n\n${url}`;
    const result = parseStructuredFields(text);
    expect(result?.worldUrl).toBe(url);
    expect(result?.textWithoutUrl).toBe(template.join('\n'));
  });

  it('leaves worldUrl empty when there is no trailing URL', () => {
    const result = parseStructuredFields(template.join('\n'));
    expect(result?.worldUrl).toBe('');
    expect(result?.textWithoutUrl).toBe(template.join('\n'));
  });

  it('falls back to default emoji when the meeting-number phrase pattern does not match', () => {
    const text = template
      .join('\n')
      .replace('第210回 🎸題名のないお茶会🏘️', '第210回 カスタムタイトル');
    const result = parseStructuredFields(text);
    expect(result?.instrument).toBe('🎸');
    expect(result?.suffix).toBe('🏘️');
  });
});

describe('countTweetLength', () => {
  it('counts half-width ASCII characters as 1 each', () => {
    expect(countTweetLength('abc123')).toBe(6);
  });

  it('counts full-width Japanese characters as 2 each', () => {
    expect(countTweetLength('あいう')).toBe(6);
  });

  it('counts mixed half-width and full-width text', () => {
    expect(countTweetLength('abcあいう')).toBe(3 + 6);
  });

  it('returns 0 for an empty string', () => {
    expect(countTweetLength('')).toBe(0);
  });
});

describe('buildStructuredTweet', () => {
  it('replaces placeholders and emoji', () => {
    const result = buildStructuredTweet(
      template,
      'test',
      'World',
      'Creator',
      '🎹',
      '🎪',
    );
    expect(result).toContain('第210回 🎹題名のないお茶会');
    expect(result).toContain('題名のないお茶会🎪');
    expect(result).toContain('【場所】World By Creator');
    expect(result.startsWith('test #あ茶会')).toBe(true);
  });

  it('supports multi-line free text', () => {
    const result = buildStructuredTweet(
      template,
      'line1\nline2',
      'World',
      'Creator',
      '🎻',
      '🏠',
    );
    expect(result.startsWith('line1\nline2 #あ茶会')).toBe(true);
  });

  it('does not duplicate lines when world name contains newlines', () => {
    // Simulate a template generated with a multiline world name from a spreadsheet
    const multilineWorld = 'DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ）';
    const creator = 'MetasukaVR';
    const templateWithMultiline = [
      '自由文 #あ茶会',
      '',
      '第259回 🎷題名のないお茶会🍫',
      '【日時】3月1日(日) 14:30〜16:00',
      `【場所】DOBUITA ＆ MIKASA WORLD`,
      `（メタバースヨコスカ） By MetasukaVR`,
      '【参加方法】Group＋「題名のないお茶会」にjoin',
    ];
    const result = buildStructuredTweet(
      templateWithMultiline,
      'test',
      multilineWorld,
      creator,
      '🎷',
      '🍫',
    );
    const occurrences = result.split('（メタバースヨコスカ）').length - 1;
    expect(occurrences).toBe(1);
    expect(result).toContain(
      `【場所】DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ） By MetasukaVR`,
    );
    expect(result).toContain('【参加方法】');
  });

  it('appends the world URL as the last line when includeWorldUrl is true', () => {
    const result = buildStructuredTweet(
      template,
      'test',
      'World',
      'Creator',
      '🎹',
      '🎪',
      'https://vrchat.com/home/world/wrld_1234',
      true,
    );
    expect(result.endsWith('https://vrchat.com/home/world/wrld_1234')).toBe(
      true,
    );
  });

  it('omits the world URL when includeWorldUrl is false', () => {
    const result = buildStructuredTweet(
      template,
      'test',
      'World',
      'Creator',
      '🎹',
      '🎪',
      'https://vrchat.com/home/world/wrld_1234',
      false,
    );
    expect(result).not.toContain('https://vrchat.com/home/world/wrld_1234');
  });

  it('omits the world URL when worldUrl is empty even if includeWorldUrl is true', () => {
    const result = buildStructuredTweet(
      template,
      'test',
      'World',
      'Creator',
      '🎹',
      '🎪',
      '',
      true,
    );
    expect(result).not.toMatch(/https?:\/\//);
  });
});

describe('extractTrailingWorldUrl', () => {
  it('extracts a URL on the last line', () => {
    const text = '本文\n\nhttps://vrchat.com/home/world/wrld_1234';
    const result = extractTrailingWorldUrl(text);
    expect(result?.url).toBe('https://vrchat.com/home/world/wrld_1234');
    expect(result?.textWithoutUrl).toBe('本文');
  });

  it('returns null when the last line is not a URL', () => {
    expect(extractTrailingWorldUrl('本文\n\nただの文章')).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(extractTrailingWorldUrl('')).toBeNull();
  });
});

describe('extractLocation', () => {
  it('extracts single-line location', () => {
    const text = '【場所】MyWorld By Creator\n【参加方法】join';
    const result = extractLocation(text);
    expect(result).toEqual({ world: 'MyWorld', creator: 'Creator' });
  });

  it('extracts multiline location', () => {
    const text =
      '【場所】DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ） By MetasukaVR\n【参加方法】join';
    const result = extractLocation(text);
    expect(result?.world).toBe(
      'DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ）',
    );
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
    const result = validateTweet(validTweet, currentDate);
    expect(result.hasNightWord).toBe(true);
  });

  it('does not detect night word in regular tweet', () => {
    const text = validTweet.replace('今夜の', '今日の');
    const currentDate = new Date('2026-01-10');
    const result = validateTweet(text, currentDate);
    expect(result.hasNightWord).toBe(false);
  });

  it('validates tweet with multiline location', () => {
    const tweet =
      'テスト #あ茶会\n\n第259回 🎸題名のないお茶会🏘️\n【日時】3月1日(日) 14:30〜16:00\n【場所】DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ） By MetasukaVR\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2026-02-23');
    const result = validateTweet(tweet, currentDate);
    expect(result.hasValidLocation).toBe(true);
    expect(result.extractedInfo.worldName).toBe(
      'DOBUITA ＆ MIKASA WORLD\n（メタバースヨコスカ）',
    );
    expect(result.extractedInfo.creator).toBe('MetasukaVR');
    expect(result.isValid).toBe(true);
  });

  it('is valid even when the meeting number does not match a computed expectation', () => {
    // 開催回数はスプレッドシートから取得するため、ツイート内の回数はチェックしない
    const tweet =
      'テスト #あ茶会\n\n第999回 🎸題名のないお茶会🏘️\n【日時】1月11日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2026-01-10');
    const result = validateTweet(tweet, currentDate);
    expect(result.isValid).toBe(true);
    expect(result.meetingNumber).toBe(999);
    expect(result.extractedInfo.meetingNumber).toBe('第999回');
  });

  it('marks placeholders as invalid even when other fields are valid', () => {
    const tweet =
      'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】12月21日(日) 14:30〜16:00\n【場所】ワールド名 By クリエイター名\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2025-12-20');
    const result = validateTweet(tweet, currentDate);
    expect(result.hasPlaceholders).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('computes hasValidLocation, hasTime, and meetingNumber correctly even when no date is found', () => {
    const tweet =
      'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】14:30〜16:00\n【場所】MyWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const result = validateTweet(tweet);
    expect(result.date).toBeNull();
    expect(result.hasValidLocation).toBe(true);
    expect(result.hasTime).toBe(true);
    expect(result.meetingNumber).toBe(254);
    expect(result.extractedInfo.worldName).toBe('MyWorld');
    expect(result.extractedInfo.creator).toBe('Creator');
    expect(result.extractedInfo.time).toBe('14:30〜16:00');
    expect(result.extractedInfo.meetingNumber).toBe('第254回');
    expect(result.isValid).toBe(false);
  });

  it('is invalid when the stated date is not actually a Sunday', () => {
    // 2026-01-11 is confirmed Sunday (see year calculation tests below), so 1/12 is Monday
    const tweet =
      'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】1月12日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2026-01-05');
    const result = validateTweet(tweet, currentDate);
    expect(result.isSunday).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('is invalid when the #あ茶会 hashtag is missing', () => {
    const tweet =
      'テスト\n\n第254回 🎸題名のないお茶会🏘️\n【日時】12月21日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2025-12-20');
    const result = validateTweet(tweet, currentDate);
    expect(result.hasHashtag).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('is invalid when the time range is missing', () => {
    const tweet =
      'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】12月21日(日)\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2025-12-20');
    const result = validateTweet(tweet, currentDate);
    expect(result.hasTime).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('is invalid when the stated date does not exist on the calendar', () => {
    // 2026年はうるう年ではないため 2月29日は存在せず、Dateコンストラクタは3月1日へ繰り上げる
    const tweet =
      'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】2月29日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2026-02-01');
    const result = validateTweet(tweet, currentDate);
    expect(result.isSunday).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('is invalid for the non-existent "4月31日" date (4月は30日まで)', () => {
    const tweet =
      'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】4月31日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2026-04-01');
    const result = validateTweet(tweet, currentDate);
    expect(result.isSunday).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('is invalid when the month does not exist, even though the rolled-over date lands on a Sunday', () => {
    // 13月は存在しない。Dateコンストラクタは "13月3日" を2027年1月3日へ繰り上げるが、
    // この日は実際に日曜日なので、day成分だけを見る判定だと素通りしてしまう
    // （month成分のチェックが独立して効いていることをここで確認する）。
    const tweet =
      'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】13月3日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
    const currentDate = new Date('2026-01-05');
    const result = validateTweet(tweet, currentDate);
    expect(result.isSunday).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('recognizes DEFAULT_EVENT_TIME as a valid hasTime match (tweetTemplate.ts と validateTweet の非対称性の固定用)', () => {
    const tweet = `テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】12月21日(日) ${DEFAULT_EVENT_TIME}\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin`;
    const currentDate = new Date('2025-12-20');
    const result = validateTweet(tweet, currentDate);
    expect(result.hasTime).toBe(true);
    expect(result.isValid).toBe(true);
  });

  describe('year calculation', () => {
    it('correctly identifies Dec 21 2025 as Sunday', () => {
      const tweet =
        'テスト #あ茶会\n\n第253回 🎸題名のないお茶会🏘️\n【日時】12月21日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2025-12-20');
      const result = validateTweet(tweet, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('uses next year for dates that have passed this year', () => {
      // If current date is Dec 2025, and tweet says "1月11日(日)", it should use Jan 11, 2026
      const tweet =
        'テスト #あ茶会\n\n第254回 🎸題名のないお茶会🏘️\n【日時】1月11日(日) 14:30〜16:00\n【場所】TestWorld By Creator\n【参加方法】Group＋「題名のないお茶会」にjoin';
      const currentDate = new Date('2025-12-20');
      const result = validateTweet(tweet, currentDate);
      expect(result.isSunday).toBe(true);
      expect(result.date).toEqual(new Date(2026, 0, 11));
    });
  });
});
