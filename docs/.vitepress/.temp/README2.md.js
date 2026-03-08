import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"README2.md","filePath":"README2.md"}');
const _sfc_main = { name: "README2.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><pre class="mermaid">sequenceDiagram
  autonumber
  actor Client
  participant API
  participant SQS
  participant Worker
  participant DB as PostgreSQL

  Client-&gt;&gt;API: POST /generate-report
  API-&gt;&gt;SQS: enqueue(jobId)
  API--&gt;&gt;Client: 202 Accepted {jobId}

  Worker-&gt;&gt;SQS: poll
  SQS--&gt;&gt;Worker: message(jobId)
  Worker-&gt;&gt;DB: heavy processing / write result
  Worker--&gt;&gt;DB: mark SUCCESS
</pre></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("README2.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const README2 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  README2 as default
};
