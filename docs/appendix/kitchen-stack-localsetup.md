# kitchen-stack ローカル開発セットアップ手順（FastAPI + PostgreSQL）

> これは今回行った一連の作業を **VitePress 用 Markdown 1ファイル**にまとめたものです。
> OS: Windows（Git Bash / PowerShell 併用） / Editor: VS Code

---

## 目的

* FastAPI の骨格を作る
* Docker で **PostgreSQL** をローカル起動
* **Alembic** で DB マイグレーション
* 動作確認用の **ヘルスチェック API**（アプリ・DB）を用意
* 将来 Render へ移行できる作りに（ポートや構成はそのまま流用可能）

---

## ディレクトリ構成（最終形）

```
kitchen-stack/
├─ backend/
│  ├─ .env
│  ├─ .venv/                     # 仮想環境（ローカル）
│  ├─ api/
│  │  ├─ main.py                 # FastAPI アプリ本体（app factory）
│  │  ├─ core/
│  │  │  └─ db.py                # DB 接続（SQLAlchemy Async）
│  │  ├─ routers/
│  │  │  └─ health.py            # ヘルスチェック API (/api/healthz, /api/healthz/db)
│  │  ├─ schemas/                # 将来の Pydantic スキーマ
│  │  └─ services/               # 将来のサービス層
│  ├─ migrations/                # Alembic
│  │  └─ env.py                  # DB URL を読み込むよう修正済み
│  ├─ models.py                  # 将来の SQLAlchemy モデル
│  ├─ requirements.txt
│  └─ docker-compose.yml         # PostgreSQL 起動用（ローカル）
└─ frontend/                     # （必要になったら追加）
```

---

## 1. Python 仮想環境の作成

> **Git Bash 推奨**。PowerShell の場合は有効化コマンドが異なります。

```bash
# ルートへ
cd ~/WEBAPI/kitchen-stack/backend

# 既存の .venv があれば削除（Git Bash）
rm -rf .venv

# Python 3.11 で仮想環境作成
py -3.11 -m venv .venv

# 有効化（Git Bash）
source .venv/Scripts/activate
# PowerShell の場合:
# .venv\Scripts\Activate.ps1
```

### 依存関係のインストール

`backend/requirements.txt`

```txt
fastapi
uvicorn[standard]
httpx
SQLAlchemy>=2.0
asyncpg
alembic
pydantic-settings
pytest
pytest-asyncio
python-dotenv
```

```bash
(.venv) pip install -U pip
(.venv) pip install -r requirements.txt
```

---

## 2. ローカル PostgreSQL を Docker で起動

`backend/docker-compose.yml`

```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    container_name: pg16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
volumes:
  pg_data:
```

```bash
(.venv) docker compose up -d
(.venv) docker compose ps
(.venv) docker logs pg16 --tail=50
```

\::: tip
すでに `pg16` というコンテナ名が使われていると「Conflict」になります。
`docker rm -f pg16` で削除 → `docker compose up -d` を再実行。
\:::

---

## 3. 環境変数ファイル（.env）

`backend/.env`

```env
# DB 接続（asyncpg）
DATABASE_URL=postgresql+asyncpg://app:pass@localhost:5432/appdb

# 外部APIを使うなら例（任意）
RAKUTEN_APP_ID=xxxxxxxxxxxxxxxxxx
```

\::: tip
将来 Render に出すときも同じキー名で環境変数を登録すれば、そのまま動きます。
\:::

---

## 4. FastAPI アプリ本体

`backend/api/main.py`

```py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .routers import health

def create_app(mount_static: bool = False) -> FastAPI:
    app = FastAPI(title="kitchen-stack API")
    # ルーター登録
    app.include_router(health.router, prefix="/api", tags=["health"])

    # 将来フロントを同コンテナで配信する時用
    if mount_static:
        dist = Path(__file__).resolve().parents[1] / "dist"
        if dist.exists():
            app.mount("/", StaticFiles(directory=dist, html=True), name="static")

    return app

# Uvicorn から参照されるインスタンス
app = create_app()
```

---

## 5. DB 接続（SQLAlchemy Async）

`backend/api/core/db.py`

```py
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv

# .env 読み込み
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

engine = create_async_engine(DATABASE_URL, future=True, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

# 使い方例（依存性注入用などで）
async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

# シンプルな Ping
async def ping_db() -> bool:
    async with engine.connect() as conn:
        await conn.execute("SELECT 1")
    return True
```

---

## 6. ヘルスチェック API

`backend/api/routers/health.py`

```py
from fastapi import APIRouter
from ..core.db import ping_db

router = APIRouter()

@router.get("/healthz")
async def healthz():
    return {"status": "ok"}

@router.get("/healthz/db")
async def healthz_db():
    try:
        await ping_db()
        return {"db": "ok"}
    except Exception as e:
        return {"db": "ng", "error": str(e)}
```

---

## 7. Alembic 初期化と設定

### 初期化

```bash
(.venv) python -m alembic init migrations
```

> 既に `migrations/` がある場合はスキップ。`alembic.ini` と `migrations/env.py` が生成されます。

### `migrations/env.py` の修正（.env を読んで DATABASE\_URL を使う）

```py
# backend/migrations/env.py
import os, asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# ここで .env を読む
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

# モデルメタデータ（モデルを作ったらここで import）
try:
    from api.models import Base      # 将来使う想定
    target_metadata = Base.metadata
except Exception:
    target_metadata = None

def get_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url

def run_migrations_offline():
    context.configure(url=get_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    engine = create_async_engine(get_url(), pool_pre_ping=True)
    async with engine.connect() as conn:
        await conn.run_sync(do_run_migrations)

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

### マイグレーション作成＆反映

> まだモデルが無ければ空のリビジョンでも OK。後から増やします。

```bash
(.venv) python -m alembic revision -m "init schema" --autogenerate
(.venv) python -m alembic upgrade head
```

---

## 8. 起動 & 動作確認

### Uvicorn 起動

```bash
(.venv) uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### ブラウザ確認

* アプリ: [http://127.0.0.1:8000/api/healthz](http://127.0.0.1:8000/api/healthz) → `{"status":"ok"}`
* DB: [http://127.0.0.1:8000/api/healthz/db](http://127.0.0.1:8000/api/healthz/db) → `{"db":"ok"}`（失敗時は `{"db":"ng", ...}`）
* ドキュメント: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

\::: warning よくあるハマり

* ブラウザが**旧ポート**を開いたまま（例: 8686）→ `8000` を開き直す。
* Uvicorn は起動しているが画面が白い → URL/ポートの打ち間違い or ブラウザ拡張の干渉。
* `ModuleNotFoundError` → import パスの再確認（今回 `api.core.db` が正）。
  \:::

---

## 9. 最小テスト（任意）

`backend/tests/test_health.py`

```py
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_healthz():
    r = client.get("/api/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
```

```bash
(.venv) pytest -q
```

---

## 10. Git へ保存

```bash
git add -A
git commit -m "feat: FastAPI skeleton + DB + Alembic + health endpoints"
git push origin main
```

---

## 11. 次の一歩（ロードマップ）

* **CRUD** の小さなリソース（例：ingredients）を
  モデル → マイグレーション → ルータ → テスト の順で追加
* **CORS** を許可してフロント（Vue3/TS）と連携
* **Dockerfile** を用意し、将来 Render の `$PORT` で動かす（`uvicorn ... --port $PORT`）
* **CI（GitHub Actions）** で `pytest → Docker Build → Deploy Hook` の順に自動化

---

## 付録：よくあるトラブルと対処

* **「Permission denied」で venv が作れない（Windows）**
  → 権限問題の可能性。**Git Bash** で `rm -rf .venv` → `py -3.11 -m venv .venv`。
  PowerShell の実行ポリシーにも注意。

* **ドキュメント（/docs）が真っ白**
  → URL/ポート違い、またはブラウザ拡張の影響。`openapi.json` が開けるかも確認。

* **Alembic が DB URL を読めない**
  → `migrations/env.py` が `.env` を読んでいるか、`DATABASE_URL` が正しいか確認。

---

