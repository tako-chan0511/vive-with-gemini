---
title: API Gateway（Nginx）環境設定 & Tips
outline: deep
---

# API Gateway（Nginx）環境設定 & Tips

このページでは、**FastAPI の前段**に **Nginx ベースの簡易 API Gateway** を置き、  
**認証（API Key）／CORS／レート制限／アクセスログ（JSON）／簡易ロードバランス** を構成する方法をまとめます。  
ローカル〜コンテナ運用の**再現性重視**の最小構成です。

## アーキテクチャ（概要）

<pre class="mermaid" v-pre>
flowchart TD
  %% --- Nodes ---
  subgraph client[クライアント]
    B[ブラウザ / WebApp]
  end

  %% --- API Gateway 層 ---
  subgraph edge[API Gateway （Nginx）]
  　GW["認証(API Key) / CORS / 速度制限 / ロギング"]
  end

  %% --- アプリケーション層 ---
  subgraph app[アプリケーションサーバー]
    API[FastAPI /api...]
    %% style API fill:#eef,stroke:#88a  ← スタイル指定は別行でOK
  end

  %% --- 外部サービス層 ---
  subgraph ext[外部サービス]
    DB[(PostgreSQL)]
    Q[Amazon SQS など]
  end

  %% --- Edges ---
  B -->|"HTTP(S) リクエスト"| GW
  GW -->|"正当なリクエストのみ転送"| API
  API --> DB
  API -.-> Q

  classDef dashed stroke-dasharray:4 3
  class Q dashed
</pre>


---

## ディレクトリ構成

```txt
your-project/
├─ backend/                 # 既存の FastAPI
│  └─ ...
├─ gateway/
│  ├─ nginx.conf.template  # ← これがゲートウェイ本体
│  └─ .env.gateway         # ← API Key や CORS 設定
└─ docker-compose.yml       # ← gateway サービスを追加
```

---

## 1) docker-compose.yml（最小例）

```yaml
version: "3.9"
services:
  gateway:
    image: nginx:1.25-alpine
    ports:
      - "8080:80"                # ← ブラウザは http://localhost:8080 でアクセス
    env_file:
      - ./gateway/.env.gateway
    volumes:
      - ./gateway/nginx.conf.template:/etc/nginx/nginx.conf.template:ro
    depends_on:
      - api
    command: >
      sh -c "envsubst '$$API_GATEWAY_API_KEY $$CORS_ALLOWED_ORIGINS'
      < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
      && exec nginx -g 'daemon off;'"

  api:
    build:
      context: ./backend
    expose:
      - "8000"
    command: >
      sh -c "uvicorn api.main:app --host 0.0.0.0 --port 8000"
```

> すでに DB などがある場合は、そのまま並べてください。  
> `api` をコンテナ化していないなら `image`/`build`/`command` を環境に合わせて調整。

---

## 2) gateway/.env.gateway（環境変数）

```dotenv
# クライアントは X-API-Key ヘッダで送る
API_GATEWAY_API_KEY=supersecret

# CORS 許可オリジン（カンマ区切り）
# 例: http://localhost:5173,https://example.com
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

- **API_GATEWAY_API_KEY**: ゲートウェイで検査（`401` を返す）。  
- **CORS_ALLOWED_ORIGINS**: 複数可。プリフライトも本リクエストも網羅。

---

## 3) gateway/nginx.conf.template（本体）

```nginx
worker_processes  auto;
events { worker_connections 1024; }

http {
  # ---- JSON アクセスログ ----
  log_format json escape=json
    '{'
      '"time":"$time_iso8601",'
      '"remote_addr":"$remote_addr",'
      '"request":"$request",'
      '"status":$status,'
      '"bytes":$bytes_sent,'
      '"referer":"$http_referer",'
      '"ua":"$http_user_agent",'
      '"req_time":$request_time'
    '}';
  access_log /dev/stdout json;
  error_log  /dev/stderr warn;

  # ---- レート制限 (IP単位 10 req/s, バースト20) ----
  limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;

  # ---- バックエンド（複数 server を並べるとラウンドロビン） ----
  upstream api_upstream {
    server api:8000;   # docker-compose の service 名
    # server api2:8000;
  }

  # ==== 認証(API Key) ====
  map $http_x_api_key $is_authorized {
    default 0;
    "${API_GATEWAY_API_KEY}" 1;
  }

  # ==== CORS 許可 ====
  # "http://a.com,http://b.com" → 正規表現 "(a|b)"
  map $http_origin $cors_ok {
    default 0;
    "~^(${CORS_ALLOWED_ORIGINS//,/|})$" 1;
  }

  server {
    listen 80;
    server_name _;

    # 共通 CORS ヘッダ
    set $allow_origin "";
    if ($cors_ok) { set $allow_origin $http_origin; }

    # --- Preflight（OPTIONS）：常に204で返す ---
    if ($request_method = OPTIONS) {
      add_header Access-Control-Allow-Origin $allow_origin always;
      add_header Access-Control-Allow-Credentials "true" always;
      add_header Access-Control-Allow-Headers "Authorization,Content-Type,X-API-Key" always;
      add_header Access-Control-Allow-Methods "GET,POST,PATCH,PUT,DELETE,OPTIONS" always;
      add_header Access-Control-Max-Age "86400" always;
      return 204;
    }

    # --- /api → FastAPI へ ---
    location /api/ {
      # 認証 (必要に応じて /api/healthz を例外にしても良い)
      if ($is_authorized = 0) { return 401; }

      # レート制限
      limit_req zone=perip burst=20 nodelay;

      # CORS (本リクエスト)
      add_header Access-Control-Allow-Origin $allow_origin always;
      add_header Access-Control-Allow-Credentials "true" always;

      proxy_set_header Host              $host;
      proxy_set_header X-Real-IP         $remote_addr;
      proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      proxy_pass http://api_upstream;
    }

    # ドキュメントを通す場合（必要なら無認証でも）
    location /docs {
      add_header Access-Control-Allow-Origin $allow_origin always;
      proxy_pass http://api_upstream;
    }

    # ルート（必要なら FastAPI の Static に委譲）
    location / {
      add_header Access-Control-Allow-Origin $allow_origin always;
      proxy_pass http://api_upstream;
    }

    client_max_body_size 10m;
  }
}
```

---

## 4) 起動 & 動作確認（Windows PowerShell 例）

```powershell
docker compose up -d --build

# 認証なし → 401
curl.exe -i http://localhost:8080/api/healthz

# API Key あり → 200
curl.exe -i -H "X-API-Key: supersecret" http://localhost:8080/api/healthz
```

---

## よくあるカスタマイズ

### 4-1. ヘルスチェックは無認証で通したい

```nginx
location = /api/healthz {
  proxy_pass http://api_upstream;
  add_header Access-Control-Allow-Origin $allow_origin always;
  # 認証チェックをスキップするので if は書かない
}
```

### 4-2. レート制限を緩める / 厳しくする

```nginx
# 例: 20 req/s, バースト 40
limit_req_zone $binary_remote_addr zone=perip:10m rate=20r/s;

location /api/ {
  limit_req zone=perip burst=40 nodelay;
  ...
}
```

### 4-3. 特定オリジンだけを許可

`.env.gateway` の `CORS_ALLOWED_ORIGINS` に **厳密なオリジン**を列挙。  
ワイルドカードは使わず、`http://localhost:5173,https://your.site` のように書くのが安全。

---

## 監視・運用 Tips

- **JSON アクセスログ**を標準出力に吐いているため、Docker/Cloud のログ基盤で集約しやすい。  
- **X-Forwarded-For** などのヘッダを FastAPI 側で見れば「実クライアント IP」を扱える。  
- **upstream を複数**にすれば**簡易ロードバランス**（ラウンドロビン）。  
- **タイムアウト**や**ヘルスチェック**を詰めたい場合は `proxy_read_timeout` や `health_check`（モジュール）を検討。

---

## 応用: OAuth / OIDC（JWT）を使いたい

認証を **API Key → OIDC（Google/Microsoft/Cognito 等）**にしたい場合は、  
Nginx の `auth_request` + `oauth2-proxy` が実運用で扱いやすい構成です（サンプルは別ページで提供可能）。

<pre class="mermaid" v-pre>
flowchart LR
  B[ブラウザ] --> GW[Nginx Gateway]
  GW -- auth_request --> O2P[oauth2-proxy]
  O2P -- 検証OK/JWT --> GW
  GW --> API[FastAPI]
</pre>

---

## トラブルシュート

- **`401 Unauthorized` が返る**  
  → `X-API-Key` が一致していない。`.env.gateway` とクライアント側ヘッダを再確認。

- **CORS エラー**  
  → `CORS_ALLOWED_ORIGINS` にフロントのオリジン（`http://localhost:5173` 等）を追加。  
  → 先に **プリフライト（OPTIONS）** が通っているか、ブラウザ DevTools のネットワークで確認。

- **`429 Too Many Requests`**  
  → レート制限が発動。`rate`/`burst` を調整。

- **`502/504`**  
  → FastAPI が未起動／落ちている／遅延。`api` コンテナのログ確認、`proxy_read_timeout` 調整。

---

## 付録：AWS API Gateway を使う選択肢（超ミニ）

IaaS 管理を減らすなら **AWS API Gateway + Cognito** での JWT 検証も有効。  
下記は *断片* だけ示します（詳細は別途）。

```yaml
openapi: 3.0.1
info: { title: kitchen-stack-gw, version: 1.0.0 }
paths:
  /api/healthz:
    get:
      security: [{ cognito_jwt: [] }]
      x-amazon-apigateway-integration:
        type: http_proxy
        httpMethod: GET
        payloadFormatVersion: "1.0"
        uri: https://your-render-app.onrender.com/api/healthz
      responses: { "200": { description: "ok" } }
components:
  securitySchemes:
    cognito_jwt:
      type: oauth2
      flows:
        implicit:
          authorizationUrl: "https://your-domain.auth.ap-northeast-1.amazoncognito.com/oauth2/authorize"
          scopes: {}
x-amazon-apigateway-cors:
  allowOrigins: [ "http://localhost:5173", "https://example.com" ]
  allowHeaders: [ "Authorization", "Content-Type", "X-API-Key" ]
  allowMethods: [ "GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS" ]
```

---

## まとめ

- **Nginx を前段に置く**だけで、**API Key 認証 / CORS / Rate Limit / JSON ログ /（簡易）LB** が一括で入る。  
- **.env とテンプレート**で環境差分を吸収。  
- 将来的に **oauth2-proxy + OIDC** や **AWS API Gateway** へ拡張しやすい。

> 実際の `docker-compose.yml`／`nginx.conf.template`／`.env.gateway` をこのページ内のサンプル通りに配置すれば、  
> `docker compose up -d --build` で即動作します。
