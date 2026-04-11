import { describe, it, expect } from 'vitest';
import {
  parseCSV,
  parseScheduleCSV,
  formatDateForSheet,
  findEntryByDate,
  deriveSkippedDates,
  generateScheduleAnnouncement,
  generateDiscordWeeklyMessage,
} from './fetchSheetSchedule';

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const csv = 'a,b,c\n1,2,3';
    expect(parseCSV(csv)).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields', () => {
    const csv = '"hello, world","test"\nfoo,bar';
    expect(parseCSV(csv)).toEqual([
      ['hello, world', 'test'],
      ['foo', 'bar'],
    ]);
  });

  it('handles escaped quotes', () => {
    const csv = '"say ""hello""","ok"';
    expect(parseCSV(csv)).toEqual([['say "hello"', 'ok']]);
  });

  it('handles multiline fields', () => {
    const csv = '"line1\nline2",other\nnext,row';
    expect(parseCSV(csv)).toEqual([
      ['line1\nline2', 'other'],
      ['next', 'row'],
    ]);
  });

  it('handles empty fields', () => {
    const csv = 'a,,c\n,b,';
    expect(parseCSV(csv)).toEqual([
      ['a', '', 'c'],
      ['', 'b', ''],
    ]);
  });

  it('handles CRLF line endings', () => {
    const csv = 'a,b\r\nc,d';
    expect(parseCSV(csv)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('parseScheduleCSV', () => {
  const sampleCSV = [
    '"運用ルール","","",""',
    '"チェックが入っていたら確定分","TRUE","FALSE",""',
    '"開催予定日","2026/02/01","2026/02/08","2026/02/15"',
    '"開催回数","256","257","-"',
    '"ワールド名","Stardust Piano","ケセドのバレンタインデイ",""',
    '"作者","nekobus_17","ケセドCHESED",""',
    '"url","https://example.com","https://example2.com",""',
    '"説明","ピアノが美しいワールドです","バレンタインデイをテーマにしたワールド",""',
  ].join('\n');

  it('parses schedule entries from transposed CSV', () => {
    const entries = parseScheduleCSV(sampleCSV);
    expect(entries).toHaveLength(3);
  });

  it('extracts meeting numbers correctly', () => {
    const entries = parseScheduleCSV(sampleCSV);
    expect(entries[0].meetingNumber).toBe(256);
    expect(entries[1].meetingNumber).toBe(257);
    expect(entries[2].meetingNumber).toBeNull(); // "-" means skipped
  });

  it('extracts world URLs from url row', () => {
    const entries = parseScheduleCSV(sampleCSV);
    expect(entries[0].worldUrl).toBe('https://example.com');
    expect(entries[1].worldUrl).toBe('https://example2.com');
    expect(entries[2].worldUrl).toBe('');
  });

  it('extracts world descriptions from 説明 row', () => {
    const entries = parseScheduleCSV(sampleCSV);
    expect(entries[0].worldDescription).toBe('ピアノが美しいワールドです');
    expect(entries[1].worldDescription).toBe('バレンタインデイをテーマにしたワールド');
    expect(entries[2].worldDescription).toBe('');
  });

  it('returns empty string for worldDescription when 説明 row is absent', () => {
    const csvWithoutDescription = [
      '"開催予定日","2026/02/01"',
      '"開催回数","256"',
      '"ワールド名","TestWorld"',
      '"作者","TestCreator"',
      '"チェックが入っていたら確定分","TRUE"',
      '"url","https://example.com"',
    ].join('\n');
    const entries = parseScheduleCSV(csvWithoutDescription);
    expect(entries[0].worldDescription).toBe('');
  });

  it('extracts confirmed status from checkbox row', () => {
    const entries = parseScheduleCSV(sampleCSV);
    expect(entries[0].confirmed).toBe(true);   // "TRUE"
    expect(entries[1].confirmed).toBe(false);  // "FALSE"
    expect(entries[2].confirmed).toBe(false);  // "" (empty → false)
  });

  it('extracts world names and creators', () => {
    const entries = parseScheduleCSV(sampleCSV);
    expect(entries[0].worldName).toBe('Stardust Piano');
    expect(entries[0].creator).toBe('nekobus_17');
    expect(entries[1].worldName).toBe('ケセドのバレンタインデイ');
  });

  it('handles empty world names', () => {
    const entries = parseScheduleCSV(sampleCSV);
    expect(entries[2].worldName).toBe('');
    expect(entries[2].creator).toBe('');
  });

  it('returns empty array for invalid CSV', () => {
    expect(parseScheduleCSV('')).toEqual([]);
    expect(parseScheduleCSV('no,schedule,data')).toEqual([]);
  });
});

describe('formatDateForSheet', () => {
  it('formats date as YYYY/MM/DD', () => {
    expect(formatDateForSheet(new Date(2026, 1, 15))).toBe('2026/02/15');
  });

  it('zero-pads single digit months and days', () => {
    expect(formatDateForSheet(new Date(2026, 0, 1))).toBe('2026/01/01');
  });
});

describe('findEntryByDate', () => {
  const entries = [
    { date: '2026/02/01', meetingNumber: 256, worldName: 'World1', creator: 'Creator1', confirmed: true, worldUrl: '', worldDescription: '' },
    { date: '2026/02/08', meetingNumber: 257, worldName: 'World2', creator: 'Creator2', confirmed: false, worldUrl: '', worldDescription: '' },
    { date: '2026/02/15', meetingNumber: null, worldName: '', creator: '', confirmed: false, worldUrl: '', worldDescription: '' },
  ];

  it('finds entry matching date', () => {
    const result = findEntryByDate(entries, new Date(2026, 1, 8));
    expect(result?.meetingNumber).toBe(257);
    expect(result?.worldName).toBe('World2');
  });

  it('returns undefined for non-matching date', () => {
    expect(findEntryByDate(entries, new Date(2026, 1, 22))).toBeUndefined();
  });
});

describe('deriveSkippedDates', () => {
  const entries = [
    { date: '2026/01/25', meetingNumber: null, worldName: '', creator: '', confirmed: false, worldUrl: '', worldDescription: '' },
    { date: '2026/02/01', meetingNumber: 256, worldName: 'World', creator: 'Creator', confirmed: true, worldUrl: '', worldDescription: '' },
    { date: '2026/02/22', meetingNumber: null, worldName: '', creator: '', confirmed: false, worldUrl: '', worldDescription: '' },
  ];

  it('extracts dates with null meeting numbers', () => {
    const skipped = deriveSkippedDates(entries);
    expect(skipped).toHaveLength(2);
    expect(skipped[0].getMonth()).toBe(0); // January
    expect(skipped[0].getDate()).toBe(25);
    expect(skipped[1].getMonth()).toBe(1); // February
    expect(skipped[1].getDate()).toBe(22);
  });

  it('returns empty array when no skipped dates', () => {
    const noSkips = [
      { date: '2026/02/01', meetingNumber: 256, worldName: 'W', creator: 'C', confirmed: true, worldUrl: '', worldDescription: '' },
    ];
    expect(deriveSkippedDates(noSkips)).toEqual([]);
  });
});

describe('generateScheduleAnnouncement', () => {
  const entries = [
    { date: '2025/12/21', meetingNumber: 253, worldName: 'W1', creator: 'C1', confirmed: true, worldUrl: '', worldDescription: '' },
    { date: '2025/12/28', meetingNumber: null, worldName: '', creator: '', confirmed: false, worldUrl: '', worldDescription: '' },
    { date: '2026/01/04', meetingNumber: null, worldName: '', creator: '', confirmed: false, worldUrl: '', worldDescription: '' },
    { date: '2026/01/11', meetingNumber: 254, worldName: 'W2', creator: 'C2', confirmed: true, worldUrl: '', worldDescription: '' },
    { date: '2026/01/18', meetingNumber: 255, worldName: 'W3', creator: 'C3', confirmed: true, worldUrl: '', worldDescription: '' },
    { date: '2026/01/25', meetingNumber: null, worldName: '', creator: '', confirmed: false, worldUrl: '', worldDescription: '' },
    { date: '2026/02/01', meetingNumber: 256, worldName: 'W4', creator: 'C4', confirmed: true, worldUrl: '', worldDescription: '' },
  ];

  it('generates announcement starting from the next Sunday', () => {
    // Wednesday Dec 17, 2025 → next Sunday is Dec 21
    const result = generateScheduleAnnouncement(entries, new Date(2025, 11, 17));
    expect(result).toContain('#あ茶会 12月の予定をお知らせします');
    expect(result).toContain('12/21 🍵');
    expect(result).toContain('12/28 - お休み -');
  });

  it('marks skipped dates with お休み', () => {
    const result = generateScheduleAnnouncement(entries, new Date(2025, 11, 17));
    expect(result).toContain('12/28 - お休み -');
    expect(result).toContain('1/4 - お休み -');
  });

  it('adds year-first annotation for the first active event of a new year', () => {
    // Start from Dec 21 → 12/21 is active in 2025, so 1/11 is first active in 2026
    const result = generateScheduleAnnouncement(entries, new Date(2025, 11, 17));
    expect(result).toContain('1/11 🍵（2026年初）');
  });

  it('does not add year-first annotation when the year already had an active event before range', () => {
    // Start from Jan 11 → 2026 already had no active event before,
    // but 2025 had one (12/21), so 1/11 is first active of 2026
    const result = generateScheduleAnnouncement(entries, new Date(2026, 0, 7));
    expect(result).toContain('1/11 🍵（2026年初）');
  });

  it('does not add year-first annotation if prior active event exists in that year', () => {
    // Start from Jan 18 → 2026 already had active 1/11 before range
    const result = generateScheduleAnnouncement(entries, new Date(2026, 0, 14));
    expect(result).toContain('1/18 🍵');
    expect(result).not.toContain('1/18 🍵（2026年初）');
  });

  it('respects weeksCount parameter', () => {
    const result = generateScheduleAnnouncement(entries, new Date(2025, 11, 17), 3);
    const lines = result.split('\n').filter(l => l.match(/^\d+\//));
    expect(lines).toHaveLength(3);
  });

  it('returns empty string when no upcoming entries', () => {
    const result = generateScheduleAnnouncement(entries, new Date(2027, 0, 1));
    expect(result).toBe('');
  });

  it('uses header month from the first entry', () => {
    const result = generateScheduleAnnouncement(entries, new Date(2026, 0, 7));
    expect(result).toContain('#あ茶会 1月の予定をお知らせします');
  });
});

describe('generateDiscordWeeklyMessage', () => {
  it('確定済みエントリにはワールド名と作者を含む', () => {
    const entries = [
      { date: '2026/03/29', meetingNumber: 262, worldName: '星空の回廊', creator: 'testuser', confirmed: true, worldUrl: '', worldDescription: '' },
    ];
    const msg = generateDiscordWeeklyMessage(entries, new Date(2026, 2, 25));
    expect(msg).toContain('星空の回廊');
    expect(msg).toContain('testuser');
    expect(msg).toContain('第262回');
  });

  it('確定済みでURLがある場合はURLを含む', () => {
    const entries = [
      { date: '2026/03/29', meetingNumber: 262, worldName: '星空の回廊', creator: 'testuser', confirmed: true, worldUrl: 'https://vrchat.com/home/world/wrld_xxx', worldDescription: '' },
    ];
    const msg = generateDiscordWeeklyMessage(entries, new Date(2026, 2, 25));
    expect(msg).toContain('https://vrchat.com/home/world/wrld_xxx');
  });

  it('確定済みでURLがない場合はURLリンク行を含まない', () => {
    const entries = [
      { date: '2026/03/29', meetingNumber: 262, worldName: '星空の回廊', creator: 'testuser', confirmed: true, worldUrl: '', worldDescription: '' },
    ];
    const msg = generateDiscordWeeklyMessage(entries, new Date(2026, 2, 25));
    expect(msg).not.toContain('🔗');
  });

  it('未確定エントリには「まだ決まっていません」を含む', () => {
    const entries = [
      { date: '2026/03/29', meetingNumber: 262, worldName: '', creator: '', confirmed: false, worldUrl: '', worldDescription: '' },
    ];
    const msg = generateDiscordWeeklyMessage(entries, new Date(2026, 2, 25));
    expect(msg).toContain('まだ決まっていません');
  });

  it('お休み（meetingNumber null）には「お休み」を含む', () => {
    const entries = [
      { date: '2026/03/29', meetingNumber: null, worldName: '', creator: '', confirmed: false, worldUrl: '', worldDescription: '' },
    ];
    const msg = generateDiscordWeeklyMessage(entries, new Date(2026, 2, 25));
    expect(msg).toContain('お休み');
  });

  it('該当エントリがない場合はその旨を伝える', () => {
    const entries = [
      { date: '2026/04/05', meetingNumber: 263, worldName: 'W', creator: 'C', confirmed: true, worldUrl: '', worldDescription: '' },
    ];
    const msg = generateDiscordWeeklyMessage(entries, new Date(2026, 2, 25));
    expect(msg).toContain('予定が見つかりません');
  });

  it('水曜から次の日曜を正しく計算する', () => {
    const entries = [
      { date: '2026/03/29', meetingNumber: 262, worldName: 'テストワールド', creator: 'テスト作者', confirmed: true, worldUrl: '', worldDescription: '' },
    ];
    const msg = generateDiscordWeeklyMessage(entries, new Date(2026, 2, 25));
    expect(msg).toContain('3/29');
  });
});
