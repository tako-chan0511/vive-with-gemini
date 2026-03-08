# title: 動的LoRAデプロイ実践ガイド
## description: OpenShift AI GUI のデプロイ編集画面だけで動的LoRAを設定するための実践ガイド

## OpenShift AI GUI だけで完結する設定手順と各項目の意味

# この資料の読み方

この資料は、単なる「OpenShift AI の画面操作説明」ではありません。  
大切なのは、**GUI のどの項目が、推論基盤のどの挙動に対応しているか**を理解し、YAMLを直接触らずに必要十分な設定を GUI で完結させることです。資料全体は次の流れで読むと理解しやすくなります。

1. なぜ動的LoRAが必要なのかを理解する  
2. ベースモデルと LoRA アダプタの配置を理解する  
3. GUI のどの入力欄に何を入れるかを理解する  
4. Advanced Settings でどのランタイム引数を入れるかを理解する  
5. API からどうやって LoRA を動的指定するかを理解する  
6. 失敗時にどこを見るかを理解する  

## 🎧 音声解説（リンク）

★今回は「動的LoRAでAIを即座に切り替える.m4a」でこの資料を解説しています。  

### 音声URL

https://drive.google.com/file/d/16swnbfq2NhaHGy-r6NjYwsMLE3CmjSou/view?usp=drive_link

https://drive.google.com/file/d/1ssQnqprW7bslSzwq9ywWRkLQltewgNat/view?usp=drive_link

---

# 1. 表紙：この資料のテーマ

![DLDG1.動的LoRAデプロイメント実践ガイド](/images/LLM/DLDG1.動的LoRAデプロイメント実践ガイド.jpg)

## このページの要旨

表紙では、左に OpenShift AI GUI、右に InferenceService の概念図が描かれています。  
ここで伝えたいことは、**GUI と InferenceService は別物ではなく、GUI の設定は裏側で推論サービスの設定に繋がっている**という点です。ただし本資料の実運用上の結論は、**その内部構造を理解したうえで、実際の変更作業は GUI だけで行う**ということです。

## 基本用語

### OpenShift AI
OpenShift 上で AI モデルの配備や運用を行うためのプラットフォームです。GUI からモデルをデプロイできるのが大きな特徴です。

### InferenceService
推論サービスを表す仕組みです。内部的にはこうした設定が存在しますが、本資料ではそれを**理解対象**とし、**直接編集対象にはしません**。

### Base Model
共通の土台となる大規模言語モデルです。LoRA を切り替えても、この土台自体は共通利用します。

### LoRA
Base Model に対する軽量な差分アダプタです。用途別・部門別の振る舞いを追加するために使います。

### 動的LoRA
Pod を再起動せず、リクエスト時に使う LoRA を切り替える運用方式です。

---

# 2. なぜ「動的LoRA」なのか？

![DLDG2.なぜ「動的LoRA」なのか？](/images/LLM/DLDG2.なぜ「動的LoRA」なのか？.jpg)

## このページの要旨

2ページ目では、従来の静的デプロイと、動的LoRAの推奨アーキテクチャが比較されています。  
静的方式では、モデルごとに VRAM を専有し、再起動のたびにダウンタイムが発生します。これに対し、動的LoRAでは **1つのGPU上のベースモデルを共有しつつ、リクエスト時に必要なLoRAだけを動的ロード**することで、**ゼロダウンタイムと高いコスト効率**を目指せることが示されています。

## 詳細解説

### 静的デプロイの問題
- LoRA ごとに別デプロイになりやすい
- GPU メモリを無駄に消費しやすい
- 新しい LoRA を追加するたびに再デプロイが必要になりやすい
- 利用頻度が低いアダプタでも常時リソースを消費しやすい

### 動的LoRAの利点
- Base Model は共通利用できる
- LoRA だけを必要時に切り替えられる
- 再起動なしで切り替えやすい
- コストと柔軟性のバランスが良い

## 実務上の意味

PoC では静的方式でも動くことがありますが、部門や用途が増えると急激に管理が難しくなります。  
本番運用を見据えるなら、最初から **GUI で動的LoRA用のランタイム引数を設定できる構成**に寄せる方が運用しやすいです。

---

# 3. デプロイメント・ワークフローのギャップ

![DLDG3.デプロイメントワークフローのギャップ](/images/LLM/DLDG3.デプロイメントワークフローのギャップ.jpg)

## このページの要旨

3ページ目には、  
- Step 1: GUIで「空の器」をデプロイする  
- Step 2: LoRA機能を注入する  
- Step 3: APIから動的にフレーバーを指定する  
という流れが描かれています。図中には「YAML Surgery」という表現がありますが、本資料の運用方針では**YAMLを直接編集するのではなく、GUIの編集画面から必要な設定を注入する**と読み替えるのが重要です。

## 本資料における解釈

このページの本質は、「最初の GUI デプロイだけでは足りず、追加設定が必要」という点です。  
ただしその追加設定は、**YAML 編集ではなく GUI の Advanced Settings で実施する**のが本資料の運用ルールです。

## 画面上で対応する場所

OpenShift AI のベースモデルのデプロイ編集画面で、次の流れを取ります。

1. モデルをデプロイする  
2. 編集画面を開く  
3. **Advanced Settings** を開く  
4. **Configuration parameters** を確認する  
5. **Add custom runtime arguments** にチェックを入れる  
6. **View custom runtime arguments** を開く  
7. `--enable-lora` などの引数を GUI から追加する  

この流れにより、YAML を直接触らずに、資料でいう「機能注入」を GUI 上で完結できます。

---

# 4. Step 1：ストレージとデータ接続の構成

![DLDG4.Step1：ストレージとデータ接続の構成](/images/LLM/DLDG4.Step1：ストレージとデータ接続の構成.jpg)

## このページの要旨

4ページ目では、ベースモデルと LoRA アダプタを分けて配置する構成が示されています。  
ベースモデルは `/mnt/models/tsuzumi-base`、LoRA アダプタは `s3://llm-models/loras/` のようなオブジェクトストレージ配置が例示され、LoRA 側には `adapter_config.json` と `adapter_model.safetensors` が必要と示されています。さらに、OpenShift AI の **Data Connection** が、推論Pod起動時の認証シークレットとして機能することも書かれています。

## 詳細解説

### ベースモデル
大きくて重い土台モデルです。頻繁に変えない前提なら、PVC やローカルマウント領域に置く構成が扱いやすいです。

### LoRAアダプタ
軽量差分です。追加や更新が起こりやすいため、S3互換ストレージに置くと管理しやすくなります。

### `adapter_config.json`
LoRA のメタ情報です。どのような設定で学習されたか、どの構成に適用されるかなどの情報を持ちます。

### `adapter_model.safetensors`
LoRA の重み本体です。これが実際の差分データです。

### Data Connection
GUI でストレージ接続を登録する仕組みです。ここで設定した接続情報により、推論基盤が安全にモデルやアダプタを取得できます。

## 実務ポイント

- Base Model と LoRA は分けて配置する
- LoRA 側のファイル欠損は 500 エラーの原因になりやすい
- Data Connection は GUI 上の設定だが、実質的にはストレージ認証の要になる

---

# 5. Mapping 1：ベースモデルのデプロイ

![DLDG5.Mapping1：ベースモデルのデプロイ（GUItoYAML）](/images/LLM/DLDG5.Mapping1：ベースモデルのデプロイ（GUItoYAML）.jpg)

## このページの要旨

5ページ目では、GUI の基本項目と内部設定の対応が示されています。  
図では次の3項目が重要です。  
- **Model deployment name**  
- **Serving runtime**  
- **Model location**  
これらは、GUI でベースとなる推論サービスの骨格を定義する最重要項目です。

## GUI項目の詳細解説

### 1. Model deployment name
デプロイ名です。運用時に一覧で識別するための名前になります。

#### 付け方の考え方
- ベースモデル名を含める
- 用途が分かるようにする
- 例: `tsuzumi-base-dynamic-lora`

### 2. Serving runtime
どの推論ランタイムで動かすかを選びます。資料では **vLLM ServingRuntime for KServe** が例示されています。

#### なぜ vLLM か
- LLM 推論に向いている
- 動的LoRAのような構成に適している
- ランタイム引数による制御がしやすい

### 3. Model location
ベースモデルの配置場所を指定します。資料では `s3://my-bucket/models/tsuzumi-base/` の例が描かれています。

#### 注意点
ここには **Base Model の場所** を指定します。LoRA の場所ではありません。

## この段階での意味

この時点では、まだ「LoRA を受け付けられる器」を作っている段階です。  
動的LoRAとして動かすには、次ページ以降の **Advanced Settings** が重要になります。

---

# 6. GUI編集画面での追加設定ポイント

![DLDG6.「TAMLView」appingへの移行](/images/LLM/DLDG6.「TAMLView」appingへの移行.jpg)

## このページの要旨

6ページ目には「YAML View への移行」と書かれていますが、本資料の運用ではここを**GUI編集画面で追加設定を行う地点**として扱います。  
重要なのは、「標準GUIでは見えにくい詳細設定がある」という点であり、それは実運用上、**Advanced Settings の Configuration parameters** を使って対応します。

## GUIだけで完結させる操作の考え方

実際の作業では、以下のように進めます。

1. Deployed model 一覧から対象モデルを開く  
2. Edit を開く  
3. **Advanced Settings** を展開する  
4. **Configuration parameters** を確認する  
5. **Add custom runtime arguments** を有効化する  
6. **View custom runtime arguments** で引数入力欄を表示する  
7. 必要な引数を GUI から登録する  

## ここで重要なこと

- YAML 直接編集は禁止
- ただし詳細パラメータの理解は必要
- その理解をもとに、GUI の詳細設定欄へ正しく入力する

つまり、本資料で内部構造を知るのは、「YAML を触るため」ではなく、**GUI の入力ミスを防ぐため**です。

---

# 7. Mapping 2：LoRA起動引数の設定

![DLDG7.Mapping2：LoRA起動引数の注入（TheSurgery）](/images/LLM/DLDG7.Mapping2：LoRA起動引数の注入（TheSurgery）.jpg)

## このページの要旨

7ページ目では、LoRA 機能の有効化に関わる主要引数として、  
- `--model=/mnt/models`  
- `--enable-lora`  
- `--max-loras=4`  
が示されています。右側には重要な設計方針として、**`--lora-modules` のように特定アダプタをハードコードしない**ことも書かれています。

## GUIでの設定場所

これらは YAML に直接書くのではなく、**Advanced Settings → Configuration parameters → Add custom runtime arguments** から GUI 上で追加します。  
`View custom runtime arguments` を開くと、引数入力欄が表示され、そこへ順に追加できます。

## 各引数の詳細解説

### `--model=/mnt/models`
ベースモデルの実ロード先を指定します。

#### 意味
vLLM が起動時に参照するモデルパスです。GUI の Model location と混同しやすいですが、こちらはランタイム側の参照パスです。

### `--enable-lora`
LoRA 機能を有効化します。

#### 意味
これが無いと、API で LoRA を切り替える前提が成立しません。動的LoRAの最重要引数です。

### `--max-loras=4`
同時に GPU メモリ上へ保持できる LoRA 数の上限です。

#### 意味
複数LoRAを使い回すときのキャッシュ効率に関わります。大きくしすぎると VRAM を圧迫します。

## 重要な設計方針

### 特定LoRAを固定しない
資料でも強調されている通り、**特定のアダプタを固定ロードする設計は避ける**べきです。  
使う LoRA は API リクエスト時に指定し、ランタイム側は「受け入れ可能な状態」に留めます。

---

# 8. vLLMパラメータの解剖学

![DLDG8.vLLMパラメータの解剖学](/images/LLM/DLDG8.vLLMパラメータの解剖学.jpg)

## このページの要旨

8ページ目には、動的LoRA運用で特に重要な3つの引数が整理されています。  
- `--max-loras=4`  
- `--max-cpu-loras=8`  
- `--max-lora-rank=64`  
それぞれ、GPU上の保持数、CPU側退避数、許容ランク上限を意味します。

## GUIで設定する引数としての意味

これらも **custom runtime arguments** に追加する対象です。  
つまり、GUI だけで完結させる場合でも、これらの意味を理解して入力する必要があります。

## 詳細解説

### `--max-loras`
GPU 上に同時保持する LoRA 数です。

#### 実務での考え方
- 多すぎると VRAM 圧迫
- 少なすぎると再ロード頻度増
- 最初は小さく始めるのが無難

### `--max-cpu-loras`
CPU メモリ側へ退避キャッシュする LoRA 数です。

#### 実務での考え方
GPUから外しても再利用されやすい LoRA を CPU 側で保持し、再取得の負担を減らします。

### `--max-lora-rank`
許容する LoRA ランク上限です。
 - デフォルトは１６です。
  - 学習時のランクがこれを超えている場合は、HTTP400系エラー（サポートされていないランクです：Rank out of bounds）

#### 実務での考え方
学習側で作られた LoRA の rank がこの値を超えると受け付けられないため、基盤側と学習側の事前調整が必要です。

---

# 9. Mapping 3：ハードウェアとリソース制限

![DLDG9.Mapping3：ハードウェアとリソース制限](/images/LLM/DLDG9.Mapping3：ハードウェアとリソース制限.jpg)

## このページの要旨

9ページ目では、GUI の  
- **Accelerator**  
- **Number of accelerators**  
が、GPU リソース割り当てに対応することが示されています。図には `memory: "32Gi"` のような記載もありますが、本資料の運用では、**YAML追記ではなく、GUI上で設定可能なリソース項目があればそちらを優先して設定する**という方針で解釈します。

## GUI項目の詳細解説

### Accelerator
使用するアクセラレータ種別です。資料では **NVIDIA GPU** が示されています。

### Number of accelerators
GPU の枚数です。資料では `1` が例示されています。

## OOMKilled とは

### 意味
Out Of Memory により、コンテナがメモリ不足で強制終了される状態です。

### なぜ起こるか
- Base Model のロードが重い
- CPU メモリが不足する
- LoRA 数を増やしすぎる
- 長文入力や高負荷で一時的にメモリが膨らむ

## 実務ポイント

- GPU数だけ見て安心しない
- システムRAM不足でも落ちる
- GUI の編集画面で設定できるリソース上限は必ず確認する
- 画面で設定可能なら GUI で完結させる

---

# 10. 高度なチューニング：VRAMの保護

![DLDG10.高度なチューニング：VRAMの保護](/images/LLM/DLDG10.高度なチューニング：VRAMの保護.jpg)

## このページの要旨

10ページ目では、VRAM を  
- Base Model Weights 50%  
- KV Cache 25%  
- LoRA Reservation  
- Headroom 10%  
のように考える図があり、  
- `--gpu-memory-utilization=0.9`  
- `--max-model-len=4096`  
の2つの引数で安全余白を持たせる考え方が説明されています。

## GUIでの設定方法

これらも **Add custom runtime arguments** から GUI 上で追加する代表的な引数です。

## 詳細解説

### `--gpu-memory-utilization=0.9`
GPUメモリ使用率の上限を 90% に抑える設定です。

#### なぜ必要か
LoRA の追加ロードや一時的なキャッシュ増加で、100%近くまで詰めるとクラッシュしやすいためです。

### `--max-model-len=4096`
入力と出力を含めた最大トークン長の上限です。

#### なぜ必要か
長すぎる入力は KV キャッシュを大量消費し、VRAM を圧迫するためです。

## 用語解説

### KV Cache
生成中に保持する中間データです。長文になるほど増えます。

### Headroom
安全余白です。運用では非常に重要です。

---

# 11. 高度なチューニング：ヘルスチェックの罠

![DLDG11.高度なチューニング：ヘルスチェックの罠](/images/LLM/DLDG11.高度なチューニング：ヘルスチェックの罠.jpg)

## このページの要旨

11ページ目では、Base Model のロードに時間がかかるため、起動直後にヘルスチェックを厳しくかけると、まだ正常起動途中なのに異常と誤判定されてしまう問題が説明されています。資料には、  
- `readinessProbe.initialDelaySeconds: 120`  
- `livenessProbe.initialDelaySeconds: 180`  
の例が示されています。

## 本資料での運用解釈

ここも内部構造としては重要ですが、実際の運用では **GUI で設定可能なヘルスチェック項目が提供されている場合は GUI から設定する** のが前提です。  
YAML の意味を理解しつつ、**画面で設定できるものは必ず画面で行う**方針です。

## 用語解説

### readinessProbe
リクエスト受付可能かを判断するチェックです。

### livenessProbe
生存しているかを判断するチェックです。

### initialDelaySeconds
起動後、最初のチェックを始めるまでの待機時間です。

### CrashLoopBackOff
起動失敗と再起動を繰り返す状態です。

## 実務ポイント

- モデルサイズが大きいほど起動に時間がかかる
- ストレージが遅いとさらに待機時間が必要
- readiness と liveness は目的が違う

---

# 12. 動的実行：APIからのペイロード送信

![DLDG12.動的実行：APIからのペイロード送信](/images/LLM/DLDG12.動的実行：APIからのペイロード送信.jpg)

## このページの要旨

12ページ目では、API へ送る JSON ペイロード中の `"model": "hr-lora-v1"` が強調されています。  
つまり、GUI で LoRA を固定するのではなく、**リクエスト時にどのLoRAを使うかを指定する**のが動的LoRAの本質です。

## 代表的なcurl例

```bash
curl -X POST https://ai-endpoint/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "hr-lora-v1",
    "messages": [
      {
        "role": "user",
        "content": "就業規則の改定案を要約してください。"
      }
    ]
  }'
````
動的LoRAでオンデマンドロードをする場合は、＜ベースモデル名＞：＜使いたいアダプタフォルダ名＞で指定する。
- ベースモデル名：tsuzumi-baseの場合は、"model":"tsuzumi-base:hr-lora-v1",となる

## コマンド詳細解説

### `curl`

HTTP リクエストを送るための基本コマンドです。API の疎通確認、認証確認、リクエスト内容の検証で広く使います。補助資料でも、`curl` の基本オプションや診断用途が整理されています。

### `-X POST`

HTTPメソッドを POST に指定します。

### `-H "Content-Type: application/json"`

JSON を送ることを示します。

### `-d '...'`

送信する JSON 本文です。

### `"model": "hr-lora-v1"`

ここが最重要です。今回使いたい LoRA を指定します。

## よく使う追加オプション

### `-i`

レスポンスヘッダも表示します。HTTP ステータス確認に便利です。

### `-v`

通信詳細を表示します。認証やTLS、経路切り分けに役立ちます。

### `--fail-with-body`

エラー時に失敗扱いしつつ本文確認もしやすくなります。

---

# 13. アーキテクチャ・フロー：舞台裏の挙動

![DLDG13.アーキテクチャフロー：舞台裏の挙動](/images/LLM/DLDG13.アーキテクチャフロー：舞台裏の挙動.jpg)

## このページの要旨

13ページ目では、利用者からの `{"model":"hr-lora-v1"}` リクエストが KServe Router を経由して vLLM Pod に届き、Pod 側で対象 LoRA があるかを確認し、無ければ MinIO(S3) から取得して LoRA Reservation Space に載せ、Base Model と組み合わせて応答を返す流れが描かれています。

## 詳細解説

### KServe Router

推論リクエストの入口です。適切なサービスへリクエストを流します。

### Cache Miss

指定された LoRA がまだロードされていない状態です。このときストレージから取得が必要になります。

### LoRA Reservation Space

LoRA を一時的に配置して適用するための領域です。

## この図が示す役割分担

* GUI で「LoRAを受けられるランタイム」を作る
* API で「今回使う LoRA」を指定する
* ランタイムが必要に応じて LoRA を取得・適用する

この分担を守ることで、GUI に特定 LoRA を固定せず、柔軟な運用ができます。

---

# 14. トラブルシューティング・マトリクス

![DLDG14.トラブルシューティングマトリクス](/images/LLM/DLDG14.トラブルシューティングマトリクス.jpg)

## このページの要旨

14ページ目には、代表的な症状と原因・対策が表形式でまとめられています。
主な項目は次の4つです。

* Baseモデルの回答が返る
* 500 Internal Server Error
* コンテナが OOMKilled で落ちる
* 401 / 403 Error 

## 1. Baseモデルの回答が返る

### 原因候補

* API の `model` 指定ミス
* LoRA 名と実体の不一致
* LoRA が正しくロードされていない

### 確認ポイント

* JSON の `model` 値
* LoRA の配置パス
* GUI で設定した runtime arguments
* サーバログ

---

## 2. 500 Internal Server Error

### 原因候補

* LoRA フォルダ内の必須ファイル欠損
* `adapter_config.json` 不在
* `adapter_model.safetensors` 不在

### 確認ポイント

* S3 / MinIO 側のファイル構成
* ディレクトリ名
* ファイル名の綴り

---

## 3. コンテナが OOMKilled で落ちる

### 原因候補

* システムRAM不足
* LoRA 数を増やしすぎた
* 長文入力でメモリ圧迫

### 確認ポイント

* GPU 数
* GUI 上のリソース設定
* `--max-loras`
* `--gpu-memory-utilization`
* `--max-model-len`

---

## 4. 401 / 403 Error

### 原因候補

* API Gateway の認証失敗
* ルーティング不整合
* 権限不足

### 確認ポイント

* 認証ヘッダ
* トークン
* API Gateway 設定
* 経路制御設定

---

# 15. 導入前・最終チェックリスト

![DLDG15.導入前最終チェックリスト](/images/LLM/DLDG15.導入前最終チェックリスト.jpg)

## このページの要旨

15ページ目には、導入前の確認事項として

* Storage
* GUI Deployment
* YAML Surgery
* API Execution
  が並んでいます。
  本資料の運用ルールに合わせると、ここでいう「YAML Surgery」は**GUI の Advanced Settings による詳細設定**に読み替えるのが適切です。

## 本資料版の最終チェックリスト

### 1. Storage

* MinIO / S3 接続は正しいか
* Base / LoRA の配置は分離されているか
* LoRA 必須ファイルは揃っているか
* Data Connection は正しいか

### 2. GUI Deployment

* ベースモデルは GUI でデプロイ済みか
* Serving runtime は vLLM 系か
* Model location は Base Model を指しているか
* GPU 数は適切か

### 3. GUI Advanced Settings

* Add custom runtime arguments を有効化したか
* `--enable-lora` を追加したか
* `--max-loras` を追加したか
* 必要に応じて `--max-cpu-loras` を追加したか
* 必要に応じて `--max-lora-rank` を追加したか
* 必要に応じて `--gpu-memory-utilization` を追加したか
* 必要に応じて `--max-model-len` を追加したか
* 特定 LoRA を固定する引数を入れていないか

### 4. API Execution

* API の JSON で `model` を指定しているか
* ベース回答ではなく目的の LoRA の応答になっているか
* curl 等で疎通確認済みか

---

# GUIで設定すべき代表的ランタイム引数一覧

OpenShift AI GUI の
**Advanced Settings → Configuration parameters → Add custom runtime arguments → View custom runtime arguments**
で追加する代表例を整理します。資料中に登場する主要引数は次の通りです。

```text
--model=/mnt/models
--enable-lora
--max-loras=4
--max-cpu-loras=8
--max-lora-rank=64
--gpu-memory-utilization=0.9
--max-model-len=4096
```

## 各引数の役割まとめ

| 引数                             | 役割        | 主な目的         |
| ------------------------------ | --------- | ------------ |
| `--model=/mnt/models`          | ベースモデル参照先 | 起動対象の明示      |
| `--enable-lora`                | LoRA有効化   | 動的LoRA運用の前提  |
| `--max-loras=4`                | GPU上同時保持数 | キャッシュ効率調整    |
| `--max-cpu-loras=8`            | CPU側退避数   | 再利用性向上       |
| `--max-lora-rank=64`           | 許容rank上限  | 学習済みLoRAとの整合 |
| `--gpu-memory-utilization=0.9` | VRAM上限率   | クラッシュ防止      |
| `--max-model-len=4096`         | 最大トークン長   | KV Cache暴走防止 |

---

# 実務でよく使う確認コマンド

資料中の主役は GUI ですが、運用では確認コマンドも重要です。

## API疎通確認

```bash
curl -i https://<endpoint>/health
curl -v https://<endpoint>/v1/models
```

* `-i`: ヘッダ込み確認
* `-v`: 詳細通信ログ確認 

## GPU状態確認

```bash
nvidia-smi
```

VRAM 使用量、GPU使用率、異常プロセス確認に使います。

## ストレージ配置確認

```bash
ls -R /mnt/models
du -sh /mnt/models/*
```

ベースモデルやキャッシュの配置確認に使います。

# まとめ

本資料の結論は明確です。
**動的LoRAの設定は、YAMLを直接編集しなくても、OpenShift AI GUI の編集画面だけで完結できる**ということです。添付資料にある各ページのメッセージを、本資料では次のように整理しました。

* Base Model は GUI の基本項目で定義する
* LoRA有効化や各種チューニングは GUI の Advanced Settings で行う
* 特定 LoRA は GUI に固定せず、API の `model` で動的指定する
* つまり、**YAMLを理解しつつ、実際の運用は GUI だけで完結させる**のが正しい

この考え方で進めれば、運用ルールを守りながら、動的LoRAのメリットを活かした構成を実現できます。

