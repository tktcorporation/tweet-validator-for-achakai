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
      isValid: isSunday && hasHashtag && isCorrectMeeting && timeMatch !== null && hasValidLocation,
      date: tweetDate,
      isSunday,
      hasHashtag,
      meetingNumber,
      expectedMeetingNumber,
      isCorrectMeeting,
      hasTime: timeMatch !== null,
      hasValidLocation,
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
          <h1 className="text-5xl font-extrabold text-brand-primary">
            あ茶会 Tweet Validator
          </h1>
        </header>
        
        <section className="bg-neutral-light rounded-xl shadow-2xl p-8 mb-10">
          <label htmlFor="tweetTextArea" className="block text-lg font-semibold text-neutral-dark mb-3">
            ツイートテキスト
          </label>
          <button
            onClick={generateThisWeeksSchedule}
            disabled={isLoadingSchedule}
            className="mb-6 px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-opacity-85 transition-all duration-150 text-base font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-75 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center w-full sm:w-auto"
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
          
          <div className="mb-4 p-4 border border-neutral-medium/50 rounded-lg bg-neutral-ultralight/50">
            <h3 className="text-sm font-semibold text-neutral-dark mb-3">楽器の絵文字候補 (クリックしてコピー):</h3>
            <div className="flex flex-wrap gap-2">
              {instrumentEmojiArray.map((emoji, index) => (
                <div key={index} className="relative">
                  <button
                    onClick={() => handleEmojiCopy(emoji)}
                    className="p-2 text-2xl bg-white rounded-md shadow-sm hover:bg-neutral-light transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    aria-label={`Copy emoji ${emoji}`}
                  >
                    {emoji}
                  </button>
                  {showCopyFeedbackFor === emoji && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-neutral-dark text-white px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                      Copied!
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3 text-sm text-right text-neutral-dark">
             <span className={`font-mono ${animateCount ? 'animate-pulse-fade' : ''}`}>文字数: {charCount}</span>
          </div>
          <textarea
            id="tweetTextArea"
            value={tweetText}
            onChange={(e) => setTweetText(e.target.value)}
            className="w-full h-56 p-4 border border-neutral-medium rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-brand-accent bg-white text-neutral-dark text-base shadow-sm"
            placeholder="ここにツイートを入力してください..."
          />
          <div
            className={`mt-3 text-sm text-right font-medium ${
              tweetLength > maxTweetLength ? 'text-red-500' : 'text-neutral-medium'
            }`}
          >
            {tweetLength} / {maxTweetLength}
          </div>
        </section>

        <section className="bg-neutral-light rounded-xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-brand-secondary mb-8 text-center">検証結果</h2>
          
          <div className="space-y-5">
            {[
              { Icon: Calendar, label: "日曜日の日付", isValid: validation.isSunday, dataTestId: "validation-date" },
              { Icon: Clock, label: "時間が含まれている", isValid: validation.hasTime, dataTestId: "validation-time" },
              { Icon: MapPin, label: "有効な場所形式が含まれている", isValid: validation.hasValidLocation, dataTestId: "validation-location" },
              { Icon: Hash, label: "#あ茶会 ハッシュタグが含まれている", isValid: validation.hasHashtag, dataTestId: "validation-hashtag" },
            ].map(({ Icon, label, isValid, dataTestId }) => (
              <div key={label} data-testid={dataTestId} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-brand-primary" />
                  <span className="text-neutral-dark text-base">{label}</span>
                </div>
                {isValid ? 
                  <CheckCircle className="w-7 h-7 text-green-500" /> : 
                  <XCircle className="w-7 h-7 text-red-500" />
                }
              </div>
            ))}

            <div data-testid="validation-meeting-number" className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center font-bold text-brand-primary text-xl">#</span>
                <span className="text-neutral-dark text-base">開催回数</span>
              </div>
              {validation.isCorrectMeeting ? (
                <CheckCircle className="w-7 h-7 text-green-500" />
              ) : (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-xs font-semibold">
                  {validation.meetingNumber !== null
                    ? `第${validation.expectedMeetingNumber}回であるべきです`
                    : '開催回数が欠落しています'}
                </span>
              )}
            </div>
          </div>

          {validation.isValid && (
            <div className="mt-8 p-6 bg-white rounded-lg shadow">
              <h3 className="text-xl font-bold text-brand-secondary mb-4">抽出された情報:</h3>
              <dl className="space-y-3 text-neutral-dark text-base">
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-20">会議:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.meetingNumber}</dd>
                </div>
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-20">日付:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.date}</dd>
                </div>
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-20">時間:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.time}</dd>
                </div>
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-20">ワールド:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.worldName}</dd>
                </div>
                <div className="flex gap-2 items-baseline">
                  <dt className="font-bold text-neutral-dark w-20">クリエイター:</dt>
                  <dd className="text-neutral-dark flex-1">{validation.extractedInfo.creator}</dd>
                </div>
              </dl>
            </div>
          )}

          <div
            className="mt-10 p-5 rounded-lg text-center text-2xl font-semibold shadow-inner flex items-center justify-center"
            style={{
              background: validation.isValid
                ? 'rgba(20, 184, 166, 0.15)' // brand-primary with more alpha
                : 'rgba(255, 127, 80, 0.15)', // brand-secondary with more alpha
            }}
          >
            {validation.isValid ? (
              <div className="text-brand-primary flex items-center">
                <CheckCircle className="w-8 h-8 inline-block mr-3 align-middle" />
                <span>✨ ツイートは有効です！ ✨</span>
              </div>
            ) : (
              <div className="text-brand-secondary flex items-center">
                <XCircle className="w-8 h-8 inline-block mr-3 align-middle" />
                <span>ツイートに調整が必要です</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
