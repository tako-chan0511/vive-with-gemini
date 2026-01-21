# Vercel Modern Data Stack: Supabase & Upstash 統合ガイド

## 1. 表紙：Vercel Modern Data Stack（Supabase & Upstash 統合ガイド）

![V1.VercelModernDataStack：SupabaseとUpstash統合ガイド](/images/gamehub/V1.VercelModernDataStack：SupabaseとUpstash統合ガイド.jpg)

### 何を言っているページか

* **Vercelを中心に**、永続DB（Supabase/Postgres）とKV/キャッシュ（Upstash/Redis）を組み合わせた “モダンなデータ基盤” の全体像を示しています。
* サブタイトルにある通り、**環境構築 → 設計（PlantUML）→ キャッシュ戦略 → 運用**までを一気通貫で扱う資料です。

### この資料の読み方（以降の前提）

* **Supabase＝Source of Truth（正本）**：整合性と永続性が必要なデータ
* **Upstash＝Cache/KV（高速・一時・派生）**：読み取り高速化、セッション、派生ビューなど
* **Vercel＝統合面（オーケストレーション）**：環境変数注入・デプロイ・Preview/Prod切替を“制御プレーン”として扱う

---

## 2. Vercelをコントロールプレーンとした統合データ基盤

![V2.Vercelをコントロールプレーンとした統合データ基盤](/images/gamehub/V2.Vercelをコントロールプレーンとした統合データ基盤.jpg)

### 図の要点

* 上段：**Compute**（Next.js / Edge Functions）
* 中段：**Control Plane**（Vercel Dashboard / Environment Variables / Auto-Inject）
* 下段：**Persistence**

  * Supabase（PostgreSQL）＝Structured Data（ER）
  * Upstash（Redis）＝Ephemeral State（KV）

### 実装・運用のポイント

* Vercel Marketplace 経由の統合で、**接続情報（URL/Key等）を環境変数として自動注入**しやすい。
* 開発者はコードに集中し、インフラ情報は **Vercelの環境変数管理**に寄せる（設定漏れ・混在を減らす）。

---

## 3. Supabase環境設定とコネクションプーリングの重要性

![V3.Superbase環境設定とコネクションプーリングの重要性](/images/gamehub/V3.Superbase環境設定とコネクションプーリングの重要性.jpg)

### 何が問題で、何を推奨しているか

* Serverless（Vercel）ではリクエストごとに接続が増えやすく、**DB接続枯渇（Connection Exhaustion）** が典型障害。
* そのため、`POSTGRES_URL` などの **Direct Connection** ではなく、**PgBouncer/Pooling（例：POSTGRES_PRISMA_URL）** を推奨、という構図です。

### 実装チェック

* Vercel Marketplace → Integration で入る環境変数（例：`POSTGRES_URL` / `SUPABASE_SERVICE_ROLE_KEY` 等）をそのまま使うのではなく、

  * **“プール接続のURL” を使っているか**
  * **サーバ側（API/Edge）とクライアント側（ブラウザ）で鍵を分離**できているか
    を点検する。

---

## 4. Upstash Redisの導入とコネクションレス・アーキテクチャ

![V4.UpstashRedisの導入とコネクションレスアーキテクチャ](/images/gamehub/V4.UpstashRedisの導入とコネクションレスアーキテクチャ.jpg)

### 図の要点

* 従来のRedis（TCP接続）は serverless/edge で扱いにくい（接続維持や同時接続数の問題）。
* Upstash は **HTTP/RESTベース**で、**Connectionless/Stateless** に寄せられるため相性が良い。

### 実装の要点

* クライアント例として `@upstash/redis` を用い、`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` を環境変数から注入して初期化するパターン。
* 「EdgeでKVを使う」前提で、**TCP前提の設計を捨て、REST前提で設計**するのが重要。

---

## 5. PlantUMLによる設計のコード化（Diagram-as-Code）

![V5.ER図の記述方法：Supabase（Relational）](/images/gamehub/V5.ER図の記述方法：Supabase（Relational）.jpg)

### 何を主張しているか

* **設計図を“成果物”ではなく“コード”として管理**し、CIで生成して常に最新化するアプローチ。
* 図では「Source of Truth → Code Definition → Visual Artifact」という流れ：

  * Source of Truth：PostgreSQL（あるいは仕様の正本）
  * Code Definition：`schema.puml` のようなテキスト
  * Visual Artifact：CIで `schema.svg` 生成

### 得られる効果

* ドキュメントの陳腐化（Documentation Rot）を防止。
* 設計レビューが「画像」ではなく「差分（diff）」中心になるため、変更点が追いやすい。

---

## 6. ER図の記述方法：Supabase（Relational）

![V6.PlantUMLによる設計のコード化（DiagramAsCode）](/images/gamehub/V6.PlantUMLによる設計のコード化（DiagramAsCode）.jpg)

### 図の内容（テーブル関係）

* 例として「Bookmarks」アプリのERが載っています：

  * `bookmarks`（id, user_id, url, title, description, image_url, created_at, updated_at）
  * `tags`（id, name, created_at）
  * 中間：`bookmark_tags`（bookmark_id, tag_id）
* **多対多（Bookmarks×Tags）**を中間テーブルで表現。

### PlantUML観点のポイント

* Crow’s Foot（カーディナリティ）表記で「1対多／多対多」を視覚化。
* `primary_key()` マクロ等で主キーを明示し、**リレーションの根拠をコードに残す**。

---

## 7. KV構造の可視化：Upstash Redis

![V7.KV構造の可視化：UpstashRadis](/images/gamehub/V7.KV構造の可視化：UpstashRadis.jpg)

### 何を言っているか

* Redisはスキーマレスだが、**Keyspace（論理構造）設計が不可欠**。
* ER図の代わりに、オブジェクト図・パッケージ図のように「キー階層」を見せる。

### 例（図の意図）

* `user:{id}:profile`（Hash）
* `user:{id}:sessions`（Set）
* `:` 区切りで**階層**を作り、検索性・運用性を上げる。

---

## 8. SQLとNoSQLの統合データモデル

![V8.SQLとNoSQLの統合データモデル](/images/gamehub/V8.SQLとNoSQLの統合データモデル.jpg)

### 図の要点

* Supabase（Users）を正本にしつつ、Upstashに `user:{id}:profile` のような形で **キャッシュ／投影（projection）** を持つ。
* 「SQLの主キーをRedisのキーセグメントに使う」ことで、対応関係が明確になる。

### 実装パターン

* DB更新時にRedisを更新（Write-through/Write-behind）するか、
* 読み取り時にキャッシュ欠損ならDBから埋める（Cache-aside）か、を次ページで整理。

---

## 9. キャッシュ戦略とデータ同期のパターン（Cache-Aside for Serverless）

![V9.キャッシュ戦略とデータ同期のパターン](/images/gamehub/V9.キャッシュ戦略とデータ同期のパターン.jpg)

### 図の流れ（Cache-aside）

1. Application が Redis を先に確認
2. Hit → Redisから返す
3. Miss → Supabaseから取得して Redisへ書き戻し（+ TTL）

### 運用面の示唆

* TTLを前提にし、**完全整合性より“十分な鮮度”**を狙う。
* Upstashの **Global Replication** を選ぶと、ユーザに近いリージョンから低遅延で返せる（ただし整合性モデルは要確認）。

---

## 10. Redisキーの命名規則とスキーマ設計（Anatomy of a Key）

![V10.Redisキーの命名規則とスキーマ設計](/images/gamehub/V10.Redisキーの命名規則とスキーマ設計.jpg)

### 推奨フォーマット

* `object_type:id:field`

  * object_type：SQLテーブル（例：user）
  * id：SQLのPK（例：1001）
  * field：属性（例：profile）

### Bad vs Good

* `userProfile1001`：階層がなく解析しにくい
* `user:1001:profile`：**階層的で検索・運用しやすい**

### 実務で効く理由

* ログ／運用コマンド／障害調査で「どの種類のデータか」が一目で分かる。
* 「NoSQLにおける外部キー」の役割を果たし、設計の一貫性が保てる。

---

## 11. Monorepo構成と環境変数の共有

![V11.Monorepo構成と環境変数の共有](/images/gamehub/V11.Monorepo構成と環境変数の共有.jpg)

### 何を言っているか

* 例として `apps/web`（Frontend）と `apps/api`（Backend）を持つ構成。
* `vercel.json` の `relatedProjects` 的な発想で、**別プロジェクトでも環境変数を共有**し、Preview/Prod差分を管理しやすくする。

### 実装上の注意

* Preview環境で「本番DBを触ってしまう」事故を避けるため、環境変数は

  * **Production専用**
  * **Preview専用**
    を分離し、権限（鍵）も分けるのが基本。

---

## 12. 実装に向けた最終チェックリスト

![V12.実装に向けた最終チェックリスト](/images/gamehub/V12.実装に向けた最終チェックリスト.jpg)

### チェック観点（このページの骨子）

* **Infrastructure**：Marketplace経由で統合し、環境変数が正しく注入されているか
* **Connection**：SupabaseはPooling、UpstashはREST APIを使っているか
* **CI/CD**：PlantUMLの自動生成ワークフローが稼働しているか
* **Design**：Redisキー命名規則（object:id:field）が統一されているか
* **Security**：本番・プレビューでデータストアが分離されているか

---

## 13. Resources & References（参照先）

![V13.Resources＆References](/images/gamehub/V13.Resources＆References.jpg)

### 位置づけ

* “何を見れば実装が進むか” の参照リストです。
* Documentation：Vercel Storage Docs / Supabase Connection Pooling / Upstash REST API
* Tools：PlantUML関連（例：achiku/planter）や `@upstash/redis` SDK など

### 実務的な使い方

* チーム内に展開する場合、このページを「標準リンク集」としてWikiに固定し、運用ルール（接続方式、命名規則、CI）と紐づけると効果が出ます。