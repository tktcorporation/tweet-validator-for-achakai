import React, { useState } from 'react';
import {
  Calendar,
  Hash,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Trash2,
  Edit3,
  Eye,
  Megaphone,
  ExternalLink,
  FileText,
} from 'lucide-react';
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
    suffixEmoji,
    setSuffixEmoji,
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
  } = useTweetState();

  const [isEmojiSectionOpen, setIsEmojiSectionOpen] = useState(false);
  const [isScheduleSectionOpen, setIsScheduleSectionOpen] = useState(false);

  // 今週の日曜日を計算（スケジュールのハイライト用）
  const getUpcomingSunday = () => {
    const d = new Date();
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };
  const upcomingSundayStr = getUpcomingSunday();

  return (
    <div className="min-h-screen bg-neutral-ultralight py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-primary">
            あ茶会 Tweet Validator
          </h1>
        </header>

        {/* Sheet Schedule Section */}
        <section className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <button
            onClick={() => setIsScheduleSectionOpen(!isScheduleSectionOpen)}
            className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-neutral-light/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-medium" />
              <span className="text-sm font-medium text-neutral-dark">スプレッドシート予定</span>
              {isSheetLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-neutral-medium" />
              ) : sheetError ? (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  読み込み失敗
                </span>
              ) : sheetSchedule.length > 0 ? (
                <span className="text-xs text-green-600">({sheetSchedule.length}件)</span>
              ) : null}
            </div>
            {isScheduleSectionOpen ? (
              <ChevronUp className="w-5 h-5 text-neutral-medium" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-medium" />
            )}
          </button>
          {isScheduleSectionOpen && (
            <div className="px-5 pb-4">
              {sheetError && (
                <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center justify-between">
                  <span>{sheetError}</span>
                  <button
                    onClick={loadSheetSchedule}
                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 rounded text-amber-800 font-medium transition-colors"
                  >
                    再試行
                  </button>
                </div>
              )}
              {isSheetLoading && (
                <div className="text-center py-4 text-sm text-neutral-medium">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  読み込み中...
                </div>
              )}
              {!isSheetLoading && sheetSchedule.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-medium/20">
                        <th className="text-center py-2 px-2 text-neutral-medium font-medium">確定</th>
                        <th className="text-left py-2 px-2 text-neutral-medium font-medium">日付</th>
                        <th className="text-left py-2 px-2 text-neutral-medium font-medium">回</th>
                        <th className="text-left py-2 px-2 text-neutral-medium font-medium">ワールド名</th>
                        <th className="text-left py-2 px-2 text-neutral-medium font-medium">作者</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheetSchedule
                        .filter(entry => {
                          // 過去2週間以降のエントリのみ表示
                          const [y, m, d] = entry.date.split('/').map(Number);
                          const entryDate = new Date(y, m - 1, d);
                          const twoWeeksAgo = new Date();
                          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                          return entryDate >= twoWeeksAgo;
                        })
                        .slice(0, 12)
                        .map((entry) => {
                          const isThisWeek = entry.date === upcomingSundayStr;
                          const isSkipped = entry.meetingNumber === null;
                          return (
                            <tr
                              key={entry.date}
                              className={`border-b border-neutral-medium/10 ${
                                isThisWeek
                                  ? 'bg-brand-primary/10 font-semibold'
                                  : isSkipped
                                    ? 'bg-red-50/50 text-neutral-medium'
                                    : ''
                              }`}
                            >
                              <td className="py-1.5 px-2 text-center">
                                {entry.confirmed ? (
                                  <CheckCircle className="w-4 h-4 text-green-500 inline" />
                                ) : (
                                  <span className="w-4 h-4 inline-block rounded-full border-2 border-neutral-medium/30" />
                                )}
                              </td>
                              <td className="py-1.5 px-2 whitespace-nowrap">
                                {isThisWeek && <span className="mr-1">▶</span>}
                                {entry.date}
                              </td>
                              <td className="py-1.5 px-2">
                                {isSkipped ? (
                                  <span className="text-red-400">休み</span>
                                ) : (
                                  `第${entry.meetingNumber}回`
                                )}
                              </td>
                              <td className="py-1.5 px-2 max-w-[150px] truncate" title={entry.worldName}>
                                {entry.worldName || '-'}
                              </td>
                              <td className="py-1.5 px-2 max-w-[100px] truncate" title={entry.creator}>
                                {entry.creator || '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
              {!isSheetLoading && !sheetError && sheetSchedule.length === 0 && (
                <p className="text-sm text-neutral-medium py-3 text-center">
                  データがありません
                </p>
              )}
              {/* 今週のワールド詳細（URL・説明） */}
              {!isSheetLoading && thisWeekEntry && thisWeekEntry.meetingNumber !== null && thisWeekEntry.worldUrl && (
                <div className="mt-3 p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
                  <p className="text-xs font-semibold text-brand-primary mb-2">今週のワールド詳細</p>
                  {/* URL リンク */}
                  <a
                    href={thisWeekEntry.worldUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline mb-2 break-all"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    {thisWeekEntry.worldUrl}
                  </a>
                  {/* VRChat API から取得した説明（取得中・取得済み・フォールバック） */}
                  {isVrchatWorldLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      VRChat からワールド情報を取得中...
                    </div>
                  ) : vrchatWorldInfo?.description ? (
                    <div className="flex items-start gap-1.5 text-xs text-neutral-dark">
                      <FileText className="w-3 h-3 flex-shrink-0 mt-0.5 text-neutral-medium" />
                      <p className="whitespace-pre-wrap">{vrchatWorldInfo.description}</p>
                    </div>
                  ) : thisWeekEntry.worldDescription ? (
                    // VRChat API が取得できなかった場合はスプレッドシートの説明を表示
                    <div className="flex items-start gap-1.5 text-xs text-neutral-dark">
                      <FileText className="w-3 h-3 flex-shrink-0 mt-0.5 text-neutral-medium" />
                      <p className="whitespace-pre-wrap">{thisWeekEntry.worldDescription}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Expired Schedule Banner */}
        {isScheduleExpired && (
          <section className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-amber-800 mb-1">
                  前回の開催は終了しました
                </h2>
                <p className="text-sm text-amber-700 mb-3">
                  {validation.extractedInfo.date} の予定が残っています。次の開催予定を作成しましょう。
                </p>
                <button
                  onClick={generateThisWeeksSchedule}
                  disabled={isLoadingSchedule}
                  className="px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all duration-150 text-sm font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoadingSchedule ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      次の予定を設定する
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Main Input Section */}
        <section className="bg-white rounded-xl shadow-lg p-5 sm:p-6 mb-6">
          {/* Section Header with Primary Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-neutral-dark">ツイート作成</h2>
            {!isScheduleExpired && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={generateThisWeeksSchedule}
                  disabled={isLoadingSchedule}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-all duration-150 text-sm font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoadingSchedule ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      今週の予定を生成
                    </>
                  )}
                </button>
                <button
                  onClick={generateScheduleAnnouncementTweet}
                  disabled={isSheetLoading}
                  className="px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-opacity-90 transition-all duration-150 text-sm font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  予定お知らせを生成
                </button>
              </div>
            )}
          </div>

          {/* Edit Mode Toggle */}
          <div className="flex items-center gap-2 mb-4 p-1 bg-neutral-light rounded-lg">
            <button
              onClick={() => {
                if (structuredMode) switchToStructuredMode();
                setStructuredMode(false);
              }}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 ${
                !structuredMode
                  ? 'bg-white text-neutral-dark shadow-sm'
                  : 'text-neutral-medium hover:text-neutral-dark'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              直接編集
            </button>
            <button
              onClick={() => {
                if (!structuredMode) switchToStructuredMode();
              }}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 ${
                structuredMode
                  ? 'bg-white text-neutral-dark shadow-sm'
                  : 'text-neutral-medium hover:text-neutral-dark'
              }`}
            >
              <Eye className="w-4 h-4" />
              項目ごと編集
            </button>
          </div>

          {/* Input Area */}
          {structuredMode ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="freeTextInput" className="block text-sm font-medium text-neutral-dark mb-1.5">
                  自由文
                </label>
                <textarea
                  id="freeTextInput"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  className="w-full p-3 h-20 border border-neutral-medium/50 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                  placeholder="今回のお茶会の一言コメントなど..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="instrumentEmojiInput" className="block text-sm font-medium text-neutral-dark mb-1.5">
                    お茶会絵文字
                  </label>
                  <input
                    id="instrumentEmojiInput"
                    type="text"
                    value={instrumentEmoji}
                    onChange={(e) => setInstrumentEmoji(e.target.value)}
                    className="w-full p-3 border border-neutral-medium/50 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-center text-xl"
                    placeholder="🎸"
                  />
                </div>
                <div>
                  <label htmlFor="suffixEmojiInput" className="block text-sm font-medium text-neutral-dark mb-1.5">
                    後ろの絵文字
                  </label>
                  <input
                    id="suffixEmojiInput"
                    type="text"
                    value={suffixEmoji}
                    onChange={(e) => setSuffixEmoji(e.target.value)}
                    className="w-full p-3 border border-neutral-medium/50 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-center text-xl"
                    placeholder="🏘️"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="worldNameInput" className="block text-sm font-medium text-neutral-dark mb-1.5">
                  ワールド名
                </label>
                <input
                  id="worldNameInput"
                  type="text"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  className="w-full p-3 border border-neutral-medium/50 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                  placeholder="開催場所のワールド名"
                />
              </div>
              <div>
                <label htmlFor="creatorNameInput" className="block text-sm font-medium text-neutral-dark mb-1.5">
                  クリエイター名
                </label>
                <input
                  id="creatorNameInput"
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  className="w-full p-3 border border-neutral-medium/50 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                  placeholder="ワールド作成者の名前"
                />
              </div>
              <div>
                <label htmlFor="tweetTemplate" className="block text-sm font-medium text-neutral-dark mb-1.5">
                  プレビュー
                </label>
                <textarea
                  id="tweetTemplate"
                  readOnly
                  value={tweetText}
                  className="w-full h-40 p-3 border border-neutral-medium/30 rounded-lg bg-neutral-light/50 text-neutral-dark text-sm"
                />
              </div>
            </div>
          ) : (
            <textarea
              id="tweetTextArea"
              value={tweetText}
              onChange={(e) => setTweetText(e.target.value)}
              className={`w-full h-48 p-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-white text-neutral-dark text-sm transition-all ${
                validation.hasPlaceholders ? 'border-red-400' : 'border-neutral-medium/50'
              }`}
              placeholder="ここにツイートを入力してください..."
            />
          )}

          {/* Character Count */}
          <div className="flex justify-between items-center mt-3">
            <span className={`text-sm font-mono ${animateCount ? 'animate-pulse-fade' : ''} text-neutral-medium`}>
              文字数: {charCount}
            </span>
            <span
              className={`text-sm font-mono ${
                tweetLength > maxTweetLength ? 'text-red-500 font-semibold' : 'text-neutral-medium'
              }`}
            >
              {tweetLength} / {maxTweetLength}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-neutral-medium/20">
            <div className="relative">
              <button
                onClick={handleTweetCopy}
                disabled={validation.hasPlaceholders}
                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-all duration-150 text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                全文コピー
              </button>
              {showCopyFeedbackFor === 'tweet' && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-neutral-dark text-white px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-10">
                  Copied!
                </span>
              )}
            </div>
            <button
              onClick={clearStoredData}
              className="px-4 py-2 bg-neutral-light text-neutral-dark rounded-lg hover:bg-neutral-medium/30 transition-all duration-150 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-medium focus:ring-offset-2 flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              クリア
            </button>
            {validation.hasPlaceholders && (
              <span className="flex items-center text-xs text-red-500 ml-2">
                プレイスホルダーを埋めてください
              </span>
            )}
          </div>
        </section>

        {/* Emoji Picker Section (Collapsible) */}
        <section className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <button
            onClick={() => setIsEmojiSectionOpen(!isEmojiSectionOpen)}
            className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-neutral-light/50 transition-colors"
          >
            <span className="text-sm font-medium text-neutral-dark">絵文字を選択</span>
            {isEmojiSectionOpen ? (
              <ChevronUp className="w-5 h-5 text-neutral-medium" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-medium" />
            )}
          </button>
          {isEmojiSectionOpen && (
            <div className="px-5 pb-4 space-y-4">
              <div>
                <span className="text-xs font-medium text-neutral-medium uppercase tracking-wide">お茶会絵文字</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {instrumentEmojiArray.map((emoji, index) => (
                    <div key={index} className="relative">
                      <button
                        onClick={() => {
                          setInstrumentEmoji(emoji);
                          handleEmojiCopy(emoji);
                        }}
                        className={`p-2 text-xl rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                          instrumentEmoji === emoji
                            ? 'bg-brand-primary/10 ring-2 ring-brand-primary'
                            : 'bg-neutral-light hover:bg-neutral-medium/20'
                        }`}
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
              <div>
                <span className="text-xs font-medium text-neutral-medium uppercase tracking-wide">後ろの絵文字</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {instrumentEmojiArray.map((emoji, index) => (
                    <div key={index} className="relative">
                      <button
                        onClick={() => {
                          setSuffixEmoji(emoji);
                          handleEmojiCopy(emoji);
                        }}
                        className={`p-2 text-xl rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                          suffixEmoji === emoji
                            ? 'bg-brand-primary/10 ring-2 ring-brand-primary'
                            : 'bg-neutral-light hover:bg-neutral-medium/20'
                        }`}
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
            </div>
          )}
        </section>

        {/* Validation Results Section */}
        <section className="bg-white rounded-xl shadow-lg p-5 sm:p-6">
          {!validation.isValid ? (
            <>
              <h2 className="text-lg font-bold text-neutral-dark mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-secondary" />
                検証結果
              </h2>
              <div className="space-y-2">
                {[
                  { Icon: Calendar, label: "日曜日の日付", isValid: validation.isSunday, dataTestId: "validation-date" },
                  { Icon: Clock, label: "時間が含まれている", isValid: validation.hasTime, dataTestId: "validation-time" },
                  { Icon: MapPin, label: "有効な場所形式", isValid: validation.hasValidLocation, dataTestId: "validation-location" },
                  { Icon: Hash, label: "#あ茶会 ハッシュタグ", isValid: validation.hasHashtag, dataTestId: "validation-hashtag" },
                  { Icon: Edit3, label: "プレイスホルダーなし", isValid: !validation.hasPlaceholders, dataTestId: "validation-placeholder" },
                ].map(({ Icon, label, isValid, dataTestId }) => (
                  <div
                    key={label}
                    data-testid={dataTestId}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                      isValid ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isValid ? 'text-green-600' : 'text-red-500'}`} />
                      <span className="text-neutral-dark text-sm">{label}</span>
                    </div>
                    {isValid ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                ))}
                <div
                  data-testid="validation-meeting-number"
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                    validation.isCorrectMeeting ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 flex items-center justify-center font-bold text-sm ${
                      validation.isCorrectMeeting ? 'text-green-600' : 'text-red-500'
                    }`}>#</span>
                    <span className="text-neutral-dark text-sm">開催回数</span>
                  </div>
                  {validation.isCorrectMeeting ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <span className="text-xs text-red-500 font-medium">
                      {validation.meetingNumber !== null
                        ? `第${validation.expectedMeetingNumber}回であるべき`
                        : '欠落'}
                    </span>
                  )}
                </div>
              </div>
              {validation.hasNightWord && (
                <div className="mt-4 p-3 rounded-lg flex items-center bg-yellow-50 border border-yellow-200">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                  <span className="text-sm text-yellow-800">
                    「夜」関連の言葉が含まれています。開催は昼ですが、意図通りですか？
                  </span>
                </div>
              )}
              <div className="mt-5 p-4 rounded-lg text-center bg-red-50 border border-red-200">
                <div className="flex items-center justify-center gap-2 text-red-600 font-semibold">
                  <XCircle className="w-5 h-5" />
                  <span>ツイートに調整が必要です</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {validation.hasNightWord && (
                <div className="mb-4 p-3 rounded-lg flex items-center bg-yellow-50 border border-yellow-200">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                  <span className="text-sm text-yellow-800">
                    「夜」関連の言葉が含まれています。開催は昼ですが、意図通りですか？
                  </span>
                </div>
              )}
              <div className="p-4 rounded-lg text-center bg-green-50 border border-green-200 mb-5">
                <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  <span>ツイートは有効です</span>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-neutral-dark mb-3 uppercase tracking-wide">抽出された情報</h3>
              <dl className="space-y-2 text-sm bg-neutral-light/50 rounded-lg p-4">
                {[
                  { label: '開催回数', value: validation.extractedInfo.meetingNumber },
                  { label: '日付', value: validation.extractedInfo.date },
                  { label: '時間', value: validation.extractedInfo.time },
                  { label: 'ワールド', value: validation.extractedInfo.worldName },
                  { label: 'クリエイター', value: validation.extractedInfo.creator },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3">
                    <dt className="font-medium text-neutral-medium w-24 flex-shrink-0">{label}</dt>
                    <dd className="text-neutral-dark">{value || '-'}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
