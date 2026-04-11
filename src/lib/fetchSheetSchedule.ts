const SPREADSHEET_ID = '1ZVTxdMsSbfTX_0RCDajiR2VeDWETeabBUnNhyd4IYrg';
const SCHEDULE_SHEET_GID = '342034787';

export interface ScheduleEntry {
  date: string;
  meetingNumber: number | null;
  worldName: string;
  creator: string;
  /** スプレッドシートの「確定」チェックボックスの状態。TRUE なら確定済み。 */
  confirmed: boolean;
  /** ワールドのURL（スプレッドシート「url」行） */
  worldUrl: string;
  /** ワールドの説明文（スプレッドシート「説明」行）。未記入時は空文字。 */
  worldDescription: string;
}

export async function fetchScheduleFromSheet(): Promise<ScheduleEntry[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SCHEDULE_SHEET_GID}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch schedule: ${response.status}`);
  const csv = await response.text();
  return parseScheduleCSV(csv);
}

/** Parse CSV text handling quoted fields and multiline values */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\n' || (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n')) {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        if (ch === '\r') i++;
      } else if (ch === '\r') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function parseScheduleCSV(csv: string): ScheduleEntry[] {
  const rows = parseCSV(csv);

  const findRow = (header: string) => rows.find(r => r[0]?.trim() === header);

  const dateRow = findRow('開催予定日');
  const meetingRow = findRow('開催回数');
  const worldRow = findRow('ワールド名');
  const creatorRow = findRow('作者');
  // スプレッドシートの確定チェックボックス行（"TRUE" / "FALSE"）
  const confirmedRow = findRow('チェックが入っていたら確定分');
  const urlRow = findRow('url');
  const descriptionRow = findRow('説明');

  if (!dateRow || !meetingRow) return [];

  const entries: ScheduleEntry[] = [];
  const colCount = Math.max(dateRow.length, meetingRow.length);

  for (let i = 1; i < colCount; i++) {
    const dateStr = dateRow[i]?.trim() || '';
    if (!dateStr) continue;

    const meetingStr = meetingRow[i]?.trim() || '';
    const meetingNumber = meetingStr && meetingStr !== '-'
      ? parseInt(meetingStr, 10)
      : null;

    entries.push({
      date: dateStr,
      meetingNumber: Number.isNaN(meetingNumber) ? null : meetingNumber,
      worldName: worldRow?.[i]?.trim() || '',
      creator: creatorRow?.[i]?.trim() || '',
      confirmed: confirmedRow?.[i]?.trim().toUpperCase() === 'TRUE',
      worldUrl: urlRow?.[i]?.trim() || '',
      worldDescription: descriptionRow?.[i]?.trim() || '',
    });
  }

  return entries;
}

/** Format a Date as "YYYY/MM/DD" to match the sheet format */
export function formatDateForSheet(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/** Find the schedule entry for a specific date */
export function findEntryByDate(
  entries: ScheduleEntry[],
  date: Date,
): ScheduleEntry | undefined {
  const target = formatDateForSheet(date);
  return entries.find(e => e.date === target);
}

/** Derive skipped dates from sheet data (entries with no meeting number) */
export function deriveSkippedDates(entries: ScheduleEntry[]): Date[] {
  return entries
    .filter(e => e.meetingNumber === null)
    .map(e => {
      const [y, m, d] = e.date.split('/').map(Number);
      return new Date(y, m - 1, d);
    });
}

/**
 * 水曜日の Discord 週次通知用メッセージを生成する。
 * currentDate から直近の日曜を求め、該当エントリの状態に応じてメッセージを返す。
 *
 * 呼び出し元: scripts/discord-weekly-notify.ts (GitHub Actions から実行)
 */
export function generateDiscordWeeklyMessage(
  entries: ScheduleEntry[],
  currentDate: Date = new Date(),
): string {
  // 次の日曜を求める（当日が日曜ならその日）
  const nextSunday = new Date(currentDate);
  nextSunday.setHours(0, 0, 0, 0);
  while (nextSunday.getDay() !== 0) nextSunday.setDate(nextSunday.getDate() + 1);

  const m = nextSunday.getMonth() + 1;
  const d = nextSunday.getDate();
  const dateLabel = `${m}/${d}（日）`;

  const entry = findEntryByDate(entries, nextSunday);

  if (!entry) {
    return `🍵 今週のあ茶会（${dateLabel}）\n\n今週の予定が見つかりません。スプレッドシートを確認してください。`;
  }

  // お休みの週（meetingNumber が null）
  if (entry.meetingNumber === null) {
    return `🍵 今週のあ茶会（${dateLabel}）\n\n今週はお休みです 🌙`;
  }

  // 確定していない週
  if (!entry.confirmed) {
    return `🍵 今週のあ茶会 第${entry.meetingNumber}回（${dateLabel}）\n\n今週のワールドはまだ決まっていません。決まり次第お知らせします！`;
  }

  // 確定済み
  let msg = `🍵 今週のあ茶会 第${entry.meetingNumber}回（${dateLabel}）\n\n📍 ${entry.worldName} By ${entry.creator}\n⏰ 14:30〜16:00`;
  if (entry.worldUrl) {
    msg += `\n🔗 ${entry.worldUrl}`;
  }
  msg += '\n\nお楽しみに！';
  return msg;
}

/** Generate a schedule announcement tweet from sheet data.
 *  Format:
 *  #あ茶会 N月の予定をお知らせします
 *
 *  M/D 🍵
 *  M/D - お休み -
 */
export function generateScheduleAnnouncement(
  entries: ScheduleEntry[],
  currentDate: Date = new Date(),
  weeksCount = 6,
): string {
  // Find the nearest upcoming Sunday (including today)
  const startSunday = new Date(currentDate);
  startSunday.setHours(0, 0, 0, 0);
  while (startSunday.getDay() !== 0) startSunday.setDate(startSunday.getDate() + 1);

  // Filter entries from startSunday onward
  const upcoming = entries.filter(e => {
    const [y, m, d] = e.date.split('/').map(Number);
    const entryDate = new Date(y, m - 1, d);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate >= startSunday;
  }).slice(0, weeksCount);

  if (upcoming.length === 0) return '';

  const firstMonth = Number.parseInt(upcoming[0].date.split('/')[1]);

  let text = `#あ茶会 ${firstMonth}月の予定をお知らせします\n\n`;

  // Track years that already had an active event (before or within the range)
  const yearsWithPriorActive = new Set<number>();
  for (const e of entries) {
    const [y, m, d] = e.date.split('/').map(Number);
    const entryDate = new Date(y, m - 1, d);
    if (entryDate >= startSunday) break;
    if (e.meetingNumber !== null) {
      yearsWithPriorActive.add(y);
    }
  }
  const yearsSeenActive = new Set(yearsWithPriorActive);

  for (const entry of upcoming) {
    const [y, m, d] = entry.date.split('/').map(Number);
    const isSkipped = entry.meetingNumber === null;

    let annotation = '';
    if (!isSkipped && !yearsSeenActive.has(y)) {
      annotation = `（${y}年初）`;
      yearsSeenActive.add(y);
    }

    if (isSkipped) {
      text += `${m}/${d} - お休み -\n`;
    } else {
      text += `${m}/${d} 🍵${annotation}\n`;
    }
  }

  return text.trimEnd();
}
