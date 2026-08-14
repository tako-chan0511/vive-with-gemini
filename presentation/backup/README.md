# AI開発事例共有会：スライド

発表タイトル：**AIは「道具」でなく「相棒」― アジャイルなAI駆動開発の実践事例 ―**

- 発表者：原 桂介
- 想定枠：20分
- 本編：およそ18分
- 残り：切り替え・質疑・時間調整用におよそ2分
- 対象本文：第5章〜5.3章

## ファイル

- `ai-developer-meeting-vive-with-gemini-10slides.pptx`：10枚のPowerPoint。各スライドに発表者ノートを収録
- `ai-developer-meeting-vive-with-gemini-presenterstop-24slides.pptx`：PresenterStopごとの24枚版（元ファイル）
- `ai-developer-meeting-vive-with-gemini-presenterstop-25slides.pptx`：各ページの公開参照リンクと「今回、伝えたかったこと」を追加した25枚版
- `speaker-notes.md`：時間配分、話す要点、注意点、本文との対応
- `public-links.md`：25枚版に収録した公開参照リンクの対応表

## 10枚版の構成

1. 表紙・自己紹介
2. 相棒の定義とROI
3. 仕様とテンプレートを確実に適用するAIの強み
4. 動くものと顧客フィードバックが生む価値
5. 閉域MaaS活動の4本柱と現在地
6. AI利用領域と閉域領域の分離
7. GuideLLM／vLLMの評価ループ
8. Copilot Agentによる評価ブック作成
9. AIとの分単位の対話と1週間スプリント
10. AIへの任せ方3 Tips

## 25枚版で追加した内容

- 2〜25枚目のフッターに、表示内容と対応する公開HPのURLを配置
- URLのクリック先は、公開ページ内の該当見出しへ設定
- 技術スライドの発表者ノートに公式資料を補足
- 25枚目に「今回、伝えたかったこと」を追加し、本文QRコードを再掲

## 再生成

10枚版PowerPointは `scripts/build_ai_developer_meeting_deck.py` から再生成できます。

```bash
python3 -m pip install --target /tmp/vive_ppt_deps \
  -r scripts/requirements-presentation.txt
PYTHONPATH=/tmp/vive_ppt_deps python3 scripts/build_ai_developer_meeting_deck.py
```

PowerPointを修正した場合は、再生成で上書きされるため注意してください。

24枚版を元に25枚版を再生成する場合は、次を実行します。元の24枚版は上書きしません。

```bash
PYTHONPATH=/tmp/vive_ppt_deps \
  python3 scripts/enhance_presenterstop_deck.py
```

## 公開URL

<https://tako-chan0511.github.io/vive-with-gemini/ai-agile-vive-with-gemini-5.html>

第5章のQRコードは1ページ目に配置しています。発表当日にも、会場回線とスマートフォンで到達確認をしてください。
