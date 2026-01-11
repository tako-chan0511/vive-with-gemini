import{_ as r,c as t,o as n,j as a}from"./chunks/framework.CDjunVez.js";const S=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"README.md","filePath":"README.md"}'),o={name:"README.md"};function s(i,e,p,c,d,l){return n(),t("div",null,[...e[0]||(e[0]=[a("pre",{class:"mermaid"},`sequenceDiagram
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
`,-1)])])}const E=r(o,[["render",s]]);export{S as __pageData,E as default};
