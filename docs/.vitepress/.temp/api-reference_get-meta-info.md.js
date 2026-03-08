import { ssrRenderAttrs, ssrRenderStyle } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"統計メタ情報取得API","description":"e-Statの統計表IDからメタ情報（分類情報）を取得するAPIエンドポイント。","frontmatter":{"title":"統計メタ情報取得API","description":"e-Statの統計表IDからメタ情報（分類情報）を取得するAPIエンドポイント。"},"headers":[],"relativePath":"api-reference/get-meta-info.md","filePath":"api-reference/get-meta-info.md"}');
const _sfc_main = { name: "api-reference/get-meta-info.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="統計メタ情報取得api-api-get-meta-info" tabindex="-1">統計メタ情報取得API (<code>/api/get-meta-info</code>) <a class="header-anchor" href="#統計メタ情報取得api-api-get-meta-info" aria-label="Permalink to &quot;統計メタ情報取得API (\`/api/get-meta-info\`)&quot;">​</a></h1><p>このAPIは、e-Statの統計表ID（statsDataId）を指定して、分類（CLASS_INF）に関するメタ情報を取得します。</p><h2 id="エンドポイント" tabindex="-1">エンドポイント <a class="header-anchor" href="#エンドポイント" aria-label="Permalink to &quot;エンドポイント&quot;">​</a></h2><ul><li><strong>Method:</strong> <code>GET</code></li><li><strong>Path:</strong> <code>/api/get-meta-info</code></li><li><strong>クエリパラメータ:</strong><ul><li><code>statsDataId</code> (必須): e-Statの統計表ID</li></ul></li></ul><h2 id="環境変数" tabindex="-1">環境変数 <a class="header-anchor" href="#環境変数" aria-label="Permalink to &quot;環境変数&quot;">​</a></h2><ul><li><code>ESTAT_APP_ID</code>（e-StatのアプリケーションID）が必要です。これが設定されていないとエラーになります。</li></ul><h2 id="レスポンス例" tabindex="-1">レスポンス例 <a class="header-anchor" href="#レスポンス例" aria-label="Permalink to &quot;レスポンス例&quot;">​</a></h2><p>成功時 (<code>200 OK</code>):</p><div class="language-json vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">json</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">[</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#005CC5", "--shiki-dark": "#79B8FF" })}">    &quot;@id&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;cat01&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">,</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#005CC5", "--shiki-dark": "#79B8FF" })}">    &quot;CLASS&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">: [</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#005CC5", "--shiki-dark": "#79B8FF" })}">        &quot;@code&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;001&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">,</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#005CC5", "--shiki-dark": "#79B8FF" })}">        &quot;@name&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;総数&quot;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      },</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-light-font-style": "italic", "--shiki-dark": "#FDAEB7", "--shiki-dark-font-style": "italic" })}">      ...</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">    ]</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">]</span></span></code></pre></div><p>失敗時（例: <code>400 Bad Request</code>, <code>500 Internal Server Error</code>）:</p><div class="language-json vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">json</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">{</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#005CC5", "--shiki-dark": "#79B8FF" })}">  &quot;error&quot;</span><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">: </span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}">&quot;エラーメッセージ&quot;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">}</span></span></code></pre></div><h2 id="注意事項" tabindex="-1">注意事項 <a class="header-anchor" href="#注意事項" aria-label="Permalink to &quot;注意事項&quot;">​</a></h2><ul><li>statsDataIdは必須で、文字列形式で渡す必要があります。</li><li>e-Stat APIがエラーを返した場合は、そのメッセージが含まれます。</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("api-reference/get-meta-info.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const getMetaInfo = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  getMetaInfo as default
};
