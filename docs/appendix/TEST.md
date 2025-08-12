<div class="mermaid">
graph TD;
  Client[クライアント/ブラウザ]; API[FastAPI API サーバー]; Worker[ワーカー]; BL[ビジネスロジック]; SQS[Amazon SQS]; DB[(PostgreSQL)];
  Client-->API; API-->BL; BL-->DB; DB-->BL; BL-->API; API-->Client;
  Client-.->API; API-.->SQS; SQS-.->Worker; Worker-.->BL; BL-.->DB;
</div>