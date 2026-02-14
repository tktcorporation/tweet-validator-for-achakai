import { useState, useEffect, useCallback } from 'react';
import {
  fetchScheduleFromSheet,
  findEntryByDate,
  deriveSkippedDates,
  type ScheduleEntry,
} from '../lib/fetchSheetSchedule';

export const instrumentEmojiArray = '🎸 🎹 🥁 🎺 🎻 🎷 🪕 🪗 🎤 🎧 📯 🪘 🎼'.split(' ');

export function countTweetLength(text: string): number {
  const wideChar = /[\u1100-\u115F\u2329\u232A\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u;
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
}

export function parseStructuredFields(text: string): ParsedFields | null {
  const freeMatch = text.match(/^[\s\S]*?(?=#あ茶会)/);
  const free = freeMatch ? freeMatch[0].trim() : '';
  const locationRegex = /【場所】([^\n]+)\s*By\s*(.+?)(?:\s*$|\n)/i;
  const locationMatch = text.match(locationRegex);
  if (!locationMatch) {
    return null;
  }
  const meetingEmojiMatch = text.match(
    /第\d+回\s*(.*?)題名のないお茶会([^\n]*)/,
  );
  const instrument = meetingEmojiMatch ? meetingEmojiMatch[1].trim() : '🎸';
  const suffix = meetingEmojiMatch ? meetingEmojiMatch[2].trim() : '🏘️';
  return {
    freeText: free === '自由文' ? '' : free,
    world: locationMatch[1].trim() === 'ワールド名' ? '' : locationMatch[1].trim(),
    creator: locationMatch[2].trim() === 'クリエイター名' ? '' : locationMatch[2].trim(),
    instrument,
    suffix,
  };
}

export function buildStructuredTweet(
  template: string[],
  free: string,
  world: string,
  creator: string,
  emoji: string,
  suffix: string,
): string {
  if (!template.length) return '';
  const lines = [...template];
  lines[0] = `${free} #あ茶会`;
  return lines
    .map((line) => {
      if (line.startsWith('【場所】')) {
        return `【場所】${world} By ${creator}`;
      }
      if (line.includes('題名のないお茶会')) {
        return line.replace(
          /(第\d+回 )(.+?)(題名のないお茶会)([^\n]*)/,
          `$1${emoji}$3${suffix}`,
        );
      }
      return line;
    })
    .join('\n');
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

export function validateTweet(
  text: string,
  referenceDate = new Date('2025-12-21'),
  referenceMeetingNumber = 253,
  currentDate: Date = new Date(),
  skippedDatesOverride: Date[] = skippedDates,
) {
  const meetingRegex = /第(\d+)回/;
  const meetingMatch = text.match(meetingRegex);
  const dateRegex = /(\d+)月(\d+)日\(日\)/;
  const dateMatch = text.match(dateRegex);
  const timeRegex = /(\d{1,2}):(\d{2})〜(\d{1,2}):(\d{2})/;
  const timeMatch = text.match(timeRegex);
  const hasHashtag = text.includes('#あ茶会');
  const locationRegex = /【場所】([^\n]+)\s*By\s*(.+?)(?:\s*$|\n)/i;
  const locationMatch = text.match(locationRegex);
  const hasValidLocation = locationMatch !== null;
  const placeholdersRegex = /(ワールド名|クリエイター名|自由文)/;
  const hasPlaceholders = placeholdersRegex.test(text);
  const nightWordRegex = /(夜|宵|今宵|今夜)/;
  const hasNightWord = nightWordRegex.test(text);
  if (!dateMatch) {
    return {
      isValid: false,
      date: null,
      isSunday: false,
      hasHashtag,
      meetingNumber: null,
      isCorrectMeeting: false,
      hasTime: false,
      hasValidLocation: false,
      hasPlaceholders,
      hasNightWord,
      extractedInfo: {
        date: null,
        time: null,
        worldName: null,
        creator: null,
        meetingNumber: null,
      },
    };
  }
  const month = parseInt(dateMatch[1]);
  const day = parseInt(dateMatch[2]);
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
  const isSunday = tweetDate.getDay() === 0;
  const weeksDiff = Math.round(
    (tweetDate.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  let expectedMeetingNumber = referenceMeetingNumber + weeksDiff;
  // Count skipped dates between reference date and tweet date
  const skippedCount = skippedDatesOverride.filter(d => {
    return d > referenceDate && d <= tweetDate;
  }).length;
  expectedMeetingNumber -= skippedCount;
  const meetingNumber = meetingMatch ? parseInt(meetingMatch[1]) : null;
  const isCorrectMeeting = meetingNumber === expectedMeetingNumber;
  const time = timeMatch
    ? `${timeMatch[1]}:${timeMatch[2]}〜${timeMatch[3]}:${timeMatch[4]}`
    : null;
  return {
    isValid:
      isSunday &&
      hasHashtag &&
      isCorrectMeeting &&
      timeMatch !== null &&
      hasValidLocation &&
      !hasPlaceholders,
    date: tweetDate,
    isSunday,
    hasHashtag,
    meetingNumber,
    expectedMeetingNumber,
    isCorrectMeeting,
    hasTime: timeMatch !== null,
    hasValidLocation,
    hasPlaceholders,
    hasNightWord,
    extractedInfo: {
      date: dateMatch ? `${month}月${day}日(日)` : null,
      time,
      worldName: locationMatch ? locationMatch[1].trim() : null,
      creator: locationMatch ? locationMatch[2].trim() : null,
      meetingNumber: meetingNumber ? `第${meetingNumber}回` : null,
    },
  };
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
  const [showCopyFeedbackFor, setShowCopyFeedbackFor] = useState<string | null>(null);
  const [structuredMode, setStructuredMode] = useState(initialData.structuredMode || false);
  const [freeText, setFreeText] = useState(initialData.freeText || '');
  const [worldName, setWorldName] = useState(initialData.worldName || '');
  const [creatorName, setCreatorName] = useState(initialData.creatorName || '');
  const [instrumentEmoji, setInstrumentEmoji] = useState(initialData.instrumentEmoji || '🎸');
  const [suffixEmoji, setSuffixEmoji] = useState(initialData.suffixEmoji || '🏘️');
  const [structuredTemplate, setStructuredTemplate] = useState<string[]>(initialData.structuredTemplate || []);
  const [sheetSchedule, setSheetSchedule] = useState<ScheduleEntry[]>([]);
  const [sheetSkippedDates, setSheetSkippedDates] = useState<Date[]>(skippedDates);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

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
      setSheetError(e instanceof Error ? e.message : 'スプレッドシートの読み込みに失敗しました');
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
        ),
      );
    }
  }, [freeText, worldName, creatorName, instrumentEmoji, suffixEmoji, structuredMode, structuredTemplate]);

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
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('tweet-state', JSON.stringify(data));
    }
  }, [tweetText, structuredMode, freeText, worldName, creatorName, instrumentEmoji, suffixEmoji, structuredTemplate]);

  const referenceDate = new Date('2025-12-21');
  const referenceMeetingNumber = 253;

  const generateThisWeeksSchedule = () => {
    if (
      tweetText.trim() !== '' ||
      freeText.trim() !== '' ||
      worldName.trim() !== '' ||
      creatorName.trim() !== ''
    ) {
      const confirmed = window.confirm('現在の入力内容は上書きされます。続行しますか?');
      if (!confirmed) {
        return;
      }
    }
    setIsLoadingSchedule(true);
    setTimeout(() => {
      const today = new Date();
      const upcomingSunday = new Date(today);
      while (upcomingSunday.getDay() !== 0) {
        upcomingSunday.setDate(upcomingSunday.getDate() + 1);
      }
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
        const skippedCount = sheetSkippedDates.filter(d => {
          return d > referenceDate && d <= upcomingSunday;
        }).length;
        meetingNumber -= skippedCount;
      }

      const sheetWorld = sheetEntry?.worldName || '';
      const sheetCreator = sheetEntry?.creator || '';

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
      setStructuredMode(true);
      setIsLoadingSchedule(false);
    }, 300);
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
    setStructuredMode(false);
  };

  const switchToStructuredMode = () => {
    const parsed = parseStructuredFields(tweetText);
    if (!parsed) {
      alert('現在のテキストはテンプレートと互換性がないため、構造化編集に戻せません。');
      return;
    }
    setFreeText(parsed.freeText);
    setWorldName(parsed.world);
    setCreatorName(parsed.creator);
    setInstrumentEmoji(parsed.instrument);
    setSuffixEmoji(parsed.suffix);
    setStructuredTemplate(tweetText.split('\n'));
    setStructuredMode(true);
  };

  const validation = validateTweet(tweetText, referenceDate, referenceMeetingNumber, new Date(), sheetSkippedDates);
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
    structuredTemplate,
    generateThisWeeksSchedule,
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
  };
}

export default useTweetState;
