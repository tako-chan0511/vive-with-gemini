# VitePress Markdown 記述文法ガイド

VitePressは、標準的なMarkdownのすべての機能に加え、ドキュメント作成をより強力で便利にするための独自の拡張構文をサポートしています。

## 1. 標準Markdown

まずは基本となる、一般的に利用可能なMarkdown記法です。

### 見出し
```markdown
# h1
## h2
### h3
#### h4
##### h5
###### h6
```

### テキストの装飾
```markdown
*イタリック* or _イタリック_
**太字** or __太字__
***太字 & イタリック***
~~打ち消し線~~
```

### 引用
```markdown
> これは引用です。
>
> > ネストされた引用も可能です。
```

### リスト
- **順序なしリスト**
  ```markdown
  - アイテム 1
  - アイテム 2
    - サブアイテム 2.1
  ```
- **順序付きリスト**
  ```markdown
  1. 最初のアイテム
  2. 2番目のアイテム
  3. 3番目のアイテム
  ```

### リンクと画像
```markdown
<!-- リンク -->
[VitePress公式サイト](https://vitepress.dev/)

<!-- 画像 -->
![Vueのロゴ](https://vuejs.org/images/logo.png)
```

### テーブル
```markdown
| ヘッダー 1 | ヘッダー 2 | ヘッダー 3 |
| :--- | :---: | ---: |
| 左寄せ | 中央寄せ | 右寄せ |
| content | content | content |
```

---

## 2. VitePress拡張構文

ここからはVitePressが独自に拡張した、より表現力豊かな構文です。

### コンテナ (Containers)

特定のメッセージを目立たせるためのカスタムコンテナを簡単に作成できます。

```markdown
::: info
これは情報メッセージです。
:::

::: tip
これはヒントやアドバイスです。
:::

::: warning
これは注意喚起のメッセージです。
:::

::: danger
これは危険な操作や重要な警告を示します。
:::

::: details 詳細
クリックすると内容が表示される折りたたみブロックです。
:::
```

### コードブロックの拡張

- **シンタックスハイライト**
  言語名を指定することで、コードが色付けされます。
  ````markdown
  ```javascript
  console.log('Hello, VitePress!');
  ````

- **行のハイライト**
  特定の行を目立たせることができます。 `{}`で行番号を指定します。
  ````markdown
  ```js{2,4-5}
  function sayHello() {
    console.log('Hello'); // この行がハイライトされます
  }
  sayHello(); // この行と
  // 次の行がハイライトされます
  ````

- **行番号の表示**
  `:line-numbers` を追加すると、行番号が表示されます。
  ````markdown
  ```ts:line-numbers
  // 1行目
  // 2行目
  ````

### 絵文字
標準の絵文字ショートコードが利用できます。

```markdown
:tada: :rocket:
```

### 目次 (Table of Contents)
ページ内の見出し (`h2`, `h3`) から自動で目次を生成します。

```markdown
[[TOC]]
```

---

## 3. Vueコンポーネントの利用

VitePressの最も強力な機能の一つが、Markdownファイル内で直接Vueコンポーネントを使えることです。

**例: カウンターコンポーネント**

1.  まず、コンポーネントを作成します。
    `.vitepress/theme/MyCounter.vue`
    ````vue
    <script setup>
    import { ref } from 'vue'
    const count = ref(0)
    </script>

    <template>
      <div class="my-counter">
        <p>Count: {{ count }}</p>
        <button @click="count++">Increment</button>
      </div>
    </template>

    <style scoped>
    .my-counter {
      border: 1px solid #ccc;
      padding: 1rem;
      border-radius: 8px;
    }
    </style>
    ````

2.  Markdownファイル内でインポートして使用します。
    `index.md`
    ````markdown
    # Vueコンポーネントのテスト

    これは静的なテキストです。

    <script setup>
    import MyCounter from './.vitepress/theme/MyCounter.vue'
    </script>

    <MyCounter />

    Markdownは続きます...
    ````

これにより、静的なドキュメント内にインタラクティブな要素をシームレスに埋め込むことができます。
