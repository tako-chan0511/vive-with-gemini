import{_ as o,c as e,o as r,ae as n}from"./chunks/framework.Ai_99reE.js";const q=JSON.parse('{"title":"同期・非同期アーキテクチャ図（API Gateway 付き）","description":"","frontmatter":{},"headers":[],"relativePath":"appendix/Sync-async-APIGAteway-archtecture.md","filePath":"appendix/Sync-async-APIGAteway-archtecture.md"}'),a={name:"appendix/Sync-async-APIGAteway-archtecture.md"};function s(l,t,i,u,g,c){return r(),e("div",null,[...t[0]||(t[0]=[n(`<h1 id="同期・非同期アーキテクチャ図-api-gateway-付き" tabindex="-1">同期・非同期アーキテクチャ図（API Gateway 付き） <a class="header-anchor" href="#同期・非同期アーキテクチャ図-api-gateway-付き" aria-label="Permalink to &quot;同期・非同期アーキテクチャ図（API Gateway 付き）&quot;">​</a></h1><blockquote><p>図は Mermaid を <strong><code>&lt;pre class=&quot;mermaid&quot; v-pre&gt;</code></strong> で描画します。</p></blockquote><pre class="mermaid">flowchart TD
%% ============== Subgraphs =========================
subgraph users[&quot;ユーザー&quot;]
  Client[&quot;クライアント／ブラウザ&quot;]
end

subgraph edge[&quot;エッジ／ゲートウェイ層&quot;]
  APIGW[&quot;API Gateway (認証/認可・CORS・レート制限・ロギング・負荷分散)&quot;]
end

subgraph app[&quot;アプリケーションサーバー&quot;]
  API[&quot;FastAPI API サーバー (オートスケール想定)&quot;]
  BL[&quot;ビジネスロジック&quot;]
  Worker[&quot;ワーカー（非同期処理）&quot;]
end

subgraph ext[&quot;外部サービス&quot;]
  SQS[&quot;Amazon SQS（キュー）&quot;]
  DB[&quot;PostgreSQL&quot;]
  LOG[&quot;ログ/メトリクス/トレース基盤&quot;]
end

%% ============== 同期（実線） =======================
Client --&gt;|&quot;HTTPS リクエスト&quot;| APIGW
APIGW --&gt;|&quot;認証/JWT検証・CORS判定・レート制限後に転送&quot;| API
API --&gt;|&quot;直接呼び出し&quot;| BL
BL --&gt;|&quot;データ読み書き&quot;| DB
DB --&gt;|&quot;結果&quot;| BL
BL --&gt;|&quot;結果&quot;| API
API --&gt;|&quot;JSON 応答&quot;| APIGW
APIGW --&gt;|&quot;応答整形/ログ記録&quot;| Client

%% ============== 非同期（点線） =====================
Client -.-&gt;|&quot;非同期リクエスト POST /generate-report&quot;| APIGW
APIGW -.-&gt;|&quot;202 Accepted（受付済）&quot;| Client
APIGW -.-&gt;|&quot;認証後に転送&quot;| API
API -.-&gt;|&quot;キュー投入&quot;| SQS
SQS -.-&gt;|&quot;ポーリング&quot;| Worker
Worker -.-&gt;|&quot;処理依頼&quot;| BL
BL -.-&gt;|&quot;重い処理（集計/書き込み）&quot;| DB

%% ============== ログ/トレース（点線） =============
APIGW -.-&gt;|&quot;アクセスログ/メトリクス&quot;| LOG
API -.-&gt;|&quot;構造化ログ/分散トレース&quot;| LOG
Worker -.-&gt;|&quot;ジョブログ/リトライ状況&quot;| LOG
</pre><hr><h2 id="_1-サブグラフと要素の説明" tabindex="-1">1. サブグラフと要素の説明 <a class="header-anchor" href="#_1-サブグラフと要素の説明" aria-label="Permalink to &quot;1. サブグラフと要素の説明&quot;">​</a></h2><h3 id="ユーザー-users" tabindex="-1">ユーザー (<code>users</code>) <a class="header-anchor" href="#ユーザー-users" aria-label="Permalink to &quot;ユーザー (\`users\`)&quot;">​</a></h3><ul><li><strong>クライアント／ブラウザ（Client）</strong><br> API を叩く起点。同期は結果が返るまで待機、非同期は「受付済（202）」のみ受け取り、後続は待たない。</li></ul><h3 id="エッジ-ゲートウェイ層-edge" tabindex="-1">エッジ／ゲートウェイ層 (<code>edge</code>) <a class="header-anchor" href="#エッジ-ゲートウェイ層-edge" aria-label="Permalink to &quot;エッジ／ゲートウェイ層 (\`edge\`)&quot;">​</a></h3><ul><li><strong>API Gateway（APIGW）</strong><ul><li><strong>認証/認可</strong>：JWT 検証（例：Cognito/JWK）、スコープ/ロールの検査。</li><li><strong>CORS</strong>：<code>OPTIONS</code> 事前検証と <code>Access-Control-*</code> ヘッダ付与を統一管理。</li><li><strong>レート制限/スロットリング</strong>：濫用防止・フェイルセーフ。</li><li><strong>ロギング/メトリクス</strong>：アクセスログ、レイテンシ、エラー率の収集。</li><li><strong>負荷分散</strong>：バックエンド群（FastAPI）へ振り分け（ALB/HTTP統合など）。</li><li><strong>リクエスト/レスポンス整形</strong>：ヘッダ付加、ステージ別挙動、キャッシュ（GET）等。</li></ul></li></ul><h3 id="アプリケーションサーバー-app" tabindex="-1">アプリケーションサーバー (<code>app</code>) <a class="header-anchor" href="#アプリケーションサーバー-app" aria-label="Permalink to &quot;アプリケーションサーバー (\`app\`)&quot;">​</a></h3><ul><li><strong>FastAPI API サーバー（API）</strong><br> 入力バリデーション、軽量処理は同期返却。重い処理はキューへ委譲。スケールアウトを想定。</li><li><strong>ビジネスロジック（BL）</strong><br> ドメインルール、権限、集計、整合性の中心。同期/非同期の両方から呼ばれる。</li><li><strong>ワーカー（Worker）</strong><br> バックグラウンド専用。SQS をポーリングしジョブを BL に委譲。リトライ/冪等性に対応。</li></ul><h3 id="外部サービス-ext" tabindex="-1">外部サービス (<code>ext</code>) <a class="header-anchor" href="#外部サービス-ext" aria-label="Permalink to &quot;外部サービス (\`ext\`)&quot;">​</a></h3><ul><li><strong>SQS</strong>：非同期ジョブのキュー。可視性タイムアウト/デッドレターで堅牢化。</li><li><strong>PostgreSQL（DB）</strong>：メインデータストア。トランザクション設計が性能と整合性の要。</li><li><strong>ログ/メトリクス/トレース基盤（LOG）</strong>：Gateway/API/Worker から構造化ログとトレースを集約（例：CloudWatch/Otel/ELK）。</li></ul><hr><h2 id="_2-フロー説明" tabindex="-1">2. フロー説明 <a class="header-anchor" href="#_2-フロー説明" aria-label="Permalink to &quot;2. フロー説明&quot;">​</a></h2><h3 id="同期-実線" tabindex="-1">同期（実線） <a class="header-anchor" href="#同期-実線" aria-label="Permalink to &quot;同期（実線）&quot;">​</a></h3><ol><li><strong>Client → APIGW</strong>：HTTPS で API 呼び出し。</li><li><strong>APIGW</strong>：JWT 検証、CORS 判定、レート制限、ロギング後に<strong>認可済み転送</strong>。</li><li><strong>API → BL → DB</strong>：必要な読み書き。</li><li><strong>DB → BL → API</strong>：結果を組み立て。</li><li><strong>API → APIGW → Client</strong>：JSON を返却。Gateway で<strong>応答整形/ロギング</strong>。</li></ol><blockquote><p>ユーザーは結果が返るまで待機。低レイテンシ要求の処理に適する。</p></blockquote><h3 id="非同期-点線" tabindex="-1">非同期（点線） <a class="header-anchor" href="#非同期-点線" aria-label="Permalink to &quot;非同期（点線）&quot;">​</a></h3><p>A. <strong>Client → APIGW</strong>：重い処理の依頼。<br> B. <strong>APIGW → Client</strong>：検証後すぐ <strong><code>202 Accepted</code></strong>（ジョブID等を返却推奨）。<br> C. <strong>APIGW → API</strong>：認証済み転送。<br> D. <strong>API → SQS</strong>：ジョブを<strong>キュー投入</strong>（冪等性キー付き）。<br> E. <strong>SQS → Worker</strong>：<strong>ポーリング</strong>で取得。<br> F. <strong>Worker → BL → DB</strong>：<strong>重い処理</strong>を実行・永続化。</p><blockquote><p>ユーザー応答は瞬時。処理はバックグラウンドで安全に再試行可能。</p></blockquote><hr><h2 id="_3-実装ベストプラクティス" tabindex="-1">3. 実装ベストプラクティス <a class="header-anchor" href="#_3-実装ベストプラクティス" aria-label="Permalink to &quot;3. 実装ベストプラクティス&quot;">​</a></h2><ul><li><strong>認証/認可</strong>：Gateway で JWT（JWK キャッシュ）を検証、スコープ → FastAPI に伝搬。</li><li><strong>相関ID</strong>：<code>X-Request-ID</code> を Gateway で発行し、API/Worker/DB ログに<strong>必ず</strong>連鎖格納。分散トレースは <code>traceparent</code> を継承。</li><li><strong>CORS</strong>：<code>allowedOrigins</code> を厳格化。プリフライトを Gateway に集約。</li><li><strong>レート制限</strong>：ユーザー単位 or API キー単位。バースト+持続レートで設計。</li><li><strong>整合性/冪等性</strong>：非同期の<strong>ジョブキー</strong>を用意し、DB に一意制約／重複実行を抑止。</li><li><strong>ログ/メトリクス</strong>：JSON ログ、P95/P99、エラー率、SQS キュー長、DLQ 件数、Worker の再試行回数を可視化。</li><li><strong>セキュリティヘッダ</strong>：<code>Strict-Transport-Security</code>, <code>Content-Security-Policy</code>, <code>X-Content-Type-Options</code> 等を Gateway で統制。</li><li><strong>キャッシュ</strong>：GET の読み取り系は Gateway で TTL キャッシュを検討（整合性要件に注意）。</li></ul><hr><h3 id="例-api-設計ヒント" tabindex="-1">例：API 設計ヒント <a class="header-anchor" href="#例-api-設計ヒント" aria-label="Permalink to &quot;例：API 設計ヒント&quot;">​</a></h3><ul><li>同期 <code>GET /recipe/{id}</code>：200/404。</li><li>非同期 <code>POST /generate-report</code>：<strong>202</strong> + <code>jobId</code>。<code>GET /jobs/{jobId}</code> で状態照会、完了時 <code>resultsUrl</code> を返す。</li></ul>`,27)])])}const P=o(a,[["render",s]]);export{q as __pageData,P as default};
