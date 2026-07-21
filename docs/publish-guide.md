# 発表用資料の公開手順

このページでは、VitePress で作成した資料を外部公開するための手順をまとめます。

## 1. ローカル確認

```bash
cd /home/user/projects/vive-with-gemini
npm run dev
```

ブラウザでローカルプレビューを確認します。

## 2. 公開用ビルド

```bash
cd /home/user/projects/vive-with-gemini
npm run docs:build
```

ビルドが成功すれば、公開準備は完了です。

## 3. GitHub に反映

```bash
cd /home/user/projects/vive-with-gemini
git add .
git commit -m "Update presentation materials"
git push origin main
```

## 4. GitHub Pages で公開

このリポジトリでは、main ブランチへ push すると GitHub Actions が自動実行され、GitHub Pages に公開されます。

公開先の URL は次の形式です。

```text
https://tako-chan0511.github.io/vive-with-gemini/
```

## 5. もしすぐ再公開したい場合

GitHub の Actions 画面から「Deploy VitePress site to Pages」を手動実行できます。

## 6. すぐ使うコマンド一覧

```bash
cd /home/user/projects/vive-with-gemini
npm run dev
npm run docs:build
git add .
git commit -m "Update presentation materials"
git push origin main
```
