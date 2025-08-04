# FastAPI から AWS Aurora (PostgreSQL) への接続ガイド

FastAPI は Aurora (PostgreSQL 互換) へ SQLAlchemy や asyncpg を通じて問題なく接続可能です。

---

## 基本構成

```
[FastAPI] → [SQLAlchemy or asyncpg] → [Aurora PostgreSQL]
```

---

## インストール

```bash
pip install fastapi[all] sqlalchemy asyncpg psycopg2-binary python-dotenv
```

---

## .env の例

```env
DB_HOST=your-aurora-cluster-endpoint
DB_PORT=5432
DB_NAME=your_db
DB_USER=your_user
DB_PASSWORD=your_password
```

---

## 接続用コード

### 同期バージョン (SQLAlchemy + psycopg2)

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
               f"{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

### 非同期バージョン (asyncpg + SQLAlchemy async)

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = f"postgresql+asyncpg://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
```

---

## セキュリティの要点

| 項目         | 推奨設定                           |
| ---------- | ------------------------------ |
| VPC/Subnet | Aurora を FastAPI 側から見えるVPC内に配置 |
| セキュリティグループ | FastAPI側のIPをAuroraに許可          |
| DBパスワード管理  | AWS Secrets Manager の利用を推奨     |

---

## ベストプラクティス

* SQLAlchemy のコネクションプールを利用
* Reader Node を利用した読み込み分散
* ログ管理: CloudWatch, スロークエリー記録
* Aurora Serverless の自動スケーリング

---

## AWS で FastAPI + Aurora を構築する場合

| 実行環境        | 解説               |
| ----------- | ---------------- |
| EC2         | 自由度高いが運用コスト高め    |
| Lambda      | 小規模APIならサーバレス化も可 |
| ECS/Fargate | コンテナ対応、CI/CD 向け  |
| Vercel      | DBには直接接続不可、跡床必要  |

---

## 補足

* コネクションはプールして有効利用
* .env を gitignore したまま Secrets Manager へ移行するのが安全

---

