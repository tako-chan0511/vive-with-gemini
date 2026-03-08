import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"appendix/TEST.md","filePath":"appendix/TEST.md"}');
const _sfc_main = { name: "appendix/TEST.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><div class="mermaid"> graph TD; Client[クライアント/ブラウザ]; API[FastAPI API サーバー]; Worker[ワーカー]; BL[ビジネスロジック]; SQS[Amazon SQS]; DB[(PostgreSQL)]; Client--&gt;API; API--&gt;BL; BL--&gt;DB; DB--&gt;BL; BL--&gt;API; API--&gt;Client; Client-.-&gt;API; API-.-&gt;SQS; SQS-.-&gt;Worker; Worker-.-&gt;BL; BL-.-&gt;DB; </div></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("appendix/TEST.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const TEST = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  TEST as default
};
