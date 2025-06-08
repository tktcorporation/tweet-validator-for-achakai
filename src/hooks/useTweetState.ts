import { useState, useEffect } from 'react';

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
}

export function parseStructuredFields(text: string): ParsedFields | null {
  const freeMatch = text.match(/^[\s\S]*?(?=#あ茶会)/);
  const free = freeMatch ? freeMatch[0].trim() : '';
  const locationRegex = /【場所】([^\n]+)\s*By\s*(.+?)(?:\s*$|\n)/i;
  const locationMatch = text.match(locationRegex);
  if (!locationMatch) {
    return null;
  }
  const meetingEmojiMatch = text.match(/第\d+回\s*(.*?)題名のないお茶会/);
  const instrument = meetingEmojiMatch ? meetingEmojiMatch[1].trim() : '🎸';
  return {
    freeText: free === '自由文' ? '' : free,
    world: locationMatch[1].trim() === 'ワールド名' ? '' : locationMatch[1].trim(),
    creator: locationMatch[2].trim() === 'クリエイター名' ? '' : locationMatch[2].trim(),
    instrument,
  };
}

export function buildStructuredTweet(
  template: string[],
  free: string,
  world: string,
  creator: string,
  emoji: string,
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
        return line.replace(/(第\d+回 )(.+?)(題名のないお茶会)/, `$1${emoji}$3`);
      }
      return line;
    })
    .join('\n');
}

export function validateTweet(
  text: string,
  referenceDate = new Date('2025-02-02'),
  referenceMeetingNumber = 208,
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
  const tweetDate = new Date(2025, month - 1, day);
  const isSunday = tweetDate.getDay() === 0;
  const weeksDiff = Math.round(
    (tweetDate.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  const expectedMeetingNumber = referenceMeetingNumber + weeksDiff;
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
  const [tweetText, setTweetText] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [animateCount, setAnimateCount] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [showCopyFeedbackFor, setShowCopyFeedbackFor] = useState<string | null>(null);
  const [structuredMode, setStructuredMode] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [worldName, setWorldName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [instrumentEmoji, setInstrumentEmoji] = useState('🎸');
  const [structuredTemplate, setStructuredTemplate] = useState<string[]>([]);

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
        ),
      );
    }
  }, [freeText, worldName, creatorName, instrumentEmoji, structuredMode, structuredTemplate]);

  const referenceDate = new Date('2025-02-02');
  const referenceMeetingNumber = 208;

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
      const weeksDiff = Math.round(
        (upcomingSunday.getTime() - referenceDate.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
      const meetingNumber = referenceMeetingNumber + weeksDiff;
      const template =
        `自由文 #あ茶会\n\n` +
        `第${meetingNumber}回 ${instrumentEmoji}題名のないお茶会🏘️\n` +
        `【日時】${month}月${day}日(日) 14:30〜16:00\n` +
        `【場所】ワールド名 By クリエイター名\n` +
        `【参加方法】Group＋「題名のないお茶会」にjoin`;
      setTweetText(template);
      setStructuredTemplate(template.split('\n'));
      setFreeText('');
      setWorldName('');
      setCreatorName('');
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
    navigator.clipboard
      .writeText(tweetText)
      .then(() => {
        setShowCopyFeedbackFor('tweet');
        setTimeout(() => setShowCopyFeedbackFor(null), 1500);
      })
      .catch((err) => console.error('Failed to copy text: ', err));
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
    setStructuredTemplate(tweetText.split('\n'));
    setStructuredMode(true);
  };

  const validation = validateTweet(tweetText, referenceDate, referenceMeetingNumber);
  const tweetLength = countTweetLength(tweetText);
  const maxTweetLength = 280;

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
    structuredTemplate,
    generateThisWeeksSchedule,
    handleEmojiCopy,
    handleTweetCopy,
    switchToStructuredMode,
    validation,
    tweetLength,
    maxTweetLength,
  };
}

export default useTweetState;
