# Tweet Validator for Achakai - Project Guidelines

## Project Overview
VRChatの「あ茶会」イベント用ツイート作成・検証ツール。React + TypeScript + Tailwind CSS。

## Tech Stack
- React 18 + TypeScript
- Tailwind CSS
- Vite
- Vitest

---

# UI/UX Design Guidelines

> **設計原則**: AIがデザインを行う際、装飾を加えることより「引き算」を意識する。
> 全ての視覚要素には明確な目的が必要であり、目的がないものは削除する。

## 1. Anti-Patterns（絶対にやってはいけないこと）

### 1.1 装飾の禁止事項
```
❌ 禁止                              ✅ 代替
─────────────────────────────────────────────────────────
グラデーション背景                   → 単色背景
複数色のグラデーションテキスト       → 単色テキスト
shadow-xl, shadow-2xl               → shadow-sm, shadow-md まで
過度なborder-radius (rounded-3xl)   → rounded-lg まで
装飾的なボーダー（複数色、太い）     → 1px、単色
アニメーションの多用                 → 必要最小限（ローディング、フィードバックのみ）
ネオンエフェクト、グロー効果         → 使用禁止
背景パターン、テクスチャ             → 単色のみ
アイコンの過剰使用                   → 1要素1アイコンまで
```

### 1.2 カラーの禁止事項
```
❌ 禁止                              ✅ 代替
─────────────────────────────────────────────────────────
5色以上の使用                       → プライマリ、セカンダリ、ニュートラルの3系統
彩度の高すぎる色 (saturated)        → tailwind.config.js定義色のみ
黒(#000)、純白(#fff)の直接使用      → neutral-dark, white
ランダムな色の追加                   → 既存パレットから選択
```

### 1.3 レイアウトの禁止事項
```
❌ 禁止                              ✅ 代替
─────────────────────────────────────────────────────────
固定幅 (w-[500px])                  → max-w-* + w-full
margin/paddingの不規則な値          → 4の倍数 (4, 8, 12, 16, 20, 24)
深いネスト (4階層以上)              → コンポーネント分割
要素間の不均一なスペーシング         → 統一されたgap値
```

### 1.4 タイポグラフィの禁止事項
```
❌ 禁止                              ✅ 代替
─────────────────────────────────────────────────────────
4種類以上のフォントサイズ            → sm, base, lg, xl の4種まで
太字の多用                          → 見出しのみ font-bold
text-xs の本文使用                  → text-sm 以上
letter-spacing の過度な調整          → デフォルト値
```

## 2. Design Tokens（デザイントークン）

### 2.1 このプロジェクトのカラーパレット（tailwind.config.js準拠）
```javascript
// 必ずこれらの色のみを使用する
colors: {
  'brand-primary': '#14B8A6',    // メインアクション、リンク
  'brand-secondary': '#FF7F50',  // 警告、注意喚起
  'brand-accent': '#F97316',     // 強調（使用は控えめに）
  'neutral-light': '#F3F4F6',    // 背景、区切り線
  'neutral-medium': '#9CA3AF',   // サブテキスト、ボーダー
  'neutral-dark': '#374151',     // 本文テキスト
  'neutral-ultralight': '#EFF6FF', // ページ背景
}

// 状態色（Tailwindデフォルト使用）
success: green-500, green-50 (背景)
error: red-500, red-50 (背景)
warning: amber-500, amber-50 (背景)
```

### 2.2 スペーシングシステム
```
使用可能な値（Tailwindクラス）:
gap/padding/margin: 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24

セクション間: mb-6, gap-6
要素グループ間: mb-4, gap-4
関連要素間: mb-2, gap-2
インライン: gap-1, gap-2
```

### 2.3 シャドウ
```
使用可能: shadow-sm, shadow, shadow-md, shadow-lg
禁止: shadow-xl, shadow-2xl, shadow-inner

用途:
- カード: shadow-lg
- ボタン（ホバー時）: shadow-md
- ドロップダウン: shadow-lg
- インプット: shadow-sm（フォーカス時のみ）
```

### 2.4 角丸
```
使用可能: rounded, rounded-md, rounded-lg, rounded-xl, rounded-full
禁止: rounded-2xl, rounded-3xl

用途:
- ボタン: rounded-lg
- カード: rounded-xl
- インプット: rounded-lg
- バッジ/タグ: rounded-md
- アイコンボタン: rounded-full
```

## 3. Component Patterns（コンポーネントパターン）

### 3.1 ボタン
```tsx
// Primary（1画面に1つ推奨）
className="px-4 py-2 bg-brand-primary text-white rounded-lg
  hover:bg-opacity-90 transition-all duration-150
  text-sm font-medium shadow-sm hover:shadow-md
  focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed"

// Secondary
className="px-4 py-2 bg-neutral-light text-neutral-dark rounded-lg
  hover:bg-neutral-medium/30 transition-all duration-150
  text-sm font-medium
  focus:outline-none focus:ring-2 focus:ring-neutral-medium focus:ring-offset-2"

// Danger（確認が必要な破壊的操作のみ）
className="px-4 py-2 bg-red-500 text-white rounded-lg ..."
```

### 3.2 インプット
```tsx
className="w-full p-3 border border-neutral-medium/50 rounded-lg
  focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
  transition-all"

// エラー状態
className="... border-red-400"
```

### 3.3 カード
```tsx
className="bg-white rounded-xl shadow-lg p-5 sm:p-6"
```

### 3.4 セクション見出し
```tsx
<h2 className="text-lg font-bold text-neutral-dark mb-4">
```

## 4. UX Patterns（UXパターン）

### 4.1 状態の視覚フィードバック（必須実装）
全てのインタラクティブ要素には以下の状態が必要：

```
状態          実装方法
──────────────────────────────────────────
Default      基本スタイル
Hover        hover: で変化（opacity, shadow, bg-color）
Focus        focus:ring-2 focus:ring-offset-2
Active       active:scale-95 または bg変化
Disabled     opacity-50 cursor-not-allowed
Loading      Loader2アイコン + animate-spin
```

### 4.2 フィードバックパターン
```tsx
// 成功フィードバック（一時的表示 2-3秒）
<span className="text-xs bg-neutral-dark text-white px-2 py-1 rounded-md">
  Copied!
</span>

// エラーメッセージ
<div className="p-3 rounded-lg bg-red-50 border border-red-200">
  <span className="text-sm text-red-600">エラー内容</span>
</div>

// 警告メッセージ
<div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
  <AlertTriangle className="w-5 h-5 text-amber-600" />
  <span className="text-sm text-amber-800">警告内容</span>
</div>
```

### 4.3 ローディング状態
```tsx
// ボタン内ローディング
{isLoading ? (
  <>
    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
    処理中...
  </>
) : (
  <>
    <Icon className="w-4 h-4 mr-2" />
    アクション名
  </>
)}
```

### 4.4 レスポンシブ対応
```
ブレークポイント: sm (640px), md (768px), lg (1024px)

必須対応:
- タッチターゲット: 最小 44x44px（p-2以上、またはmin-h-[44px]）
- スタック変更: flex-col sm:flex-row
- パディング調整: p-4 sm:p-6
- フォントサイズ: text-sm sm:text-base（必要時のみ）
```

## 5. 視覚的階層（Visual Hierarchy）

### 5.1 情報の優先度
```
レベル1（最重要）: Primary Button, 見出し
レベル2（重要）: Secondary Button, サブ見出し, 主要コンテンツ
レベル3（補助）: テキストリンク, 補足情報
レベル4（背景）: ボーダー, 背景色, プレースホルダー
```

### 5.2 ページあたりの制限
```
Primary Button: 1-2個まで
アクセントカラー使用: 最小限（1-3箇所）
アニメーション要素: 2-3個まで
見出しレベル: 3段階まで（h1, h2, h3相当）
```

## 6. Implementation Checklist（実装チェックリスト）

### 新規UI実装時
- [ ] tailwind.config.jsの既存カラーのみ使用しているか
- [ ] グラデーション、過度なシャドウを使用していないか
- [ ] スペーシングが4の倍数で統一されているか
- [ ] Primary Buttonは1画面1-2個に収まっているか
- [ ] 全てのボタンにhover/focus/disabled状態があるか
- [ ] ローディング状態が実装されているか
- [ ] エラー状態の表示が定義されているか
- [ ] タッチターゲットが44px以上あるか
- [ ] レスポンシブ対応されているか（sm:ブレークポイント）

### デザイン見直し時
- [ ] 装飾を50%削減できないか確認
- [ ] 色数を減らせないか確認
- [ ] アニメーションは本当に必要か確認
- [ ] 同じパターンが繰り返されているか確認（一貫性）

---

## Development Notes

### Commands
```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm test         # テスト実行
```

### File Structure
```
src/
├── App.tsx           # メインコンポーネント
├── hooks/            # カスタムフック
│   └── useTweetState.ts
├── index.css         # Tailwind imports
└── main.tsx          # エントリーポイント
```
