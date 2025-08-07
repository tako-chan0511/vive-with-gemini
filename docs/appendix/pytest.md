# FastAPIバックエンドの単体テストとカバレッジ測定ガイド

Vue 3 + Python (FastAPI) のMonorepo構成において、バックエンドAPIの品質を担保するためのテスト自動化環境を構築する手順を解説します。

::: tip
このガイドでは、テストフレームワークとして **Pytest**、APIのテストクライアントとしてFastAPI付属の **TestClient**、テストカバレッジ測定ツールとして **pytest-cov** を使用します。
:::

---

## 1. テスト環境の構築

まず、テストの実行とカバレッジ測定に必要なライブラリをインストールし、設定ファイルを準備します。

### 1.1. 必要なライブラリのインストール

Pythonの仮想環境が有効化されていることを確認し、以下のコマンドでライブラリをインストールします。

```bash
pip install pytest pytest-cov
```

インストール後、現在の環境をrequirements.txtに反映させておきましょう。

```bash
pip freeze > requirements.txt
```

### 1.2. フォルダ構成の準備

テストコードは、アプリケーションのソースコードとは別の専用フォルダに配置するのが一般的です。
プロジェクトのルートディレクトリに`tests`フォルダを作成します。

```
memosphere/
├── api/
├── frontend/
├── tests/  <-- ★ここにテストコードを配置
└── ...
```

### 1.3. Pytestの設定 (`pytest.ini`)

テストコードからapiディレクトリ内のモジュールを正しくインポートできるように、プロジェクトのルートディレクトリに`pytest.ini`を作成します。

```ini
[pytest]
pythonpath = .
```

この設定により、pytest実行時にプロジェクトルートがPythonの検索パスに含まれるようになり、`ModuleNotFoundError`を防ぎます。

### 1.4. カバレッジ測定の設定 (`.coveragerc`)

命令網羅（C0）だけでなく、より詳細な分岐網羅（C1）も測定するために、プロジェクトのルートディレクトリに`.coveragerc`を作成します。

```ini
[run]
branch = True

[report]
show_missing = True
```

- `branch = True`: 分岐網羅の測定を有効にします。
- `show_missing = True`: カバレッジが100%でない場合に、どの行が実行されていないかを表示します。

---

## 2. テストコードの実装

準備が整ったら、最初のテストケースを書いてみましょう。
`GET /api/memos`エンドポイントのテストを`tests/test_memos_api.py`に記述します。

```python
from fastapi.testclient import TestClient
from api.index import app  # メインのFastAPIアプリケーションをインポート

# テスト用のクライアントを作成
client = TestClient(app)

def test_get_all_memos():
    '''
    GET /api/memos のテスト
    - 正常なレスポンス（ステータスコード200）が返ってくること
    - レスポンスのボディがリスト形式であること
    を確認する
    '''
    response = client.get("/api/memos")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

---

## 3. テストの実行と結果の解釈

### 3.1. 基本的なテストの実行

ターミナルで以下のコマンドを実行します。
pytestは`tests`フォルダ内のテストファイルを自動で見つけて実行します。

```bash
pytest
```

**実行結果の例:**

```
================ test session starts ================
...
tests\test_memos_api.py .                      [100%]
================= 1 passed in ...s ==================
```

- `.` はテストが成功したことを示します。
- `[100%]` は、発見されたテストケースの実行進捗率であり、コードカバレッジではありません。

### 3.2. テストカバレッジの測定

`--cov`オプションを付けて実行することで、テストカバレッジを測定できます。

```bash
pytest --cov=api
```

**実行結果の例:**

```
================== tests coverage ===================
Name                    Stmts   Miss Branch BrPart  Cover   Missing
-------------------------------------------------------------------
api\db.py                  14      0      0      0   100%
api\routers\memos.py       24     11      2      2    46%   20-35
...
-------------------------------------------------------------------
TOTAL                      59     11      2      2    79%
```

### 3.3. カバレッジレポートの見方

| 列       | 意味 |
|----------|------|
| Stmts    | 実行可能なコードの行数（C0: 命令網羅の母数） |
| Miss     | テストで実行されなかったコードの行数 |
| Branch   | if文などの分岐の総数（C1: 分岐網羅の母数） |
| BrPart   | 部分的にしか実行されなかった分岐の数 |
| Cover    | 総合的なカバレッジ率（命令網羅＋分岐網羅） |
| Missing  | 実行されなかった行番号や分岐の詳細 |

このレポートから、
「`api/routers/memos.py`のPOST処理やDELETE処理（11行が未実行）のテストを書けば、カバレッジが向上する」
という、次のアクションが明確になります。

---

## Tips & トラブルシューティング

- **`ModuleNotFoundError: No module named 'api'`**:
  - `tests`フォルダがプロジェクトルートにないか、`pytest.ini`の設定が間違っています。フォルダ構造と設定ファイルを見直してください。

- **SQLAlchemyのWarning**:
  - `api/db.py`で`declarative_base`を`sqlalchemy.orm`からインポートすることで、将来のバージョンアップに対応できます。
    ```python
    # from sqlalchemy.ext.declarative import declarative_base # 古い
    from sqlalchemy.orm import declarative_base # 新しい
    ```