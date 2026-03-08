import { ssrRenderAttrs, ssrRenderAttr } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _imports_0 = "/vive-with-gemini/assets/%EF%BC%91%E6%9E%9A%E5%B1%A5%E6%AD%B4%E6%9B%B8%EF%BC%88%E7%94%BB%E5%83%8F%EF%BC%89.Bt9HPKxK.jpg";
const _imports_1 = "/vive-with-gemini/assets/1%E6%9E%9A%E5%B1%A5%E6%AD%B4%E6%9B%B8%EF%BC%88%E7%94%BB%E5%83%8F%E8%A9%B3%E7%B4%B0%EF%BC%89.C3MzLTQD.jpg";
const __pageData = JSON.parse('{"title":"作者プロフィール","description":"","frontmatter":{},"headers":[],"relativePath":"profile.md","filePath":"profile.md"}');
const _sfc_main = { name: "profile.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="作者プロフィール" tabindex="-1">作者プロフィール <a class="header-anchor" href="#作者プロフィール" aria-label="Permalink to &quot;作者プロフィール&quot;">​</a></h1><h2 id="ビートテック株式会社-九州支店" tabindex="-1">ビートテック株式会社＜九州支店＞ <a class="header-anchor" href="#ビートテック株式会社-九州支店" aria-label="Permalink to &quot;ビートテック株式会社＜九州支店＞&quot;">​</a></h2><p><strong>原 桂介（Keisuke Hara）</strong></p><ul><li>所属：ビートテック株式会社 九州支店</li><li>担当：AI時代のエンジニア育成／業務改革</li><li>スキル：アジャイル推進 / Vue 3 / TypeScript / AI活用推進 / クラウド推進</li><li>座右の銘：「価値はフィードバックの総量に比例する」</li></ul><h2 id="" tabindex="-1"><img${ssrRenderAttr("src", _imports_0)} alt="１枚履歴書（画像）"><img${ssrRenderAttr("src", _imports_1)} alt="1枚履歴書（画像詳細）"> <a class="header-anchor" href="#" aria-label="Permalink to &quot;![１枚履歴書（画像）](./public/images/１枚履歴書（画像）.jpg)
![1枚履歴書（画像詳細）](./public/images/1枚履歴書（画像詳細）.jpg)&quot;">​</a></h2><h2 id="🔹-viveコーディング実践と成果" tabindex="-1">🔹 Viveコーディング実践と成果 <a class="header-anchor" href="#🔹-viveコーディング実践と成果" aria-label="Permalink to &quot;🔹 Viveコーディング実践と成果&quot;">​</a></h2><p>2025年5月からViveコーディング実践で26個のアプリを作りました。思った以上にChatGPTやGeminiは優秀で、2～3日程度で1個の割合で追加できました。</p><p>１．成果物（アウトプット）は以下のURLからアクセスできます： 🔗 <a href="https://toppage-five.vercel.app/" target="_blank" rel="noreferrer">アプリゲームハブ（GameHub）</a><br> ２．技術的なことは以下のURLのまとめました。 🔗 <a href="https://hara0511skilltrail.vercel.app/" target="_blank" rel="noreferrer">作成アプリスキル一覧</a><br> ３．プロセスや気づきについては、このHomePageにまとめています。</p><hr><h3 id="🔹-自己紹介動画-2025年2月" tabindex="-1">🔹 自己紹介動画（2025年2月） <a class="header-anchor" href="#🔹-自己紹介動画-2025年2月" aria-label="Permalink to &quot;🔹 自己紹介動画（2025年2月）&quot;">​</a></h3><iframe src="https://drive.google.com/file/d/1WlJDKwFmWBnWE-wreKnda6xzluhI8mvL/preview" width="640" height="360" allow="autoplay"></iframe><hr><h3 id="🔹-おじさんの挑戦動画-2023年10月-※アクセスできない場合は小生まで連絡ください" tabindex="-1">🔹 おじさんの挑戦動画（2023年10月）※アクセスできない場合は小生まで連絡ください <a class="header-anchor" href="#🔹-おじさんの挑戦動画-2023年10月-※アクセスできない場合は小生まで連絡ください" aria-label="Permalink to &quot;🔹 おじさんの挑戦動画（2023年10月）※アクセスできない場合は小生まで連絡ください&quot;">​</a></h3><iframe src="https://drive.google.com/file/d/1jlYkGm6avzhk4nx03BXl1pu6rVKxipM3/preview" width="640" height="360" allow="autoplay"></iframe></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("profile.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const profile = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  profile as default
};
