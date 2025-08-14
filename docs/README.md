<pre class="mermaid" v-pre>
sequenceDiagram
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
