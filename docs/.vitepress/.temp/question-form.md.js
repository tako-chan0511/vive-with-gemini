import { ssrRenderAttrs, ssrRenderAttr, ssrRenderStyle } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _imports_0 = "/vive-with-gemini/images/slido-logo.png";
const _imports_1 = "/vive-with-gemini/images/slido-qrcode.png";
const __pageData = JSON.parse('{"title":"リアルタイム Q&A","description":"","frontmatter":{},"headers":[],"relativePath":"question-form.md","filePath":"question-form.md"}');
const _sfc_main = { name: "question-form.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="リアルタイム-q-a" tabindex="-1">リアルタイム Q&amp;A <a class="header-anchor" href="#リアルタイム-q-a" aria-label="Permalink to &quot;リアルタイム Q&amp;A&quot;">​</a></h1><p>ここのHPやセッションに関するご質問は、以下のSlidoページからお気軽にお寄せください。<br> 他の人の質問に「いいね！」で投票することもできます！</p><br><a href="https://app.sli.do/event/1uzZvCeF4MvMDdnwmV7cZd" target="_blank" class="slido-link"><img${ssrRenderAttr("src", _imports_0)} alt="Slido Logo" class="slido-logo"><span>Slidoで質問を送る（ここをクリック）</span></a><hr><h3 id="スマートフォンからはこちらのqrコードをご利用ください" tabindex="-1">スマートフォンからはこちらのQRコードをご利用ください <a class="header-anchor" href="#スマートフォンからはこちらのqrコードをご利用ください" aria-label="Permalink to &quot;スマートフォンからはこちらのQRコードをご利用ください&quot;">​</a></h3><img${ssrRenderAttr("src", _imports_1)} alt="Slido QR Code" style="${ssrRenderStyle({ "max-width": "250px", "margin-top": "10px" })}"></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("question-form.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const questionForm = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  questionForm as default
};
