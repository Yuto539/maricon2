# コントリビューション

maricon2 は Next.js（App Router）＋ Supabase ＋ Vitest の構成です。以下の「スクリプト」「テスト」セクションは `package.json` / `vitest.config.ts` から自動生成されています。

## 前提条件

- **Node.js**: 20 系 LTS 推奨（Next.js 16 向け）
- **パッケージマネージャー**: このリポジトリは `npm` と `package-lock.json` を前提にしています

## セットアップ

1. 依存関係をインストール: `npm install`
2. ルートの `.env.example` をコピーして `.env.local` を作成し、Supabase の値を埋める
3. 開発サーバー: `npm run dev`

<!-- AUTO-GENERATED:scripts -->
## 利用可能なスクリプト

| Command | Description |
|---------|-------------|
| `npm run dev` | 開発サーバー（`next dev`） |
| `npm run build` | 本番ビルド（`next build`） |
| `npm run start` | 本番サーバー（`next start`） — ビルド後に実行 |
| `npm run lint` | ESLint（`eslint`） |
| `npm test` | Vitest を 1 回実行（`vitest run`） |
| `npm run test:watch` | Vitest ウォッチモード |
| `npm run test:coverage` | カバレッジ付きで Vitest 実行 |
<!-- /AUTO-GENERATED -->

<!-- AUTO-GENERATED:testing -->
## テスト

- **ランナー**: Vitest（`vitest.config.ts`）
- **環境**: `jsdom`、セットアップ `src/test/setup.ts`
- **カバレッジ**（`npm run test:coverage`）:
  - 対象: `src/lib/**/*.ts`, `src/app/api/**/handler.ts`
  - 閾値: branches / functions / lines / statements いずれも **80%**
  - 除外: `src/lib/supabase/**`, `src/lib/repositories/supabase/**`, `*.test.ts`, `src/test/**`
- 新規ロジックは `*.test.ts` / `*.test.tsx` を同階層または `__tests__` に追加し、上記閾値を維持してください。
<!-- /AUTO-GENERATED -->

## Lint / 型

- **ESLint**: `eslint.config.mjs`（`eslint-config-next` の core-web-vitals + TypeScript）
- **型チェック**: `next build` 時に TypeScript チェックが走ります

## PR 前チェックリスト

- [ ] `npm test` が通る
- [ ] `npm run lint` が通る
- [ ] 環境変数を追加した場合は `.env.example` と `docs/ENV.md` の自動生成ブロックを更新する（または `/update-docs` を実行）
- [ ] 新規 API ルートは `docs/API.md` の表を更新する（または `/update-docs`）
