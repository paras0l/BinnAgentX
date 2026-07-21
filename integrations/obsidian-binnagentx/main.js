"use strict";
var u = Object.defineProperty;
var f = Object.getOwnPropertyDescriptor;
var v = Object.getOwnPropertyNames;
var b = Object.prototype.hasOwnProperty;
var x = (i, t) => {
    for (var n in t) u(i, n, { get: t[n], enumerable: !0 });
  },
  A = (i, t, n, e) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let s of v(t))
        !b.call(i, s) &&
          s !== n &&
          u(i, s, { get: () => t[s], enumerable: !(e = f(t, s)) || e.enumerable });
    return i;
  };
var $ = (i) => A(u({}, "__esModule", { value: !0 }), i);
var F = {};
x(F, { default: () => p });
module.exports = $(F);
var a = require("obsidian"),
  w = {
    apiBaseUrl: "http://127.0.0.1:8000/learner",
    connectionId: "",
    syncSecret: "",
    allowedFolders: "BinnAgentX",
    allowedTags: "",
    maxNotes: 80,
    maxExcerptCharacters: 900,
    autoSync: !0,
    lastSyncedAt: "",
    lastSyncError: "",
  },
  k = {
    "\u8BCD\u6C47.md": `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "vocabulary"
tags:
  - binnagent
  - vocabulary
---

# \u8BCD\u6C47\u6216\u77ED\u8BED

## \u6838\u5FC3\u542B\u4E49

## \u5E38\u7528\u642D\u914D

## \u539F\u53E5\u4E0E\u8BED\u5883

## \u6211\u7684\u4F8B\u53E5

## \u6613\u6DF7\u6DC6\u70B9
`,
    "\u8BED\u6CD5.md": `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "grammar"
tags:
  - binnagent
  - grammar
---

# \u8BED\u6CD5\u7ED3\u6784

## \u7ED3\u6784\u516C\u5F0F

## \u5224\u65AD\u7EBF\u7D22

## \u539F\u53E5\u62C6\u89E3

## \u5E38\u89C1\u8BEF\u533A

## \u65B0\u8BED\u5883\u9A8C\u8BC1
`,
    "\u5199\u4F5C\u8868\u8FBE.md": `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "writing_expression"
tags:
  - binnagent
  - writing-expression
---

# \u53EF\u8FC1\u79FB\u8868\u8FBE

## \u8868\u8FBE\u529F\u80FD

## \u53E5\u5F0F\u9AA8\u67B6

## \u539F\u59CB\u8303\u4F8B

## \u6211\u7684\u6539\u5199

## \u53EF\u66FF\u6362\u8BCD\u69FD
`,
    "\u9605\u8BFB\u7B56\u7565.md": `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "reading_skill"
tags:
  - binnagent
  - reading-skill
---

# \u9605\u8BFB\u7B56\u7565

## \u9002\u7528\u573A\u666F

## \u64CD\u4F5C\u6B65\u9AA4

## \u8BC1\u636E\u5B9A\u4F4D

## \u5931\u8D25\u4FE1\u53F7

## \u65B0\u6587\u7AE0\u9A8C\u8BC1
`,
  },
  p = class extends a.Plugin {
    settings = w;
    async onload() {
      (await this.loadSettings(),
        this.addSettingTab(new m(this.app, this)),
        this.addCommand({
          id: "preview-learning-context",
          name: "Preview learning context",
          callback: () => this.preview(),
        }),
        this.addCommand({
          id: "sync-learning-context",
          name: "Sync approved learning context",
          callback: () => this.sync(),
        }),
        this.addCommand({
          id: "install-learning-templates",
          name: "Install BinnAgentX learning templates",
          callback: () => this.installTemplates(),
        }),
        this.app.workspace.onLayoutReady(() => {
          this.settings.autoSync && this.sync(!1);
        }),
        this.registerInterval(
          window.setInterval(() => {
            this.settings.autoSync && this.sync(!1);
          }, 6e4),
        ));
    }
    async loadSettings() {
      this.settings = { ...w, ...(await this.loadData()) };
    }
    async saveSettings() {
      await this.saveData(this.settings);
    }
    async collectEntriesAsync() {
      let t = _(this.settings.allowedFolders),
        n = _(this.settings.allowedTags).map((s) => s.replace(/^#/, ""));
      if (!t.length && !n.length)
        throw new Error(
          "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u5141\u8BB8\u540C\u6B65\u7684\u6587\u4EF6\u5939\u6216\u6807\u7B7E",
        );
      let e = this.app.vault.getMarkdownFiles().filter((s) => E(s, t, n, this.app));
      if (e.length > this.settings.maxNotes)
        throw new Error(
          `\u5339\u914D\u5230 ${e.length} \u7BC7\u7B14\u8BB0\uFF0C\u8BF7\u7F29\u5C0F\u8303\u56F4\uFF08\u4E0A\u9650 ${this.settings.maxNotes}\uFF09`,
        );
      return Promise.all(
        e.map(async (s) => {
          let o = this.app.metadataCache.getFileCache(s),
            r = o?.frontmatter ?? {},
            g = y([...S(r.tags), ...(o?.tags ?? []).map((l) => l.tag.replace(/^#/, ""))]);
          return {
            source_key: s.path,
            asset_id: typeof r.binnagent_asset_id == "string" ? r.binnagent_asset_id : void 0,
            title: String(r.title ?? s.basename),
            kind: T(r.binnagent_kind, g),
            tags: g,
            excerpt: B(await this.app.vault.read(s), this.settings.maxExcerptCharacters),
            modified_at: new Date(s.stat.mtime).toISOString(),
          };
        }),
      );
    }
    async preview() {
      try {
        let t = await this.collectEntriesAsync();
        new a.Notice(
          `\u5C06\u540C\u6B65 ${t.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF1A${
            t
              .slice(0, 4)
              .map((n) => n.title)
              .join("\u3001") || "\u65E0"
          }`,
        );
      } catch (t) {
        new a.Notice(
          t instanceof Error ? t.message : "\u65E0\u6CD5\u9884\u89C8\u540C\u6B65\u8303\u56F4",
        );
      }
    }
    async installTemplates() {
      let t = "BinnAgentX/Templates";
      (this.app.vault.getAbstractFileByPath("BinnAgentX") ||
        (await this.app.vault.createFolder("BinnAgentX")),
        this.app.vault.getAbstractFileByPath(t) || (await this.app.vault.createFolder(t)));
      let n = 0;
      for (let [e, s] of Object.entries(k))
        this.app.vault.getAbstractFileByPath(`${t}/${e}`) ||
          (await this.app.vault.create(`${t}/${e}`, s), (n += 1));
      new a.Notice(
        n
          ? `\u5DF2\u5B89\u88C5 ${n} \u4E2A BinnAgentX \u6A21\u677F`
          : "\u6A21\u677F\u5DF2\u5B58\u5728\uFF0C\u672A\u8986\u76D6\u4F60\u7684\u4FEE\u6539",
      );
    }
    async sync(t = !0) {
      if (!this.settings.connectionId || !this.settings.syncSecret) {
        t &&
          new a.Notice(
            "\u8BF7\u5148\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u586B\u5199 BinnAgentX \u8FDE\u63A5\u51ED\u636E",
          );
        return;
      }
      try {
        let n = await this.pullPendingAssets(),
          e = await this.collectEntriesAsync(),
          s = await (0, a.requestUrl)({
            url: `${this.settings.apiBaseUrl.replace(/\/$/, "")}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/import`,
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.settings.syncSecret}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              schema_version: "learning-context/v1",
              vault_name: this.app.vault.getName(),
              entries: e,
            }),
            throw: !1,
          });
        if (s.status < 200 || s.status >= 300)
          throw new Error(`BinnAgentX \u62D2\u7EDD\u540C\u6B65\uFF08${s.status}\uFF09`);
        ((this.settings.lastSyncedAt = new Date().toISOString()),
          (this.settings.lastSyncError = ""),
          await this.saveSettings(),
          t &&
            new a.Notice(
              `\u53CC\u5411\u540C\u6B65\u5B8C\u6210\uFF1A\u63A5\u6536 ${n} \u6761\u8D44\u4EA7\uFF0C\u4E0A\u4F20 ${e.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\u3002`,
            ));
      } catch (n) {
        let e = n instanceof Error ? n.message : "\u540C\u6B65\u5931\u8D25";
        ((this.settings.lastSyncError = e), await this.saveSettings(), t && new a.Notice(e));
      }
    }
    async pullPendingAssets() {
      let t = this.settings.apiBaseUrl.replace(/\/$/, ""),
        n = { Authorization: `Bearer ${this.settings.syncSecret}` },
        e = await (0, a.requestUrl)({
          url: `${t}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports`,
          method: "GET",
          headers: n,
          throw: !1,
        });
      if (e.status < 200 || e.status >= 300)
        throw new Error(
          `\u65E0\u6CD5\u8BFB\u53D6\u5F85\u540C\u6B65\u8D44\u4EA7\uFF08${e.status}\uFF09`,
        );
      let s = e.json,
        o = 0;
      for (let r of s) {
        let g = await this.createAssetNote(r),
          l = await this.app.vault.read(g),
          h = await C(l),
          c = await (0, a.requestUrl)({
            url: `${t}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports/${encodeURIComponent(r.asset_id)}/ack`,
            method: "POST",
            headers: { ...n, "Content-Type": "application/json" },
            body: JSON.stringify({
              source_key: g.path,
              content_hash: h,
              modified_at: new Date(g.stat.mtime).toISOString(),
              vault_name: this.app.vault.getName(),
            }),
            throw: !1,
          });
        if (c.status < 200 || c.status >= 300)
          throw new Error(
            `\u8D44\u4EA7\u540C\u6B65\u56DE\u6267\u5931\u8D25\uFF08${c.status}\uFF09`,
          );
        o += 1;
      }
      return o;
    }
    async createAssetNote(t) {
      let n = "BinnAgentX",
        e = `${n}/Assets`;
      (this.app.vault.getAbstractFileByPath(n) || (await this.app.vault.createFolder(n)),
        this.app.vault.getAbstractFileByPath(e) || (await this.app.vault.createFolder(e)));
      let s = `${P(t.title)}-${t.asset_id.slice(-10)}.md`,
        o = `${e}/${s}`,
        r = this.app.vault.getAbstractFileByPath(o);
      if (r instanceof a.TFile) return r;
      let g = y(["binnagent", t.kind, ...t.tags]),
        l = [
          "---",
          'binnagent_schema: "asset/v1"',
          `binnagent_asset_id: "${d(t.asset_id)}"`,
          `binnagent_kind: "${d(t.kind)}"`,
          `binnagent_source_type: "${d(t.source_type)}"`,
          `title: "${d(t.title)}"`,
          ...(t.source_task_id ? [`binnagent_source_task_id: "${d(t.source_task_id)}"`] : []),
          "tags:",
          ...g.map((c) => `  - ${c}`),
          "---",
          "",
          `# ${t.title}`,
          "",
        ],
        h = t.initial_content?.trim()
          ? [
              "## \u5B66\u4E60\u73B0\u573A",
              "",
              t.initial_content.trim(),
              "",
              "## \u6211\u7684\u7406\u89E3",
              "",
            ]
          : [
              "## \u6700\u521D\u8BED\u5883",
              "",
              "## \u6211\u7684\u7406\u89E3",
              "",
              "## \u53EF\u8FC1\u79FB\u89C4\u5219",
              "",
              "## \u65B0\u8BED\u5883\u9A8C\u8BC1",
              "",
            ];
      return await this.app.vault.create(
        o,
        [...l, ...h].join(`
`),
      );
    }
  },
  m = class extends a.PluginSettingTab {
    constructor(n, e) {
      super(n, e);
      this.plugin = e;
    }
    display() {
      let { containerEl: n } = this;
      (n.empty(),
        n.createEl("h2", { text: "BinnAgentX \u5B66\u4E60\u8D44\u4EA7\u540C\u6B65" }),
        n.createEl("p", {
          text: "\u4EC5\u540C\u6B65\u4F60\u5728\u4E0B\u65B9\u660E\u786E\u5141\u8BB8\u7684\u6587\u4EF6\u5939\u6216\u6807\u7B7E\u3002\u7B14\u8BB0\u4E0D\u4F1A\u88AB\u5220\u9664\u3001\u6539\u5199\u6216\u79FB\u52A8\u3002",
        }),
        new a.Setting(n)
          .setName("\u81EA\u52A8\u53CC\u5411\u540C\u6B65")
          .setDesc(
            "Obsidian \u542F\u52A8\u540E\u53CA\u6BCF 60 \u79D2\u540C\u6B65\u4E00\u6B21\u5DF2\u6388\u6743\u8303\u56F4\uFF1B\u53EF\u968F\u65F6\u5173\u95ED\u5E76\u6539\u7528\u624B\u52A8\u547D\u4EE4\u3002",
          )
          .addToggle((e) =>
            e.setValue(this.plugin.settings.autoSync).onChange(async (s) => {
              ((this.plugin.settings.autoSync = s), await this.plugin.saveSettings());
            }),
          ),
        new a.Setting(n)
          .setName("\u6700\u8FD1\u540C\u6B65")
          .setDesc(
            this.plugin.settings.lastSyncError
              ? `\u5931\u8D25\uFF1A${this.plugin.settings.lastSyncError}`
              : this.plugin.settings.lastSyncedAt || "\u5C1A\u672A\u5B8C\u6210\u540C\u6B65",
          ),
        new a.Setting(n)
          .setName("\u5141\u8BB8\u7684\u6587\u4EF6\u5939")
          .setDesc(
            "\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 BinnAgentX, \u82F1\u8BED/\u8BED\u6CD5",
          )
          .addText((e) =>
            e.setValue(this.plugin.settings.allowedFolders).onChange(async (s) => {
              ((this.plugin.settings.allowedFolders = s), await this.plugin.saveSettings());
            }),
          ),
        new a.Setting(n)
          .setName("\u5141\u8BB8\u7684\u6807\u7B7E")
          .setDesc(
            "\u53EF\u9009\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 binnagent-vocabulary, grammar",
          )
          .addText((e) =>
            e.setValue(this.plugin.settings.allowedTags).onChange(async (s) => {
              ((this.plugin.settings.allowedTags = s), await this.plugin.saveSettings());
            }),
          ),
        new a.Setting(n)
          .setName("BinnAgentX \u5730\u5740")
          .setDesc("\u672C\u673A\u9ED8\u8BA4\uFF1Ahttp://127.0.0.1:8000/learner")
          .addText((e) =>
            e.setValue(this.plugin.settings.apiBaseUrl).onChange(async (s) => {
              ((this.plugin.settings.apiBaseUrl = s), await this.plugin.saveSettings());
            }),
          ),
        new a.Setting(n).setName("\u8FDE\u63A5 ID").addText((e) =>
          e.setValue(this.plugin.settings.connectionId).onChange(async (s) => {
            ((this.plugin.settings.connectionId = s), await this.plugin.saveSettings());
          }),
        ),
        new a.Setting(n)
          .setName("\u540C\u6B65\u5BC6\u94A5")
          .setDesc(
            "\u7531 BinnAgentX \u7684\u8FDE\u63A5\u5411\u5BFC\u751F\u6210\uFF1B\u4EC5\u4FDD\u5B58\u5728\u672C\u673A Obsidian \u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u3002",
          )
          .addText((e) =>
            e.setValue(this.plugin.settings.syncSecret).onChange(async (s) => {
              ((this.plugin.settings.syncSecret = s), await this.plugin.saveSettings());
            }),
          ));
    }
  };
function _(i) {
  return i
    .split(",")
    .map((t) => t.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
}
function S(i) {
  return Array.isArray(i) ? i.filter((t) => typeof t == "string") : typeof i == "string" ? [i] : [];
}
function y(i) {
  return [...new Set(i.map((t) => t.replace(/^#/, "").trim()).filter(Boolean))];
}
function E(i, t, n, e) {
  if (i.path.startsWith("BinnAgentX/Templates/")) return !1;
  let s = t.some((r) => i.path === r || i.path.startsWith(`${r}/`)),
    o = y([
      ...(e.metadataCache.getFileCache(i)?.tags ?? []).map((r) => r.tag),
      ...S(e.metadataCache.getFileCache(i)?.frontmatter?.tags),
    ]);
  return s || n.some((r) => o.includes(r));
}
function T(i, t) {
  let n =
    typeof i == "string"
      ? i
      : t.find((e) =>
          [
            "vocabulary",
            "grammar",
            "writing_expression",
            "reading_skill",
            "exam_skill",
            "writing_skill",
          ].includes(e),
        );
  return [
    "vocabulary",
    "grammar",
    "writing_expression",
    "reading_skill",
    "exam_skill",
    "writing_skill",
  ].includes(n ?? "")
    ? n
    : "reading_skill";
}
function B(i, t) {
  return i
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/```[\s\S]*?```/gu, "")
    .replace(/!?(\[([^\]]*)\]\([^)]*\))/gu, "$2")
    .replace(/[#>*_`]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, t);
}
function P(i) {
  return (
    i
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim()
      .slice(0, 80) || "asset"
  );
}
function d(i) {
  return i.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
async function C(i) {
  let t = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(i));
  return Array.from(new Uint8Array(t), (n) => n.toString(16).padStart(2, "0")).join("");
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEFwcCwgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIFRGaWxlLCByZXF1ZXN0VXJsIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbnR5cGUgTGVhcm5pbmdLaW5kID1cbiAgfCBcInZvY2FidWxhcnlcIlxuICB8IFwiZ3JhbW1hclwiXG4gIHwgXCJ3cml0aW5nX2V4cHJlc3Npb25cIlxuICB8IFwicmVhZGluZ19za2lsbFwiXG4gIHwgXCJleGFtX3NraWxsXCJcbiAgfCBcIndyaXRpbmdfc2tpbGxcIjtcblxuaW50ZXJmYWNlIFN5bmNTZXR0aW5ncyB7XG4gIGFwaUJhc2VVcmw6IHN0cmluZztcbiAgY29ubmVjdGlvbklkOiBzdHJpbmc7XG4gIHN5bmNTZWNyZXQ6IHN0cmluZztcbiAgYWxsb3dlZEZvbGRlcnM6IHN0cmluZztcbiAgYWxsb3dlZFRhZ3M6IHN0cmluZztcbiAgbWF4Tm90ZXM6IG51bWJlcjtcbiAgbWF4RXhjZXJwdENoYXJhY3RlcnM6IG51bWJlcjtcbiAgYXV0b1N5bmM6IGJvb2xlYW47XG4gIGxhc3RTeW5jZWRBdDogc3RyaW5nO1xuICBsYXN0U3luY0Vycm9yOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBMZWFybmluZ0NvbnRleHRFbnRyeSB7XG4gIHNvdXJjZV9rZXk6IHN0cmluZztcbiAgYXNzZXRfaWQ/OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGtpbmQ6IExlYXJuaW5nS2luZDtcbiAgdGFnczogc3RyaW5nW107XG4gIGV4Y2VycHQ6IHN0cmluZztcbiAgbW9kaWZpZWRfYXQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFBlbmRpbmdBc3NldEV4cG9ydCB7XG4gIGFzc2V0X2lkOiBzdHJpbmc7XG4gIGtpbmQ6IExlYXJuaW5nS2luZDtcbiAgdGl0bGU6IHN0cmluZztcbiAgdGFnczogc3RyaW5nW107XG4gIHNvdXJjZV90eXBlOiBzdHJpbmc7XG4gIHNvdXJjZV90YXNrX2lkOiBzdHJpbmcgfCBudWxsO1xuICBpbml0aWFsX2NvbnRlbnQ6IHN0cmluZyB8IG51bGw7XG59XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFN5bmNTZXR0aW5ncyA9IHtcbiAgYXBpQmFzZVVybDogXCJodHRwOi8vMTI3LjAuMC4xOjgwMDAvbGVhcm5lclwiLFxuICBjb25uZWN0aW9uSWQ6IFwiXCIsXG4gIHN5bmNTZWNyZXQ6IFwiXCIsXG4gIGFsbG93ZWRGb2xkZXJzOiBcIkJpbm5BZ2VudFhcIixcbiAgYWxsb3dlZFRhZ3M6IFwiXCIsXG4gIG1heE5vdGVzOiA4MCxcbiAgbWF4RXhjZXJwdENoYXJhY3RlcnM6IDkwMCxcbiAgYXV0b1N5bmM6IHRydWUsXG4gIGxhc3RTeW5jZWRBdDogXCJcIixcbiAgbGFzdFN5bmNFcnJvcjogXCJcIixcbn07XG5cbmNvbnN0IExFQVJOSU5HX1RFTVBMQVRFUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgXCJcdThCQ0RcdTZDNDcubWRcIjpcbiAgICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJ2b2NhYnVsYXJ5XCJcXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gdm9jYWJ1bGFyeVxcbi0tLVxcblxcbiMgXHU4QkNEXHU2QzQ3XHU2MjE2XHU3N0VEXHU4QkVEXFxuXFxuIyMgXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XFxuXFxuIyMgXHU1RTM4XHU3NTI4XHU2NDJEXHU5MTREXFxuXFxuIyMgXHU1MzlGXHU1M0U1XHU0RTBFXHU4QkVEXHU1ODgzXFxuXFxuIyMgXHU2MjExXHU3Njg0XHU0RjhCXHU1M0U1XFxuXFxuIyMgXHU2NjEzXHU2REY3XHU2REM2XHU3MEI5XFxuJyxcbiAgXCJcdThCRURcdTZDRDUubWRcIjpcbiAgICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJncmFtbWFyXCJcXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gZ3JhbW1hclxcbi0tLVxcblxcbiMgXHU4QkVEXHU2Q0Q1XHU3RUQzXHU2Nzg0XFxuXFxuIyMgXHU3RUQzXHU2Nzg0XHU1MTZDXHU1RjBGXFxuXFxuIyMgXHU1MjI0XHU2NUFEXHU3RUJGXHU3RDIyXFxuXFxuIyMgXHU1MzlGXHU1M0U1XHU2MkM2XHU4OUUzXFxuXFxuIyMgXHU1RTM4XHU4OUMxXHU4QkVGXHU1MzNBXFxuXFxuIyMgXHU2NUIwXHU4QkVEXHU1ODgzXHU5QThDXHU4QkMxXFxuJyxcbiAgXCJcdTUxOTlcdTRGNUNcdTg4NjhcdThGQkUubWRcIjpcbiAgICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJ3cml0aW5nX2V4cHJlc3Npb25cIlxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSB3cml0aW5nLWV4cHJlc3Npb25cXG4tLS1cXG5cXG4jIFx1NTNFRlx1OEZDMVx1NzlGQlx1ODg2OFx1OEZCRVxcblxcbiMjIFx1ODg2OFx1OEZCRVx1NTI5Rlx1ODBGRFxcblxcbiMjIFx1NTNFNVx1NUYwRlx1OUFBOFx1NjdCNlxcblxcbiMjIFx1NTM5Rlx1NTlDQlx1ODMwM1x1NEY4QlxcblxcbiMjIFx1NjIxMVx1NzY4NFx1NjUzOVx1NTE5OVxcblxcbiMjIFx1NTNFRlx1NjZGRlx1NjM2Mlx1OEJDRFx1NjlGRFxcbicsXG4gIFwiXHU5NjA1XHU4QkZCXHU3QjU2XHU3NTY1Lm1kXCI6XG4gICAgJy0tLVxcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXFxuYmlubmFnZW50X2tpbmQ6IFwicmVhZGluZ19za2lsbFwiXFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHJlYWRpbmctc2tpbGxcXG4tLS1cXG5cXG4jIFx1OTYwNVx1OEJGQlx1N0I1Nlx1NzU2NVxcblxcbiMjIFx1OTAwMlx1NzUyOFx1NTczQVx1NjY2RlxcblxcbiMjIFx1NjRDRFx1NEY1Q1x1NkI2NVx1OUFBNFxcblxcbiMjIFx1OEJDMVx1NjM2RVx1NUI5QVx1NEY0RFxcblxcbiMjIFx1NTkzMVx1OEQyNVx1NEZFMVx1NTNGN1xcblxcbiMjIFx1NjVCMFx1NjU4N1x1N0FFMFx1OUE4Q1x1OEJDMVxcbicsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCaW5uQWdlbnRYTGVhcm5pbmdTeW5jUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN5bmNTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBCaW5uQWdlbnRYU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJwcmV2aWV3LWxlYXJuaW5nLWNvbnRleHRcIixcbiAgICAgIG5hbWU6IFwiUHJldmlldyBsZWFybmluZyBjb250ZXh0XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5wcmV2aWV3KCksXG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcInN5bmMtbGVhcm5pbmctY29udGV4dFwiLFxuICAgICAgbmFtZTogXCJTeW5jIGFwcHJvdmVkIGxlYXJuaW5nIGNvbnRleHRcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLnN5bmMoKSxcbiAgICB9KTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwiaW5zdGFsbC1sZWFybmluZy10ZW1wbGF0ZXNcIixcbiAgICAgIG5hbWU6IFwiSW5zdGFsbCBCaW5uQWdlbnRYIGxlYXJuaW5nIHRlbXBsYXRlc1wiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuaW5zdGFsbFRlbXBsYXRlcygpLFxuICAgIH0pO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9TeW5jKSB2b2lkIHRoaXMuc3luYyhmYWxzZSk7XG4gICAgfSk7XG4gICAgdGhpcy5yZWdpc3RlckludGVydmFsKFxuICAgICAgd2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuYXV0b1N5bmMpIHZvaWQgdGhpcy5zeW5jKGZhbHNlKTtcbiAgICAgIH0sIDYwXzAwMCksXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0geyAuLi5ERUZBVUxUX1NFVFRJTkdTLCAuLi4oYXdhaXQgdGhpcy5sb2FkRGF0YSgpKSB9O1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbGxlY3RFbnRyaWVzQXN5bmMoKTogUHJvbWlzZTxMZWFybmluZ0NvbnRleHRFbnRyeVtdPiB7XG4gICAgY29uc3QgZm9sZGVycyA9IHNwbGl0U2NvcGUodGhpcy5zZXR0aW5ncy5hbGxvd2VkRm9sZGVycyk7XG4gICAgY29uc3QgdGFncyA9IHNwbGl0U2NvcGUodGhpcy5zZXR0aW5ncy5hbGxvd2VkVGFncykubWFwKCh0YWcpID0+IHRhZy5yZXBsYWNlKC9eIy8sIFwiXCIpKTtcbiAgICBpZiAoIWZvbGRlcnMubGVuZ3RoICYmICF0YWdzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKFwiXHU4QkY3XHU5MDA5XHU2MkU5XHU4MUYzXHU1QzExXHU0RTAwXHU0RTJBXHU1MTQxXHU4QkI4XHU1NDBDXHU2QjY1XHU3Njg0XHU2NTg3XHU0RUY2XHU1OTM5XHU2MjE2XHU2ODA3XHU3QjdFXCIpO1xuICAgIGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHRcbiAgICAgIC5nZXRNYXJrZG93bkZpbGVzKClcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+IGlzQWxsb3dlZChmaWxlLCBmb2xkZXJzLCB0YWdzLCB0aGlzLmFwcCkpO1xuICAgIGlmIChmaWxlcy5sZW5ndGggPiB0aGlzLnNldHRpbmdzLm1heE5vdGVzKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgXHU1MzM5XHU5MTREXHU1MjMwICR7ZmlsZXMubGVuZ3RofSBcdTdCQzdcdTdCMTRcdThCQjBcdUZGMENcdThCRjdcdTdGMjlcdTVDMEZcdTgzMDNcdTU2RjRcdUZGMDhcdTRFMEFcdTk2NTAgJHt0aGlzLnNldHRpbmdzLm1heE5vdGVzfVx1RkYwOWAsXG4gICAgICApO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChcbiAgICAgIGZpbGVzLm1hcChhc3luYyAoZmlsZSkgPT4ge1xuICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xuICAgICAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlciA/PyB7fTtcbiAgICAgICAgY29uc3QgdGFncyA9IHVuaXF1ZVN0cmluZ3MoW1xuICAgICAgICAgIC4uLmFycmF5U3RyaW5ncyhmcm9udG1hdHRlci50YWdzKSxcbiAgICAgICAgICAuLi4oY2FjaGU/LnRhZ3MgPz8gW10pLm1hcCgodGFnKSA9PiB0YWcudGFnLnJlcGxhY2UoL14jLywgXCJcIikpLFxuICAgICAgICBdKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2Vfa2V5OiBmaWxlLnBhdGgsXG4gICAgICAgICAgYXNzZXRfaWQ6XG4gICAgICAgICAgICB0eXBlb2YgZnJvbnRtYXR0ZXIuYmlubmFnZW50X2Fzc2V0X2lkID09PSBcInN0cmluZ1wiXG4gICAgICAgICAgICAgID8gZnJvbnRtYXR0ZXIuYmlubmFnZW50X2Fzc2V0X2lkXG4gICAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgIHRpdGxlOiBTdHJpbmcoZnJvbnRtYXR0ZXIudGl0bGUgPz8gZmlsZS5iYXNlbmFtZSksXG4gICAgICAgICAga2luZDogaW5mZXJLaW5kKGZyb250bWF0dGVyLmJpbm5hZ2VudF9raW5kLCB0YWdzKSxcbiAgICAgICAgICB0YWdzLFxuICAgICAgICAgIGV4Y2VycHQ6IHN1bW1hcml6ZShhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpLCB0aGlzLnNldHRpbmdzLm1heEV4Y2VycHRDaGFyYWN0ZXJzKSxcbiAgICAgICAgICBtb2RpZmllZF9hdDogbmV3IERhdGUoZmlsZS5zdGF0Lm10aW1lKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9O1xuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHJldmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZW50cmllcyA9IGF3YWl0IHRoaXMuY29sbGVjdEVudHJpZXNBc3luYygpO1xuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgYFx1NUMwNlx1NTQwQ1x1NkI2NSAke2VudHJpZXMubGVuZ3RofSBcdTY3NjFcdTVCNjZcdTRFNjBcdTRFMEFcdTRFMEJcdTY1ODdcdUZGMUEke1xuICAgICAgICAgIGVudHJpZXNcbiAgICAgICAgICAgIC5zbGljZSgwLCA0KVxuICAgICAgICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRpdGxlKVxuICAgICAgICAgICAgLmpvaW4oXCJcdTMwMDFcIikgfHwgXCJcdTY1RTBcIlxuICAgICAgICB9YCxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIG5ldyBOb3RpY2UoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlx1NjVFMFx1NkNENVx1OTg4NFx1ODlDOFx1NTQwQ1x1NkI2NVx1ODMwM1x1NTZGNFwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGluc3RhbGxUZW1wbGF0ZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZm9sZGVyID0gXCJCaW5uQWdlbnRYL1RlbXBsYXRlc1wiO1xuICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQmlubkFnZW50WFwiKSlcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihcIkJpbm5BZ2VudFhcIik7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZm9sZGVyKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlcik7XG4gICAgbGV0IGluc3RhbGxlZCA9IDA7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgY29udGVudF0gb2YgT2JqZWN0LmVudHJpZXMoTEVBUk5JTkdfVEVNUExBVEVTKSkge1xuICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYCR7Zm9sZGVyfS8ke25hbWV9YCkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGAke2ZvbGRlcn0vJHtuYW1lfWAsIGNvbnRlbnQpO1xuICAgICAgICBpbnN0YWxsZWQgKz0gMTtcbiAgICAgIH1cbiAgICB9XG4gICAgbmV3IE5vdGljZShpbnN0YWxsZWQgPyBgXHU1REYyXHU1Qjg5XHU4OEM1ICR7aW5zdGFsbGVkfSBcdTRFMkEgQmlubkFnZW50WCBcdTZBMjFcdTY3N0ZgIDogXCJcdTZBMjFcdTY3N0ZcdTVERjJcdTVCNThcdTU3MjhcdUZGMENcdTY3MkFcdTg5ODZcdTc2RDZcdTRGNjBcdTc2ODRcdTRGRUVcdTY1MzlcIik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHN5bmMoc2hvd05vdGljZSA9IHRydWUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY29ubmVjdGlvbklkIHx8ICF0aGlzLnNldHRpbmdzLnN5bmNTZWNyZXQpIHtcbiAgICAgIGlmIChzaG93Tm90aWNlKSBuZXcgTm90aWNlKFwiXHU4QkY3XHU1MTQ4XHU1NzI4XHU2M0QyXHU0RUY2XHU4QkJFXHU3RjZFXHU0RTJEXHU1ODZCXHU1MTk5IEJpbm5BZ2VudFggXHU4RkRFXHU2M0E1XHU1MUVEXHU2MzZFXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZXhwb3J0ZWQgPSBhd2FpdCB0aGlzLnB1bGxQZW5kaW5nQXNzZXRzKCk7XG4gICAgICBjb25zdCBlbnRyaWVzID0gYXdhaXQgdGhpcy5jb2xsZWN0RW50cmllc0FzeW5jKCk7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke3RoaXMuc2V0dGluZ3MuYXBpQmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9pbXBvcnRgLFxuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuc2V0dGluZ3Muc3luY1NlY3JldH1gLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc2NoZW1hX3ZlcnNpb246IFwibGVhcm5pbmctY29udGV4dC92MVwiLFxuICAgICAgICAgIHZhdWx0X25hbWU6IHRoaXMuYXBwLnZhdWx0LmdldE5hbWUoKSxcbiAgICAgICAgICBlbnRyaWVzLFxuICAgICAgICB9KSxcbiAgICAgICAgdGhyb3c6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQmlubkFnZW50WCBcdTYyRDJcdTdFRERcdTU0MENcdTZCNjVcdUZGMDgke3Jlc3BvbnNlLnN0YXR1c31cdUZGMDlgKTtcbiAgICAgIHRoaXMuc2V0dGluZ3MubGFzdFN5bmNlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0U3luY0Vycm9yID0gXCJcIjtcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gICAgICBpZiAoc2hvd05vdGljZSlcbiAgICAgICAgbmV3IE5vdGljZShgXHU1M0NDXHU1NDExXHU1NDBDXHU2QjY1XHU1QjhDXHU2MjEwXHVGRjFBXHU2M0E1XHU2NTM2ICR7ZXhwb3J0ZWR9IFx1Njc2MVx1OEQ0NFx1NEVBN1x1RkYwQ1x1NEUwQVx1NEYyMCAke2VudHJpZXMubGVuZ3RofSBcdTY3NjFcdTVCNjZcdTRFNjBcdTRFMEFcdTRFMEJcdTY1ODdcdTMwMDJgKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJcdTU0MENcdTZCNjVcdTU5MzFcdThEMjVcIjtcbiAgICAgIHRoaXMuc2V0dGluZ3MubGFzdFN5bmNFcnJvciA9IG1lc3NhZ2U7XG4gICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgaWYgKHNob3dOb3RpY2UpIG5ldyBOb3RpY2UobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwdWxsUGVuZGluZ0Fzc2V0cygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGJhc2UgPSB0aGlzLnNldHRpbmdzLmFwaUJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IGhlYWRlcnMgPSB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLnNldHRpbmdzLnN5bmNTZWNyZXR9YCB9O1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke2Jhc2V9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9leHBvcnRzYCxcbiAgICAgIG1ldGhvZDogXCJHRVRcIixcbiAgICAgIGhlYWRlcnMsXG4gICAgICB0aHJvdzogZmFsc2UsXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBcdTY1RTBcdTZDRDVcdThCRkJcdTUzRDZcdTVGODVcdTU0MENcdTZCNjVcdThENDRcdTRFQTdcdUZGMDgke3Jlc3BvbnNlLnN0YXR1c31cdUZGMDlgKTtcbiAgICBjb25zdCBleHBvcnRzID0gcmVzcG9uc2UuanNvbiBhcyBQZW5kaW5nQXNzZXRFeHBvcnRbXTtcbiAgICBsZXQgY29tcGxldGVkID0gMDtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgZXhwb3J0cykge1xuICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuY3JlYXRlQXNzZXROb3RlKGl0ZW0pO1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgICBjb25zdCBkaWdlc3QgPSBhd2FpdCBzaGEyNTYoY29udGVudCk7XG4gICAgICBjb25zdCBhY2sgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHtiYXNlfS92MS9vYnNpZGlhbi1zeW5jLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuc2V0dGluZ3MuY29ubmVjdGlvbklkKX0vZXhwb3J0cy8ke2VuY29kZVVSSUNvbXBvbmVudChpdGVtLmFzc2V0X2lkKX0vYWNrYCxcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgaGVhZGVyczogeyAuLi5oZWFkZXJzLCBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc291cmNlX2tleTogZmlsZS5wYXRoLFxuICAgICAgICAgIGNvbnRlbnRfaGFzaDogZGlnZXN0LFxuICAgICAgICAgIG1vZGlmaWVkX2F0OiBuZXcgRGF0ZShmaWxlLnN0YXQubXRpbWUpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgdmF1bHRfbmFtZTogdGhpcy5hcHAudmF1bHQuZ2V0TmFtZSgpLFxuICAgICAgICB9KSxcbiAgICAgICAgdGhyb3c6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgICBpZiAoYWNrLnN0YXR1cyA8IDIwMCB8fCBhY2suc3RhdHVzID49IDMwMClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcdThENDRcdTRFQTdcdTU0MENcdTZCNjVcdTU2REVcdTYyNjdcdTU5MzFcdThEMjVcdUZGMDgke2Fjay5zdGF0dXN9XHVGRjA5YCk7XG4gICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBsZXRlZDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQXNzZXROb3RlKGl0ZW06IFBlbmRpbmdBc3NldEV4cG9ydCk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBjb25zdCByb290ID0gXCJCaW5uQWdlbnRYXCI7XG4gICAgY29uc3QgZm9sZGVyID0gYCR7cm9vdH0vQXNzZXRzYDtcbiAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChyb290KSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHJvb3QpO1xuICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlcikpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXIpO1xuICAgIGNvbnN0IGZpbGVuYW1lID0gYCR7c2FmZUZpbGVuYW1lKGl0ZW0udGl0bGUpfS0ke2l0ZW0uYXNzZXRfaWQuc2xpY2UoLTEwKX0ubWRgO1xuICAgIGNvbnN0IHBhdGggPSBgJHtmb2xkZXJ9LyR7ZmlsZW5hbWV9YDtcbiAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICBpZiAoZXhpc3RpbmcgaW5zdGFuY2VvZiBURmlsZSkgcmV0dXJuIGV4aXN0aW5nO1xuICAgIGNvbnN0IHRhZ3MgPSB1bmlxdWVTdHJpbmdzKFtcImJpbm5hZ2VudFwiLCBpdGVtLmtpbmQsIC4uLml0ZW0udGFnc10pO1xuICAgIGNvbnN0IGZyb250bWF0dGVyID0gW1xuICAgICAgXCItLS1cIixcbiAgICAgICdiaW5uYWdlbnRfc2NoZW1hOiBcImFzc2V0L3YxXCInLFxuICAgICAgYGJpbm5hZ2VudF9hc3NldF9pZDogXCIke3lhbWxTdHJpbmcoaXRlbS5hc3NldF9pZCl9XCJgLFxuICAgICAgYGJpbm5hZ2VudF9raW5kOiBcIiR7eWFtbFN0cmluZyhpdGVtLmtpbmQpfVwiYCxcbiAgICAgIGBiaW5uYWdlbnRfc291cmNlX3R5cGU6IFwiJHt5YW1sU3RyaW5nKGl0ZW0uc291cmNlX3R5cGUpfVwiYCxcbiAgICAgIGB0aXRsZTogXCIke3lhbWxTdHJpbmcoaXRlbS50aXRsZSl9XCJgLFxuICAgICAgLi4uKGl0ZW0uc291cmNlX3Rhc2tfaWRcbiAgICAgICAgPyBbYGJpbm5hZ2VudF9zb3VyY2VfdGFza19pZDogXCIke3lhbWxTdHJpbmcoaXRlbS5zb3VyY2VfdGFza19pZCl9XCJgXVxuICAgICAgICA6IFtdKSxcbiAgICAgIFwidGFnczpcIixcbiAgICAgIC4uLnRhZ3MubWFwKCh0YWcpID0+IGAgIC0gJHt0YWd9YCksXG4gICAgICBcIi0tLVwiLFxuICAgICAgXCJcIixcbiAgICAgIGAjICR7aXRlbS50aXRsZX1gLFxuICAgICAgXCJcIixcbiAgICBdO1xuICAgIGNvbnN0IGJvZHkgPSBpdGVtLmluaXRpYWxfY29udGVudD8udHJpbSgpXG4gICAgICA/IFtcIiMjIFx1NUI2Nlx1NEU2MFx1NzNCMFx1NTczQVwiLCBcIlwiLCBpdGVtLmluaXRpYWxfY29udGVudC50cmltKCksIFwiXCIsIFwiIyMgXHU2MjExXHU3Njg0XHU3NDA2XHU4OUUzXCIsIFwiXCJdXG4gICAgICA6IFtcIiMjIFx1NjcwMFx1NTIxRFx1OEJFRFx1NTg4M1wiLCBcIlwiLCBcIiMjIFx1NjIxMVx1NzY4NFx1NzQwNlx1ODlFM1wiLCBcIlwiLCBcIiMjIFx1NTNFRlx1OEZDMVx1NzlGQlx1ODlDNFx1NTIxOVwiLCBcIlwiLCBcIiMjIFx1NjVCMFx1OEJFRFx1NTg4M1x1OUE4Q1x1OEJDMVwiLCBcIlwiXTtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIFsuLi5mcm9udG1hdHRlciwgLi4uYm9keV0uam9pbihcIlxcblwiKSk7XG4gIH1cbn1cblxuY2xhc3MgQmlubkFnZW50WFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IEJpbm5BZ2VudFhMZWFybmluZ1N5bmNQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1OEQ0NFx1NEVBN1x1NTQwQ1x1NkI2NVwiIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlx1NEVDNVx1NTQwQ1x1NkI2NVx1NEY2MFx1NTcyOFx1NEUwQlx1NjVCOVx1NjYwRVx1Nzg2RVx1NTE0MVx1OEJCOFx1NzY4NFx1NjU4N1x1NEVGNlx1NTkzOVx1NjIxNlx1NjgwN1x1N0I3RVx1MzAwMlx1N0IxNFx1OEJCMFx1NEUwRFx1NEYxQVx1ODhBQlx1NTIyMFx1OTY2NFx1MzAwMVx1NjUzOVx1NTE5OVx1NjIxNlx1NzlGQlx1NTJBOFx1MzAwMlwiLFxuICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTgxRUFcdTUyQThcdTUzQ0NcdTU0MTFcdTU0MENcdTZCNjVcIilcbiAgICAgIC5zZXREZXNjKFwiT2JzaWRpYW4gXHU1NDJGXHU1MkE4XHU1NDBFXHU1M0NBXHU2QkNGIDYwIFx1NzlEMlx1NTQwQ1x1NkI2NVx1NEUwMFx1NkIyMVx1NURGMlx1NjM4OFx1Njc0M1x1ODMwM1x1NTZGNFx1RkYxQlx1NTNFRlx1OTY4Rlx1NjVGNlx1NTE3M1x1OTVFRFx1NUU3Nlx1NjUzOVx1NzUyOFx1NjI0Qlx1NTJBOFx1NTQ3RFx1NEVFNFx1MzAwMlwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b1N5bmMpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9TeW5jID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU2NzAwXHU4RkQxXHU1NDBDXHU2QjY1XCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdFN5bmNFcnJvclxuICAgICAgICAgID8gYFx1NTkzMVx1OEQyNVx1RkYxQSR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdFN5bmNFcnJvcn1gXG4gICAgICAgICAgOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sYXN0U3luY2VkQXQgfHwgXCJcdTVDMUFcdTY3MkFcdTVCOENcdTYyMTBcdTU0MENcdTZCNjVcIixcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTE0MVx1OEJCOFx1NzY4NFx1NjU4N1x1NEVGNlx1NTkzOVwiKVxuICAgICAgLnNldERlc2MoXCJcdTkwMTdcdTUzRjdcdTUyMDZcdTk2OTRcdUZGMENcdTRGOEJcdTU5ODIgQmlubkFnZW50WCwgXHU4MkYxXHU4QkVEL1x1OEJFRFx1NkNENVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxsb3dlZEZvbGRlcnMpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRGb2xkZXJzID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1MTQxXHU4QkI4XHU3Njg0XHU2ODA3XHU3QjdFXCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NTNFRlx1OTAwOVx1RkYwQ1x1OTAxN1x1NTNGN1x1NTIwNlx1OTY5NFx1RkYwQ1x1NEY4Qlx1NTk4MiBiaW5uYWdlbnQtdm9jYWJ1bGFyeSwgZ3JhbW1hclwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxsb3dlZFRhZ3MpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRUYWdzID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmlubkFnZW50WCBcdTU3MzBcdTU3NDBcIilcbiAgICAgIC5zZXREZXNjKFwiXHU2NzJDXHU2NzNBXHU5RUQ4XHU4QkE0XHVGRjFBaHR0cDovLzEyNy4wLjAuMTo4MDAwL2xlYXJuZXJcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiXHU4RkRFXHU2M0E1IElEXCIpLmFkZFRleHQoKHRleHQpID0+XG4gICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbm5lY3Rpb25JZCkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbm5lY3Rpb25JZCA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0pLFxuICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTQwQ1x1NkI2NVx1NUJDNlx1OTRBNVwiKVxuICAgICAgLnNldERlc2MoXCJcdTc1MzEgQmlubkFnZW50WCBcdTc2ODRcdThGREVcdTYzQTVcdTU0MTFcdTVCRkNcdTc1MUZcdTYyMTBcdUZGMUJcdTRFQzVcdTRGRERcdTVCNThcdTU3MjhcdTY3MkNcdTY3M0EgT2JzaWRpYW4gXHU2M0QyXHU0RUY2XHU4QkJFXHU3RjZFXHU0RTJEXHUzMDAyXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jU2VjcmV0KS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jU2VjcmV0ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzcGxpdFNjb3BlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5zcGxpdChcIixcIilcbiAgICAubWFwKChwYXJ0KSA9PiBwYXJ0LnRyaW0oKS5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCBcIlwiKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xufVxuZnVuY3Rpb24gYXJyYXlTdHJpbmdzKHZhbHVlOiB1bmtub3duKTogc3RyaW5nW10ge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSlcbiAgICA/IHZhbHVlLmZpbHRlcigoaXRlbSk6IGl0ZW0gaXMgc3RyaW5nID0+IHR5cGVvZiBpdGVtID09PSBcInN0cmluZ1wiKVxuICAgIDogdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiXG4gICAgICA/IFt2YWx1ZV1cbiAgICAgIDogW107XG59XG5mdW5jdGlvbiB1bmlxdWVTdHJpbmdzKHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBbLi4ubmV3IFNldCh2YWx1ZXMubWFwKCh2YWx1ZSkgPT4gdmFsdWUucmVwbGFjZSgvXiMvLCBcIlwiKS50cmltKCkpLmZpbHRlcihCb29sZWFuKSldO1xufVxuZnVuY3Rpb24gaXNBbGxvd2VkKGZpbGU6IFRGaWxlLCBmb2xkZXJzOiBzdHJpbmdbXSwgdGFnczogc3RyaW5nW10sIGFwcDogQXBwKTogYm9vbGVhbiB7XG4gIGlmIChmaWxlLnBhdGguc3RhcnRzV2l0aChcIkJpbm5BZ2VudFgvVGVtcGxhdGVzL1wiKSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBwYXRoQWxsb3dlZCA9IGZvbGRlcnMuc29tZShcbiAgICAoZm9sZGVyKSA9PiBmaWxlLnBhdGggPT09IGZvbGRlciB8fCBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtmb2xkZXJ9L2ApLFxuICApO1xuICBjb25zdCBmaWxlVGFncyA9IHVuaXF1ZVN0cmluZ3MoW1xuICAgIC4uLihhcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LnRhZ3MgPz8gW10pLm1hcCgodGFnKSA9PiB0YWcudGFnKSxcbiAgICAuLi5hcnJheVN0cmluZ3MoYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcj8udGFncyksXG4gIF0pO1xuICByZXR1cm4gcGF0aEFsbG93ZWQgfHwgdGFncy5zb21lKCh0YWcpID0+IGZpbGVUYWdzLmluY2x1ZGVzKHRhZykpO1xufVxuZnVuY3Rpb24gaW5mZXJLaW5kKHZhbHVlOiB1bmtub3duLCB0YWdzOiBzdHJpbmdbXSk6IExlYXJuaW5nS2luZCB7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9XG4gICAgdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiXG4gICAgICA/IHZhbHVlXG4gICAgICA6IHRhZ3MuZmluZCgodGFnKSA9PlxuICAgICAgICAgIFtcbiAgICAgICAgICAgIFwidm9jYWJ1bGFyeVwiLFxuICAgICAgICAgICAgXCJncmFtbWFyXCIsXG4gICAgICAgICAgICBcIndyaXRpbmdfZXhwcmVzc2lvblwiLFxuICAgICAgICAgICAgXCJyZWFkaW5nX3NraWxsXCIsXG4gICAgICAgICAgICBcImV4YW1fc2tpbGxcIixcbiAgICAgICAgICAgIFwid3JpdGluZ19za2lsbFwiLFxuICAgICAgICAgIF0uaW5jbHVkZXModGFnKSxcbiAgICAgICAgKTtcbiAgcmV0dXJuIChcbiAgICBbXG4gICAgICBcInZvY2FidWxhcnlcIixcbiAgICAgIFwiZ3JhbW1hclwiLFxuICAgICAgXCJ3cml0aW5nX2V4cHJlc3Npb25cIixcbiAgICAgIFwicmVhZGluZ19za2lsbFwiLFxuICAgICAgXCJleGFtX3NraWxsXCIsXG4gICAgICBcIndyaXRpbmdfc2tpbGxcIixcbiAgICBdIGFzIHN0cmluZ1tdXG4gICkuaW5jbHVkZXMoY2FuZGlkYXRlID8/IFwiXCIpXG4gICAgPyAoY2FuZGlkYXRlIGFzIExlYXJuaW5nS2luZClcbiAgICA6IFwicmVhZGluZ19za2lsbFwiO1xufVxuZnVuY3Rpb24gc3VtbWFyaXplKG1hcmtkb3duOiBzdHJpbmcsIGxpbWl0OiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gbWFya2Rvd25cbiAgICAucmVwbGFjZSgvXi0tLVtcXHNcXFNdKj8tLS1cXHMqL3UsIFwiXCIpXG4gICAgLnJlcGxhY2UoL2BgYFtcXHNcXFNdKj9gYGAvZ3UsIFwiXCIpXG4gICAgLnJlcGxhY2UoLyE/KFxcWyhbXlxcXV0qKVxcXVxcKFteKV0qXFwpKS9ndSwgXCIkMlwiKVxuICAgIC5yZXBsYWNlKC9bIz4qX2BdL2d1LCBcIiBcIilcbiAgICAucmVwbGFjZSgvXFxzKy9ndSwgXCIgXCIpXG4gICAgLnRyaW0oKVxuICAgIC5zbGljZSgwLCBsaW1pdCk7XG59XG5mdW5jdGlvbiBzYWZlRmlsZW5hbWUodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiAoXG4gICAgdmFsdWVcbiAgICAgIC5yZXBsYWNlKC9bXFxcXC86Kj9cIjw+fF0vZywgXCItXCIpXG4gICAgICAudHJpbSgpXG4gICAgICAuc2xpY2UoMCwgODApIHx8IFwiYXNzZXRcIlxuICApO1xufVxuZnVuY3Rpb24geWFtbFN0cmluZyh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcXFwvZywgXCJcXFxcXFxcXFwiKS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyk7XG59XG5hc3luYyBmdW5jdGlvbiBzaGEyNTYodmFsdWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGRpZ2VzdCA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZGlnZXN0KFwiU0hBLTI1NlwiLCBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUodmFsdWUpKTtcbiAgcmV0dXJuIEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoZGlnZXN0KSwgKGJ5dGUpID0+IGJ5dGUudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsIFwiMFwiKSkuam9pbihcIlwiKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICJ5YUFBQSxJQUFBQSxFQUFBLEdBQUFDLEVBQUFELEVBQUEsYUFBQUUsSUFBQSxlQUFBQyxFQUFBSCxHQUFBLElBQUFJLEVBQWtGLG9CQTJDNUVDLEVBQWlDLENBQ3JDLFdBQVksZ0NBQ1osYUFBYyxHQUNkLFdBQVksR0FDWixlQUFnQixhQUNoQixZQUFhLEdBQ2IsU0FBVSxHQUNWLHFCQUFzQixJQUN0QixTQUFVLEdBQ1YsYUFBYyxHQUNkLGNBQWUsRUFDakIsRUFFTUMsRUFBNkMsQ0FDakQsa0JBQ0U7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUNGLGtCQUNFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFDRiw4QkFDRTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBQ0YsOEJBQ0U7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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QUUsT0FBT2MsQ0FBSyxDQUFDLEVBQ3BGLE9BQU8sTUFBTSxLQUFLLElBQUksV0FBV2QsQ0FBTSxFQUFJdUIsR0FBU0EsRUFBSyxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUcsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQ2pHIiwKICAibmFtZXMiOiBbIm1haW5fZXhwb3J0cyIsICJfX2V4cG9ydCIsICJCaW5uQWdlbnRYTGVhcm5pbmdTeW5jUGx1Z2luIiwgIl9fdG9Db21tb25KUyIsICJpbXBvcnRfb2JzaWRpYW4iLCAiREVGQVVMVF9TRVRUSU5HUyIsICJMRUFSTklOR19URU1QTEFURVMiLCAiQmlubkFnZW50WFNldHRpbmdUYWIiLCAiZm9sZGVycyIsICJzcGxpdFNjb3BlIiwgInRhZ3MiLCAidGFnIiwgImZpbGVzIiwgImZpbGUiLCAiaXNBbGxvd2VkIiwgImNhY2hlIiwgImZyb250bWF0dGVyIiwgInVuaXF1ZVN0cmluZ3MiLCAiYXJyYXlTdHJpbmdzIiwgImluZmVyS2luZCIsICJzdW1tYXJpemUiLCAiZW50cmllcyIsICJlbnRyeSIsICJlcnJvciIsICJmb2xkZXIiLCAiaW5zdGFsbGVkIiwgIm5hbWUiLCAiY29udGVudCIsICJzaG93Tm90aWNlIiwgImV4cG9ydGVkIiwgInJlc3BvbnNlIiwgIm1lc3NhZ2UiLCAiYmFzZSIsICJoZWFkZXJzIiwgImV4cG9ydHMiLCAiY29tcGxldGVkIiwgIml0ZW0iLCAiZGlnZXN0IiwgInNoYTI1NiIsICJhY2siLCAicm9vdCIsICJmaWxlbmFtZSIsICJzYWZlRmlsZW5hbWUiLCAicGF0aCIsICJleGlzdGluZyIsICJ5YW1sU3RyaW5nIiwgImJvZHkiLCAiYXBwIiwgInBsdWdpbiIsICJjb250YWluZXJFbCIsICJ0b2dnbGUiLCAidmFsdWUiLCAidGV4dCIsICJwYXJ0IiwgInZhbHVlcyIsICJwYXRoQWxsb3dlZCIsICJmaWxlVGFncyIsICJjYW5kaWRhdGUiLCAibWFya2Rvd24iLCAibGltaXQiLCAiYnl0ZSJdCn0K
