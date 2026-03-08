import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"共有会アジェンダ（案）","description":"","frontmatter":{},"headers":[],"relativePath":"agenda.md","filePath":"agenda.md"}');
const _sfc_main = { name: "agenda.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="共有会アジェンダ-案" tabindex="-1">共有会アジェンダ（案） <a class="header-anchor" href="#共有会アジェンダ-案" aria-label="Permalink to &quot;共有会アジェンダ（案）&quot;">​</a></h1><p><strong>テーマ:</strong> 開発ROIを最大化する、AIとの協業スタイル「Viveコーディング」のご紹介</p><p><strong>所要時間:</strong> 60分</p><hr><h3 id="_1-イントロ-なぜ今、viveコーディングなのか-5分" tabindex="-1">1. イントロ：なぜ今、Viveコーディングなのか？ (5分) <a class="header-anchor" href="#_1-イントロ-なぜ今、viveコーディングなのか-5分" aria-label="Permalink to &quot;1. イントロ：なぜ今、Viveコーディングなのか？ (5分)&quot;">​</a></h3><ul><li><strong>提示ページ</strong>: <a href="/vive-with-gemini/">ホーム</a></li><li><strong>目的</strong>: 参加者の課題感を自分ごと化し、本日のゴールを共有する。</li><li><strong>話すこと</strong>: <ul><li>価値は、単位時間あたりのフィードバック量に比例する。</li><li>ROI最大化とは、すなわち「価値 ÷ コスト」の最適化である。</li><li>今日のゴールが「ROI最大化」と「リードタイム短縮」であることを宣言する。</li></ul></li></ul><h3 id="_2-本編1-デモ「aiと駆動するテスト駆動開発」-25分" tabindex="-1">2. 本編①：デモ「AIと駆動するテスト駆動開発」 (25分) <a class="header-anchor" href="#_2-本編1-デモ「aiと駆動するテスト駆動開発」-25分" aria-label="Permalink to &quot;2. 本編①：デモ「AIと駆動するテスト駆動開発」 (25分)&quot;">​</a></h3><ul><li><strong>提示ページ</strong>: <a href="/vive-with-gemini/refactoring.html">実践：AI駆動TDD</a></li><li><strong>目的</strong>: AIとの協業の具体的な姿を、ライブコーディング形式で見せる。</li><li><strong>話すこと</strong>: <ul><li>このデモのメインディッシュ。</li><li>ページを上から順に、実際にGeminiとのやり取りを見せながら、TDDのサイクル（新機能追加→仕様変更）を実演する。</li><li>「テストがあるから、安全に変更できる」ことを強調する。</li></ul></li></ul><h3 id="_3-本編2-このアプローチが、皆さんの現場でどう活きるか-10分" tabindex="-1">3. 本編②：このアプローチが、皆さんの現場でどう活きるか (10分) <a class="header-anchor" href="#_3-本編2-このアプローチが、皆さんの現場でどう活きるか-10分" aria-label="Permalink to &quot;3. 本編②：このアプローチが、皆さんの現場でどう活きるか (10分)&quot;">​</a></h3><ul><li><strong>提示ページ</strong>: <a href="/vive-with-gemini/column.html">コラム：AI時代のエンジニア進化論</a></li><li><strong>目的</strong>: デモで示した技術が、参加者それぞれの役割でどう役立つかを具体的に示す。</li><li><strong>話すこと</strong>: <ul><li>コラムの章立てに沿って、運用保守やインフラの現場での具体的な活用例を解説する。</li><li>「&quot;お守り&quot;から&quot;価値創造の主役&quot;へ」というメッセージを伝える。</li></ul></li></ul><h3 id="_4-まとめ-今日から試せるtipsと、私たちの目指す未来-10分" tabindex="-1">4. まとめ：今日から試せるTipsと、私たちの目指す未来 (10分) <a class="header-anchor" href="#_4-まとめ-今日から試せるtipsと、私たちの目指す未来-10分" aria-label="Permalink to &quot;4. まとめ：今日から試せるTipsと、私たちの目指す未来 (10分)&quot;">​</a></h3><ul><li><strong>提示ページ</strong>: <a href="/vive-with-gemini/tips.html">Tips集</a></li><li><strong>目的</strong>: 参加者が「自分でもできそう」と感じ、行動を促す。</li><li><strong>話すこと</strong>: <ul><li>Viveコーディングを成功させるための具体的なコツをいくつか紹介。</li><li>「皆さんも今日から試せます」というメッセージで締めくくる。</li></ul></li></ul><h3 id="_5-質疑応答-10分" tabindex="-1">5. 質疑応答 (10分) <a class="header-anchor" href="#_5-質疑応答-10分" aria-label="Permalink to &quot;5. 質疑応答 (10分)&quot;">​</a></h3><ul><li>参加者からの質問を受け付け、ディスカッションを行う。</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("agenda.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const agenda = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  agenda as default
};
