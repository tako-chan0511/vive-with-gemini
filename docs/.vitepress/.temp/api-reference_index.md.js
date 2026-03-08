import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"APIリファレンス","description":"vive-with-geminiプロジェクトで公開しているAPIのエンドポイント仕様一覧です。","frontmatter":{"title":"APIリファレンス","description":"vive-with-geminiプロジェクトで公開しているAPIのエンドポイント仕様一覧です。"},"headers":[],"relativePath":"api-reference/index.md","filePath":"api-reference/index.md"}');
const _sfc_main = { name: "api-reference/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="apiリファレンス" tabindex="-1">APIリファレンス <a class="header-anchor" href="#apiリファレンス" aria-label="Permalink to &quot;APIリファレンス&quot;">​</a></h1><p>このセクションでは、<code>vive-with-gemini</code>プロジェクトで開発・公開しているAPIの技術仕様をまとめています。</p><p>これらのAPIは、CORSポリシーにより全てのドメインからの呼び出しを許可しており、皆さんのアプリケーションから自由にご利用いただけます。</p><h2 id="公開api一覧" tabindex="-1">公開API一覧 <a class="header-anchor" href="#公開api一覧" aria-label="Permalink to &quot;公開API一覧&quot;">​</a></h2><h3 id="汎用api" tabindex="-1">汎用API <a class="header-anchor" href="#汎用api" aria-label="Permalink to &quot;汎用API&quot;">​</a></h3><ul><li><a href="./quote.html"><strong>名言ジェネレーター API</strong></a><ul><li>ランダムに心に響く名言を返す、シンプルなAPIです。</li></ul></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api-reference/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
