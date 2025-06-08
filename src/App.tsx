import React from 'react';
import { Calendar, Hash, CheckCircle, XCircle, Clock, MapPin, Loader2 } from 'lucide-react';
import useTweetState, { instrumentEmojiArray } from './hooks/useTweetState';

function App() {
  const {
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
    generateThisWeeksSchedule,
    handleEmojiCopy,
    handleTweetCopy,
    switchToStructuredMode,
    validation,
    tweetLength,
    maxTweetLength,
  } = useTweetState();

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
                    onClick={() => {
                      setInstrumentEmoji(emoji);
                      handleEmojiCopy(emoji);
                    }}
                    className="p-1.5 text-xl bg-white rounded-md shadow-sm hover:bg-neutral-medium/20 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    aria-label={`Select emoji ${emoji}`}
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
            <div className="space-y-4">
              <div>
                <label htmlFor="freeTextInput" className="block text-sm font-semibold text-neutral-dark mb-1">
                  自由文
                </label>
                <input
                  id="freeTextInput"
                  type="text"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  className="w-full p-2 border border-neutral-medium rounded-md focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                  placeholder="自由文"
                />
              </div>
              <div>
                <label htmlFor="instrumentEmojiInput" className="block text-sm font-semibold text-neutral-dark mb-1">
                  お茶会絵文字
                </label>
                <input
                  id="instrumentEmojiInput"
                  type="text"
                  value={instrumentEmoji}
                  onChange={(e) => setInstrumentEmoji(e.target.value)}
                  className="w-full p-2 border border-neutral-medium rounded-md focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                  placeholder="🎸"
                />
              </div>
              <div>
                <label htmlFor="worldNameInput" className="block text-sm font-semibold text-neutral-dark mb-1">
                  ワールド名
                </label>
                <input
                  id="worldNameInput"
                  type="text"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  className="w-full p-2 border border-neutral-medium rounded-md focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                  placeholder="ワールド名"
                />
              </div>
              <div>
                <label htmlFor="creatorNameInput" className="block text-sm font-semibold text-neutral-dark mb-1">
                  クリエイター名
                </label>
                <input
                  id="creatorNameInput"
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  className="w-full p-2 border border-neutral-medium rounded-md focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                  placeholder="クリエイター名"
                />
              </div>
              <div>
                <label htmlFor="tweetTemplate" className="block text-sm font-semibold text-neutral-dark mb-1">
                  生成されたテンプレート
                </label>
                <textarea
                  id="tweetTemplate"
                  readOnly
                  value={tweetText}
                  className="w-full h-48 p-3 border border-neutral-medium rounded-lg bg-neutral-ultralight text-neutral-dark text-base shadow-sm"
                />
              </div>
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
