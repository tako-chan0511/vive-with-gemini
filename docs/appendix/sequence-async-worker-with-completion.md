# 非同期ワークフロー（受付→処理→**完了確認**→結果返却）

**目的**：`POST /generate-report` を非同期化し、**クライアントが完了を検知して結果を受け取る**までのフローを、Mermaid のシーケンス図と最小コードで解説します。  
（VitePress では `<pre class="mermaid" v-pre>` を使う前提）

---

## 全体シーケンス（①〜⑯）

<pre class="mermaid" v-pre>
sequenceDiagram
  autonumber
  actor Client
  participant GW as API Gateway
  participant API
  participant SQS
  participant Worker
  participant DB as PostgreSQL

  %% 受付
  Client->>GW: ① POST /generate-report
  GW->>API: ② forward (auth / CORS / rate limit / logging)
  API->>DB: ③ INSERT Job(status=PENDING)
  API->>SQS: ④ enqueue {jobId}
  API-->>Client: ⑤ 202 Accepted {jobId}, Location:/jobs/{jobId}

  %% バックグラウンド
  Worker->>SQS: ⑥ poll
  SQS-->>Worker: ⑦ message {jobId}
  Worker->>DB: ⑧ UPDATE Job(status=PROCESSING)
  Worker->>DB: ⑨ heavy processing / write result
  Worker->>DB: ⑩ UPDATE Job(status=SUCCESS, result_url?)

  %% 完了確認～返却
  Client->>GW: ⑪ GET /jobs/{jobId}
  GW->>API: ⑫ forward
  API->>DB: ⑬ SELECT Job by id
  alt 進行中
    API-->>Client: ⑭ 202 {status:"running"}, Retry-After: 3
  else 完了
    API-->>Client: ⑮ 200 {status:"success", downloadUrl}
    Client->>GW: ⑯ GET /jobs/{jobId}/result (or GET downloadUrl)
    GW->>API: forward
    API->>DB: fetch result (or sign URL)
    API-->>Client: 200 content (or 303 -> signed URL)
  end
</pre>

> **ポイント**：クライアントは ⑤ で受け取った `jobId` を使い、⑪ で状態確認。完了したら ⑯ で結果取得します。  
> 図は「ポーリング版」。SSE / WebSocket / Webhook でも置き換え可能。

---

## ステップ解説（概要）

- **①〜⑤：受付** — API はすぐ `202` を返す（`Location` / `Retry-After` を活用）。  
- **⑥〜⑩：処理** — Worker が SQS をロングポーリング、DB に結果・状態を保存。  
- **⑪〜⑮：確認** — `GET /jobs/{id}` は **進行中なら 202**、完了なら **200 + downloadUrl**。  
- **⑯：結果取得** — 直接返す / 署名付きURLへ `303 See Other` でリダイレクト。

---

## 最小コード（Python）

> 依存：`fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `psycopg[binary]`（または `asyncpg`）, `boto3`  
> 環境変数：`DATABASE_URL`, `SQS_QUEUE_URL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### 1) モデル

```python
# models.py
from sqlalchemy import String, Text, Enum, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime
import enum, uuid

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
    result: Mapped[str | None] = mapped_column(Text, nullable=True)       # 小さな結果なら本文
    result_url: Mapped[str | None] = mapped_column(Text, nullable=True)   # 大きい結果ならURL
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
```

### 2) API（①〜⑤, ⑪〜⑯）

```python
# api.py
from fastapi import FastAPI, HTTPException, Response, status
from fastapi.responses import JSONResponse, RedirectResponse, PlainTextResponse
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
    statusUrl: str

@app.post("/generate-report", status_code=status.HTTP_202_ACCEPTED, response_model=SubmitResponse)
def submit_job():
    with SessionLocal() as db:
        job = Job()
        db.add(job)
        db.commit()
        db.refresh(job)

    msg = {"jobId": job.id}
    sqs.send_message(QueueUrl=SQS_QUEUE_URL, MessageBody=json.dumps(msg))

    status_url = f"/jobs/{job.id}"
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={"jobId": job.id, "statusUrl": status_url},
        headers={"Location": status_url, "Retry-After": "3"},
    )

class JobStatusOut(BaseModel):
    status: str
    downloadUrl: str | None = None
    error: str | None = None

@app.get("/jobs/{job_id}", response_model=JobStatusOut)
def get_status(job_id: str):
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(404, "job not found")

        if job.status in {JobStatus.PENDING, JobStatus.PROCESSING}:
            return JSONResponse(
                status_code=status.HTTP_202_ACCEPTED,
                content={"status": "running"},
                headers={"Retry-After": "3"},
            )

        if job.status == JobStatus.SUCCESS:
            return JobStatusOut(status="success", downloadUrl=f"/jobs/{job_id}/result")

        return JobStatusOut(status="failed", error=job.result or "unknown error")

@app.get("/jobs/{job_id}/result")
def get_result(job_id: str):
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(404, "job not found")
        if job.status != JobStatus.SUCCESS:
            raise HTTPException(409, "job not finished")

        if job.result_url:
            return RedirectResponse(url=job.result_url, status_code=status.HTTP_303_SEE_OTHER)

        return PlainTextResponse(job.result or "OK")
```

### 3) Worker（⑥〜⑩）

```python
# worker.py
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

def heavy_processing(job_id: str) -> tuple[str | None, str | None]:
    # 実際はレポート生成など。ここではダミー。
    time.sleep(2)
    result_text = f"report for {job_id}"
    result_url = None
    return result_text, result_url

def run():
    while True:
        resp = sqs.receive_message(
            QueueUrl=SQS_QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20,
            VisibilityTimeout=60,
        )
        messages = resp.get("Messages", [])
        if not messages:
            continue

        for m in messages:
            body = json.loads(m["Body"])
            job_id = body["jobId"]
            try:
                with SessionLocal() as db:
                    job = db.get(Job, job_id)
                    if not job:
                        sqs.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=m["ReceiptHandle"])
                        continue
                    job.status = JobStatus.PROCESSING
                    db.commit()

                result_text, result_url = heavy_processing(job_id)

                with SessionLocal() as db:
                    job = db.get(Job, job_id)
                    job.result = result_text
                    job.result_url = result_url
                    job.status = JobStatus.SUCCESS
                    db.commit()

                sqs.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=m["ReceiptHandle"])

            except Exception as e:
                with SessionLocal() as db:
                    job = db.get(Job, job_id)
                    if job:
                        job.status = JobStatus.FAILED
                        job.result = f"ERROR: {e}"
                        db.commit()
                # 再配信は VisibilityTimeout 経過後（リトライ戦略は要件次第）

if __name__ == "__main__":
    run()
```

---

## 実装のコツ

- **202 の設計**：`Location: /jobs/{id}` を返すとクライアント実装が楽になります。  
- **Retry-After** を 2〜5 秒程度にしてポーリング頻度を制御。  
- **結果のサイズ**で返却方法を分岐：小さい → 本文、**大きい → 署名付きURL**（S3 等）。  
- **状態遷移**は `PENDING → PROCESSING → SUCCESS/FAILED` に限定し、冪等性を確保。  
- キューは **DLQ** を設定して失敗メッセージを隔離。  
- 進捗 UI が必要なら **SSE / WebSocket** で置き換え可能（エンドポイントは `/jobs/{id}/events` 等）。
