# Perpetual Zero Cost Automation

## 無料枠サービスをGitHub Actionsで永続化する技術

---

### 1. 課題：無料ティアの「非アクティブ」問題

多くのクラウドサービス（特にBaaS/DBaaS）の無料プランでは、リソースを節約するため、一定期間利用がないプロジェクトが自動的に一時停止（Pause）される仕様があります。

#### **Supabaseの事例**

* **条件**: 1週間、APIコールまたはダッシュボードへのアクセスがない場合。
* **発生事象**: プロジェクトが「非アクティブ（Inactive）」状態になり、データベースが一時停止される。
* **通知**: 事前に警告メール、停止時に通知メールが届く。
* **復旧**: Supabaseのダッシュボードから手動でプロジェクトを再開（Restore/Unpause）できる（データは失われない）。
* **影響**: 手動での再開作業が必要になり、アプリケーションからの初回アクセス時にコールドスタートが発生してレスポンスが遅延する可能性がある。

> **出典より:**
> * "I read through the free tier but noticed that stuff gets inactive after a week... I am programming an app where you need to use it every 2 weeks or so, that would be i would probably always run into an inactive state is that correct?" - *Reddit r/Supabase*
> * "You’ll get an email saying they’re going to shut your instance down due to inactivity- just need to restart it from the dashboard. No data is lost" - *Reddit r/Supabase*
> 
> 

---

### 2. 解決策：GitHub Actionsによる自動キープアライブ

GitHub Actionsのスケジュール実行機能（cron）を利用し、定期的に対象のサービスへAPIリクエストを送信（Ping）することで、プロジェクトを人為的に「アクティブ」な状態に保ち、自動停止を回避します。

#### **仕組みの概要**

1. **GitHub Actionsの起動**: 設定したスケジュール（例：毎日、3日に1回など）に従い、ワークフローが自動的に実行。
2. **APIリクエストの送信**: ワークフロー内のスクリプトが、SupabaseなどのデータベースAPIを呼び出す。
3. **非アクティブカウンターのリセット**: サービス側がアクセスを検知し、「最終アクティブ日時」が更新され、7日間の停止カウンターがリセットされる。

#### **このアプローチの利点**

* **自動化**: 一度設定すれば、手動での操作は不要。
* **コスト効率**: GitHub Actionsの無料枠内で運用できるため、追加コストなし。
* **一貫した可用性**: データベースが常にアクティブな状態に保たれ、一貫したパフォーマンスを維持できる。

---

### 3. 前提知識：GitHub Actionsの無料枠

この自動化は、GitHub Actionsの無料利用枠の範囲内で行うことが前提となります。

| アカウント種別 | 無料利用枠（月間） |
| --- | --- |
| **Free** | 2,000分 |
| **Pro** | 3,000分 |

#### **OSによる消費時間の倍率**

* **Linux**: 1倍（基準）
* **Windows**: 2倍
* **macOS**: 10倍

#### **無料枠を超過した場合**

* **動作**: プライベートリポジトリのワークフローは実行されなくなります。
* **通知**: メールおよびGitHubのBillingページで通知されます。
* **追加利用**: Billingページから上限金額を設定することで従量課金（Linux $0.008/分）に移行可能。自動で課金されることはありません。

> **Note:** キープアライブのワークフローは通常1分未満で完了するため、毎日実行しても月間の消費時間は約30分程度となり、無料枠を圧迫することはほとんどありません。

---

### 4. 実装例①：cURLを使った基本的なSupabaseキープアライブ

最もシンプルで一般的な実装方法です。cURLコマンドを使い、Supabaseのテーブルに直接GETリクエストを送信します。

#### **ワークフローファイル (`.github/workflows/keep-alive.yml`)**

```yaml
name: Supabase Keep Alive

on:
  schedule:
    # 毎日 日本時間 朝9時（UTC 0:00）に実行
    - cron: '0 0 * * *'
  workflow_dispatch: # 手動実行用のボタンも有効にする

jobs:
  ping_supabase:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase Database
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: |
          curl -X GET "${SUPABASE_URL}/rest/v1/page_views?select=*&limit=1" \
          -H "apikey: ${SUPABASE_KEY}" \
          -H "Authorization: Bearer ${SUPABASE_KEY}"

```

#### **設定手順**

1. **ワークフローファイルの配置**: リポジトリの `.github/workflows/` ディレクトリにYAMLファイルを作成。
2. **GitHub Secretsの設定**: リポジトリの `Settings` → `Secrets and variables` → `Actions` に以下を登録。
* `SUPABASE_URL`: SupabaseプロジェクトのURL
* `SUPABASE_KEY`: Supabaseのanon keyまたはservice_role key



---

### 5. 実装例②：Node.jsを使ったSupabaseキープアライブ

公式クライアントライブラリ（`@supabase/supabase-js`）を利用して、より確実にデータベース操作を行う方法です。

#### **ワークフローファイル (`.github/workflows/supabase-ping.yml`)**

```yaml
name: Ping Supabase to Prevent Pausing

on:
  schedule:
    # 毎週月曜日と木曜日の午前9時(UTC)に実行
    - cron: '0 9 * * 1,4'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Supabase Client
        run: npm install @supabase/supabase-js --force

      - name: Ping Supabase
        env:
          SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.NEXT_SERVICE_ROLE_KEY }}
        run: |
          node -e "
            (async () => {
              try {
                const { createClient } = require('@supabase/supabase-js');
                const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
                
                // 'your_table' を実際のテーブル名に変更
                const { data, error } = await supabase.from('your_table').select('*').limit(10);
                
                if (error) throw error;
                console.log('Ping successful:', data);
              } catch (err) {
                console.error('Error pinging Supabase:', err.message);
                process.exit(1);
              }
            })();
          "

```

---

### 6. 実装例③：Upstash KVのキープアライブ

Upstash Redis (KV)に対する堅牢なキープアライブ実装例です。

#### **ワークフローファイル (`.github/workflows/upstash-keep-alive.yml`)**

```yaml
name: KV Keep Alive (Upstash)

on:
  schedule:
    # 3日に1回 / 日本時間 09:05（UTC 00:05）
    - cron: '5 0 */3 * *'
  workflow_dispatch:

jobs:
  keep_alive:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Upstash REST /info
        env:
          KV_REST_API_URL: ${{ secrets.MARKETKV_KV_REST_API_URL }}
          KV_REST_API_TOKEN: ${{ secrets.MARKETKV_KV_REST_API_TOKEN }}
        run: |
          set -euo pipefail
          # Secretsの存在チェック
          if [ -z "${KV_REST_API_URL:-}" ] || [ -z "${KV_REST_API_TOKEN:-}" ]; then
            echo "Secrets MARKETKV_KV_REST_API_URL / MARKETKV_KV_REST_API_TOKEN are not set."
            exit 1
          fi

          URL="${KV_REST_API_URL%/}/info"
          echo "POST ${URL}"
          BODY="$(curl -sS -X POST "${URL}" \
            -H "Authorization: Bearer ${KV_REST_API_TOKEN}" \
            --max-time 20 --retry 3 --retry-delay 2)"
          echo "Response: ${BODY}"

          # レスポンスボディの判定
          if echo "${BODY}" | grep -q '"error"'; then
            if echo "${BODY}" | grep -qi 'temporarily rate-limited'; then
              echo "WARN: temporarily rate-limited (treated as success for keep-alive)."
              exit 0
            fi
            echo "ERROR: Upstash returned error."
            exit 1
          fi

```

---

### 7. 注意事項とトラブルシューティング

1. **cronの実行タイミングの不確実性**
* GitHub Actionsのスケジュールイベントは正確な実行を保証しません。通常3〜10分、負荷状況により1時間以上の遅延が発生することもあります。
* **対策**: 7日間の猶予に対し、毎日または3日に1回など余裕を持ったスケジュールを設定してください。


2. **ワークフローファイルの配置場所**
* スケジュール実行が有効になるのは、**デフォルトブランチ（通常はmain）**にファイルが存在する場合のみです。


3. **この手法の有効性に関する最近の動向**
* 単純なAPIアクセスだけでは停止を防げなくなったという報告もあります。
* **対策**: `select` だけでなく、`insert` や `update` などの書き込み処理を試す、または実際のアプリ経由のアクセスを模倣する工夫が必要になる可能性があります。


4. **運用上のマナー**
* **過剰な頻度を避ける**: 1時間に1回などは避け、1日1回程度に留めましょう。
* **放置プロジェクト**: 長期間使わないことが明らかな場合は、素直にPauseさせておくのもマナーです。



---

### 8. まとめ

* Supabase等の無料ティア自動停止は、GitHub Actionsの **cron** を利用して回避可能です。
* 実装はシンプルで、運用コストもGitHub Actionsの無料枠内で収まります。
* **重要な点**: cronの遅延を考慮すること、デフォルトブランチに配置すること、そしてサービスの仕様変更の可能性に注意を払うことが重要です。
