import{_ as o,c as r,o as e,ae as n}from"./chunks/framework.Ai_99reE.js";const h=JSON.parse('{"title":"同期・非同期アーキテクチャ図（解説付き）","description":"","frontmatter":{},"headers":[],"relativePath":"appendix/Sync-async-archtecture.md","filePath":"appendix/Sync-async-archtecture.md"}'),a={name:"appendix/Sync-async-archtecture.md"};function s(l,t,i,g,u,c){return e(),r("div",null,[...t[0]||(t[0]=[n(`<h1 id="同期・非同期アーキテクチャ図-解説付き" tabindex="-1">同期・非同期アーキテクチャ図（解説付き） <a class="header-anchor" href="#同期・非同期アーキテクチャ図-解説付き" aria-label="Permalink to &quot;同期・非同期アーキテクチャ図（解説付き）&quot;">​</a></h1><blockquote><p>図は Mermaid を <strong><code>&lt;pre class=&quot;mermaid&quot; v-pre&gt;</code></strong> で描画します。<br> サイドバー遷移でテキストのまま残る環境では、ページ表示直後に自動レンダリングされる設定を入れてください。</p></blockquote><pre class="mermaid">flowchart TD
%% --- subgraphs (ASCII id + JP label) ---
subgraph users[&quot;ユーザー&quot;]
  Client[クライアント／ブラウザ]
end
subgraph app[&quot;アプリケーションサーバー&quot;]
  API[FastAPI API サーバー]
  Worker[ワーカー（非同期処理）]
  BL[ビジネスロジック]
end
subgraph ext[&quot;外部サービス&quot;]
  SQS[Amazon SQS（キュー）]
  DB[(PostgreSQL)]
end

%% --- 同期（実線） ---
Client --&gt;|&quot;同期リクエスト<br>GET /recipe/123&quot;| API
API --&gt;|&quot;直接呼び出し&quot;| BL
BL --&gt;|&quot;データ読み書き&quot;| DB
DB --&gt;|&quot;結果&quot;| BL
BL --&gt;|&quot;結果&quot;| API
API --&gt;|&quot;同期レスポンス<br>JSON&quot;| Client

%% --- 非同期（点線） ---
Client -.-&gt;|&quot;非同期リクエスト<br>POST /generate-report&quot;| API
API -.-&gt;|&quot;202 Accepted&quot;| Client
API -.-&gt;|&quot;キュー投入&quot;| SQS
SQS -.-&gt;|&quot;ポーリング&quot;| Worker
Worker -.-&gt;|&quot;処理依頼&quot;| BL
BL -.-&gt;|&quot;重い処理（書き込み等）&quot;| DB
</pre><hr><h2 id="_1-サブグラフと要素の説明" tabindex="-1">1. サブグラフと要素の説明 <a class="header-anchor" href="#_1-サブグラフと要素の説明" aria-label="Permalink to &quot;1. サブグラフと要素の説明&quot;">​</a></h2><h3 id="ユーザー-users" tabindex="-1">ユーザー (<code>users</code>) <a class="header-anchor" href="#ユーザー-users" aria-label="Permalink to &quot;ユーザー (\`users\`)&quot;">​</a></h3><ul><li><strong>クライアント／ブラウザ（Client）</strong><br> 人間の操作や自動クライアントが API を呼び出す起点。同期処理では結果を待ち、非同期処理では即応答を受けて後続を待たない。</li></ul><h3 id="アプリケーションサーバー-app" tabindex="-1">アプリケーションサーバー (<code>app</code>) <a class="header-anchor" href="#アプリケーションサーバー-app" aria-label="Permalink to &quot;アプリケーションサーバー (\`app\`)&quot;">​</a></h3><ul><li><strong>FastAPI API サーバー（API）</strong><br> 受け口。HTTP リクエストを受け、軽い処理はそのまま同期で返す。重い処理はキューに積んですぐ 202 を返す。</li><li><strong>ビジネスロジック（BL）</strong><br> ドメイン規約・入力検証・権限・集計などアプリの核心。同期/非同期どちらからも呼ばれる。</li><li><strong>ワーカー（Worker）</strong><br> バックグラウンド実行専用プロセス。SQS をポーリングし、受け取ったジョブを <strong>BL</strong> に委譲して実行。</li></ul><h3 id="外部サービス-ext" tabindex="-1">外部サービス (<code>ext</code>) <a class="header-anchor" href="#外部サービス-ext" aria-label="Permalink to &quot;外部サービス (\`ext\`)&quot;">​</a></h3><ul><li><strong>Amazon SQS（SQS）</strong><br> 非同期ジョブを蓄えるキュー。冪等性キーや可視性タイムアウト設定で再実行・重複に耐える設計が可能。</li><li><strong>PostgreSQL（DB）</strong><br> 主要ストア。同期/非同期ともに読み書きする。トランザクション/ロック設計が性能と整合性の要。</li></ul><hr><h2 id="_2-フロー説明" tabindex="-1">2. フロー説明 <a class="header-anchor" href="#_2-フロー説明" aria-label="Permalink to &quot;2. フロー説明&quot;">​</a></h2><h3 id="同期-実線" tabindex="-1">同期（実線） <a class="header-anchor" href="#同期-実線" aria-label="Permalink to &quot;同期（実線）&quot;">​</a></h3><ol><li><strong>Client → API：</strong> <code>GET /recipe/123</code> などの<strong>同期リクエスト</strong>を送信。</li><li><strong>API → BL：</strong> API は<strong>直接</strong>ビジネスロジックを呼び出す。</li><li><strong>BL → DB：</strong> 必要なデータを<strong>読み書き</strong>。</li><li><strong>DB → BL：</strong> クエリ<strong>結果</strong>を返す。</li><li><strong>BL → API：</strong> 処理<strong>結果</strong>を返却。</li><li><strong>API → Client：</strong> <strong>同期レスポンス（JSON）</strong> を返す（例：200 OK）。</li></ol><blockquote><p>特徴：待ち時間＝処理時間。ユーザーが結果をすぐに必要とする場面向け。</p></blockquote><h3 id="非同期-点線" tabindex="-1">非同期（点線） <a class="header-anchor" href="#非同期-点線" aria-label="Permalink to &quot;非同期（点線）&quot;">​</a></h3><p>A. <strong>Client → API：</strong> <code>POST /generate-report</code> など<strong>非同期リクエスト</strong>を送信。<br> B. <strong>API → Client：</strong> 受理のみ行い <strong><code>202 Accepted</code></strong> を即返す（ジョブID等を返すと良い）。<br> C. <strong>API → SQS：</strong> リクエスト内容を<strong>キュー投入</strong>（冪等性キー推奨）。<br> D. <strong>SQS → Worker：</strong> ワーカーが<strong>ポーリング</strong>してメッセージを取得。<br> E. <strong>Worker → BL：</strong> メッセージに基づいて BL に<strong>処理依頼</strong>。<br> F. <strong>BL → DB：</strong> <strong>重い処理</strong>（集計・書き込み等）を実施し永続化。</p><blockquote><p>特徴：応答は即時、実処理はバックグラウンド。長時間処理・ピーク平準化・再試行に強い。</p></blockquote><hr><h3 id="運用メモ-参考" tabindex="-1">運用メモ（参考） <a class="header-anchor" href="#運用メモ-参考" aria-label="Permalink to &quot;運用メモ（参考）&quot;">​</a></h3><ul><li><strong>冪等性</strong>：キュー投入時に重複禁止キー（例：<code>job_key</code>）を付与し、DB 側でも一意制約で多重実行を抑止。</li><li><strong>再試行</strong>：失敗時は可視性タイムアウト後に再配信。BL は<strong>副作用の再実行</strong>に耐える設計に。</li><li><strong>進捗通知</strong>：ポーリング API・WebSocket・Webhook のいずれかでクライアントに完了/失敗を通知。</li><li><strong>監視</strong>：SQS のキュー長/遅延、Worker の処理時間、DB のロック待ちをメトリクス化。</li></ul>`,22)])])}const q=o(a,[["render",s]]);export{h as __pageData,q as default};
