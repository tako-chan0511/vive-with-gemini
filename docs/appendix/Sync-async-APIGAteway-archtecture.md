# 同期・非同期アーキテクチャ図（API Gateway 付き）

> 図は Mermaid を **`<pre class="mermaid" v-pre>`** で描画します。

<pre class="mermaid" v-pre>
flowchart TD
%% ============== Subgraphs =========================
subgraph users["ユーザー"]
  Client["クライアント／ブラウザ"]
end

subgraph edge["エッジ／ゲートウェイ層"]
  APIGW["API Gateway (認証/認可・CORS・レート制限・ロギング・負荷分散)"]
end

subgraph app["アプリケーションサーバー"]
  API["FastAPI API サーバー (オートスケール想定)"]
  BL["ビジネスロジック"]
  Worker["ワーカー（非同期処理）"]
end

subgraph ext["外部サービス"]
  SQS["Amazon SQS（キュー）"]
  DB["PostgreSQL"]
  LOG["ログ/メトリクス/トレース基盤"]
end

%% ============== 同期（実線） =======================
Client -->|"HTTPS リクエスト"| APIGW
APIGW -->|"認証/JWT検証・CORS判定・レート制限後に転送"| API
API -->|"直接呼び出し"| BL
BL -->|"データ読み書き"| DB
DB -->|"結果"| BL
BL -->|"結果"| API
API -->|"JSON 応答"| APIGW
APIGW -->|"応答整形/ログ記録"| Client

%% ============== 非同期（点線） =====================
Client -.->|"非同期リクエスト POST /generate-report"| APIGW
APIGW -.->|"202 Accepted（受付済）"| Client
APIGW -.->|"認証後に転送"| API
API -.->|"キュー投入"| SQS
SQS -.->|"ポーリング"| Worker
Worker -.->|"処理依頼"| BL
BL -.->|"重い処理（集計/書き込み）"| DB

%% ============== ログ/トレース（点線） =============
APIGW -.->|"アクセスログ/メトリクス"| LOG
API -.->|"構造化ログ/分散トレース"| LOG
Worker -.->|"ジョブログ/リトライ状況"| LOG
</pre>


---

## 1. サブグラフと要素の説明

### ユーザー (`users`)
- **クライアント／ブラウザ（Client）**  
  API を叩く起点。同期は結果が返るまで待機、非同期は「受付済（202）」のみ受け取り、後続は待たない。

### エッジ／ゲートウェイ層 (`edge`)
- **API Gateway（APIGW）**  
  - **認証/認可**：JWT 検証（例：Cognito/JWK）、スコープ/ロールの検査。  
  - **CORS**：`OPTIONS` 事前検証と `Access-Control-*` ヘッダ付与を統一管理。  
  - **レート制限/スロットリング**：濫用防止・フェイルセーフ。  
  - **ロギング/メトリクス**：アクセスログ、レイテンシ、エラー率の収集。  
  - **負荷分散**：バックエンド群（FastAPI）へ振り分け（ALB/HTTP統合など）。  
  - **リクエスト/レスポンス整形**：ヘッダ付加、ステージ別挙動、キャッシュ（GET）等。

### アプリケーションサーバー (`app`)
- **FastAPI API サーバー（API）**  
  入力バリデーション、軽量処理は同期返却。重い処理はキューへ委譲。スケールアウトを想定。  
- **ビジネスロジック（BL）**  
  ドメインルール、権限、集計、整合性の中心。同期/非同期の両方から呼ばれる。  
- **ワーカー（Worker）**  
  バックグラウンド専用。SQS をポーリングしジョブを BL に委譲。リトライ/冪等性に対応。

### 外部サービス (`ext`)
- **SQS**：非同期ジョブのキュー。可視性タイムアウト/デッドレターで堅牢化。  
- **PostgreSQL（DB）**：メインデータストア。トランザクション設計が性能と整合性の要。  
- **ログ/メトリクス/トレース基盤（LOG）**：Gateway/API/Worker から構造化ログとトレースを集約（例：CloudWatch/Otel/ELK）。

---

## 2. フロー説明

### 同期（実線）
1. **Client → APIGW**：HTTPS で API 呼び出し。  
2. **APIGW**：JWT 検証、CORS 判定、レート制限、ロギング後に**認可済み転送**。  
3. **API → BL → DB**：必要な読み書き。  
4. **DB → BL → API**：結果を組み立て。  
5. **API → APIGW → Client**：JSON を返却。Gateway で**応答整形/ロギング**。  
> ユーザーは結果が返るまで待機。低レイテンシ要求の処理に適する。

### 非同期（点線）
A. **Client → APIGW**：重い処理の依頼。  
B. **APIGW → Client**：検証後すぐ **`202 Accepted`**（ジョブID等を返却推奨）。  
C. **APIGW → API**：認証済み転送。  
D. **API → SQS**：ジョブを**キュー投入**（冪等性キー付き）。  
E. **SQS → Worker**：**ポーリング**で取得。  
F. **Worker → BL → DB**：**重い処理**を実行・永続化。  
> ユーザー応答は瞬時。処理はバックグラウンドで安全に再試行可能。

---

## 3. 実装ベストプラクティス

- **認証/認可**：Gateway で JWT（JWK キャッシュ）を検証、スコープ → FastAPI に伝搬。  
- **相関ID**：`X-Request-ID` を Gateway で発行し、API/Worker/DB ログに**必ず**連鎖格納。分散トレースは `traceparent` を継承。  
- **CORS**：`allowedOrigins` を厳格化。プリフライトを Gateway に集約。  
- **レート制限**：ユーザー単位 or API キー単位。バースト+持続レートで設計。  
- **整合性/冪等性**：非同期の**ジョブキー**を用意し、DB に一意制約／重複実行を抑止。  
- **ログ/メトリクス**：JSON ログ、P95/P99、エラー率、SQS キュー長、DLQ 件数、Worker の再試行回数を可視化。  
- **セキュリティヘッダ**：`Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options` 等を Gateway で統制。  
- **キャッシュ**：GET の読み取り系は Gateway で TTL キャッシュを検討（整合性要件に注意）。

---

### 例：API 設計ヒント
- 同期 `GET /recipe/{id}`：200/404。  
- 非同期 `POST /generate-report`：**202** + `jobId`。`GET /jobs/{jobId}` で状態照会、完了時 `resultsUrl` を返す。

