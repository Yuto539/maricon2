# 運用・デプロイ Runbook

インフラ用の `Dockerfile` / `docker-compose.yml` はリポジトリにありません。標準的な Next.js ホスティングを想定しています。

## デプロイ手順（概要）

1. **環境変数**: ホスティング先に `docs/ENV.md` の必須変数を設定する
2. **ビルド**: `npm ci`（CI）→ `npm run build`
3. **起動**: `npm run start`（Node）またはプラットフォーム既定の Next 起動
4. **データベース**: `supabase/migrations/*.sql` を対象の Supabase プロジェクトに適用する（Supabase CLI または SQL Editor）

## ヘルスチェック

専用の `/health` エンドポイントは未定義です。プラットフォームのデフォルトで **GET `/`** の応答（200）を監視するか、後からヘルス用 Route Handler を追加してください。

## 既知の問題（トラブルシュート）

<!-- AUTO-GENERATED:build-notes -->
- **`npm run build` が `@/lib/ai/openai` で失敗する**  
  `src/app/api/ai/*/route.ts` が `@/lib/ai/openai` を動的 import していますが、現状リポジトリに該当ファイルがありません。`src/lib/ai/openai.ts`（または同等の実装）を追加してから再ビルドしてください。
<!-- /AUTO-GENERATED -->

- **複数の `package-lock.json` で Next がルートを誤推論する**  
  ビルドログに Turbopack の警告が出る場合、ホームディレクトリ等に別の lockfile がある可能性があります。`next.config` の `turbopack.root` 設定または余分な lockfile の整理を検討してください。

## ロールバック

- **Vercel 等**: 直前の本番デプロイメントに Promote / Redeploy
- **データベース**: マイグレーションは原則前進のみ。破壊的変更は別マイグレーションで戻すか、バックアップからリストア

## アラート・エスカレーション

プロジェクト固有のオンコールは未定義です。組織のインシデント手順に合わせて追記してください。
