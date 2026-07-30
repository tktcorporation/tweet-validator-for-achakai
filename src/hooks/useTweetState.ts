import { useState, useEffect, useCallback } from 'react';
import {
  fetchScheduleFromSheet,
  findEntryByDate,
  deriveSkippedDates,
  generateScheduleAnnouncement,
  getUpcomingSunday,
  type ScheduleEntry,
} from '../lib/fetchSheetSchedule';
import {
  extractVRChatWorldId,
  fetchVRChatWorldInfo,
  type VRChatWorldInfo,
} from '../lib/fetchVRChatWorld';

export const instrumentEmojiArray =
  '🎸 🎹 🥁 🎺 🎻 🎷 🪕 🪗 🎤 🎧 📯 🪘 🎼'.split(' ');

export function countTweetLength(text: string): number {
  const wideChar =
    /[\u1100-\u115F\u2329\u232A\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u;
  let count = 0;
  for (const ch of [...text]) {
    count += wideChar.test(ch) ? 2 : 1;
  }
  return count;
}

export interface ParsedFields {
  freeText: string;
  world: string;
  creator: string;
  instrument: string;
  suffix: string;
  /** 末尾に付与されていたワールドURL。なければ空文字。 */
  worldUrl: string;
  /** 末尾のワールドURL行を取り除いた本文。structuredTemplate の再構築に使う。 */
  textWithoutUrl: string;
}

export function extractLocation(
  text: string,
): { world: string; creator: string } | null {
  const blockMatch = text.match(/【場所】([\s\S]*?)(?=\n【|\s*$)/);
  if (!blockMatch) return null;
  const block = blockMatch[1];
  const byIdx = block.lastIndexOf(' By ');
  if (byIdx === -1) return null;
  return {
    world: block.substring(0, byIdx).trim(),
    creator: block.substring(byIdx + 4).trim(),
  };
}

/** 本文の最終行が URL のみの場合、それを分離して返す。なければ null。 */
export function extractTrailingWorldUrl(
  text: string,
): { url: string; textWithoutUrl: string } | null {
  const lines = text.split('\n');
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && lines[lastIdx].trim() === '') lastIdx--;
  if (lastIdx < 0) return null;
  const lastLine = lines[lastIdx].trim();
  if (!/^https?:\/\/\S+$/.test(lastLine)) return null;

  const remaining = lines.slice(0, lastIdx);
  while (
    remaining.length > 0 &&
    remaining[remaining.length - 1].trim() === ''
  ) {
    remaining.pop();
  }
  return { url: lastLine, textWithoutUrl: remaining.join('\n') };
}

export function parseStructuredFields(text: string): ParsedFields | null {
  const trailing = extractTrailingWorldUrl(text);
  const worldUrl = trailing?.url ?? '';
  const body = trailing?.textWithoutUrl ?? text;

  const freeMatch = body.match(/^[\s\S]*?(?=#あ茶会)/);
  const free = freeMatch ? freeMatch[0].trim() : '';
  const location = extractLocation(body);
  if (!location) {
    return null;
  }
  const meetingEmojiMatch = body.match(
    /第\d+回\s*(.*?)題名のないお茶会([^\n]*)/,
  );
  const instrument = meetingEmojiMatch ? meetingEmojiMatch[1].trim() : '🎸';
  const suffix = meetingEmojiMatch ? meetingEmojiMatch[2].trim() : '🏘️';
  return {
    freeText: free === '自由文' ? '' : free,
    world: location.world === 'ワールド名' ? '' : location.world,
    creator: location.creator === 'クリエイター名' ? '' : location.creator,
    instrument,
    suffix,
    worldUrl,
    textWithoutUrl: body,
  };
}

export function buildStructuredTweet(
  template: string[],
  free: string,
  world: string,
  creator: string,
  emoji: string,
  suffix: string,
  worldUrl = '',
  includeWorldUrl = false,
): string {
  if (!template.length) return '';
  const lines = [...template];
  lines[0] = `${free} #あ茶会`;

  // Replace the entire location block (【場所】 line and any continuation lines
  // before the next 【 section). This prevents duplicates when world names
  // contain newlines (e.g. multiline values from the spreadsheet).
  const locationIdx = lines.findIndex((line) => line.startsWith('【場所】'));
  if (locationIdx !== -1) {
    let endIdx = locationIdx + 1;
    while (endIdx < lines.length && !lines[endIdx].startsWith('【')) {
      endIdx++;
    }
    const locationLines = `【場所】${world} By ${creator}`.split('\n');
    lines.splice(locationIdx, endIdx - locationIdx, ...locationLines);
  }

  const body = lines
    .map((line) => {
      if (line.includes('題名のないお茶会')) {
        return line.replace(
          /(第\d+回 )(.+?)(題名のないお茶会)([^\n]*)/,
          `$1${emoji}$3${suffix}`,
        );
      }
      return line;
    })
    .join('\n');

  if (includeWorldUrl && worldUrl.trim() !== '') {
    return `${body}\n\n${worldUrl.trim()}`;
  }
  return body;
}

// Dates when the event is skipped (holidays)
export const skippedDates = [
  new Date('2025-12-28'),
  new Date('2026-01-04'),
  new Date('2026-01-25'),
  new Date('2026-02-22'),
  new Date('2026-03-08'),
  new Date('2026-04-26'), // リアルあ茶会の日
];

export function validateTweet(text: string, currentDate: Date = new Date()) {
  const meetingRegex = /第(\d+)回/;
  const meetingMatch = text.match(meetingRegex);
  const dateRegex = /(\d+)月(\d+)日\(日\)/;
  const dateMatch = text.match(dateRegex);
  const timeRegex = /(\d{1,2}):(\d{2})〜(\d{1,2}):(\d{2})/;
  const timeMatch = text.match(timeRegex);
  const hasHashtag = text.includes('#あ茶会');
  const location = extractLocation(text);
  const hasValidLocation = location !== null;
  const placeholdersRegex = /(ワールド名|クリエイター名|自由文)/;
  const hasPlaceholders = placeholdersRegex.test(text);
  const nightWordRegex = /(夜|宵|今宵|今夜)/;
  const hasNightWord = nightWordRegex.test(text);
  const meetingNumber = meetingMatch ? parseInt(meetingMatch[1], 10) : null;
  const time = timeMatch
    ? `${timeMatch[1]}:${timeMatch[2]}〜${timeMatch[3]}:${timeMatch[4]}`
    : null;

  if (!dateMatch) {
    return {
      isValid: false,
      date: null,
      isSunday: false,
      hasHashtag,
      meetingNumber,
      hasTime: timeMatch !== null,
      hasValidLocation,
      hasPlaceholders,
      hasNightWord,
      extractedInfo: {
        date: null,
        time,
        worldName: location ? location.world : null,
        creator: location ? location.creator : null,
        meetingNumber: meetingNumber ? `第${meetingNumber}回` : null,
      },
    };
  }
  const month = parseInt(dateMatch[1], 10);
  const day = parseInt(dateMatch[2], 10);
  // Determine year dynamically: if the date has passed this year, assume next year
  const now = currentDate;
  const currentYear = now.getFullYear();
  let tweetYear = currentYear;
  const candidateThisYear = new Date(currentYear, month - 1, day);
  // If the date is more than a week in the past, assume next year
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (candidateThisYear < oneWeekAgo) {
    tweetYear = currentYear + 1;
  }
  const tweetDate = new Date(tweetYear, month - 1, day);
  // 「4月31日」等の存在しない日付は Date コンストラクタが翌月へ繰り上げてしまうため、
  // 繰り上げが起きていないか（= 入力どおりの月/日になっているか）を検証する。
  const isRealCalendarDate =
    tweetDate.getMonth() === month - 1 && tweetDate.getDate() === day;
  const isSunday = isRealCalendarDate && tweetDate.getDay() === 0;
  return {
    isValid:
      isSunday &&
      hasHashtag &&
      timeMatch !== null &&
      hasValidLocation &&
      !hasPlaceholders,
    date: tweetDate,
    isSunday,
    hasHashtag,
    meetingNumber,
    hasTime: timeMatch !== null,
    hasValidLocation,
    hasPlaceholders,
    hasNightWord,
    extractedInfo: {
      date: `${month}月${day}日(日)`,
      time,
      worldName: location ? location.world : null,
      creator: location ? location.creator : null,
      meetingNumber: meetingNumber ? `第${meetingNumber}回` : null,
    },
  };
}

/**
 * 入力中の内容がある状態でテンプレート生成を実行しようとしたとき、上書き確認ダイアログを出す。
 * 内容が空ならダイアログなしで true を返す。
 */
function confirmOverwriteIfNeeded(
  tweetText: string,
  freeText: string,
  worldName: string,
  creatorName: string,
): boolean {
  const hasContent =
    tweetText.trim() !== '' ||
    freeText.trim() !== '' ||
    worldName.trim() !== '' ||
    creatorName.trim() !== '';
  if (!hasContent) return true;
  return window.confirm('現在の入力内容は上書きされます。続行しますか?');
}

export function useTweetState() {
  let initialData: Partial<{
    tweetText: string;
    structuredMode: boolean;
    freeText: string;
    worldName: string;
    creatorName: string;
    instrumentEmoji: string;
    suffixEmoji: string;
    structuredTemplate: string[];
    worldUrl: string;
    includeWorldUrl: boolean;
  }> = {};
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('tweet-state');
    if (stored) {
      try {
        initialData = JSON.parse(stored);
      } catch {
        initialData = {};
      }
    }
  }

  const [tweetText, setTweetText] = useState(initialData.tweetText || '');
  const [charCount, setCharCount] = useState(0);
  const [animateCount, setAnimateCount] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [showCopyFeedbackFor, setShowCopyFeedbackFor] = useState<string | null>(
    null,
  );
  const [structuredMode, setStructuredMode] = useState(
    initialData.structuredMode || false,
  );
  const [freeText, setFreeText] = useState(initialData.freeText || '');
  const [worldName, setWorldName] = useState(initialData.worldName || '');
  const [creatorName, setCreatorName] = useState(initialData.creatorName || '');
  const [instrumentEmoji, setInstrumentEmoji] = useState(
    initialData.instrumentEmoji || '🎸',
  );
  const [suffixEmoji, setSuffixEmoji] = useState(
    initialData.suffixEmoji || '🏘️',
  );
  const [structuredTemplate, setStructuredTemplate] = useState<string[]>(
    initialData.structuredTemplate || [],
  );
  const [worldUrl, setWorldUrl] = useState(initialData.worldUrl || '');
  const [includeWorldUrl, setIncludeWorldUrl] = useState(
    initialData.includeWorldUrl || false,
  );
  const [sheetSchedule, setSheetSchedule] = useState<ScheduleEntry[]>([]);
  const [sheetSkippedDates, setSheetSkippedDates] =
    useState<Date[]>(skippedDates);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [vrchatWorldInfo, setVrchatWorldInfo] =
    useState<VRChatWorldInfo | null>(null);
  const [isVrchatWorldLoading, setIsVrchatWorldLoading] = useState(false);

  const loadSheetSchedule = useCallback(async () => {
    setIsSheetLoading(true);
    setSheetError(null);
    try {
      const entries = await fetchScheduleFromSheet();
      setSheetSchedule(entries);
      const derived = deriveSkippedDates(entries);
      if (derived.length > 0) {
        setSheetSkippedDates(derived);
      }
    } catch (e) {
      setSheetError(
        e instanceof Error
          ? e.message
          : 'スプレッドシートの読み込みに失敗しました',
      );
    } finally {
      setIsSheetLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSheetSchedule();
  }, [loadSheetSchedule]);

  useEffect(() => {
    setCharCount(countTweetLength(tweetText));
    setAnimateCount(true);
    const t = setTimeout(() => setAnimateCount(false), 500);
    return () => clearTimeout(t);
  }, [tweetText]);

  useEffect(() => {
    if (structuredMode) {
      setTweetText(
        buildStructuredTweet(
          structuredTemplate,
          freeText,
          worldName,
          creatorName,
          instrumentEmoji,
          suffixEmoji,
          worldUrl,
          includeWorldUrl,
        ),
      );
    }
  }, [
    freeText,
    worldName,
    creatorName,
    instrumentEmoji,
    suffixEmoji,
    structuredMode,
    structuredTemplate,
    worldUrl,
    includeWorldUrl,
  ]);

  useEffect(() => {
    const data = {
      tweetText,
      structuredMode,
      freeText,
      worldName,
      creatorName,
      instrumentEmoji,
      suffixEmoji,
      structuredTemplate,
      worldUrl,
      includeWorldUrl,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('tweet-state', JSON.stringify(data));
    }
  }, [
    tweetText,
    structuredMode,
    freeText,
    worldName,
    creatorName,
    instrumentEmoji,
    suffixEmoji,
    structuredTemplate,
    worldUrl,
    includeWorldUrl,
  ]);

  const referenceDate = new Date('2025-12-21');
  const referenceMeetingNumber = 253;

  // 今週（直近の日曜日）のスケジュールエントリを取得
  const upcomingSunday = getUpcomingSunday();
  const thisWeekEntry = findEntryByDate(sheetSchedule, upcomingSunday);

  // 今週エントリのURLが変わるたびに VRChat API からワールド詳細を取得する。
  // thisWeekEntry の宣言より後に配置することで TDZ エラーを防ぐ。
  // CORS またはセッション未ログイン時は null のまま（フォールバック表示に任せる）。
  useEffect(() => {
    const url = thisWeekEntry?.worldUrl;
    if (!url) {
      setVrchatWorldInfo(null);
      return;
    }
    const worldId = extractVRChatWorldId(url);
    if (!worldId) {
      setVrchatWorldInfo(null);
      return;
    }
    setIsVrchatWorldLoading(true);
    setVrchatWorldInfo(null);
    fetchVRChatWorldInfo(worldId).then((info) => {
      setVrchatWorldInfo(info);
      setIsVrchatWorldLoading(false);
    });
  }, [thisWeekEntry?.worldUrl]);

  const generateThisWeeksSchedule = () => {
    if (
      !confirmOverwriteIfNeeded(tweetText, freeText, worldName, creatorName)
    ) {
      return;
    }
    setIsLoadingSchedule(true);
    setTimeout(() => {
      const upcomingSunday = getUpcomingSunday();
      const month = upcomingSunday.getMonth() + 1;
      const day = upcomingSunday.getDate();

      // Try to find this week's entry from the sheet
      const sheetEntry = findEntryByDate(sheetSchedule, upcomingSunday);

      let meetingNumber: number;
      if (sheetEntry?.meetingNumber) {
        meetingNumber = sheetEntry.meetingNumber;
      } else {
        const weeksDiff = Math.round(
          (upcomingSunday.getTime() - referenceDate.getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        );
        meetingNumber = referenceMeetingNumber + weeksDiff;
        const skippedCount = sheetSkippedDates.filter((d) => {
          return d > referenceDate && d <= upcomingSunday;
        }).length;
        meetingNumber -= skippedCount;
      }

      const sheetWorld = sheetEntry?.worldName || '';
      const sheetCreator = sheetEntry?.creator || '';
      const sheetWorldUrl = sheetEntry?.worldUrl || '';

      const template =
        `自由文 #あ茶会\n\n` +
        `第${meetingNumber}回 ${instrumentEmoji}題名のないお茶会${suffixEmoji}\n` +
        `【日時】${month}月${day}日(日) 14:30〜16:00\n` +
        `【場所】${sheetWorld || 'ワールド名'} By ${sheetCreator || 'クリエイター名'}\n` +
        `【参加方法】Group＋「題名のないお茶会」にjoin`;
      setTweetText(template);
      setStructuredTemplate(template.split('\n'));
      setFreeText('');
      setWorldName(sheetWorld);
      setCreatorName(sheetCreator);
      setWorldUrl(sheetWorldUrl);
      setStructuredMode(true);
      setIsLoadingSchedule(false);
    }, 300);
  };

  const generateScheduleAnnouncementTweet = () => {
    if (
      !confirmOverwriteIfNeeded(tweetText, freeText, worldName, creatorName)
    ) {
      return;
    }
    const announcement = generateScheduleAnnouncement(sheetSchedule);
    if (!announcement) {
      alert('予定データがありません。スプレッドシートを読み込んでください。');
      return;
    }
    setTweetText(announcement);
    setStructuredMode(false);
    setStructuredTemplate([]);
    setFreeText('');
    setWorldName('');
    setCreatorName('');
  };

  const handleEmojiCopy = (emoji: string) => {
    navigator.clipboard
      .writeText(emoji)
      .then(() => {
        setShowCopyFeedbackFor(emoji);
        setTimeout(() => {
          setShowCopyFeedbackFor(null);
        }, 1500);
      })
      .catch((err) => console.error('Failed to copy emoji: ', err));
  };

  const handleTweetCopy = () => {
    if (validation.hasNightWord) {
      const confirmed = window.confirm(
        'ツイートに夜を連想させる言葉が含まれていますが、このままコピーしますか？ (開催は昼の時間帯です)',
      );
      if (!confirmed) {
        return;
      }
    }
    navigator.clipboard
      .writeText(tweetText)
      .then(() => {
        setShowCopyFeedbackFor('tweet');
        setTimeout(() => setShowCopyFeedbackFor(null), 1500);
      })
      .catch((err) => console.error('Failed to copy text: ', err));
  };

  const clearStoredData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tweet-state');
    }
    setTweetText('');
    setFreeText('');
    setWorldName('');
    setCreatorName('');
    setInstrumentEmoji('🎸');
    setSuffixEmoji('🏘️');
    setStructuredTemplate([]);
    setWorldUrl('');
    setIncludeWorldUrl(false);
    setStructuredMode(false);
  };

  const switchToStructuredMode = () => {
    const parsed = parseStructuredFields(tweetText);
    if (!parsed) {
      alert(
        '現在のテキストはテンプレートと互換性がないため、構造化編集に戻せません。',
      );
      return;
    }
    setFreeText(parsed.freeText);
    setWorldName(parsed.world);
    setCreatorName(parsed.creator);
    setInstrumentEmoji(parsed.instrument);
    setSuffixEmoji(parsed.suffix);
    setWorldUrl(parsed.worldUrl);
    setIncludeWorldUrl(parsed.worldUrl !== '');
    setStructuredTemplate(parsed.textWithoutUrl.split('\n'));
    setStructuredMode(true);
  };

  const validation = validateTweet(tweetText, new Date());
  const tweetLength = countTweetLength(tweetText);
  const maxTweetLength = 280;

  // 期限切れ判定: 予定日付が今日より前なら期限切れ
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isScheduleExpired = validation.date !== null && validation.date < today;

  return {
    tweetText,
    setTweetText,
    charCount,
    animateCount,
    isLoadingSchedule,
    showCopyFeedbackFor,
    structuredMode,
    setStructuredMode,
    freeText,
    setFreeText,
    worldName,
    setWorldName,
    creatorName,
    setCreatorName,
    instrumentEmoji,
    setInstrumentEmoji,
    suffixEmoji,
    setSuffixEmoji,
    worldUrl,
    setWorldUrl,
    includeWorldUrl,
    setIncludeWorldUrl,
    generateThisWeeksSchedule,
    generateScheduleAnnouncementTweet,
    handleEmojiCopy,
    handleTweetCopy,
    switchToStructuredMode,
    clearStoredData,
    validation,
    tweetLength,
    maxTweetLength,
    isScheduleExpired,
    isSheetLoading,
    sheetError,
    sheetSchedule,
    loadSheetSchedule,
    thisWeekEntry,
    vrchatWorldInfo,
    isVrchatWorldLoading,
  };
}

export default useTweetState;
