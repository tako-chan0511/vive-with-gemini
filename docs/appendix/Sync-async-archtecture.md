<pre class="mermaid" v-pre>
flowchart TD
%% --- subgraphs (ASCII id + JP label) ---
subgraph users["ユーザー"]
  Client[クライアント／ブラウザ]
end
subgraph app["アプリケーションサーバー"]
  API[FastAPI API サーバー]
  Worker[ワーカー（非同期処理）]
  BL[ビジネスロジック]
end
subgraph ext["外部サービス"]
  SQS[Amazon SQS（キュー）]
  DB[(PostgreSQL)]
end

%% --- 同期（実線） ---
Client -->|"同期リクエスト<br/>GET /recipe/123"| API
API -->|"直接呼び出し"| BL
BL -->|"データ読み書き"| DB
DB -->|"結果"| BL
BL -->|"結果"| API
API -->|"同期レスポンス<br/>JSON"| Client

%% --- 非同期（点線） ---
Client -.->|"非同期リクエスト<br/>POST /generate-report"| API
API -.->|"202 Accepted"| Client
API -.->|"キュー投入"| SQS
SQS -.->|"ポーリング"| Worker
Worker -.->|"処理依頼"| BL
BL -.->|"重い処理（書き込み等）"| DB
</pre>
