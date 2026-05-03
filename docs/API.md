# HTTP API リファレンス

App Router の `src/app/api/**/route.ts` から生成した一覧です。リクエスト／レスポンスの詳細は各 `handler.ts` の Zod スキーマとサービス層を参照してください。

<!-- AUTO-GENERATED:api-routes -->
| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/ai/replies` | Supabase セッション必須 |
| `POST` | `/api/ai/review` | Supabase セッション必須 |
| `POST` | `/api/ai/topics` | Supabase セッション必須 |
| `POST` | `/api/duo/create` | Supabase セッション必須 |
| `POST` | `/api/duo/[token]/answer` | なし（トークンで識別） |
| `GET` | `/api/gamification/[partnerId]` | Supabase セッション必須 |
<!-- /AUTO-GENERATED -->

OpenAPI 定義ファイル（`openapi.yaml` 等）は現時点ではリポジトリにありません。
