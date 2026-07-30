/**
 * ツイートテンプレートの固定文言。
 *
 * テンプレート生成（useTweetState の generateThisWeeksSchedule 等）・
 * 構造化編集への変換（parseStructuredFields）・検証（validateTweet）が
 * それぞれ独立に同じ文言をハードコードすると、一箇所だけ変更した際に
 * 生成したツイートを自分自身でパース/検証できなくなる。
 * ここを唯一の定義箇所として全箇所から参照する。
 *
 * 注意: useTweetState.ts はこれらの値を `new RegExp()` で正規表現に組み込む箇所がある。
 * 値に正規表現の特殊文字（. ( ) + ? * | [ など）を含めると意図しないマッチになるため、
 * 変更する場合は特殊文字を含まない値にすること。
 */

/** イベント告知に必須のハッシュタグ */
export const HASHTAG = '#あ茶会';

/** イベント名（「第N回」の後に続く固定タイトル） */
export const EVENT_TITLE = '題名のないお茶会';

/** 開催時間帯。開催曜日・回数はスプレッドシート/計算で決まるが時間帯は固定 */
export const DEFAULT_EVENT_TIME = '14:30〜16:00';

/** お茶会絵文字のデフォルト値（未設定時・パース失敗時のフォールバック） */
export const DEFAULT_INSTRUMENT_EMOJI = '🎸';

/** 後ろの絵文字のデフォルト値（未設定時・パース失敗時のフォールバック） */
export const DEFAULT_SUFFIX_EMOJI = '🏘️';

// テンプレートの未入力欄に入るプレースホルダー文言。
// generateThisWeeksSchedule がこの文言で埋め、parseStructuredFields は
// この文言が残っていれば「未入力」として空文字に戻し、validateTweet は
// この文言が残っていれば投稿不可として弾く。3箇所が同じ値である必要がある。
export const PLACEHOLDER_FREE_TEXT = '自由文';
export const PLACEHOLDER_WORLD_NAME = 'ワールド名';
export const PLACEHOLDER_CREATOR_NAME = 'クリエイター名';
