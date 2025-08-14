# 非同期レポート生成のシーケンス図（API + SQS + Worker + PostgreSQL）

このページでは、レポート生成を **非同期** 化する典型構成を、Mermaid のシーケンス図と
ステップごとの解説、さらに **各ステップ（①〜⑦）に対応する Python のサンプルコード** でまとめます。  
（図の描画はサイト設定に合わせ **`<pre class="mermaid" v-pre>`** を利用しています）

> 想定スタック：FastAPI（API） / Amazon SQS（キュー） / ワーカー（バックグラウンド） / PostgreSQL（永続化）

---

## シーケンス図（全体像）

<pre class="mermaid" v-pre>
sequenceDiagram
  autonumber
  actor Client
  participant API
  participant SQS
  participant Worker
  participant DB as PostgreSQL

  Client->>API: POST /generate-report
  API->>SQS: enqueue(jobId)
  API-->>Client: 202 Accepted {jobId}

  Worker->>SQS: poll
  SQS-->>Worker: message(jobId)
  Worker->>DB: heavy processing / write result
  Worker-->>DB: mark SUCCESS
</pre>

---

## ステップ解説（①〜⑦）

- **① Client → API：`POST /generate-report`**  
  クライアントがレポート生成の要求を送信。同期呼び出しは *受付* のみで、重処理は行いません。

- **② API → SQS：`enqueue(jobId)`**  
  API は新しい `jobId` を払い出し、ジョブを SQS に投入（メッセージ化）。

- **③ API → Client：`202 Accepted {jobId}`**  
  すぐに **HTTP 202** で受付完了と `jobId` を返します。以降の処理はバックグラウンド。

- **④ Worker → SQS：`poll`**  
  ワーカーはロングポーリングで SQS を監視。メッセージ到着を待ち受けます。

- **⑤ SQS → Worker：`message(jobId)`**  
  キューから `jobId` を受領。これをキーに実行対象を特定します。

- **⑥ Worker → DB：`heavy processing / write result`**  
  重い処理を実行し、結果（中間/最終）を DB に書き込みます（例：レポート生成ファイルのパスなど）。

- **⑦ Worker → DB：`mark SUCCESS`**  
  処理が完了したら **成功ステータス** に更新。失敗時は `FAILED` とし、必要に応じてリトライ回数を加算します。

---

## ステップ対応コード（最小サンプル）

> 依存：`fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `psycopg[binary]`（または `asyncpg`）, `boto3`  
> 環境変数：`DATABASE_URL`, `SQS_QUEUE_URL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### 0. モデル定義（共通）

```python
# models.py
from sqlalchemy import String, Text, Enum, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime
import enum
import uuid

class Base(DeclarativeBase):
    pass

class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
```

---

### API サーバ（FastAPI）— ①〜③

```python
# api.py  — FastAPI
from fastapi import FastAPI, status
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Job, JobStatus
import boto3, os, json

DATABASE_URL = os.environ["DATABASE_URL"]
SQS_QUEUE_URL = os.environ["SQS_QUEUE_URL"]
AWS_REGION = os.environ.get("AWS_REGION", "ap-northeast-1")

engine = create_engine(DATABASE_URL, future=True)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

sqs = boto3.client("sqs", region_name=AWS_REGION)

app = FastAPI()

class SubmitResponse(BaseModel):
    jobId: str

@app.post("/generate-report", response_model=SubmitResponse, status_code=status.HTTP_202_ACCEPTED)
def submit_job():
    # ① 受付：Job を PENDING で作成
    with SessionLocal() as db:
        job = Job()
        db.add(job)
        db.commit()
        db.refresh(job)

    # ② キュー投入：jobId をメッセージ化
    msg = {"jobId": job.id}
    sqs.send_message(QueueUrl=SQS_QUEUE_URL, MessageBody=json.dumps(msg))

    # ③ 202 Accepted + jobId を返却
    return SubmitResponse(jobId=job.id)
```

---

### Worker（バックグラウンド）— ④〜⑦

```python
# worker.py  — ポーリング & 実行
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Job, JobStatus
import boto3, os, json, time

DATABASE_URL = os.environ["DATABASE_URL"]
SQS_QUEUE_URL = os.environ["SQS_QUEUE_URL"]
AWS_REGION = os.environ.get("AWS_REGION", "ap-northeast-1")

engine = create_engine(DATABASE_URL, future=True)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

sqs = boto3.client("sqs", region_name=AWS_REGION)

def heavy_processing(job_id: str) -> str:
    # ここに本処理（レポート生成など）を実装
    time.sleep(2)  # ダミーの重処理
    return f"report://generated/{job_id}.pdf"

def run():
    while True:
        # ④ ポーリング（ロングポーリング）
        resp = sqs.receive_message(
            QueueUrl=SQS_QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20,
            VisibilityTimeout=60
        )
        messages = resp.get("Messages", [])
        if not messages:
            continue

        for m in messages:
            try:
                body = json.loads(m["Body"])
                job_id = body["jobId"]  # ⑤ 受信した jobId

                with SessionLocal() as db:
                    job = db.get(Job, job_id)
                    if not job:
                        # 存在しないなら破棄して次へ
                        sqs.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=m["ReceiptHandle"])
                        continue

                    job.status = JobStatus.PROCESSING
                    db.commit()

                # ⑥ 重処理 & 結果書き込み
                result = heavy_processing(job_id)

                with SessionLocal() as db:
                    job = db.get(Job, job_id)
                    job.result = result
                    job.status = JobStatus.SUCCESS  # ⑦ 成功マーク
                    db.commit()

                sqs.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=m["ReceiptHandle"])

            except Exception as e:
                with SessionLocal() as db:
                    job = db.get(Job, job_id) if "job_id" in locals() else None
                    if job:
                        job.status = JobStatus.FAILED
                        job.result = f"ERROR: {e}"
                        db.commit()
                # VisibilityTimeout が切れれば再配信 → リトライ戦略は実運用要件に合わせる

if __name__ == "__main__":
    run()
```

---

## 動作の流れと確認方法

1. **API を起動**：`uvicorn api:app --reload`  
2. **ジョブ投入**：  
   ```bash
   curl -X POST http://localhost:8000/generate-report
   # => {"jobId":"<生成されたUUID>"}
   ```
3. **ワーカーを起動**：別ターミナルで `python worker.py`  
4. **DB を確認**：`jobs` テーブルの `status` が `PENDING` → `PROCESSING` → `SUCCESS` に遷移、`result` に成果物の場所が入ります。

---

## 実装 Tips

- 202 を返した直後に進捗ポーリング用 API（`GET /jobs/{id}`）を用意すると UX が上がります。
- SQS は DLQ（デッドレターキュー）を設定し、失敗メッセージを隔離すると調査が容易です。
- Worker の VisibilityTimeout は **重処理の最大時間 + α** を目安に。延長が必要なら `change_message_visibility` を使います。
- ジョブの冪等性（同一 `jobId` を2回処理しない）を担保するため、DB 側の**一意制約**や**状態遷移のチェック**を入れると安全です。
