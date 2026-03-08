import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"共有会 Q&Aセッション","description":"","frontmatter":{},"headers":[],"relativePath":"q-and-a-session.md","filePath":"q-and-a-session.md"}');
const _sfc_main = { name: "q-and-a-session.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="共有会-q-aセッション" tabindex="-1">共有会 Q&amp;Aセッション <a class="header-anchor" href="#共有会-q-aセッション" aria-label="Permalink to &quot;共有会 Q&amp;Aセッション&quot;">​</a></h1><p>共有会でいただいたご質問とその回答をまとめました。</p><hr><h3 id="よくある質問" tabindex="-1">よくある質問 <a class="header-anchor" href="#よくある質問" aria-label="Permalink to &quot;よくある質問&quot;">​</a></h3><details><summary>Q. Geminiとの協業（ヴィーヴコーディング）で最も効果的だと感じたことは何ですか？</summary><p>ここに回答を記述します。Markdown形式での記述も可能です。</p><ul><li>ポイント1</li><li>ポイント2</li></ul></details><details><summary>Q. TDDのデモで、テストを先に書くことのメリットは具体的にどこで感じられましたか？</summary><p>ここに回答を記述します。</p></details><details><summary>Q. これは正しく表示されるかのテストです。</summary><p>はい、これはテスト用の回答です。正しく表示されています。</p></details></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("q-and-a-session.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const qAndASession = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  qAndASession as default
};
