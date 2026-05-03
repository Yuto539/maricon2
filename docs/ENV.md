# 環境変数

このファイルのうち「変数一覧」はリポジトリ内の `process.env` 参照と `.env.example` から自動生成されています。

<!-- AUTO-GENERATED:env-vars -->
## 変数一覧

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase プロジェクト URL（クライアント／サーバー／ミドルウェアで使用） | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase 匿名（anon）公開キー | `eyJhbGciOiJIUzI1NiIs...` |
| `NEXT_PUBLIC_APP_URL` | No | Duo 招待リンク生成時のベース URL。未設定時は `http://localhost:3000` | `https://your-app.vercel.app` |
<!-- /AUTO-GENERATED -->

## 手動メモ

- 本番では `.env.local` の代わりにホスティング（例: Vercel）の Environment Variables に同じキーを設定してください。
- `OPENAI_API_KEY` などの AI 用シークレットは、現状 `@/lib/ai/openai` モジュール実装に依存します。実装を追加したら `.env.example` とこの表を更新してください（`/update-docs` または手動）。
