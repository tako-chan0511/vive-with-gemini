import{_ as r,c as t,o as n,j as a}from"./chunks/framework.CDjunVez.js";const S=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"README2.md","filePath":"README2.md"}'),o={name:"README2.md"};function s(i,e,p,c,d,l){return n(),t("div",null,[...e[0]||(e[0]=[a("pre",{class:"mermaid"},`sequenceDiagram
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
`,-1)])])}const u=r(o,[["render",s]]);export{S as __pageData,u as default};
