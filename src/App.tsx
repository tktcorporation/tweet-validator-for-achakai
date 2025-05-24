import React, { useState } from 'react';
import { Calendar, Hash, CheckCircle, XCircle, Clock, MapPin } from 'lucide-react';

function App() {
  const [tweetText, setTweetText] = useState('');

  const instrumentEmojis =
    '🎸 🎹 🥁 🎺 🎻 🎷 🪕 🪗 🎤 🎧 📯 🪘 🎼';

  // Reference point: Meeting #208 on 2025-02-02
  const referenceDate = new Date('2025-02-02');
  const referenceMeetingNumber = 208;

  const generateThisWeeksSchedule = () => {
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          あ茶会 Tweet Validator
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ツイートテキスト
          </label>
          <button
            onClick={generateThisWeeksSchedule}
            className="mb-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            今週の予定を生成
          </button>
          <div className="mb-3 text-sm">
            楽器の絵文字候補: {instrumentEmojis}
          </div>
          <textarea
            value={tweetText}
            onChange={(e) => setTweetText(e.target.value)}
            className="w-full h-48 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="ここにツイートを入力してください..."
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">検証結果</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span>日曜日の日付</span>
              </div>
              {validation.isSunday ? 
                <CheckCircle className="w-5 h-5 text-green-500" /> : 
                <XCircle className="w-5 h-5 text-red-500" />
              }
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <span>時間が含まれている</span>
              </div>
              {validation.hasTime ? 
                <CheckCircle className="w-5 h-5 text-green-500" /> : 
                <XCircle className="w-5 h-5 text-red-500" />
              }
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                <span>有効な場所形式が含まれている</span>
              </div>
              {validation.hasValidLocation ? 
                <CheckCircle className="w-5 h-5 text-green-500" /> : 
                <XCircle className="w-5 h-5 text-red-500" />
              }
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-gray-600" />
                <span>#あ茶会 ハッシュタグが含まれている</span>
              </div>
              {validation.hasHashtag ? 
                <CheckCircle className="w-5 h-5 text-green-500" /> : 
                <XCircle className="w-5 h-5 text-red-500" />
              }
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center font-bold text-gray-600">#</span>
                <span>開催回数</span>
              </div>
              {validation.isCorrectMeeting ? 
                <CheckCircle className="w-5 h-5 text-green-500" /> : 
                <div className="text-red-500 text-sm">
                  {validation.meetingNumber ? 
                    `#${validation.expectedMeetingNumber}であるべきです` : 
                    '開催回数が欠落しています'}
                </div>
              }
            </div>
          </div>

          {validation.isValid && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold mb-2">抽出された情報:</h3>
              <dl className="space-y-2">
                <div className="flex gap-2">
                  <dt className="font-medium">会議:</dt>
                  <dd>{validation.extractedInfo.meetingNumber}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">日付:</dt>
                  <dd>{validation.extractedInfo.date}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">時間:</dt>
                  <dd>{validation.extractedInfo.time}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">ワールド:</dt>
                  <dd>{validation.extractedInfo.worldName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">クリエイター:</dt>
                  <dd>{validation.extractedInfo.creator}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="mt-6 p-4 rounded-md text-center font-medium">
            {validation.isValid ? (
              <div className="text-green-600">✨ ツイートは有効です！ ✨</div>
            ) : (
              <div className="text-red-600">ツイートに調整が必要です</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
