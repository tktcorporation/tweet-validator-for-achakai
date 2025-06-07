import React, { useState, useEffect } from 'react';
import { Calendar, Hash, CheckCircle, XCircle, Clock, MapPin, Loader2 } from 'lucide-react';

function countTweetLength(text: string): number {
  // Approximate Twitter's weighted character count where certain
  // wide characters count as 2. This follows the ranges used by
  // the Twitter Text library.
  const wideChar = /[\u1100-\u115F\u2329\u232A\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u;
  let count = 0;
  for (const ch of [...text]) {
    count += wideChar.test(ch) ? 2 : 1;
  }
  return count;
}

function App() {
  const [tweetText, setTweetText] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [animateCount, setAnimateCount] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [showCopyFeedbackFor, setShowCopyFeedbackFor] = useState<string | null>(null);
  const [structuredMode, setStructuredMode] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [worldName, setWorldName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [structuredTemplate, setStructuredTemplate] = useState<string[]>([]);

  const instrumentEmojiArray = '🎸 🎹 🥁 🎺 🎻 🎷 🪕 🪗 🎤 🎧 📯 🪘 🎼'.split(' ');

  useEffect(() => {
    // Using countTweetLength for the simple char count as well for consistency,
    // though the original only used .length. This should be fine.
    setCharCount(countTweetLength(tweetText));
    setAnimateCount(true);
    // Slightly longer animation time to match the new pulse-fade duration
    const t = setTimeout(() => setAnimateCount(false), 500);
    return () => clearTimeout(t);
  }, [tweetText]);

  useEffect(() => {
    if (structuredMode) {
      setTweetText(buildStructuredTweet(freeText, worldName, creatorName));
    }
  }, [freeText, worldName, creatorName, structuredMode]);

  // Reference point: Meeting #208 on 2025-02-02
  const referenceDate = new Date('2025-02-02');
  const referenceMeetingNumber = 208;

  const generateThisWeeksSchedule = () => {
    setIsLoadingSchedule(true);
    // Simulate a short delay for visual feedback, as the actual operation is very fast
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
          (7 * 24 * 60 * 60 * 1000)
      );
      const meetingNumber = referenceMeetingNumber + weeksDiff;

      const template =
        `自由文 #あ茶会\n\n` +
        `第${meetingNumber}回 🎸題名のないお茶会🏘️\n` +
        `【日時】${month}月${day}日(日) 14:30〜16:00\n` +
        `【場所】ワールド名 By クリエイター名\n` +
        `【参加方法】Group＋「題名のないお茶会」にjoin`;
      setTweetText(template);
      setFreeText('');
      setWorldName('');
      setCreatorName('');
      setStructuredMode(true);
      setIsLoadingSchedule(false);
    }, 300); // 300ms delay
  };

  const handleEmojiCopy = (emoji: string) => {
    navigator.clipboard.writeText(emoji).then(() => {
      setShowCopyFeedbackFor(emoji);
      setTimeout(() => {
        setShowCopyFeedbackFor(null);
      }, 1500);
    }).catch(err => console.error('Failed to copy emoji: ', err));
  };

  const handleTweetCopy = () => {
    navigator.clipboard.writeText(tweetText).then(() => {
      setShowCopyFeedbackFor('tweet');
      setTimeout(() => setShowCopyFeedbackFor(null), 1500);
    }).catch(err => console.error('Failed to copy text: ', err));
  };

  const parseStructuredFields = (text: string) => {
    const free = text.split('\n')[0]?.replace('#あ茶会', '').trim() || '';
    const locationRegex = /【場所】([^\n]+)\s*By\s*(.+?)(?:\s*$|\n)/i;
    const locationMatch = text.match(locationRegex);
    if (!locationMatch) {
      return null;
    }
    return {
      freeText: free === '自由文' ? '' : free,
      world: locationMatch[1].trim() === 'ワールド名' ? '' : locationMatch[1].trim(),
      creator: locationMatch[2].trim() === 'クリエイター名' ? '' : locationMatch[2].trim(),
    };
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
    setStructuredTemplate(tweetText.split('\n'));
    setStructuredMode(true);
  };

  const buildStructuredTweet = (free: string, world: string, creator: string) => {
    if (!structuredTemplate.length) return tweetText;
    const lines = [...structuredTemplate];
    lines[0] = `${free} #あ茶会`;
    return lines
      .map((line) =>
        line.startsWith('【場所】')
          ? `【場所】${world} By ${creator}`
          : line,
      )
      .join('\n');
  };

  const validateTweet = (text: string) => {
    // Extract meeting number (第N回)
    const meetingRegex = /第(\d+)回/;
    const meetingMatch = text.match(meetingRegex);

    // Extract date (M月D日)
    const dateRegex = /(\d+)月(\d+)日\(日\)/;
    const dateMatch = text.match(dateRegex);

    // Extract time (HH:MM〜HH:MM)
    const timeRegex = /(\d{1,2}):(\d{2})〜(\d{1,2}):(\d{2})/;
    const timeMatch = text.match(timeRegex);

    // Check hashtag
    const hasHashtag = text.includes('#あ茶会');

    // Extract location with world name and creator. The world name may include
    // the letter "B", so capture everything up to a line break instead of
    // excluding that character.
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
          meetingNumber: null
        }
      };
    }

    // Convert Japanese date to full date (assuming 2025)
    const month = parseInt(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const tweetDate = new Date(2025, month - 1, day);
    const isSunday = tweetDate.getDay() === 0;

    // Calculate expected meeting number
    const weeksDiff = Math.round((tweetDate.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const expectedMeetingNumber = referenceMeetingNumber + weeksDiff;

    const meetingNumber = meetingMatch ? parseInt(meetingMatch[1]) : null;
    const isCorrectMeeting = meetingNumber === expectedMeetingNumber;

    // Format time
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
        meetingNumber: meetingNumber ? `第${meetingNumber}回` : null
      }
    };
  };

  const validation = validateTweet(tweetText);
  const tweetLength = countTweetLength(tweetText);
  const maxTweetLength = 280;

  return (
    <div className="min-h-screen bg-neutral-ultralight py-16 px-6 sm:px-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-brand-primary"> {/* Changed text-5xl to text-4xl */}
            あ茶会 Tweet Validator
          </h1>
        </header>
        
        <section className="bg-neutral-light rounded-xl shadow-2xl p-6 md:p-8 mb-8"> {/* Adjusted padding and mb */}
          <label htmlFor="tweetTextArea" className="block text-lg font-semibold text-neutral-dark mb-3">
            ツイートテキスト
          </label>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={generateThisWeeksSchedule}
              disabled={isLoadingSchedule}
              className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-opacity-85 transition-all duration-150 text-base font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-75 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoadingSchedule ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                '今週の予定を生成'
              )}
            </button>
            <button
              onClick={structuredMode ? () => setStructuredMode(false) : switchToStructuredMode}
              className="px-4 py-3 bg-brand-secondary text-white rounded-lg hover:bg-opacity-85 transition-all duration-150 text-base font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              {structuredMode ? '直接編集へ' : '項目ごとに編集'}
            </button>
            <div className="flex flex-col items-center relative">
              <button
                onClick={handleTweetCopy}
                disabled={validation.hasPlaceholders}
                className="px-4 py-3 bg-neutral-medium text-white rounded-lg hover:bg-opacity-85 transition-all duration-150 text-base font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:opacity-70 disabled:cursor-not-allowed"
              >
                全文コピー
              </button>
              {showCopyFeedbackFor === 'tweet' && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-neutral-dark text-white px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap z-10">
                  Copied!
                </span>
              )}
              {validation.hasPlaceholders && (
                <span className="mt-1 text-xs text-red-500">プレイスホルダーを埋めてください</span>
              )}
            </div>
          </div>

          {/* New Emoji Helper Section */}
          <div className="mb-4">
            <span className="text-sm font-semibold text-neutral-dark mb-1">楽器絵文字:</span>
            <div className="flex overflow-x-auto gap-2 py-2 scrollbar-thin scrollbar-thumb-neutral-medium/50 scrollbar-track-neutral-light">
              {instrumentEmojiArray.map((emoji, index) => (
                <div key={index} className="relative">
                  <button
                    onClick={() => handleEmojiCopy(emoji)}
                    className="p-1.5 text-xl bg-white rounded-md shadow-sm hover:bg-neutral-medium/20 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-accent" // Adjusted padding and text size
                    aria-label={`Copy emoji ${emoji}`}
                  >
                    {emoji}
                  </button>
                  {showCopyFeedbackFor === emoji && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-neutral-dark text-white px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap z-10">
                      Copied!
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-2 text-sm text-right text-neutral-dark"> {/* Adjusted mb */}
             <span className={`font-mono ${animateCount ? 'animate-pulse-fade' : ''}`}>文字数: {charCount}</span>
          </div>
          {structuredMode ? (
            <div className="space-y-2">
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                className="w-full p-2 border border-neutral-medium rounded-md focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                placeholder="自由文"
              />
              <input
                type="text"
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
                className="w-full p-2 border border-neutral-medium rounded-md focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                placeholder="ワールド名"
              />
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="w-full p-2 border border-neutral-medium rounded-md focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                placeholder="クリエイター名"
              />
              <textarea
                readOnly
                value={tweetText}
                className="w-full h-48 p-3 border border-neutral-medium rounded-lg bg-neutral-ultralight text-neutral-dark text-base shadow-sm"
              />
            </div>
          ) : (
            <textarea
              id="tweetTextArea"
              value={tweetText}
              onChange={(e) => setTweetText(e.target.value)}
              className={`w-full h-48 p-3 border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-white text-neutral-dark text-base shadow-sm ${validation.hasPlaceholders ? 'border-red-500' : 'border-neutral-medium'}`}
              placeholder="ここにツイートを入力してください..."
            />
          )}
          <div
            className={`mt-2 text-sm text-right font-medium ${ // Adjusted mt
              tweetLength > maxTweetLength ? 'text-red-500' : 'text-neutral-medium'
            }`}
          >
            {tweetLength} / {maxTweetLength}
          </div>
        </section>

        {/* Dynamic Validation Results & Extracted Information Section */}
        <div className="bg-neutral-light rounded-xl shadow-2xl p-4 md:p-6 mt-8"> {/* Adjusted padding and mt */}
          {!validation.isValid ? (
            <>
              <h2 className="text-2xl font-bold text-brand-secondary mb-6 text-center">検証結果</h2>
              <div className="space-y-3">
                {[ 
                  { Icon: Calendar, label: "日曜日の日付", isValid: validation.isSunday, dataTestId: "validation-date" },
                  { Icon: Clock, label: "時間が含まれている", isValid: validation.hasTime, dataTestId: "validation-time" },
                  { Icon: MapPin, label: "有効な場所形式が含まれている", isValid: validation.hasValidLocation, dataTestId: "validation-location" },
                  { Icon: Hash, label: "#あ茶会 ハッシュタグが含まれている", isValid: validation.hasHashtag, dataTestId: "validation-hashtag" },
                  { Icon: Hash, label: "プレイスホルダーが残っていない", isValid: !validation.hasPlaceholders, dataTestId: "validation-placeholder" },
                ].map(({ Icon, label, isValid, dataTestId }) => (
                  <div key={label} data-testid={dataTestId} className="flex items-center justify-between py-2 border-b border-neutral-medium/30">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-brand-primary" />
                      <span className="text-neutral-dark text-sm">{label}</span>
                    </div>
                    {isValid ? 
                      <CheckCircle className="w-6 h-6 text-green-500" /> : 
                      <XCircle className="w-6 h-6 text-red-500" />
                    }
                  </div>
                ))}
                <div data-testid="validation-meeting-number" className="flex items-center justify-between py-2 border-b border-neutral-medium/30">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center font-bold text-brand-primary text-lg">#</span>
                    <span className="text-neutral-dark text-sm">開催回数</span>
                  </div>
                  {validation.isCorrectMeeting ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <span className="text-xs text-red-500 font-medium ml-auto pl-2">
                      {validation.meetingNumber !== null
                        ? `第${validation.expectedMeetingNumber}回であるべきです`
                        : '開催回数が欠落しています'}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-6 p-4 rounded-lg text-center text-xl font-semibold flex items-center justify-center bg-brand-secondary/10 text-brand-secondary">
                <XCircle className="w-7 h-7 inline-block mr-2" />
                <span>ツイートに調整が必要です</span>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-lg text-center text-xl font-semibold flex items-center justify-center bg-brand-primary/10 text-brand-primary mb-6">
                <CheckCircle className="w-7 h-7 inline-block mr-2" />
                <span>✨ ツイートは有効です！ ✨</span>
              </div>
              <h3 className="text-lg font-bold text-neutral-dark mb-3">抽出された情報:</h3>
              <dl className="space-y-2 text-sm"> {/* Adjusted space and text size */}
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-24 shrink-0">会議:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.meetingNumber}</dd>
                </div>
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-24 shrink-0">日付:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.date}</dd>
                </div>
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-24 shrink-0">時間:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.time}</dd>
                </div>
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-24 shrink-0">ワールド:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.worldName}</dd>
                </div>
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-24 shrink-0">クリエイター:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.creator}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
