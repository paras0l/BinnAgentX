"use strict";
var y = Object.defineProperty;
var B = Object.getOwnPropertyDescriptor;
var O = Object.getOwnPropertyNames;
var P = Object.prototype.hasOwnProperty;
var I = (i, n) => {
    for (var t in n) y(i, t, { get: n[t], enumerable: !0 });
  },
  C = (i, n, t, a) => {
    if ((n && typeof n == "object") || typeof n == "function")
      for (let e of O(n))
        !P.call(i, e) &&
          e !== t &&
          y(i, e, { get: () => n[e], enumerable: !(a = B(n, e)) || a.enumerable });
    return i;
  };
var L = (i) => C(y({}, "__esModule", { value: !0 }), i);
var K = {};
I(K, { default: () => b });
module.exports = L(K);
var o = require("obsidian"),
  r = "BinnAgentX",
  V = [
    "00-Inbox",
    "01-Vocabulary",
    "02-Grammar",
    "03-Reading",
    "04-Writing",
    "05-Templates",
    "06-Attachments",
  ],
  h = `${r}/00-Inbox`,
  m = `${r}/05-Templates`,
  D = `${r}/06-Attachments`,
  $ = 6,
  F = [
    [`${r}/Dashboard.md`, `${r}/00-Dashboard.md`],
    [`${r}/01-Vocabulary/Dashboard.md`, `${r}/01-Vocabulary/00-Dashboard.md`],
    [`${r}/02-Grammar/Dashboard.md`, `${r}/02-Grammar/00-Dashboard.md`],
  ],
  k = {
    apiBaseUrl: "http://127.0.0.1:8000/learner",
    connectionId: "",
    syncSecret: "",
    allowedFolders: "BinnAgentX",
    allowedTags: "",
    maxNotes: 80,
    maxExcerptCharacters: 900,
    autoSync: !0,
    libraryVersion: 0,
    lastSyncedAt: "",
    lastSyncError: "",
    lastSyncSummary: "",
  },
  N = `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "vocabulary"
meaning: ""
status: learning
created: {{date}}
tags:
  - binnagent
  - vocabulary
---

# {{title}}

## \u6838\u5FC3\u542B\u4E49

## \u53D1\u97F3

## \u5E38\u7528\u642D\u914D

## \u539F\u53E5\u4E0E\u8BED\u5883

## \u6211\u7684\u4F8B\u53E5

## \u6613\u6DF7\u6DC6\u70B9

## \u5173\u8054
- [[BinnAgentX/01-Vocabulary/00-Dashboard|\u8BCD\u6C47 Dashboard]]
`,
  X = `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "vocabulary"
meaning: ""
status: learning
created: "{{date}}"
tags:
  - binnagent
  - vocabulary
  - flashcards/binnagentx/vocabulary
---

# {{title}}

## \u6838\u5FC3\u542B\u4E49

## \u53D1\u97F3

## \u5E38\u7528\u642D\u914D

## \u539F\u53E5\u4E0E\u8BED\u5883

## \u6211\u7684\u4F8B\u53E5

## \u6613\u6DF7\u6DC6\u70B9

## \u95EA\u5361

> \u5148\u586B\u5199\u201C\u6838\u5FC3\u542B\u4E49\u201D\u3002\u4E0B\u9762\u4E24\u5F20\u5361\u4F1A\u590D\u7528\u540C\u4E00\u4EFD\u5185\u5BB9\uFF0C\u4E0D\u9700\u8981\u91CD\u590D\u7EF4\u62A4\u91CA\u4E49\u3002

{{title}} \u7684\u6838\u5FC3\u542B\u4E49\u662F\u4EC0\u4E48\uFF1F::![[#\u6838\u5FC3\u542B\u4E49]]

\u4E0B\u9762\u8FD9\u6BB5\u542B\u4E49\u5BF9\u5E94\u54EA\u4E2A\u5355\u8BCD\u6216\u77ED\u8BED\uFF1F ![[#\u6838\u5FC3\u542B\u4E49]]::{{title}}

## \u5173\u8054
- [[BinnAgentX/01-Vocabulary/00-Dashboard|\u8BCD\u6C47 Dashboard]]
- [[BinnAgentX/Spaced Repetition \u4F7F\u7528\u6307\u5357|Spaced Repetition \u4F7F\u7528\u6307\u5357]]
`,
  M = `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "vocabulary"
meaning: ""
status: learning
created: "{{date}}"
tags:
  - binnagent
  - vocabulary
  - flashcards/binnagentx/vocabulary
---

# {{title}}

## \u6838\u5FC3\u542B\u4E49

## \u53D1\u97F3

## \u5E38\u7528\u642D\u914D

## \u539F\u53E5\u4E0E\u8BED\u5883

## \u6211\u7684\u4F8B\u53E5

## \u6613\u6DF7\u6DC6\u70B9

## \u95EA\u5361

> \u5148\u586B\u5199\u201C\u6838\u5FC3\u542B\u4E49\u201D\u3002\u4E0B\u9762\u7684\u5361\u7247\u4F1A\u590D\u7528\u8FD9\u4EFD\u5185\u5BB9\uFF0C\u4E0D\u9700\u8981\u91CD\u590D\u7EF4\u62A4\u91CA\u4E49\u3002

{{title}} \u7684\u6838\u5FC3\u542B\u4E49\u662F\u4EC0\u4E48\uFF1F::![[#\u6838\u5FC3\u542B\u4E49]]

## \u5173\u8054
- [[BinnAgentX/01-Vocabulary/00-Dashboard|\u8BCD\u6C47 Dashboard]]
- [[BinnAgentX/Spaced Repetition \u4F7F\u7528\u6307\u5357|Spaced Repetition \u4F7F\u7528\u6307\u5357]]
`,
  E = `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "vocabulary"
meaning: ""
status: learning
created: "{{date}}"
tags:
  - binnagent
  - vocabulary
  - flashcards/binnagentx/vocabulary
---

# {{title}}

## \u6838\u5FC3\u542B\u4E49

## \u53D1\u97F3

## \u5E38\u7528\u642D\u914D

## \u539F\u53E5\u4E0E\u8BED\u5883

## \u6211\u7684\u4F8B\u53E5

## \u6613\u6DF7\u6DC6\u70B9

## \u95EA\u5361

> [!binn-prompt] \u5355\u8BCD\u56DE\u5FC6
> # {{title}}
> \u5148\u8BF4\u51FA\u6838\u5FC3\u542B\u4E49\uFF0C\u518D\u56DE\u5FC6\u4E00\u4E2A\u642D\u914D\u6216\u4F8B\u53E5\u3002
?
> [!binn-meaning] \u6838\u5FC3\u91CA\u4E49
> ![[#\u6838\u5FC3\u542B\u4E49]]
---
> [!binn-sound] \u53D1\u97F3
> ![[#\u53D1\u97F3]]
---
> [!binn-collocations] \u5E38\u7528\u642D\u914D
> ![[#\u5E38\u7528\u642D\u914D]]
---
> [!binn-example] \u6211\u7684\u4F8B\u53E5
> ![[#\u6211\u7684\u4F8B\u53E5]]
---
> [!binn-contrast] \u6613\u6DF7\u6DC6\u70B9
> ![[#\u6613\u6DF7\u6DC6\u70B9]]

## \u5173\u8054
- [[BinnAgentX/01-Vocabulary/00-Dashboard|\u8BCD\u6C47 Dashboard]]
- [[BinnAgentX/Spaced Repetition \u4F7F\u7528\u6307\u5357|Spaced Repetition \u4F7F\u7528\u6307\u5357]]
`,
  f = "binnagentx-spaced-repetition",
  z = `/* BinnAgentX vocabulary review cards */
.sr-card-container .sr-scroll-wrapper {
  background:
    radial-gradient(
      circle at 12% 0%,
      color-mix(in srgb, var(--interactive-accent) 14%, transparent),
      transparent 38%
    ),
    var(--background-primary);
}

.sr-card-container .sr-content,
.sr-card-container .sr-context {
  width: min(920px, 100%);
  margin-inline: auto;
}

.sr-card-container .sr-content {
  padding: clamp(18px, 3vw, 38px);
}

.sr-card-container .sr-context {
  padding: 10px clamp(18px, 3vw, 38px) 4px;
  font-size: 0.78em;
  letter-spacing: 0.02em;
  opacity: 0.72;
}

.sr-card-container .callout[data-callout^="binn-"] {
  margin: 12px 0;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, rgb(var(--callout-color)) 34%, transparent);
  border-radius: 16px;
  background: color-mix(
    in srgb,
    rgb(var(--callout-color)) 10%,
    var(--background-primary)
  );
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.06);
}

.sr-card-container .callout[data-callout^="binn-"] .callout-title {
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sr-card-container .callout[data-callout="binn-prompt"] {
  --callout-color: 78, 121, 255;
  --callout-icon: lucide-brain-circuit;
  padding: clamp(22px, 4vw, 44px);
  text-align: center;
  background:
    linear-gradient(145deg, rgb(78 121 255 / 0.18), rgb(126 86 224 / 0.1)),
    var(--background-primary);
}

.sr-card-container
  .callout[data-callout="binn-prompt"]
  > .callout-title {
  justify-content: center;
}

.sr-card-container .callout[data-callout="binn-prompt"] h1 {
  margin: 0.2em 0;
  font-size: clamp(2.5rem, 8vw, 5rem);
  line-height: 1;
  letter-spacing: 0.025em;
}

.sr-card-container .callout[data-callout="binn-prompt"] p:last-child {
  margin-bottom: 0;
  color: var(--text-muted);
  font-size: 0.96rem;
}

.sr-card-container .callout[data-callout="binn-meaning"] {
  --callout-color: 117, 83, 210;
  --callout-icon: lucide-languages;
}

.sr-card-container .callout[data-callout="binn-sound"] {
  --callout-color: 14, 151, 178;
  --callout-icon: lucide-volume-2;
}

.sr-card-container .callout[data-callout="binn-collocations"] {
  --callout-color: 217, 139, 25;
  --callout-icon: lucide-blocks;
}

.sr-card-container .callout[data-callout="binn-example"] {
  --callout-color: 42, 157, 92;
  --callout-icon: lucide-message-square-quote;
}

.sr-card-container .callout[data-callout="binn-contrast"] {
  --callout-color: 214, 82, 116;
  --callout-icon: lucide-git-compare-arrows;
}

.sr-card-container .callout[data-callout^="binn-"] .markdown-embed {
  margin: 0;
  padding: 0;
  border-inline-start: 0;
}

.sr-card-container .callout[data-callout^="binn-"] .markdown-embed-link {
  display: none;
}

.sr-card-container .callout[data-callout^="binn-"] h2 {
  display: none;
}

.sr-card-container .sr-response > hr {
  display: none;
}

.sr-card-container .sr-response {
  gap: 10px;
  padding: 12px clamp(14px, 2vw, 24px);
  background: color-mix(in srgb, var(--background-secondary) 86%, transparent);
  backdrop-filter: blur(14px);
}

.sr-card-container .sr-response-button {
  min-height: 52px;
  border-radius: 13px;
  font-weight: 750;
  box-shadow: 0 6px 16px rgb(0 0 0 / 0.1);
}

.sr-card-container .sr-show-answer-button {
  border: 0;
  color: white;
  background: linear-gradient(135deg, #4e79ff, #7656d8);
}
`,
  W = {
    "\u8BCD\u6C47.md": E,
    "\u8BED\u6CD5.md": `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "grammar"
status: learning
created: {{date}}
tags:
  - binnagent
  - grammar
---

# {{title}}

## \u4E00\u53E5\u8BDD\u89C4\u5219

## \u7ED3\u6784\u516C\u5F0F

## \u5224\u65AD\u7EBF\u7D22

## \u539F\u53E5\u62C6\u89E3

## \u5E38\u89C1\u8BEF\u533A

## \u65B0\u8BED\u5883\u9A8C\u8BC1

## \u5173\u8054
- [[BinnAgentX/02-Grammar/00-Dashboard|\u8BED\u6CD5 Dashboard]]
`,
    "\u5199\u4F5C\u8868\u8FBE.md": `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "writing_expression"
created: {{date}}
tags:
  - binnagent
  - writing-expression
---

# {{title}}

## \u8868\u8FBE\u529F\u80FD

## \u53E5\u5F0F\u9AA8\u67B6

## \u539F\u59CB\u8303\u4F8B

## \u6211\u7684\u6539\u5199

## \u53EF\u66FF\u6362\u8BCD\u69FD
`,
    "\u9605\u8BFB\u7B56\u7565.md": `---
binnagent_schema: "learning-context/v1"
binnagent_kind: "reading_skill"
created: {{date}}
tags:
  - binnagent
  - reading-skill
---

# {{title}}

## \u9002\u7528\u573A\u666F

## \u64CD\u4F5C\u6B65\u9AA4

## \u8BC1\u636E\u5B9A\u4F4D

## \u5931\u8D25\u4FE1\u53F7

## \u65B0\u6587\u7AE0\u9A8C\u8BC1
`,
  },
  T = {
    [`${r}/00-Dashboard.md`]: `# BinnAgentX \u5B66\u4E60\u5730\u56FE

\u7B2C\u4E00\u6B21\u4F7F\u7528\u8BF7\u5148\u8BFB [[\u4F7F\u7528\u6307\u5357]] \u548C [[Spaced Repetition \u4F7F\u7528\u6307\u5357]]\u3002\u4E4B\u540E\u4ECE [[00-Inbox/\u6536\u96C6\u7BB1\u4F7F\u7528\u8BF4\u660E|\u6536\u96C6\u7BB1]] \u5F00\u59CB\uFF0C\u628A\u788E\u7247\u5B9A\u671F\u6574\u7406\u5230\u4E0B\u9762\u7684\u9886\u57DF\u76EE\u5F55\u3002

## \u5185\u5BB9\u5730\u56FE\uFF08MOC\uFF09

- [[01-Vocabulary/00-Dashboard|\u8BCD\u6C47 Dashboard]]
- [[02-Grammar/00-Dashboard|\u8BED\u6CD5 Dashboard]]
- [[03-Reading/\u9605\u8BFB\u7B14\u8BB0\u793A\u4F8B|\u9605\u8BFB]]
- [[04-Writing/\u5199\u4F5C\u7EC3\u4E60\u793A\u4F8B|\u5199\u4F5C]]
- [[05-Templates/\u8BCD\u6C47|\u7B14\u8BB0\u6A21\u677F]]
- [[01-Vocabulary/Spaced Repetition \u95EA\u5361\u793A\u4F8B|\u53EF\u590D\u4E60\u7684\u95EA\u5361\u793A\u4F8B]]

## \u6700\u8FD1\u66F4\u65B0\uFF08Dataview\uFF09

\`\`\`dataview
TABLE WITHOUT ID file.link AS "\u7B14\u8BB0", binnagent_kind AS "\u7C7B\u578B", file.mtime AS "\u66F4\u65B0\u65F6\u95F4"
FROM "BinnAgentX"
WHERE file.name != "00-Dashboard" AND file.name != "Dashboard" AND !contains(file.path, "/05-Templates/")
SORT file.mtime DESC
LIMIT 12
\`\`\`

> \u672A\u5B89\u88C5 Dataview \u65F6\uFF0C\u4E0A\u9762\u7684\u67E5\u8BE2\u4F1A\u663E\u793A\u4E3A\u4EE3\u7801\u5757\uFF1BMOC \u94FE\u63A5\u4ECD\u53EF\u6B63\u5E38\u4F7F\u7528\u3002
`,
    [`${r}/\u4F7F\u7528\u6307\u5357.md`]: `---
binnagent_sync: false
tags:
  - binnagent
  - guide
---

# BinnAgentX \u5B66\u4E60\u5E93\u4F7F\u7528\u6307\u5357

\u8FD9\u5957\u76EE\u5F55\u628A\u201C\u5FEB\u901F\u8BB0\u5F55\u201D\u548C\u201C\u957F\u671F\u6574\u7406\u201D\u5206\u5F00\u3002\u6700\u7B80\u5355\u7684\u7528\u6CD5\u53EA\u6709\u4E09\u6B65\uFF1A**\u5148\u6536\u96C6\u3001\u518D\u6574\u7406\u3001\u5E38\u56DE\u987E**\u3002

## \u76EE\u5F55\u8BF4\u660E

| \u6587\u4EF6\u5939 | \u7528\u9014 | \u4EC0\u4E48\u65F6\u5019\u653E\u8FDB\u53BB |
| --- | --- | --- |
| \`00-Inbox/\` | \u6536\u96C6\u7BB1 | BinnAgentX \u540C\u6B65\u6765\u7684\u6807\u6CE8\u3001\u968F\u624B\u8BB0\u4E0B\u7684\u53E5\u5B50\u3001\u8FD8\u4E0D\u77E5\u9053\u5982\u4F55\u5206\u7C7B\u7684\u788E\u7247 |
| \`01-Vocabulary/\` | \u8BCD\u6C47 | \u5DF2\u7ECF\u8865\u5145\u4E86\u542B\u4E49\u3001\u642D\u914D\u3001\u8BED\u5883\u6216\u4F8B\u53E5\u7684\u5355\u8BCD\u548C\u77ED\u8BED |
| \`02-Grammar/\` | \u8BED\u6CD5 | \u80FD\u8BF4\u6E05\u89C4\u5219\u3001\u7ED3\u6784\u3001\u8BEF\u533A\u548C\u9A8C\u8BC1\u4F8B\u53E5\u7684\u8BED\u6CD5\u70B9 |
| \`03-Reading/\` | \u9605\u8BFB | \u6587\u7AE0\u539F\u6587\u3001\u4E66\u7C4D\u6458\u8BB0\u3001\u6458\u8981\u3001\u8BC1\u636E\u548C\u9605\u8BFB\u7B56\u7565 |
| \`04-Writing/\` | \u5199\u4F5C | \u82F1\u6587\u5199\u4F5C\u7EC3\u4E60\u3001V1/V2 \u4FEE\u6539\u8FC7\u7A0B\u548C\u53EF\u8FC1\u79FB\u8868\u8FBE |
| \`05-Templates/\` | \u6A21\u677F | Obsidian Templates \u6838\u5FC3\u63D2\u4EF6\u4F7F\u7528\u7684\u7B14\u8BB0\u6A21\u677F |
| \`06-Attachments/\` | \u9644\u4EF6 | \u56FE\u7247\u3001PDF\u3001\u97F3\u9891\u7B49\u975E Markdown \u6587\u4EF6 |

## \u63A8\u8350\u5DE5\u4F5C\u6D41

1. **\u968F\u65F6\u6536\u96C6**\uFF1A\u5148\u628A\u5185\u5BB9\u653E\u8FDB \`00-Inbox/\`\uFF0C\u4E0D\u8981\u56E0\u4E3A\u5206\u7C7B\u800C\u6253\u65AD\u5B66\u4E60\u3002
2. **\u6BCF\u5468\u6574\u7406**\uFF1A\u4E3A\u6709\u4EF7\u503C\u7684\u788E\u7247\u8865\u4E0A\u81EA\u5DF1\u7684\u89E3\u91CA\u548C\u4F8B\u53E5\uFF0C\u518D\u79FB\u52A8\u5230\u8BCD\u6C47\u3001\u8BED\u6CD5\u3001\u9605\u8BFB\u6216\u5199\u4F5C\u76EE\u5F55\u3002
3. **\u5EFA\u7ACB\u8FDE\u63A5**\uFF1A\u7528 \`[[\u7B14\u8BB0\u540D]]\` \u628A\u76F8\u5173\u8BCD\u6C47\u3001\u8BED\u6CD5\u548C\u9605\u8BFB\u7B14\u8BB0\u4E92\u76F8\u94FE\u63A5\u3002
4. **\u56DE\u5230\u5730\u56FE**\uFF1A\u4ECE [[00-Dashboard|\u603B Dashboard]]\u3001[[01-Vocabulary/00-Dashboard|\u8BCD\u6C47 Dashboard]] \u6216 [[02-Grammar/00-Dashboard|\u8BED\u6CD5 Dashboard]] \u6D4F\u89C8\u548C\u590D\u4E60\u3002

## \u6A21\u677F\u600E\u4E48\u7528

\u63D2\u4EF6\u4F1A\u628A Obsidian \u7684\u6A21\u677F\u6587\u4EF6\u5939\u8BBE\u4E3A \`BinnAgentX/05-Templates\`\u3002\u542F\u7528 Obsidian \u7684 **Templates\uFF08\u6A21\u677F\uFF09\u6838\u5FC3\u63D2\u4EF6** \u540E\uFF0C\u65B0\u5EFA\u7B14\u8BB0\u5E76\u6267\u884C\u201C\u63D2\u5165\u6A21\u677F\u201D\uFF0C\u518D\u9009\u62E9\u8BCD\u6C47\u3001\u8BED\u6CD5\u3001\u9605\u8BFB\u7B56\u7565\u6216\u5199\u4F5C\u8868\u8FBE\u6A21\u677F\u3002

## \u95F4\u9694\u91CD\u590D\u600E\u4E48\u7528

BinnAgentX Learning Sync \u4F7F\u7528\u793E\u533A\u63D2\u4EF6 **Spaced Repetition** \u63D0\u4F9B\u95EA\u5361\u590D\u4E60\u3002\u7B2C\u4E00\u6B21\u4F7F\u7528\u8BF7\u6309 [[Spaced Repetition \u4F7F\u7528\u6307\u5357]] \u5B8C\u6210\u5B89\u88C5\uFF0C\u518D\u6253\u5F00 [[01-Vocabulary/Spaced Repetition \u95EA\u5361\u793A\u4F8B]] \u505A\u4E00\u6B21\u7EC3\u4E60\u3002

## Dashboard \u548C Dataview

Dashboard \u672C\u8EAB\u662F\u5185\u5BB9\u5730\u56FE\uFF08MOC\uFF09\uFF0C\u91CC\u9762\u7684\u666E\u901A\u94FE\u63A5\u4E0D\u4F9D\u8D56\u4EFB\u4F55\u63D2\u4EF6\u3002\u5B89\u88C5\u5E76\u542F\u7528\u793E\u533A\u63D2\u4EF6 **Dataview** \u540E\uFF0C\u8BCD\u6C47\u3001\u8BED\u6CD5\u548C\u6700\u8FD1\u66F4\u65B0\u5217\u8868\u4F1A\u81EA\u52A8\u751F\u6210\uFF1B\u672A\u5B89\u88C5\u65F6\u53EA\u4F1A\u770B\u5230\u67E5\u8BE2\u4EE3\u7801\u5757\uFF0C\u4E0D\u5F71\u54CD\u5176\u4ED6\u7B14\u8BB0\u3002

## \u9644\u4EF6

\u63D2\u4EF6\u4F1A\u628A Obsidian \u7684\u9ED8\u8BA4\u9644\u4EF6\u4F4D\u7F6E\u8BBE\u4E3A \`BinnAgentX/06-Attachments\`\u3002\u4E4B\u540E\u7C98\u8D34\u56FE\u7247\u6216\u52A0\u5165 PDF \u65F6\uFF0C\u9644\u4EF6\u4F1A\u96C6\u4E2D\u5B58\u653E\uFF0C\u6B63\u6587\u4ECD\u53EF\u7528 Obsidian \u94FE\u63A5\u5F15\u7528\u3002

## \u4E0D\u4F1A\u53D1\u751F\u4EC0\u4E48

- \u521D\u59CB\u5316\u53EF\u4EE5\u91CD\u590D\u6267\u884C\uFF0C\u4F46\u4E0D\u4F1A\u8986\u76D6\u540C\u540D\u6587\u4EF6\u6216\u4F60\u5DF2\u7ECF\u4FEE\u6539\u7684\u6A21\u677F\u3002
- \u63D2\u4EF6\u4E0D\u4F1A\u81EA\u52A8\u66FF\u4F60\u79FB\u52A8\u3001\u5220\u9664\u6216\u201C\u6574\u7406\u5B8C\u6210\u201D\u6536\u96C6\u7BB1\u91CC\u7684\u5185\u5BB9\u3002
- \u6307\u5357\u3001Dashboard \u548C\u521D\u59CB\u5316\u793A\u4F8B\u5E26\u6709 \`binnagent_sync: false\`\uFF0C\u4E0D\u4F1A\u4F5C\u4E3A\u4F60\u7684\u4E2A\u4EBA\u5B66\u4E60\u4E0A\u4E0B\u6587\u4E0A\u4F20\u3002
`,
    [`${r}/Spaced Repetition \u4F7F\u7528\u6307\u5357.md`]: `---
binnagent_sync: false
tags:
  - binnagent
  - guide
  - spaced-repetition
---

# Spaced Repetition \u4F7F\u7528\u6307\u5357

BinnAgentX Learning Sync \u8D1F\u8D23\u628A\u5B66\u4E60\u6750\u6599\u6574\u7406\u5230\u8FD9\u4E2A Vault\uFF1B\u793E\u533A\u63D2\u4EF6 **Spaced Repetition** \u8D1F\u8D23\u5224\u65AD\u54EA\u4E9B\u95EA\u5361\u4ECA\u5929\u9700\u8981\u590D\u4E60\u3002BinnAgentX \u4E0D\u4F1A\u66FF\u4F60\u5B89\u88C5\u793E\u533A\u63D2\u4EF6\uFF0C\u4E0B\u9762\u7684\u8BBE\u7F6E\u53EA\u9700\u5B8C\u6210\u4E00\u6B21\u3002

## 1. \u5B89\u88C5\u5E76\u542F\u7528\u63D2\u4EF6

1. \u6253\u5F00 Obsidian \u7684 **\u8BBE\u7F6E \u2192 \u7B2C\u4E09\u65B9\u63D2\u4EF6\uFF08Community plugins\uFF09**\u3002
2. \u5982\u679C\u4ECD\u5904\u4E8E\u53D7\u9650\u6A21\u5F0F\uFF0C\u6309 Obsidian \u63D0\u793A\u5173\u95ED\u53D7\u9650\u6A21\u5F0F\u3002
3. \u70B9\u51FB\u201C\u6D4F\u89C8\u201D\uFF0C\u641C\u7D22 **Spaced Repetition**\uFF0C\u5B89\u88C5\u5E76\u542F\u7528\u5B83\u3002
4. \u521D\u6B21\u4F7F\u7528\u4E0D\u9700\u8981\u4FEE\u6539\u7B97\u6CD5\u6216\u5206\u9694\u7B26\u8BBE\u7F6E\uFF0C\u4FDD\u7559\u9ED8\u8BA4\u503C\u5373\u53EF\u3002

## 2. \u7528\u6837\u4F8B\u5B8C\u6210\u7B2C\u4E00\u6B21\u590D\u4E60

1. \u6253\u5F00 [[01-Vocabulary/Spaced Repetition \u95EA\u5361\u793A\u4F8B]]\u3002
2. \u6253\u5F00\u547D\u4EE4\u9762\u677F\uFF1AmacOS \u6309 \`\u2318 P\`\uFF0CWindows / Linux \u6309 \`Ctrl P\`\u3002
3. \u641C\u7D22 **Spaced Repetition**\uFF0C\u6267\u884C\u201C**\u590D\u4E60\u6B64\u7B14\u8BB0\u4E2D\u7684\u5361\u7247**\u201D\uFF08\u82F1\u6587\u754C\u9762\u4E3A \`Review flashcards in this note\`\uFF09\u3002
4. \u5148\u5728\u5FC3\u91CC\u56DE\u7B54\uFF0C\u518D\u663E\u793A\u7B54\u6848\uFF0C\u5E76\u6309\u771F\u5B9E\u56DE\u5FC6\u60C5\u51B5\u9009\u62E9\u8BC4\u5206\u3002\u63D2\u4EF6\u4F1A\u636E\u6B64\u5B89\u6392\u4E0B\u6B21\u590D\u4E60\u3002

\u5982\u679C\u53EA\u60F3\u7ACB\u523B\u91CD\u505A\u5168\u90E8\u6837\u4F8B\u3001\u4E0D\u8003\u8651\u590D\u4E60\u65E5\u671F\uFF0C\u8BF7\u6267\u884C\u201C**\u96C6\u4E2D\u590D\u4E60\u6B64\u7B14\u8BB0\u4E2D\u7684\u5361\u7247**\u201D\uFF08\u82F1\u6587\u754C\u9762\u4E3A \`Cram flashcards in this note\`\uFF09\u3002

## 3. \u521B\u5EFA\u81EA\u5DF1\u7684\u95EA\u5361

\u5148\u5728\u5305\u542B\u5361\u7247\u7684\u7B14\u8BB0\u4E2D\u52A0\u5165\u5361\u7EC4\u6807\u7B7E\u3002\u9ED8\u8BA4\u5361\u7EC4\u6807\u7B7E\u662F\uFF1A

\`\`\`markdown
#flashcards
\`\`\`

\u4E5F\u53EF\u4EE5\u7528\u5C42\u7EA7\u6807\u7B7E\u5206\u7EC4\uFF0C\u4F8B\u5982\uFF1A

\`\`\`markdown
#flashcards/binnagentx/vocabulary
\`\`\`

\u7136\u540E\u9009\u62E9\u4E00\u79CD\u5361\u7247\u683C\u5F0F\uFF1A

\`\`\`markdown
resilient \u662F\u4EC0\u4E48\u610F\u601D\uFF1F::\u6709\u97E7\u6027\u7684\uFF1B\u80FD\u4ECE\u56F0\u96BE\u4E2D\u8FC5\u901F\u6062\u590D\u7684\u3002

\u6709\u97E7\u6027\u7684\uFF1B\u80FD\u8FC5\u901F\u6062\u590D\u7684:::resilient

although \u548C despite \u540E\u9762\u5206\u522B\u63A5\u4EC0\u4E48\uFF1F
?
although \u540E\u63A5\u5B8C\u6574\u4ECE\u53E5\uFF1Bdespite \u540E\u63A5\u540D\u8BCD\u3001\u4EE3\u8BCD\u6216\u52A8\u540D\u8BCD\u3002
\`\`\`

- \`::\` \u521B\u5EFA\u5355\u5411\u5361\uFF1A\u5DE6\u8FB9\u662F\u95EE\u9898\uFF0C\u53F3\u8FB9\u662F\u7B54\u6848\u3002
- \`:::\` \u521B\u5EFA\u53CC\u5411\u5361\uFF1A\u4E24\u4E2A\u65B9\u5411\u90FD\u4F1A\u88AB\u63D0\u95EE\u3002
- \u5355\u72EC\u4E00\u884C\u7684 \`?\` \u9002\u5408\u8F83\u957F\u7684\u591A\u884C\u7B54\u6848\u3002

## 4. \u6BCF\u5929\u600E\u4E48\u590D\u4E60

\u6253\u5F00\u547D\u4EE4\u9762\u677F\uFF0C\u641C\u7D22 **Spaced Repetition** \u5E76\u6267\u884C\u201C**\u590D\u4E60\u6240\u6709\u7B14\u8BB0\u4E2D\u7684\u5361\u7247**\u201D\uFF0C\u9009\u62E9\u5361\u7EC4\u540E\u5F00\u59CB\u590D\u4E60\u3002\u5EFA\u8BAE\u5148\u56DE\u5FC6\u518D\u770B\u7B54\u6848\uFF1B\u8BC4\u5206\u53CD\u6620\u201C\u8FD9\u6B21\u60F3\u8D77\u6765\u6709\u591A\u96BE\u201D\uFF0C\u4E0D\u5FC5\u8FFD\u6C42\u5168\u90E8\u9009 Easy\u3002

\u590D\u4E60\u540E\uFF0CSpaced Repetition \u4F1A\u5728\u5361\u7247\u9644\u8FD1\u5199\u5165\u7C7B\u4F3C \`<!--SR:...-->\` \u7684\u8C03\u5EA6\u6CE8\u91CA\u3002\u8FD9\u662F\u590D\u4E60\u8BB0\u5F55\uFF0C\u4E0D\u662F\u9519\u8BEF\uFF1B\u4E0D\u8981\u624B\u52A8\u4FEE\u6539\u6216\u5220\u9664\u3002

## \u5E38\u89C1\u95EE\u9898

- **\u627E\u4E0D\u5230\u5361\u7EC4**\uFF1A\u786E\u8BA4 Spaced Repetition \u5DF2\u542F\u7528\uFF0C\u5E76\u4E14\u7B14\u8BB0\u6B63\u6587\u542B\u6709 \`#flashcards\` \u6216\u5176\u5C42\u7EA7\u6807\u7B7E\u3002
- **\u5361\u7247\u6CA1\u6709\u88AB\u8BC6\u522B**\uFF1A\u5148\u4F7F\u7528\u9ED8\u8BA4\u5206\u9694\u7B26\uFF0C\u5E76\u786E\u8BA4 \`::\`\u3001\`:::\` \u6216 \`?\` \u4E0D\u5728\u4EE3\u7801\u5757\u4E2D\u3002
- **\u4ECA\u5929\u6CA1\u6709\u5230\u671F\u5361\u7247**\uFF1A\u6267\u884C\u201C\u96C6\u4E2D\u590D\u4E60\u6B64\u7B14\u8BB0\u4E2D\u7684\u5361\u7247\u201D\u53EF\u968F\u65F6\u7EC3\u4E60\uFF0C\u4E0D\u4F1A\u53D7\u5230\u671F\u65E5\u9650\u5236\u3002
- **\u60F3\u590D\u4E60\u6574\u7BC7\u7B14\u8BB0**\uFF1A\u8FD9\u662F\u53E6\u4E00\u79CD\u5DE5\u4F5C\u6D41\uFF0C\u53EF\u7ED9\u7B14\u8BB0\u52A0 \`#review\`\uFF1B\u5165\u95E8\u9636\u6BB5\u53EA\u4F7F\u7528\u95EA\u5361\u5373\u53EF\u3002
`,
    [`${h}/\u6536\u96C6\u7BB1\u4F7F\u7528\u8BF4\u660E.md`]: `---
binnagent_sync: false
inbox_status: reference
tags:
  - binnagent
  - inbox
---

# \u6536\u96C6\u7BB1\u4F7F\u7528\u8BF4\u660E

\u6807\u6CE8\u3001\u7075\u611F\u3001\u4E0D\u4F1A\u5F52\u7C7B\u7684\u8868\u8FBE\u5148\u653E\u5728\u8FD9\u91CC\uFF0C\u4E0D\u9700\u8981\u4E00\u5F00\u59CB\u5C31\u5199\u5F97\u5B8C\u6574\u3002

## \u6BCF\u5468\u6574\u7406

1. \u80FD\u590D\u7528\u7684\u5355\u8BCD\u6216\u77ED\u8BED\uFF0C\u6574\u7406\u5230 [[../01-Vocabulary/00-Dashboard|\u8BCD\u6C47]]\u3002
2. \u53E5\u5B50\u80CC\u540E\u7684\u89C4\u5219\uFF0C\u6574\u7406\u5230 [[../02-Grammar/00-Dashboard|\u8BED\u6CD5]]\u3002
3. \u539F\u6587\u4E0E\u9605\u8BFB\u8BB0\u5F55\uFF0C\u6574\u7406\u5230 [[../03-Reading/\u9605\u8BFB\u7B14\u8BB0\u793A\u4F8B|\u9605\u8BFB]]\u3002
4. \u81EA\u5DF1\u5199\u7684\u6BB5\u843D\uFF0C\u6574\u7406\u5230 [[../04-Writing/\u5199\u4F5C\u7EC3\u4E60\u793A\u4F8B|\u5199\u4F5C]]\u3002
5. \u5DF2\u5904\u7406\u7684\u788E\u7247\u53EF\u5F52\u6863\u3001\u79FB\u52A8\u6216\u5220\u9664\uFF1B\u63D2\u4EF6\u4E0D\u4F1A\u66FF\u4F60\u8986\u76D6\u8FD9\u4E9B\u5185\u5BB9\u3002
`,
    [`${r}/01-Vocabulary/00-Dashboard.md`]: `# \u8BCD\u6C47 Dashboard

\u8FD9\u662F\u8BCD\u6C47\u5E93\u7684\u5185\u5BB9\u5730\u56FE\u3002\u65B0\u5EFA\u7B14\u8BB0\u65F6\u4F7F\u7528 [[../05-Templates/\u8BCD\u6C47|\u8BCD\u6C47\u6A21\u677F]]\u3002

## \u5168\u90E8\u8BCD\u6C47\uFF08Dataview\uFF09

\`\`\`dataview
TABLE WITHOUT ID file.link AS "\u8BCD\u6C47", meaning AS "\u6838\u5FC3\u542B\u4E49", status AS "\u72B6\u6001", file.mtime AS "\u66F4\u65B0"
FROM "BinnAgentX/01-Vocabulary"
WHERE file.name != "00-Dashboard" AND file.name != "Dashboard"
SORT file.mtime DESC
\`\`\`

## \u5EFA\u8BAE\u7684 MOC

- \u6309\u4E3B\u9898\uFF1A\u5B66\u4E60\u3001\u5DE5\u4F5C\u3001\u65C5\u884C\u3001\u60C5\u7EEA
- \u6309\u5173\u7CFB\uFF1A\u540C\u4E49\u8BCD\u3001\u53CD\u4E49\u8BCD\u3001\u6613\u6DF7\u8BCD\u3001\u56FA\u5B9A\u642D\u914D
- \u793A\u4F8B\uFF1A[[resilient]]
`,
    [`${r}/01-Vocabulary/resilient.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "vocabulary"
meaning: "\u6709\u97E7\u6027\u7684\uFF1B\u80FD\u8FC5\u901F\u6062\u590D\u7684"
status: learning
tags:
  - binnagent
  - vocabulary
  - character
---

# resilient

## \u6838\u5FC3\u542B\u4E49

Able to recover quickly after difficulty or change.

## \u53D1\u97F3

/r\u026A\u02C8z\u026Ali\u0259nt/

## \u5E38\u7528\u642D\u914D

- resilient people
- a resilient economy
- remain resilient

## \u539F\u53E5\u4E0E\u8BED\u5883

The team remained resilient after an early setback.

## \u6211\u7684\u4F8B\u53E5

I want to become more resilient when a plan changes unexpectedly.

## \u6613\u6DF7\u6DC6\u70B9

**resilient** \u5F3A\u8C03\u53D7\u632B\u540E\u7684\u6062\u590D\u80FD\u529B\uFF1B**persistent** \u5F3A\u8C03\u6301\u7EED\u575A\u6301\u3002

## \u5173\u8054

- [[00-Dashboard]]
`,
    [`${r}/01-Vocabulary/Spaced Repetition \u95EA\u5361\u793A\u4F8B.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "vocabulary"
status: example
tags:
  - binnagent
  - vocabulary
  - spaced-repetition
---

# Spaced Repetition \u95EA\u5361\u793A\u4F8B

\u8FD9\u662F\u4E00\u7EC4\u53EF\u4EE5\u7ACB\u5373\u590D\u4E60\u7684\u5165\u95E8\u5361\u7247\u3002\u8BF7\u4FDD\u7559\u4E0B\u4E00\u884C\u5361\u7EC4\u6807\u7B7E\uFF0C\u7136\u540E\u6253\u5F00\u547D\u4EE4\u9762\u677F\uFF0C\u641C\u7D22 **Spaced Repetition** \u5E76\u6267\u884C\u201C**\u590D\u4E60\u6B64\u7B14\u8BB0\u4E2D\u7684\u5361\u7247**\u201D\u3002

#flashcards/binnagentx/vocabulary

## \u5355\u5411\u5361

resilient \u7684\u6838\u5FC3\u542B\u4E49\u662F\u4EC0\u4E48\uFF1F::\u6709\u97E7\u6027\u7684\uFF1B\u80FD\u5728\u56F0\u96BE\u6216\u53D8\u5316\u540E\u8FC5\u901F\u6062\u590D\u7684\u3002

## \u53CC\u5411\u5361

\u6709\u97E7\u6027\u7684\uFF1B\u80FD\u8FC5\u901F\u6062\u590D\u7684:::resilient

## \u591A\u884C\u5361

resilient \u548C persistent \u7684\u4FA7\u91CD\u70B9\u6709\u4EC0\u4E48\u4E0D\u540C\uFF1F
?
**resilient** \u5F3A\u8C03\u53D7\u632B\u540E\u7684\u6062\u590D\u80FD\u529B\uFF1B**persistent** \u5F3A\u8C03\u4E0D\u653E\u5F03\u3001\u6301\u7EED\u575A\u6301\u3002

---

\u590D\u4E60\u5B8C\u6210\u540E\uFF0CSpaced Repetition \u4F1A\u81EA\u52A8\u5728\u5361\u7247\u9644\u8FD1\u52A0\u5165\u8C03\u5EA6\u6CE8\u91CA\u3002\u63A5\u4E0B\u6765\u53EF\u4EE5\u53C2\u8003 [[../Spaced Repetition \u4F7F\u7528\u6307\u5357|\u4F7F\u7528\u6307\u5357]]\uFF0C\u628A\u81EA\u5DF1\u7684\u5B66\u4E60\u5185\u5BB9\u6539\u5199\u6210\u5361\u7247\u3002
`,
    [`${r}/02-Grammar/00-Dashboard.md`]: `# \u8BED\u6CD5 Dashboard

\u8FD9\u662F\u8BED\u6CD5\u5E93\u7684\u5185\u5BB9\u5730\u56FE\u3002\u65B0\u5EFA\u7B14\u8BB0\u65F6\u4F7F\u7528 [[../05-Templates/\u8BED\u6CD5|\u8BED\u6CD5\u6A21\u677F]]\u3002

## \u5168\u90E8\u8BED\u6CD5\u70B9\uFF08Dataview\uFF09

\`\`\`dataview
TABLE WITHOUT ID file.link AS "\u8BED\u6CD5\u70B9", status AS "\u72B6\u6001", file.mtime AS "\u66F4\u65B0"
FROM "BinnAgentX/02-Grammar"
WHERE file.name != "00-Dashboard" AND file.name != "Dashboard"
SORT file.mtime DESC
\`\`\`

## \u5EFA\u8BAE\u7684 MOC

- \u65F6\u6001\u4E0E\u8BED\u6001
- \u4ECE\u53E5
- \u975E\u8C13\u8BED\u52A8\u8BCD
- \u8FDE\u63A5\u4E0E\u8854\u63A5
- \u793A\u4F8B\uFF1A[[although \u4E0E despite]]
`,
    [`${r}/02-Grammar/although \u4E0E despite.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "grammar"
status: learning
tags:
  - binnagent
  - grammar
  - concession
---

# although \u4E0E despite

## \u4E00\u53E5\u8BDD\u89C4\u5219

**although** \u540E\u63A5\u5B8C\u6574\u4ECE\u53E5\uFF1B**despite** \u540E\u63A5\u540D\u8BCD\u3001\u4EE3\u8BCD\u6216\u52A8\u540D\u8BCD\u3002

## \u7ED3\u6784\u516C\u5F0F

- Although + \u4E3B\u8BED + \u8C13\u8BED, \u4E3B\u53E5\u3002
- Despite + \u540D\u8BCD / doing, \u4E3B\u53E5\u3002

## \u539F\u53E5\u62C6\u89E3

Although it was raining, we kept walking.

Despite the rain, we kept walking.

## \u5E38\u89C1\u8BEF\u533A

\u4E0D\u8981\u5199\u6210 \u201Cdespite it was raining\u201D\u3002\u53EF\u6539\u4E3A \u201Cdespite the rain\u201D \u6216 \u201Cdespite the fact that it was raining\u201D\u3002

## \u65B0\u8BED\u5883\u9A8C\u8BC1

Although the task was difficult, she finished it on time.

## \u5173\u8054

- [[00-Dashboard]]
`,
    [`${r}/03-Reading/\u9605\u8BFB\u7B14\u8BB0\u793A\u4F8B.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "reading_skill"
status: example
tags:
  - binnagent
  - reading
---

# \u9605\u8BFB\u7B14\u8BB0\u793A\u4F8B

## \u6765\u6E90

\u5728\u8FD9\u91CC\u8BB0\u5F55\u6587\u7AE0\u6807\u9898\u3001\u4F5C\u8005\u548C\u94FE\u63A5\u3002

## \u4E00\u53E5\u8BDD\u6458\u8981

\u5148\u7528\u81EA\u5DF1\u7684\u8BDD\u5199\u4E00\u53E5\uFF0C\u518D\u8865\u7EC6\u8282\u3002

## \u5173\u952E\u6BB5\u843D\u4E0E\u8BC1\u636E

\u6458\u5F55\u5C11\u91CF\u5173\u952E\u53E5\uFF0C\u5E76\u8BF4\u660E\u5B83\u4E3A\u4EC0\u4E48\u91CD\u8981\u3002

## \u65B0\u8BCD\u4E0E\u8BED\u6CD5

- \u8BCD\u6C47\u53EF\u6574\u7406\u5230 [[../01-Vocabulary/00-Dashboard|\u8BCD\u6C47 Dashboard]]\u3002
- \u8BED\u6CD5\u53EF\u6574\u7406\u5230 [[../02-Grammar/00-Dashboard|\u8BED\u6CD5 Dashboard]]\u3002

## \u6211\u7684\u89C2\u70B9

\u5199\u4E0B\u8D5E\u540C\u3001\u8D28\u7591\u6216\u53EF\u4EE5\u8FC1\u79FB\u5230\u5176\u4ED6\u6587\u7AE0\u7684\u60F3\u6CD5\u3002
`,
    [`${r}/04-Writing/\u5199\u4F5C\u7EC3\u4E60\u793A\u4F8B.md`]: `---
binnagent_sync: false
binnagent_schema: "learning-context/v1"
binnagent_kind: "writing_skill"
status: draft
tags:
  - binnagent
  - writing
---

# \u5199\u4F5C\u7EC3\u4E60\u793A\u4F8B

## \u9898\u76EE

Describe a habit that has improved your learning.

## V1 \u8349\u7A3F

\u5148\u5199\u5B8C\uFF0C\u4E0D\u5728\u7B2C\u4E00\u904D\u8FFD\u6C42\u5B8C\u7F8E\u3002

## \u4FEE\u6539\u8BB0\u5F55

- \u5185\u5BB9\uFF1A\u89C2\u70B9\u662F\u5426\u6E05\u695A\uFF1F
- \u7ED3\u6784\uFF1A\u6BB5\u843D\u662F\u5426\u6709\u4E3B\u9898\u53E5\u548C\u8BC1\u636E\uFF1F
- \u8BED\u8A00\uFF1A\u662F\u5426\u80FD\u7528\u66F4\u51C6\u786E\u7684\u8BCD\u6C47\u6216\u53E5\u5F0F\uFF1F

## V2 \u5B9A\u7A3F

\u6839\u636E\u4FEE\u6539\u8BB0\u5F55\u91CD\u5199\uFF0C\u5E76\u4FDD\u7559 V1 \u65B9\u4FBF\u6BD4\u8F83\u3002
`,
  },
  b = class extends o.Plugin {
    settings = k;
    async onload() {
      (await this.loadSettings(),
        this.addSettingTab(new w(this.app, this)),
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
          name: "Initialize BinnAgentX learning library",
          callback: () => this.initializeLearningLibrary(),
        }),
        this.app.workspace.onLayoutReady(() => {
          this.handleLayoutReady();
        }),
        this.registerInterval(
          window.setInterval(() => {
            this.settings.autoSync && this.sync(!1);
          }, 6e4),
        ));
    }
    async loadSettings() {
      this.settings = { ...k, ...(await this.loadData()) };
    }
    async saveSettings() {
      await this.saveData(this.settings);
    }
    async handleLayoutReady() {
      if (this.settings.libraryVersion < $)
        try {
          await this.initializeLearningLibrary(!1);
        } catch (n) {
          let t = n instanceof Error ? n.message : "\u672A\u77E5\u9519\u8BEF";
          new o.Notice(`BinnAgentX \u5B66\u4E60\u5E93\u521D\u59CB\u5316\u5931\u8D25\uFF1A${t}`);
        }
      this.settings.autoSync && (await this.sync(!1));
    }
    async collectEntriesAsync() {
      let n = R(this.settings.allowedFolders),
        t = R(this.settings.allowedTags).map((e) => e.replace(/^#/, ""));
      if (!n.length && !t.length)
        throw new Error(
          "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u5141\u8BB8\u540C\u6B65\u7684\u6587\u4EF6\u5939\u6216\u6807\u7B7E",
        );
      let a = this.app.vault.getMarkdownFiles().filter((e) => U(e, n, t, this.app));
      if (a.length > this.settings.maxNotes)
        throw new Error(
          `\u5339\u914D\u5230 ${a.length} \u7BC7\u7B14\u8BB0\uFF0C\u8BF7\u7F29\u5C0F\u8303\u56F4\uFF08\u4E0A\u9650 ${this.settings.maxNotes}\uFF09`,
        );
      return Promise.all(
        a.map(async (e) => {
          let s = this.app.metadataCache.getFileCache(e),
            c = s?.frontmatter ?? {},
            l = A([...v(c.tags), ...(s?.tags ?? []).map((g) => g.tag.replace(/^#/, ""))]);
          return {
            source_key: e.path,
            asset_id: typeof c.binnagent_asset_id == "string" ? c.binnagent_asset_id : void 0,
            title: String(c.title ?? e.basename),
            kind: j(c.binnagent_kind, l),
            tags: l,
            excerpt: J(await this.app.vault.read(e), this.settings.maxExcerptCharacters),
            modified_at: new Date(e.stat.mtime).toISOString(),
          };
        }),
      );
    }
    async preview() {
      try {
        let n = await this.collectEntriesAsync();
        new o.Notice(
          `\u5C06\u540C\u6B65 ${n.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF1A${
            n
              .slice(0, 4)
              .map((t) => t.title)
              .join("\u3001") || "\u65E0"
          }`,
        );
      } catch (n) {
        new o.Notice(
          n instanceof Error ? n.message : "\u65E0\u6CD5\u9884\u89C8\u540C\u6B65\u8303\u56F4",
        );
      }
    }
    async initializeLearningLibrary(n = !0) {
      let t = 0;
      this.app.vault.getAbstractFileByPath(r) || (await this.app.vault.createFolder(r), (t += 1));
      for (let a of V) {
        let e = `${r}/${a}`;
        this.app.vault.getAbstractFileByPath(e) || (await this.app.vault.createFolder(e), (t += 1));
      }
      ((t += await this.migrateManagedDashboards()),
        await this.rewriteManagedDashboardLinks(),
        (t += await this.migrateManagedVocabularyTemplate()));
      for (let [a, e] of Object.entries(W))
        this.app.vault.getAbstractFileByPath(`${m}/${a}`) ||
          (await this.app.vault.create(`${m}/${a}`, e), (t += 1));
      for (let [a, e] of Object.entries(T))
        this.app.vault.getAbstractFileByPath(a) || (await this.app.vault.create(a, e), (t += 1));
      (await this.configureObsidianFolders(),
        (t += await this.installReviewStyleSnippet()),
        (this.settings.libraryVersion = $),
        await this.saveSettings(),
        n &&
          new o.Notice(
            t
              ? `BinnAgentX \u5B66\u4E60\u5E93\u5DF2\u521D\u59CB\u5316\uFF08\u8865\u9F50\u6216\u66F4\u65B0 ${t} \u9879\uFF09`
              : "BinnAgentX \u5B66\u4E60\u5E93\u5DF2\u5C31\u7EEA\uFF0C\u672A\u8986\u76D6\u4F60\u7684\u4FEE\u6539",
          ));
    }
    async migrateManagedDashboards() {
      let n = 0;
      for (let [t, a] of F) {
        let e = this.app.vault.getAbstractFileByPath(t);
        !(e instanceof o.TFile) ||
          this.app.vault.getAbstractFileByPath(a) ||
          (await this.app.vault.rename(e, a), (n += 1));
      }
      return n;
    }
    async migrateManagedVocabularyTemplate() {
      let n = `${m}/\u8BCD\u6C47.md`,
        t = this.app.vault.getAbstractFileByPath(n);
      if (!(t instanceof o.TFile)) return 0;
      let a = await this.app.vault.read(t);
      return a !== N && a !== X && a !== M ? 0 : (await this.app.vault.modify(t, E), 1);
    }
    async rewriteManagedDashboardLinks() {
      let n = this.app.vault
        .getMarkdownFiles()
        .filter((t) => t.path === `${r}.md` || t.path.startsWith(`${r}/`));
      for (let t of n) {
        let a = await this.app.vault.read(t),
          e = H(a, t.path);
        e !== a && (await this.app.vault.modify(t, e));
      }
    }
    async configureObsidianFolders() {
      let n = this.app.vault;
      (typeof n.setConfig == "function"
        ? n.setConfig("attachmentFolderPath", D)
        : await this.mergeConfigFile(`${this.app.vault.configDir}/app.json`, {
            attachmentFolderPath: D,
          }),
        await this.mergeConfigFile(`${this.app.vault.configDir}/templates.json`, { folder: m }));
    }
    async installReviewStyleSnippet() {
      let n = this.app.vault.adapter,
        t = `${this.app.vault.configDir}/snippets`,
        a = `${t}/${f}.css`,
        e = 0;
      ((await n.exists(t)) || (await n.mkdir(t)),
        (await n.exists(a)) || (await n.write(a, z), (e += 1)));
      let s = `${this.app.vault.configDir}/appearance.json`,
        c = {};
      if (await n.exists(s)) {
        let g = await n.read(s);
        try {
          let d = JSON.parse(g);
          d && typeof d == "object" && !Array.isArray(d) && (c = d);
        } catch {
          throw new Error(
            `\u65E0\u6CD5\u542F\u7528 BinnAgentX \u95EA\u5361\u6837\u5F0F\uFF1A${s} \u4E0D\u662F\u6709\u6548\u7684 JSON`,
          );
        }
      }
      let l = v(c.enabledCssSnippets);
      return (
        l.includes(f) ||
          (await n.write(
            s,
            `${JSON.stringify({ ...c, enabledCssSnippets: [...l, f] }, null, 2)}
`,
          ),
          (e += 1)),
        e
      );
    }
    async mergeConfigFile(n, t) {
      let a = this.app.vault.adapter,
        e = {};
      if (await a.exists(n)) {
        let c = await a.read(n);
        try {
          let l = JSON.parse(c);
          l && typeof l == "object" && !Array.isArray(l) && (e = l);
        } catch {
          throw new Error(
            `\u65E0\u6CD5\u66F4\u65B0 Obsidian \u914D\u7F6E\uFF1A${n} \u4E0D\u662F\u6709\u6548\u7684 JSON`,
          );
        }
      }
      let s = { ...e, ...t };
      JSON.stringify(s) !== JSON.stringify(e) &&
        (await a.write(
          n,
          `${JSON.stringify(s, null, 2)}
`,
        ));
    }
    async sync(n = !0) {
      if (!this.settings.connectionId || !this.settings.syncSecret) {
        n &&
          new o.Notice(
            "\u8BF7\u5148\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u586B\u5199 BinnAgentX \u8FDE\u63A5\u51ED\u636E",
          );
        return;
      }
      try {
        let t = await this.pullPendingAssets(),
          a = await this.collectEntriesAsync(),
          e = await (0, o.requestUrl)({
            url: `${this.settings.apiBaseUrl.replace(/\/$/, "")}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/import`,
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.settings.syncSecret}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              schema_version: "learning-context/v1",
              vault_name: this.app.vault.getName(),
              entries: a,
            }),
            throw: !1,
          });
        if (e.status < 200 || e.status >= 300)
          throw new Error(`BinnAgentX \u62D2\u7EDD\u540C\u6B65\uFF08${e.status}\uFF09`);
        let s = e.json,
          c = await this.applyOrganizationPlan(s.organization),
          l = G(s.organization, c),
          g =
            `\u63A5\u6536 ${t} \u6761\u8D44\u4EA7\uFF0C\u4E0A\u4F20 ${a.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF1B` +
            l;
        ((this.settings.lastSyncedAt = new Date().toISOString()),
          (this.settings.lastSyncError = ""),
          (this.settings.lastSyncSummary = g),
          await this.saveSettings(),
          n && new o.Notice(`\u53CC\u5411\u540C\u6B65\u5B8C\u6210\uFF1A${g}`));
      } catch (t) {
        let a = t instanceof Error ? t.message : "\u540C\u6B65\u5931\u8D25";
        ((this.settings.lastSyncError = a), await this.saveSettings(), n && new o.Notice(a));
      }
    }
    async applyOrganizationPlan(n) {
      if (n?.status !== "planned" || !n.actions.length) return 0;
      let t = new Set([
          `${r}/01-Vocabulary`,
          `${r}/02-Grammar`,
          `${r}/03-Reading`,
          `${r}/04-Writing`,
        ]),
        a = [];
      for (let s of n.actions) {
        if (!s.source_key.startsWith(`${h}/`) || !t.has(s.target_folder)) continue;
        let c = s.source_key.slice(s.source_key.lastIndexOf("/") + 1),
          l = c.lastIndexOf("."),
          g = l > 0 ? c.slice(0, l) : c,
          d = l > 0 ? c.slice(l + 1) : "md",
          p = `${s.target_folder}/${c}`,
          S = `${s.target_folder}/${g}-${s.action_id.slice(0, 6)}.${d}`,
          _ = this.app.vault.getAbstractFileByPath(s.source_key);
        if (!(_ instanceof o.TFile)) {
          (this.app.vault.getAbstractFileByPath(p) instanceof o.TFile ||
            this.app.vault.getAbstractFileByPath(S) instanceof o.TFile) &&
            a.push(s.action_id);
          continue;
        }
        let x = this.app.vault.getAbstractFileByPath(p) ? S : p;
        this.app.vault.getAbstractFileByPath(x) ||
          (await this.app.vault.rename(_, x), a.push(s.action_id));
      }
      if (a.length !== n.actions.length)
        throw new Error(
          "Inbox \u6574\u7406\u672A\u5168\u90E8\u5B8C\u6210\uFF1B\u672A\u79FB\u52A8\u7684\u7B14\u8BB0\u4F1A\u4FDD\u7559\u5728\u539F\u5904\uFF0C\u4E0B\u6B21\u540C\u6B65\u91CD\u8BD5",
        );
      let e = await (0, o.requestUrl)({
        url: `${this.settings.apiBaseUrl.replace(/\/$/, "")}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/organizer-runs/${encodeURIComponent(n.run_id)}/ack`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.settings.syncSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed_action_ids: a }),
        throw: !1,
      });
      if (e.status < 200 || e.status >= 300)
        throw new Error(`Inbox \u6574\u7406\u56DE\u6267\u5931\u8D25\uFF08${e.status}\uFF09`);
      return a.length;
    }
    async pullPendingAssets() {
      let n = this.settings.apiBaseUrl.replace(/\/$/, ""),
        t = { Authorization: `Bearer ${this.settings.syncSecret}` },
        a = await (0, o.requestUrl)({
          url: `${n}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports`,
          method: "GET",
          headers: t,
          throw: !1,
        });
      if (a.status < 200 || a.status >= 300)
        throw new Error(
          `\u65E0\u6CD5\u8BFB\u53D6\u5F85\u540C\u6B65\u8D44\u4EA7\uFF08${a.status}\uFF09`,
        );
      let e = a.json,
        s = 0;
      for (let c of e) {
        let l = await this.createAssetNote(c),
          g = await this.app.vault.read(l),
          d = await q(g),
          p = await (0, o.requestUrl)({
            url: `${n}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports/${encodeURIComponent(c.asset_id)}/ack`,
            method: "POST",
            headers: { ...t, "Content-Type": "application/json" },
            body: JSON.stringify({
              source_key: l.path,
              content_hash: d,
              modified_at: new Date(l.stat.mtime).toISOString(),
              vault_name: this.app.vault.getName(),
            }),
            throw: !1,
          });
        if (p.status < 200 || p.status >= 300)
          throw new Error(
            `\u8D44\u4EA7\u540C\u6B65\u56DE\u6267\u5931\u8D25\uFF08${p.status}\uFF09`,
          );
        s += 1;
      }
      return s;
    }
    async createAssetNote(n) {
      (this.app.vault.getAbstractFileByPath(r) || (await this.app.vault.createFolder(r)),
        this.app.vault.getAbstractFileByPath(h) || (await this.app.vault.createFolder(h)));
      let t = h,
        a = `${Y(n.title)}-${n.asset_id.slice(-10)}.md`,
        e = `${t}/${a}`,
        s = this.app.vault.getAbstractFileByPath(e);
      if (s instanceof o.TFile) return s;
      let c = A(["binnagent", n.kind, ...n.tags]),
        l = [
          "---",
          'binnagent_schema: "asset/v1"',
          `binnagent_asset_id: "${u(n.asset_id)}"`,
          `binnagent_kind: "${u(n.kind)}"`,
          `binnagent_source_type: "${u(n.source_type)}"`,
          "inbox_status: unprocessed",
          `title: "${u(n.title)}"`,
          ...(n.source_task_id ? [`binnagent_source_task_id: "${u(n.source_task_id)}"`] : []),
          "tags:",
          ...c.map((d) => `  - ${d}`),
          "---",
          "",
          `# ${n.title}`,
          "",
        ],
        g = n.initial_content?.trim()
          ? [
              "## \u5B66\u4E60\u73B0\u573A",
              "",
              n.initial_content.trim(),
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
        e,
        [...l, ...g].join(`
`),
      );
    }
  },
  w = class extends o.PluginSettingTab {
    constructor(t, a) {
      super(t, a);
      this.plugin = a;
    }
    display() {
      let { containerEl: t } = this;
      (t.empty(),
        t.createEl("h2", { text: "BinnAgentX \u5B66\u4E60\u8D44\u4EA7\u540C\u6B65" }),
        t.createEl("p", {
          text: "\u4EC5\u540C\u6B65\u4F60\u660E\u786E\u5141\u8BB8\u7684\u8303\u56F4\u3002\u767B\u5F55\u89E6\u53D1\u7684\u6574\u7406\u53EA\u4F1A\u628A 00-Inbox \u7B14\u8BB0\u79FB\u52A8\u5230 BinnAgentX \u7684\u8BCD\u6C47\u3001\u8BED\u6CD5\u3001\u9605\u8BFB\u6216\u5199\u4F5C\u76EE\u5F55\uFF1B\u4E0D\u4F1A\u5220\u9664\u3001\u6539\u5199\u6216\u79FB\u51FA\u6258\u7BA1\u76EE\u5F55\u3002",
        }),
        new o.Setting(t)
          .setName("\u521D\u59CB\u5316\u5B66\u4E60\u5E93")
          .setDesc(
            "\u521B\u5EFA 00\u201306 \u76EE\u5F55\u3001MOC / Dataview Dashboard\u3001\u652F\u6301\u95EA\u5361\u7684\u8BCD\u6C47\u6A21\u677F\u3001Spaced Repetition \u6307\u5357\u4E0E\u5165\u95E8\u793A\u4F8B\uFF1B\u4E0D\u4F1A\u8986\u76D6\u4F60\u7684\u4FEE\u6539\u3002",
          )
          .addButton((a) =>
            a.setButtonText("\u68C0\u67E5\u5E76\u8865\u9F50").onClick(async () => {
              await this.plugin.initializeLearningLibrary();
            }),
          ),
        new o.Setting(t)
          .setName("\u81EA\u52A8\u53CC\u5411\u540C\u6B65")
          .setDesc(
            "Obsidian \u542F\u52A8\u540E\u53CA\u6BCF 60 \u79D2\u540C\u6B65\u4E00\u6B21\u5DF2\u6388\u6743\u8303\u56F4\uFF1B\u53EF\u968F\u65F6\u5173\u95ED\u5E76\u6539\u7528\u624B\u52A8\u547D\u4EE4\u3002",
          )
          .addToggle((a) =>
            a.setValue(this.plugin.settings.autoSync).onChange(async (e) => {
              ((this.plugin.settings.autoSync = e), await this.plugin.saveSettings());
            }),
          ),
        new o.Setting(t)
          .setName("\u6700\u8FD1\u540C\u6B65")
          .setDesc(
            this.plugin.settings.lastSyncError
              ? `\u5931\u8D25\uFF1A${this.plugin.settings.lastSyncError}`
              : this.plugin.settings.lastSyncedAt
                ? `${this.plugin.settings.lastSyncedAt}\uFF1B${this.plugin.settings.lastSyncSummary || "\u540C\u6B65\u5B8C\u6210"}`
                : "\u5C1A\u672A\u5B8C\u6210\u540C\u6B65",
          ),
        new o.Setting(t)
          .setName("\u5141\u8BB8\u7684\u6587\u4EF6\u5939")
          .setDesc(
            "\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 BinnAgentX, \u82F1\u8BED/\u8BED\u6CD5",
          )
          .addText((a) =>
            a.setValue(this.plugin.settings.allowedFolders).onChange(async (e) => {
              ((this.plugin.settings.allowedFolders = e), await this.plugin.saveSettings());
            }),
          ),
        new o.Setting(t)
          .setName("\u5141\u8BB8\u7684\u6807\u7B7E")
          .setDesc(
            "\u53EF\u9009\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 binnagent-vocabulary, grammar",
          )
          .addText((a) =>
            a.setValue(this.plugin.settings.allowedTags).onChange(async (e) => {
              ((this.plugin.settings.allowedTags = e), await this.plugin.saveSettings());
            }),
          ),
        new o.Setting(t)
          .setName("BinnAgentX \u5730\u5740")
          .setDesc("\u672C\u673A\u9ED8\u8BA4\uFF1Ahttp://127.0.0.1:8000/learner")
          .addText((a) =>
            a.setValue(this.plugin.settings.apiBaseUrl).onChange(async (e) => {
              ((this.plugin.settings.apiBaseUrl = e), await this.plugin.saveSettings());
            }),
          ),
        new o.Setting(t).setName("\u8FDE\u63A5 ID").addText((a) =>
          a.setValue(this.plugin.settings.connectionId).onChange(async (e) => {
            ((this.plugin.settings.connectionId = e), await this.plugin.saveSettings());
          }),
        ),
        new o.Setting(t)
          .setName("\u540C\u6B65\u5BC6\u94A5")
          .setDesc(
            "\u7531 BinnAgentX \u7684\u8FDE\u63A5\u5411\u5BFC\u751F\u6210\uFF1B\u4EC5\u4FDD\u5B58\u5728\u672C\u673A Obsidian \u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u3002",
          )
          .addText((a) =>
            a.setValue(this.plugin.settings.syncSecret).onChange(async (e) => {
              ((this.plugin.settings.syncSecret = e), await this.plugin.saveSettings());
            }),
          ));
    }
  };
function G(i, n) {
  if (!i) return "\u672C\u8F6E\u6CA1\u6709\u6392\u961F\u7684 Inbox \u6574\u7406\u4EFB\u52A1\u3002";
  if (i.status === "noop") return "Inbox \u4E2D\u6CA1\u6709\u5F85\u6574\u7406\u7B14\u8BB0\u3002";
  if (i.status === "queued")
    return `Inbox \u6709 ${i.inbox_count} \u6761\u5F85\u6574\u7406\u7B14\u8BB0\uFF0C\u53EF\u9760\u5206\u7C7B ${i.classified_count} \u6761\uFF1B\u672C\u8F6E\u672A\u79FB\u52A8\uFF0C\u4EFB\u52A1\u4F1A\u5728\u4E0B\u6B21\u540C\u6B65\u91CD\u8BD5\u3002`;
  let t = {
      [`${r}/01-Vocabulary`]: "\u8BCD\u6C47",
      [`${r}/02-Grammar`]: "\u8BED\u6CD5",
      [`${r}/03-Reading`]: "\u9605\u8BFB",
      [`${r}/04-Writing`]: "\u5199\u4F5C",
    },
    a = new Map();
  for (let s of i.actions) {
    let c = t[s.target_folder] ?? s.target_folder;
    a.set(c, (a.get(c) ?? 0) + 1);
  }
  let e = [...a.entries()].map(([s, c]) => `${s} ${c} \u6761`).join("\u3001");
  return `\u6574\u7406\u5B8C\u6210\uFF1A\u79FB\u52A8 ${n} \u6761 Inbox \u7B14\u8BB0\uFF08${e}\uFF09\u3002`;
}
function R(i) {
  return i
    .split(",")
    .map((n) => n.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
}
function v(i) {
  return Array.isArray(i) ? i.filter((n) => typeof n == "string") : typeof i == "string" ? [i] : [];
}
function A(i) {
  return [...new Set(i.map((n) => n.replace(/^#/, "").trim()).filter(Boolean))];
}
function U(i, n, t, a) {
  let e = a.metadataCache.getFileCache(i);
  if (
    i.path.startsWith(`${m}/`) ||
    i.path.startsWith("BinnAgentX/Templates/") ||
    i.basename === "Dashboard" ||
    i.basename === "00-Dashboard" ||
    Object.prototype.hasOwnProperty.call(T, i.path) ||
    e?.frontmatter?.binnagent_sync === !1
  )
    return !1;
  let s = n.some((l) => i.path === l || i.path.startsWith(`${l}/`)),
    c = A([...(e?.tags ?? []).map((l) => l.tag), ...v(e?.frontmatter?.tags)]);
  return s || t.some((l) => c.includes(l));
}
function j(i, n) {
  let t =
    typeof i == "string"
      ? i
      : n.find((a) =>
          [
            "vocabulary",
            "grammar",
            "writing_expression",
            "reading_skill",
            "exam_skill",
            "writing_skill",
          ].includes(a),
        );
  return [
    "vocabulary",
    "grammar",
    "writing_expression",
    "reading_skill",
    "exam_skill",
    "writing_skill",
  ].includes(t ?? "")
    ? t
    : "reading_skill";
}
function H(i, n) {
  let t = i
    .replaceAll("BinnAgentX/01-Vocabulary/Dashboard", "BinnAgentX/01-Vocabulary/00-Dashboard")
    .replaceAll("BinnAgentX/02-Grammar/Dashboard", "BinnAgentX/02-Grammar/00-Dashboard")
    .replaceAll("../01-Vocabulary/Dashboard", "../01-Vocabulary/00-Dashboard")
    .replaceAll("../02-Grammar/Dashboard", "../02-Grammar/00-Dashboard")
    .replaceAll("[[01-Vocabulary/Dashboard", "[[01-Vocabulary/00-Dashboard")
    .replaceAll("[[02-Grammar/Dashboard", "[[02-Grammar/00-Dashboard")
    .replaceAll("[[Dashboard|\u603B Dashboard", "[[00-Dashboard|\u603B Dashboard")
    .replaceAll(
      'WHERE file.name != "Dashboard" AND !contains(file.path, "/05-Templates/")',
      'WHERE file.name != "00-Dashboard" AND file.name != "Dashboard" AND !contains(file.path, "/05-Templates/")',
    );
  return (
    (n.startsWith(`${r}/01-Vocabulary/`) || n.startsWith(`${r}/02-Grammar/`)) &&
      (t = t.replaceAll("[[Dashboard]]", "[[00-Dashboard]]")),
    (n.endsWith("/Dashboard.md") || n.endsWith("/00-Dashboard.md")) &&
      (t = t.replaceAll(
        'WHERE file.name != "Dashboard"',
        'WHERE file.name != "00-Dashboard" AND file.name != "Dashboard"',
      )),
    t
  );
}
function J(i, n) {
  return i
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/```[\s\S]*?```/gu, "")
    .replace(/!?(\[([^\]]*)\]\([^)]*\))/gu, "$2")
    .replace(/[#>*_`]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, n);
}
function Y(i) {
  return (
    i
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim()
      .slice(0, 80) || "asset"
  );
}
function u(i) {
  return i.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
async function q(i) {
  let n = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(i));
  return Array.from(new Uint8Array(n), (t) => t.toString(16).padStart(2, "0")).join("");
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEFwcCwgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIFRGaWxlLCByZXF1ZXN0VXJsIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbnR5cGUgTGVhcm5pbmdLaW5kID1cbiAgfCBcInZvY2FidWxhcnlcIlxuICB8IFwiZ3JhbW1hclwiXG4gIHwgXCJ3cml0aW5nX2V4cHJlc3Npb25cIlxuICB8IFwicmVhZGluZ19za2lsbFwiXG4gIHwgXCJleGFtX3NraWxsXCJcbiAgfCBcIndyaXRpbmdfc2tpbGxcIjtcblxuaW50ZXJmYWNlIFN5bmNTZXR0aW5ncyB7XG4gIGFwaUJhc2VVcmw6IHN0cmluZztcbiAgY29ubmVjdGlvbklkOiBzdHJpbmc7XG4gIHN5bmNTZWNyZXQ6IHN0cmluZztcbiAgYWxsb3dlZEZvbGRlcnM6IHN0cmluZztcbiAgYWxsb3dlZFRhZ3M6IHN0cmluZztcbiAgbWF4Tm90ZXM6IG51bWJlcjtcbiAgbWF4RXhjZXJwdENoYXJhY3RlcnM6IG51bWJlcjtcbiAgYXV0b1N5bmM6IGJvb2xlYW47XG4gIGxpYnJhcnlWZXJzaW9uOiBudW1iZXI7XG4gIGxhc3RTeW5jZWRBdDogc3RyaW5nO1xuICBsYXN0U3luY0Vycm9yOiBzdHJpbmc7XG4gIGxhc3RTeW5jU3VtbWFyeTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTGVhcm5pbmdDb250ZXh0RW50cnkge1xuICBzb3VyY2Vfa2V5OiBzdHJpbmc7XG4gIGFzc2V0X2lkPzogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHRhZ3M6IHN0cmluZ1tdO1xuICBleGNlcnB0OiBzdHJpbmc7XG4gIG1vZGlmaWVkX2F0OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQZW5kaW5nQXNzZXRFeHBvcnQge1xuICBhc3NldF9pZDogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHRhZ3M6IHN0cmluZ1tdO1xuICBzb3VyY2VfdHlwZTogc3RyaW5nO1xuICBzb3VyY2VfdGFza19pZDogc3RyaW5nIHwgbnVsbDtcbiAgaW5pdGlhbF9jb250ZW50OiBzdHJpbmcgfCBudWxsO1xufVxuXG5pbnRlcmZhY2UgT3JnYW5pemF0aW9uQWN0aW9uIHtcbiAgYWN0aW9uX2lkOiBzdHJpbmc7XG4gIHNvdXJjZV9rZXk6IHN0cmluZztcbiAgdGFyZ2V0X2ZvbGRlcjogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHJlYXNvbjogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgT3JnYW5pemF0aW9uUGxhbiB7XG4gIHJ1bl9pZDogc3RyaW5nO1xuICBzdGF0dXM6IFwicXVldWVkXCIgfCBcInBsYW5uZWRcIiB8IFwibm9vcFwiO1xuICBpbmJveF9jb3VudDogbnVtYmVyO1xuICBjbGFzc2lmaWVkX2NvdW50OiBudW1iZXI7XG4gIGFjdGlvbnM6IE9yZ2FuaXphdGlvbkFjdGlvbltdO1xufVxuXG5pbnRlcmZhY2UgSW1wb3J0UmVzcG9uc2Uge1xuICBpbXBvcnRlZDogbnVtYmVyO1xuICBvcmdhbml6YXRpb246IE9yZ2FuaXphdGlvblBsYW4gfCBudWxsO1xufVxuXG5jb25zdCBMSUJSQVJZX1JPT1QgPSBcIkJpbm5BZ2VudFhcIjtcbmNvbnN0IExJQlJBUllfRk9MREVSUyA9IFtcbiAgXCIwMC1JbmJveFwiLFxuICBcIjAxLVZvY2FidWxhcnlcIixcbiAgXCIwMi1HcmFtbWFyXCIsXG4gIFwiMDMtUmVhZGluZ1wiLFxuICBcIjA0LVdyaXRpbmdcIixcbiAgXCIwNS1UZW1wbGF0ZXNcIixcbiAgXCIwNi1BdHRhY2htZW50c1wiLFxuXSBhcyBjb25zdDtcbmNvbnN0IElOQk9YX0ZPTERFUiA9IGAke0xJQlJBUllfUk9PVH0vMDAtSW5ib3hgO1xuY29uc3QgVEVNUExBVEVfRk9MREVSID0gYCR7TElCUkFSWV9ST09UfS8wNS1UZW1wbGF0ZXNgO1xuY29uc3QgQVRUQUNITUVOVF9GT0xERVIgPSBgJHtMSUJSQVJZX1JPT1R9LzA2LUF0dGFjaG1lbnRzYDtcbmNvbnN0IENVUlJFTlRfTElCUkFSWV9WRVJTSU9OID0gNjtcbmNvbnN0IERBU0hCT0FSRF9NSUdSQVRJT05TID0gW1xuICBbYCR7TElCUkFSWV9ST09UfS9EYXNoYm9hcmQubWRgLCBgJHtMSUJSQVJZX1JPT1R9LzAwLURhc2hib2FyZC5tZGBdLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5L0Rhc2hib2FyZC5tZGAsIGAke0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmQubWRgXSxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDItR3JhbW1hci9EYXNoYm9hcmQubWRgLCBgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkLm1kYF0sXG5dIGFzIGNvbnN0O1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTeW5jU2V0dGluZ3MgPSB7XG4gIGFwaUJhc2VVcmw6IFwiaHR0cDovLzEyNy4wLjAuMTo4MDAwL2xlYXJuZXJcIixcbiAgY29ubmVjdGlvbklkOiBcIlwiLFxuICBzeW5jU2VjcmV0OiBcIlwiLFxuICBhbGxvd2VkRm9sZGVyczogXCJCaW5uQWdlbnRYXCIsXG4gIGFsbG93ZWRUYWdzOiBcIlwiLFxuICBtYXhOb3RlczogODAsXG4gIG1heEV4Y2VycHRDaGFyYWN0ZXJzOiA5MDAsXG4gIGF1dG9TeW5jOiB0cnVlLFxuICBsaWJyYXJ5VmVyc2lvbjogMCxcbiAgbGFzdFN5bmNlZEF0OiBcIlwiLFxuICBsYXN0U3luY0Vycm9yOiBcIlwiLFxuICBsYXN0U3luY1N1bW1hcnk6IFwiXCIsXG59O1xuXG5jb25zdCBMRUdBQ1lfVk9DQUJVTEFSWV9URU1QTEFURSA9XG4gICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxcbm1lYW5pbmc6IFwiXCJcXG5zdGF0dXM6IGxlYXJuaW5nXFxuY3JlYXRlZDoge3tkYXRlfX1cXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gdm9jYWJ1bGFyeVxcbi0tLVxcblxcbiMge3t0aXRsZX19XFxuXFxuIyMgXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XFxuXFxuIyMgXHU1M0QxXHU5N0YzXFxuXFxuIyMgXHU1RTM4XHU3NTI4XHU2NDJEXHU5MTREXFxuXFxuIyMgXHU1MzlGXHU1M0U1XHU0RTBFXHU4QkVEXHU1ODgzXFxuXFxuIyMgXHU2MjExXHU3Njg0XHU0RjhCXHU1M0U1XFxuXFxuIyMgXHU2NjEzXHU2REY3XHU2REM2XHU3MEI5XFxuXFxuIyMgXHU1MTczXHU4MDU0XFxuLSBbW0Jpbm5BZ2VudFgvMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dXFxuJztcblxuY29uc3QgQklESVJFQ1RJT05BTF9WT0NBQlVMQVJZX1RFTVBMQVRFID1cbiAgJy0tLVxcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXFxuYmlubmFnZW50X2tpbmQ6IFwidm9jYWJ1bGFyeVwiXFxubWVhbmluZzogXCJcIlxcbnN0YXR1czogbGVhcm5pbmdcXG5jcmVhdGVkOiBcInt7ZGF0ZX19XCJcXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gdm9jYWJ1bGFyeVxcbiAgLSBmbGFzaGNhcmRzL2Jpbm5hZ2VudHgvdm9jYWJ1bGFyeVxcbi0tLVxcblxcbiMge3t0aXRsZX19XFxuXFxuIyMgXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XFxuXFxuIyMgXHU1M0QxXHU5N0YzXFxuXFxuIyMgXHU1RTM4XHU3NTI4XHU2NDJEXHU5MTREXFxuXFxuIyMgXHU1MzlGXHU1M0U1XHU0RTBFXHU4QkVEXHU1ODgzXFxuXFxuIyMgXHU2MjExXHU3Njg0XHU0RjhCXHU1M0U1XFxuXFxuIyMgXHU2NjEzXHU2REY3XHU2REM2XHU3MEI5XFxuXFxuIyMgXHU5NUVBXHU1MzYxXFxuXFxuPiBcdTUxNDhcdTU4NkJcdTUxOTlcdTIwMUNcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDlcdTIwMURcdTMwMDJcdTRFMEJcdTk3NjJcdTRFMjRcdTVGMjBcdTUzNjFcdTRGMUFcdTU5MERcdTc1MjhcdTU0MENcdTRFMDBcdTRFRkRcdTUxODVcdTVCQjlcdUZGMENcdTRFMERcdTk3MDBcdTg5ODFcdTkxQ0RcdTU5MERcdTdFRjRcdTYyQTRcdTkxQ0FcdTRFNDlcdTMwMDJcXG5cXG57e3RpdGxlfX0gXHU3Njg0XHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XHU2NjJGXHU0RUMwXHU0RTQ4XHVGRjFGOjohW1sjXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XV1cXG5cXG5cdTRFMEJcdTk3NjJcdThGRDlcdTZCQjVcdTU0MkJcdTRFNDlcdTVCRjlcdTVFOTRcdTU0RUFcdTRFMkFcdTUzNTVcdThCQ0RcdTYyMTZcdTc3RURcdThCRURcdUZGMUYgIVtbI1x1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OV1dOjp7e3RpdGxlfX1cXG5cXG4jIyBcdTUxNzNcdTgwNTRcXG4tIFtbQmlubkFnZW50WC8wMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZHxcdThCQ0RcdTZDNDcgRGFzaGJvYXJkXV1cXG4tIFtbQmlubkFnZW50WC9TcGFjZWQgUmVwZXRpdGlvbiBcdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTd8U3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XV1cXG4nO1xuXG5jb25zdCBTSU1QTEVfVk9DQUJVTEFSWV9URU1QTEFURSA9XG4gICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxcbm1lYW5pbmc6IFwiXCJcXG5zdGF0dXM6IGxlYXJuaW5nXFxuY3JlYXRlZDogXCJ7e2RhdGV9fVwiXFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHZvY2FidWxhcnlcXG4gIC0gZmxhc2hjYXJkcy9iaW5uYWdlbnR4L3ZvY2FidWxhcnlcXG4tLS1cXG5cXG4jIHt7dGl0bGV9fVxcblxcbiMjIFx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVxcblxcbiMjIFx1NTNEMVx1OTdGM1xcblxcbiMjIFx1NUUzOFx1NzUyOFx1NjQyRFx1OTE0RFxcblxcbiMjIFx1NTM5Rlx1NTNFNVx1NEUwRVx1OEJFRFx1NTg4M1xcblxcbiMjIFx1NjIxMVx1NzY4NFx1NEY4Qlx1NTNFNVxcblxcbiMjIFx1NjYxM1x1NkRGN1x1NkRDNlx1NzBCOVxcblxcbiMjIFx1OTVFQVx1NTM2MVxcblxcbj4gXHU1MTQ4XHU1ODZCXHU1MTk5XHUyMDFDXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XHUyMDFEXHUzMDAyXHU0RTBCXHU5NzYyXHU3Njg0XHU1MzYxXHU3MjQ3XHU0RjFBXHU1OTBEXHU3NTI4XHU4RkQ5XHU0RUZEXHU1MTg1XHU1QkI5XHVGRjBDXHU0RTBEXHU5NzAwXHU4OTgxXHU5MUNEXHU1OTBEXHU3RUY0XHU2MkE0XHU5MUNBXHU0RTQ5XHUzMDAyXFxuXFxue3t0aXRsZX19IFx1NzY4NFx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVx1NjYyRlx1NEVDMFx1NEU0OFx1RkYxRjo6IVtbI1x1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OV1dXFxuXFxuIyMgXHU1MTczXHU4MDU0XFxuLSBbW0Jpbm5BZ2VudFgvMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dXFxuLSBbW0Jpbm5BZ2VudFgvU3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3fFNwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N11dXFxuJztcblxuY29uc3QgVk9DQUJVTEFSWV9URU1QTEFURSA9XG4gICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxcbm1lYW5pbmc6IFwiXCJcXG5zdGF0dXM6IGxlYXJuaW5nXFxuY3JlYXRlZDogXCJ7e2RhdGV9fVwiXFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHZvY2FidWxhcnlcXG4gIC0gZmxhc2hjYXJkcy9iaW5uYWdlbnR4L3ZvY2FidWxhcnlcXG4tLS1cXG5cXG4jIHt7dGl0bGV9fVxcblxcbiMjIFx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVxcblxcbiMjIFx1NTNEMVx1OTdGM1xcblxcbiMjIFx1NUUzOFx1NzUyOFx1NjQyRFx1OTE0RFxcblxcbiMjIFx1NTM5Rlx1NTNFNVx1NEUwRVx1OEJFRFx1NTg4M1xcblxcbiMjIFx1NjIxMVx1NzY4NFx1NEY4Qlx1NTNFNVxcblxcbiMjIFx1NjYxM1x1NkRGN1x1NkRDNlx1NzBCOVxcblxcbiMjIFx1OTVFQVx1NTM2MVxcblxcbj4gWyFiaW5uLXByb21wdF0gXHU1MzU1XHU4QkNEXHU1NkRFXHU1RkM2XFxuPiAjIHt7dGl0bGV9fVxcbj4gXHU1MTQ4XHU4QkY0XHU1MUZBXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XHVGRjBDXHU1MThEXHU1NkRFXHU1RkM2XHU0RTAwXHU0RTJBXHU2NDJEXHU5MTREXHU2MjE2XHU0RjhCXHU1M0U1XHUzMDAyXFxuP1xcbj4gWyFiaW5uLW1lYW5pbmddIFx1NjgzOFx1NUZDM1x1OTFDQVx1NEU0OVxcbj4gIVtbI1x1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OV1dXFxuLS0tXFxuPiBbIWJpbm4tc291bmRdIFx1NTNEMVx1OTdGM1xcbj4gIVtbI1x1NTNEMVx1OTdGM11dXFxuLS0tXFxuPiBbIWJpbm4tY29sbG9jYXRpb25zXSBcdTVFMzhcdTc1MjhcdTY0MkRcdTkxNERcXG4+ICFbWyNcdTVFMzhcdTc1MjhcdTY0MkRcdTkxNERdXVxcbi0tLVxcbj4gWyFiaW5uLWV4YW1wbGVdIFx1NjIxMVx1NzY4NFx1NEY4Qlx1NTNFNVxcbj4gIVtbI1x1NjIxMVx1NzY4NFx1NEY4Qlx1NTNFNV1dXFxuLS0tXFxuPiBbIWJpbm4tY29udHJhc3RdIFx1NjYxM1x1NkRGN1x1NkRDNlx1NzBCOVxcbj4gIVtbI1x1NjYxM1x1NkRGN1x1NkRDNlx1NzBCOV1dXFxuXFxuIyMgXHU1MTczXHU4MDU0XFxuLSBbW0Jpbm5BZ2VudFgvMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dXFxuLSBbW0Jpbm5BZ2VudFgvU3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3fFNwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N11dXFxuJztcblxuY29uc3QgUkVWSUVXX1NUWUxFX1NOSVBQRVRfTkFNRSA9IFwiYmlubmFnZW50eC1zcGFjZWQtcmVwZXRpdGlvblwiO1xuY29uc3QgUkVWSUVXX1NUWUxFX1NOSVBQRVQgPSBgLyogQmlubkFnZW50WCB2b2NhYnVsYXJ5IHJldmlldyBjYXJkcyAqL1xuLnNyLWNhcmQtY29udGFpbmVyIC5zci1zY3JvbGwtd3JhcHBlciB7XG4gIGJhY2tncm91bmQ6XG4gICAgcmFkaWFsLWdyYWRpZW50KFxuICAgICAgY2lyY2xlIGF0IDEyJSAwJSxcbiAgICAgIGNvbG9yLW1peChpbiBzcmdiLCB2YXIoLS1pbnRlcmFjdGl2ZS1hY2NlbnQpIDE0JSwgdHJhbnNwYXJlbnQpLFxuICAgICAgdHJhbnNwYXJlbnQgMzglXG4gICAgKSxcbiAgICB2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnkpO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLnNyLWNvbnRlbnQsXG4uc3ItY2FyZC1jb250YWluZXIgLnNyLWNvbnRleHQge1xuICB3aWR0aDogbWluKDkyMHB4LCAxMDAlKTtcbiAgbWFyZ2luLWlubGluZTogYXV0bztcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5zci1jb250ZW50IHtcbiAgcGFkZGluZzogY2xhbXAoMThweCwgM3Z3LCAzOHB4KTtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5zci1jb250ZXh0IHtcbiAgcGFkZGluZzogMTBweCBjbGFtcCgxOHB4LCAzdncsIDM4cHgpIDRweDtcbiAgZm9udC1zaXplOiAwLjc4ZW07XG4gIGxldHRlci1zcGFjaW5nOiAwLjAyZW07XG4gIG9wYWNpdHk6IDAuNzI7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXRePVwiYmlubi1cIl0ge1xuICBtYXJnaW46IDEycHggMDtcbiAgcGFkZGluZzogMTRweCAxNnB4O1xuICBib3JkZXI6IDFweCBzb2xpZCBjb2xvci1taXgoaW4gc3JnYiwgcmdiKHZhcigtLWNhbGxvdXQtY29sb3IpKSAzNCUsIHRyYW5zcGFyZW50KTtcbiAgYm9yZGVyLXJhZGl1czogMTZweDtcbiAgYmFja2dyb3VuZDogY29sb3ItbWl4KFxuICAgIGluIHNyZ2IsXG4gICAgcmdiKHZhcigtLWNhbGxvdXQtY29sb3IpKSAxMCUsXG4gICAgdmFyKC0tYmFja2dyb3VuZC1wcmltYXJ5KVxuICApO1xuICBib3gtc2hhZG93OiAwIDhweCAyNHB4IHJnYigwIDAgMCAvIDAuMDYpO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLmNhbGxvdXRbZGF0YS1jYWxsb3V0Xj1cImJpbm4tXCJdIC5jYWxsb3V0LXRpdGxlIHtcbiAgZ2FwOiA4cHg7XG4gIGZvbnQtc2l6ZTogMC43OHJlbTtcbiAgZm9udC13ZWlnaHQ6IDgwMDtcbiAgbGV0dGVyLXNwYWNpbmc6IDAuMDhlbTtcbiAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5jYWxsb3V0W2RhdGEtY2FsbG91dD1cImJpbm4tcHJvbXB0XCJdIHtcbiAgLS1jYWxsb3V0LWNvbG9yOiA3OCwgMTIxLCAyNTU7XG4gIC0tY2FsbG91dC1pY29uOiBsdWNpZGUtYnJhaW4tY2lyY3VpdDtcbiAgcGFkZGluZzogY2xhbXAoMjJweCwgNHZ3LCA0NHB4KTtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xuICBiYWNrZ3JvdW5kOlxuICAgIGxpbmVhci1ncmFkaWVudCgxNDVkZWcsIHJnYig3OCAxMjEgMjU1IC8gMC4xOCksIHJnYigxMjYgODYgMjI0IC8gMC4xKSksXG4gICAgdmFyKC0tYmFja2dyb3VuZC1wcmltYXJ5KTtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyXG4gIC5jYWxsb3V0W2RhdGEtY2FsbG91dD1cImJpbm4tcHJvbXB0XCJdXG4gID4gLmNhbGxvdXQtdGl0bGUge1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5jYWxsb3V0W2RhdGEtY2FsbG91dD1cImJpbm4tcHJvbXB0XCJdIGgxIHtcbiAgbWFyZ2luOiAwLjJlbSAwO1xuICBmb250LXNpemU6IGNsYW1wKDIuNXJlbSwgOHZ3LCA1cmVtKTtcbiAgbGluZS1oZWlnaHQ6IDE7XG4gIGxldHRlci1zcGFjaW5nOiAwLjAyNWVtO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLmNhbGxvdXRbZGF0YS1jYWxsb3V0PVwiYmlubi1wcm9tcHRcIl0gcDpsYXN0LWNoaWxkIHtcbiAgbWFyZ2luLWJvdHRvbTogMDtcbiAgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpO1xuICBmb250LXNpemU6IDAuOTZyZW07XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXQ9XCJiaW5uLW1lYW5pbmdcIl0ge1xuICAtLWNhbGxvdXQtY29sb3I6IDExNywgODMsIDIxMDtcbiAgLS1jYWxsb3V0LWljb246IGx1Y2lkZS1sYW5ndWFnZXM7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXQ9XCJiaW5uLXNvdW5kXCJdIHtcbiAgLS1jYWxsb3V0LWNvbG9yOiAxNCwgMTUxLCAxNzg7XG4gIC0tY2FsbG91dC1pY29uOiBsdWNpZGUtdm9sdW1lLTI7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXQ9XCJiaW5uLWNvbGxvY2F0aW9uc1wiXSB7XG4gIC0tY2FsbG91dC1jb2xvcjogMjE3LCAxMzksIDI1O1xuICAtLWNhbGxvdXQtaWNvbjogbHVjaWRlLWJsb2Nrcztcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5jYWxsb3V0W2RhdGEtY2FsbG91dD1cImJpbm4tZXhhbXBsZVwiXSB7XG4gIC0tY2FsbG91dC1jb2xvcjogNDIsIDE1NywgOTI7XG4gIC0tY2FsbG91dC1pY29uOiBsdWNpZGUtbWVzc2FnZS1zcXVhcmUtcXVvdGU7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXQ9XCJiaW5uLWNvbnRyYXN0XCJdIHtcbiAgLS1jYWxsb3V0LWNvbG9yOiAyMTQsIDgyLCAxMTY7XG4gIC0tY2FsbG91dC1pY29uOiBsdWNpZGUtZ2l0LWNvbXBhcmUtYXJyb3dzO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLmNhbGxvdXRbZGF0YS1jYWxsb3V0Xj1cImJpbm4tXCJdIC5tYXJrZG93bi1lbWJlZCB7XG4gIG1hcmdpbjogMDtcbiAgcGFkZGluZzogMDtcbiAgYm9yZGVyLWlubGluZS1zdGFydDogMDtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5jYWxsb3V0W2RhdGEtY2FsbG91dF49XCJiaW5uLVwiXSAubWFya2Rvd24tZW1iZWQtbGluayB7XG4gIGRpc3BsYXk6IG5vbmU7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXRePVwiYmlubi1cIl0gaDIge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLnNyLXJlc3BvbnNlID4gaHIge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLnNyLXJlc3BvbnNlIHtcbiAgZ2FwOiAxMHB4O1xuICBwYWRkaW5nOiAxMnB4IGNsYW1wKDE0cHgsIDJ2dywgMjRweCk7XG4gIGJhY2tncm91bmQ6IGNvbG9yLW1peChpbiBzcmdiLCB2YXIoLS1iYWNrZ3JvdW5kLXNlY29uZGFyeSkgODYlLCB0cmFuc3BhcmVudCk7XG4gIGJhY2tkcm9wLWZpbHRlcjogYmx1cigxNHB4KTtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5zci1yZXNwb25zZS1idXR0b24ge1xuICBtaW4taGVpZ2h0OiA1MnB4O1xuICBib3JkZXItcmFkaXVzOiAxM3B4O1xuICBmb250LXdlaWdodDogNzUwO1xuICBib3gtc2hhZG93OiAwIDZweCAxNnB4IHJnYigwIDAgMCAvIDAuMSk7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuc3Itc2hvdy1hbnN3ZXItYnV0dG9uIHtcbiAgYm9yZGVyOiAwO1xuICBjb2xvcjogd2hpdGU7XG4gIGJhY2tncm91bmQ6IGxpbmVhci1ncmFkaWVudCgxMzVkZWcsICM0ZTc5ZmYsICM3NjU2ZDgpO1xufVxuYDtcblxuY29uc3QgTEVBUk5JTkdfVEVNUExBVEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBcIlx1OEJDRFx1NkM0Ny5tZFwiOiBWT0NBQlVMQVJZX1RFTVBMQVRFLFxuICBcIlx1OEJFRFx1NkNENS5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcImdyYW1tYXJcIlxcbnN0YXR1czogbGVhcm5pbmdcXG5jcmVhdGVkOiB7e2RhdGV9fVxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSBncmFtbWFyXFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTRFMDBcdTUzRTVcdThCRERcdTg5QzRcdTUyMTlcXG5cXG4jIyBcdTdFRDNcdTY3ODRcdTUxNkNcdTVGMEZcXG5cXG4jIyBcdTUyMjRcdTY1QURcdTdFQkZcdTdEMjJcXG5cXG4jIyBcdTUzOUZcdTUzRTVcdTYyQzZcdTg5RTNcXG5cXG4jIyBcdTVFMzhcdTg5QzFcdThCRUZcdTUzM0FcXG5cXG4jIyBcdTY1QjBcdThCRURcdTU4ODNcdTlBOENcdThCQzFcXG5cXG4jIyBcdTUxNzNcdTgwNTRcXG4tIFtbQmlubkFnZW50WC8wMi1HcmFtbWFyLzAwLURhc2hib2FyZHxcdThCRURcdTZDRDUgRGFzaGJvYXJkXV1cXG4nLFxuICBcIlx1NTE5OVx1NEY1Q1x1ODg2OFx1OEZCRS5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcIndyaXRpbmdfZXhwcmVzc2lvblwiXFxuY3JlYXRlZDoge3tkYXRlfX1cXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gd3JpdGluZy1leHByZXNzaW9uXFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTg4NjhcdThGQkVcdTUyOUZcdTgwRkRcXG5cXG4jIyBcdTUzRTVcdTVGMEZcdTlBQThcdTY3QjZcXG5cXG4jIyBcdTUzOUZcdTU5Q0JcdTgzMDNcdTRGOEJcXG5cXG4jIyBcdTYyMTFcdTc2ODRcdTY1MzlcdTUxOTlcXG5cXG4jIyBcdTUzRUZcdTY2RkZcdTYzNjJcdThCQ0RcdTY5RkRcXG4nLFxuICBcIlx1OTYwNVx1OEJGQlx1N0I1Nlx1NzU2NS5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcInJlYWRpbmdfc2tpbGxcIlxcbmNyZWF0ZWQ6IHt7ZGF0ZX19XFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHJlYWRpbmctc2tpbGxcXG4tLS1cXG5cXG4jIHt7dGl0bGV9fVxcblxcbiMjIFx1OTAwMlx1NzUyOFx1NTczQVx1NjY2RlxcblxcbiMjIFx1NjRDRFx1NEY1Q1x1NkI2NVx1OUFBNFxcblxcbiMjIFx1OEJDMVx1NjM2RVx1NUI5QVx1NEY0RFxcblxcbiMjIFx1NTkzMVx1OEQyNVx1NEZFMVx1NTNGN1xcblxcbiMjIFx1NjVCMFx1NjU4N1x1N0FFMFx1OUE4Q1x1OEJDMVxcbicsXG59O1xuXG5jb25zdCBMSUJSQVJZX05PVEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBbYCR7TElCUkFSWV9ST09UfS8wMC1EYXNoYm9hcmQubWRgXTogYCMgQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTU3MzBcdTU2RkVcblxuXHU3QjJDXHU0RTAwXHU2QjIxXHU0RjdGXHU3NTI4XHU4QkY3XHU1MTQ4XHU4QkZCIFtbXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XV0gXHU1NDhDIFtbU3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XV1cdTMwMDJcdTRFNEJcdTU0MEVcdTRFQ0UgW1swMC1JbmJveC9cdTY1MzZcdTk2QzZcdTdCQjFcdTRGN0ZcdTc1MjhcdThCRjRcdTY2MEV8XHU2NTM2XHU5NkM2XHU3QkIxXV0gXHU1RjAwXHU1OUNCXHVGRjBDXHU2MjhBXHU3ODhFXHU3MjQ3XHU1QjlBXHU2NzFGXHU2NTc0XHU3NDA2XHU1MjMwXHU0RTBCXHU5NzYyXHU3Njg0XHU5ODg2XHU1N0RGXHU3NkVFXHU1RjU1XHUzMDAyXG5cbiMjIFx1NTE4NVx1NUJCOVx1NTczMFx1NTZGRVx1RkYwOE1PQ1x1RkYwOVxuXG4tIFtbMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dXG4tIFtbMDItR3JhbW1hci8wMC1EYXNoYm9hcmR8XHU4QkVEXHU2Q0Q1IERhc2hib2FyZF1dXG4tIFtbMDMtUmVhZGluZy9cdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTc5M0FcdTRGOEJ8XHU5NjA1XHU4QkZCXV1cbi0gW1swNC1Xcml0aW5nL1x1NTE5OVx1NEY1Q1x1N0VDM1x1NEU2MFx1NzkzQVx1NEY4QnxcdTUxOTlcdTRGNUNdXVxuLSBbWzA1LVRlbXBsYXRlcy9cdThCQ0RcdTZDNDd8XHU3QjE0XHU4QkIwXHU2QTIxXHU2NzdGXV1cbi0gW1swMS1Wb2NhYnVsYXJ5L1NwYWNlZCBSZXBldGl0aW9uIFx1OTVFQVx1NTM2MVx1NzkzQVx1NEY4QnxcdTUzRUZcdTU5MERcdTRFNjBcdTc2ODRcdTk1RUFcdTUzNjFcdTc5M0FcdTRGOEJdXVxuXG4jIyBcdTY3MDBcdThGRDFcdTY2RjRcdTY1QjBcdUZGMDhEYXRhdmlld1x1RkYwOVxuXG5cXGBcXGBcXGBkYXRhdmlld1xuVEFCTEUgV0lUSE9VVCBJRCBmaWxlLmxpbmsgQVMgXCJcdTdCMTRcdThCQjBcIiwgYmlubmFnZW50X2tpbmQgQVMgXCJcdTdDN0JcdTU3OEJcIiwgZmlsZS5tdGltZSBBUyBcIlx1NjZGNFx1NjVCMFx1NjVGNlx1OTVGNFwiXG5GUk9NIFwiQmlubkFnZW50WFwiXG5XSEVSRSBmaWxlLm5hbWUgIT0gXCIwMC1EYXNoYm9hcmRcIiBBTkQgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCIgQU5EICFjb250YWlucyhmaWxlLnBhdGgsIFwiLzA1LVRlbXBsYXRlcy9cIilcblNPUlQgZmlsZS5tdGltZSBERVNDXG5MSU1JVCAxMlxuXFxgXFxgXFxgXG5cbj4gXHU2NzJBXHU1Qjg5XHU4OEM1IERhdGF2aWV3IFx1NjVGNlx1RkYwQ1x1NEUwQVx1OTc2Mlx1NzY4NFx1NjdFNVx1OEJFMlx1NEYxQVx1NjYzRVx1NzkzQVx1NEUzQVx1NEVFM1x1NzgwMVx1NTc1N1x1RkYxQk1PQyBcdTk0RkVcdTYzQTVcdTRFQ0RcdTUzRUZcdTZCNjNcdTVFMzhcdTRGN0ZcdTc1MjhcdTMwMDJcbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9L1x1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1Ny5tZGBdOiBgLS0tXG5iaW5uYWdlbnRfc3luYzogZmFsc2VcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gZ3VpZGVcbi0tLVxuXG4jIEJpbm5BZ2VudFggXHU1QjY2XHU0RTYwXHU1RTkzXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XG5cblx1OEZEOVx1NTk1N1x1NzZFRVx1NUY1NVx1NjI4QVx1MjAxQ1x1NUZFQlx1OTAxRlx1OEJCMFx1NUY1NVx1MjAxRFx1NTQ4Q1x1MjAxQ1x1OTU3Rlx1NjcxRlx1NjU3NFx1NzQwNlx1MjAxRFx1NTIwNlx1NUYwMFx1MzAwMlx1NjcwMFx1N0I4MFx1NTM1NVx1NzY4NFx1NzUyOFx1NkNENVx1NTNFQVx1NjcwOVx1NEUwOVx1NkI2NVx1RkYxQSoqXHU1MTQ4XHU2NTM2XHU5NkM2XHUzMDAxXHU1MThEXHU2NTc0XHU3NDA2XHUzMDAxXHU1RTM4XHU1NkRFXHU5ODdFKipcdTMwMDJcblxuIyMgXHU3NkVFXHU1RjU1XHU4QkY0XHU2NjBFXG5cbnwgXHU2NTg3XHU0RUY2XHU1OTM5IHwgXHU3NTI4XHU5MDE0IHwgXHU0RUMwXHU0RTQ4XHU2NUY2XHU1MDE5XHU2NTNFXHU4RkRCXHU1M0JCIHxcbnwgLS0tIHwgLS0tIHwgLS0tIHxcbnwgXFxgMDAtSW5ib3gvXFxgIHwgXHU2NTM2XHU5NkM2XHU3QkIxIHwgQmlubkFnZW50WCBcdTU0MENcdTZCNjVcdTY3NjVcdTc2ODRcdTY4MDdcdTZDRThcdTMwMDFcdTk2OEZcdTYyNEJcdThCQjBcdTRFMEJcdTc2ODRcdTUzRTVcdTVCNTBcdTMwMDFcdThGRDhcdTRFMERcdTc3RTVcdTkwNTNcdTU5ODJcdTRGNTVcdTUyMDZcdTdDN0JcdTc2ODRcdTc4OEVcdTcyNDcgfFxufCBcXGAwMS1Wb2NhYnVsYXJ5L1xcYCB8IFx1OEJDRFx1NkM0NyB8IFx1NURGMlx1N0VDRlx1ODg2NVx1NTE0NVx1NEU4Nlx1NTQyQlx1NEU0OVx1MzAwMVx1NjQyRFx1OTE0RFx1MzAwMVx1OEJFRFx1NTg4M1x1NjIxNlx1NEY4Qlx1NTNFNVx1NzY4NFx1NTM1NVx1OEJDRFx1NTQ4Q1x1NzdFRFx1OEJFRCB8XG58IFxcYDAyLUdyYW1tYXIvXFxgIHwgXHU4QkVEXHU2Q0Q1IHwgXHU4MEZEXHU4QkY0XHU2RTA1XHU4OUM0XHU1MjE5XHUzMDAxXHU3RUQzXHU2Nzg0XHUzMDAxXHU4QkVGXHU1MzNBXHU1NDhDXHU5QThDXHU4QkMxXHU0RjhCXHU1M0U1XHU3Njg0XHU4QkVEXHU2Q0Q1XHU3MEI5IHxcbnwgXFxgMDMtUmVhZGluZy9cXGAgfCBcdTk2MDVcdThCRkIgfCBcdTY1ODdcdTdBRTBcdTUzOUZcdTY1ODdcdTMwMDFcdTRFNjZcdTdDNERcdTY0NThcdThCQjBcdTMwMDFcdTY0NThcdTg5ODFcdTMwMDFcdThCQzFcdTYzNkVcdTU0OENcdTk2MDVcdThCRkJcdTdCNTZcdTc1NjUgfFxufCBcXGAwNC1Xcml0aW5nL1xcYCB8IFx1NTE5OVx1NEY1QyB8IFx1ODJGMVx1NjU4N1x1NTE5OVx1NEY1Q1x1N0VDM1x1NEU2MFx1MzAwMVYxL1YyIFx1NEZFRVx1NjUzOVx1OEZDN1x1N0EwQlx1NTQ4Q1x1NTNFRlx1OEZDMVx1NzlGQlx1ODg2OFx1OEZCRSB8XG58IFxcYDA1LVRlbXBsYXRlcy9cXGAgfCBcdTZBMjFcdTY3N0YgfCBPYnNpZGlhbiBUZW1wbGF0ZXMgXHU2ODM4XHU1RkMzXHU2M0QyXHU0RUY2XHU0RjdGXHU3NTI4XHU3Njg0XHU3QjE0XHU4QkIwXHU2QTIxXHU2NzdGIHxcbnwgXFxgMDYtQXR0YWNobWVudHMvXFxgIHwgXHU5NjQ0XHU0RUY2IHwgXHU1NkZFXHU3MjQ3XHUzMDAxUERGXHUzMDAxXHU5N0YzXHU5ODkxXHU3QjQ5XHU5NzVFIE1hcmtkb3duIFx1NjU4N1x1NEVGNiB8XG5cbiMjIFx1NjNBOFx1ODM1MFx1NURFNVx1NEY1Q1x1NkQ0MVxuXG4xLiAqKlx1OTY4Rlx1NjVGNlx1NjUzNlx1OTZDNioqXHVGRjFBXHU1MTQ4XHU2MjhBXHU1MTg1XHU1QkI5XHU2NTNFXHU4RkRCIFxcYDAwLUluYm94L1xcYFx1RkYwQ1x1NEUwRFx1ODk4MVx1NTZFMFx1NEUzQVx1NTIwNlx1N0M3Qlx1ODAwQ1x1NjI1M1x1NjVBRFx1NUI2Nlx1NEU2MFx1MzAwMlxuMi4gKipcdTZCQ0ZcdTU0NjhcdTY1NzRcdTc0MDYqKlx1RkYxQVx1NEUzQVx1NjcwOVx1NEVGN1x1NTAzQ1x1NzY4NFx1Nzg4RVx1NzI0N1x1ODg2NVx1NEUwQVx1ODFFQVx1NURGMVx1NzY4NFx1ODlFM1x1OTFDQVx1NTQ4Q1x1NEY4Qlx1NTNFNVx1RkYwQ1x1NTE4RFx1NzlGQlx1NTJBOFx1NTIzMFx1OEJDRFx1NkM0N1x1MzAwMVx1OEJFRFx1NkNENVx1MzAwMVx1OTYwNVx1OEJGQlx1NjIxNlx1NTE5OVx1NEY1Q1x1NzZFRVx1NUY1NVx1MzAwMlxuMy4gKipcdTVFRkFcdTdBQ0JcdThGREVcdTYzQTUqKlx1RkYxQVx1NzUyOCBcXGBbW1x1N0IxNFx1OEJCMFx1NTQwRF1dXFxgIFx1NjI4QVx1NzZGOFx1NTE3M1x1OEJDRFx1NkM0N1x1MzAwMVx1OEJFRFx1NkNENVx1NTQ4Q1x1OTYwNVx1OEJGQlx1N0IxNFx1OEJCMFx1NEU5Mlx1NzZGOFx1OTRGRVx1NjNBNVx1MzAwMlxuNC4gKipcdTU2REVcdTUyMzBcdTU3MzBcdTU2RkUqKlx1RkYxQVx1NEVDRSBbWzAwLURhc2hib2FyZHxcdTYwM0IgRGFzaGJvYXJkXV1cdTMwMDFbWzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRdXSBcdTYyMTYgW1swMi1HcmFtbWFyLzAwLURhc2hib2FyZHxcdThCRURcdTZDRDUgRGFzaGJvYXJkXV0gXHU2RDRGXHU4OUM4XHU1NDhDXHU1OTBEXHU0RTYwXHUzMDAyXG5cbiMjIFx1NkEyMVx1Njc3Rlx1NjAwRVx1NEU0OFx1NzUyOFxuXG5cdTYzRDJcdTRFRjZcdTRGMUFcdTYyOEEgT2JzaWRpYW4gXHU3Njg0XHU2QTIxXHU2NzdGXHU2NTg3XHU0RUY2XHU1OTM5XHU4QkJFXHU0RTNBIFxcYEJpbm5BZ2VudFgvMDUtVGVtcGxhdGVzXFxgXHUzMDAyXHU1NDJGXHU3NTI4IE9ic2lkaWFuIFx1NzY4NCAqKlRlbXBsYXRlc1x1RkYwOFx1NkEyMVx1Njc3Rlx1RkYwOVx1NjgzOFx1NUZDM1x1NjNEMlx1NEVGNioqIFx1NTQwRVx1RkYwQ1x1NjVCMFx1NUVGQVx1N0IxNFx1OEJCMFx1NUU3Nlx1NjI2N1x1ODg0Q1x1MjAxQ1x1NjNEMlx1NTE2NVx1NkEyMVx1Njc3Rlx1MjAxRFx1RkYwQ1x1NTE4RFx1OTAwOVx1NjJFOVx1OEJDRFx1NkM0N1x1MzAwMVx1OEJFRFx1NkNENVx1MzAwMVx1OTYwNVx1OEJGQlx1N0I1Nlx1NzU2NVx1NjIxNlx1NTE5OVx1NEY1Q1x1ODg2OFx1OEZCRVx1NkEyMVx1Njc3Rlx1MzAwMlxuXG4jIyBcdTk1RjRcdTk2OTRcdTkxQ0RcdTU5MERcdTYwMEVcdTRFNDhcdTc1MjhcblxuQmlubkFnZW50WCBMZWFybmluZyBTeW5jIFx1NEY3Rlx1NzUyOFx1NzkzRVx1NTMzQVx1NjNEMlx1NEVGNiAqKlNwYWNlZCBSZXBldGl0aW9uKiogXHU2M0QwXHU0RjlCXHU5NUVBXHU1MzYxXHU1OTBEXHU0RTYwXHUzMDAyXHU3QjJDXHU0RTAwXHU2QjIxXHU0RjdGXHU3NTI4XHU4QkY3XHU2MzA5IFtbU3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XV0gXHU1QjhDXHU2MjEwXHU1Qjg5XHU4OEM1XHVGRjBDXHU1MThEXHU2MjUzXHU1RjAwIFtbMDEtVm9jYWJ1bGFyeS9TcGFjZWQgUmVwZXRpdGlvbiBcdTk1RUFcdTUzNjFcdTc5M0FcdTRGOEJdXSBcdTUwNUFcdTRFMDBcdTZCMjFcdTdFQzNcdTRFNjBcdTMwMDJcblxuIyMgRGFzaGJvYXJkIFx1NTQ4QyBEYXRhdmlld1xuXG5EYXNoYm9hcmQgXHU2NzJDXHU4RUFCXHU2NjJGXHU1MTg1XHU1QkI5XHU1NzMwXHU1NkZFXHVGRjA4TU9DXHVGRjA5XHVGRjBDXHU5MUNDXHU5NzYyXHU3Njg0XHU2NjZFXHU5MDFBXHU5NEZFXHU2M0E1XHU0RTBEXHU0RjlEXHU4RDU2XHU0RUZCXHU0RjU1XHU2M0QyXHU0RUY2XHUzMDAyXHU1Qjg5XHU4OEM1XHU1RTc2XHU1NDJGXHU3NTI4XHU3OTNFXHU1MzNBXHU2M0QyXHU0RUY2ICoqRGF0YXZpZXcqKiBcdTU0MEVcdUZGMENcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTU0OENcdTY3MDBcdThGRDFcdTY2RjRcdTY1QjBcdTUyMTdcdTg4NjhcdTRGMUFcdTgxRUFcdTUyQThcdTc1MUZcdTYyMTBcdUZGMUJcdTY3MkFcdTVCODlcdTg4QzVcdTY1RjZcdTUzRUFcdTRGMUFcdTc3MEJcdTUyMzBcdTY3RTVcdThCRTJcdTRFRTNcdTc4MDFcdTU3NTdcdUZGMENcdTRFMERcdTVGNzFcdTU0Q0RcdTUxNzZcdTRFRDZcdTdCMTRcdThCQjBcdTMwMDJcblxuIyMgXHU5NjQ0XHU0RUY2XG5cblx1NjNEMlx1NEVGNlx1NEYxQVx1NjI4QSBPYnNpZGlhbiBcdTc2ODRcdTlFRDhcdThCQTRcdTk2NDRcdTRFRjZcdTRGNERcdTdGNkVcdThCQkVcdTRFM0EgXFxgQmlubkFnZW50WC8wNi1BdHRhY2htZW50c1xcYFx1MzAwMlx1NEU0Qlx1NTQwRVx1N0M5OFx1OEQzNFx1NTZGRVx1NzI0N1x1NjIxNlx1NTJBMFx1NTE2NSBQREYgXHU2NUY2XHVGRjBDXHU5NjQ0XHU0RUY2XHU0RjFBXHU5NkM2XHU0RTJEXHU1QjU4XHU2NTNFXHVGRjBDXHU2QjYzXHU2NTg3XHU0RUNEXHU1M0VGXHU3NTI4IE9ic2lkaWFuIFx1OTRGRVx1NjNBNVx1NUYxNVx1NzUyOFx1MzAwMlxuXG4jIyBcdTRFMERcdTRGMUFcdTUzRDFcdTc1MUZcdTRFQzBcdTRFNDhcblxuLSBcdTUyMURcdTU5Q0JcdTUzMTZcdTUzRUZcdTRFRTVcdTkxQ0RcdTU5MERcdTYyNjdcdTg4NENcdUZGMENcdTRGNDZcdTRFMERcdTRGMUFcdTg5ODZcdTc2RDZcdTU0MENcdTU0MERcdTY1ODdcdTRFRjZcdTYyMTZcdTRGNjBcdTVERjJcdTdFQ0ZcdTRGRUVcdTY1MzlcdTc2ODRcdTZBMjFcdTY3N0ZcdTMwMDJcbi0gXHU2M0QyXHU0RUY2XHU0RTBEXHU0RjFBXHU4MUVBXHU1MkE4XHU2NkZGXHU0RjYwXHU3OUZCXHU1MkE4XHUzMDAxXHU1MjIwXHU5NjY0XHU2MjE2XHUyMDFDXHU2NTc0XHU3NDA2XHU1QjhDXHU2MjEwXHUyMDFEXHU2NTM2XHU5NkM2XHU3QkIxXHU5MUNDXHU3Njg0XHU1MTg1XHU1QkI5XHUzMDAyXG4tIFx1NjMwN1x1NTM1N1x1MzAwMURhc2hib2FyZCBcdTU0OENcdTUyMURcdTU5Q0JcdTUzMTZcdTc5M0FcdTRGOEJcdTVFMjZcdTY3MDkgXFxgYmlubmFnZW50X3N5bmM6IGZhbHNlXFxgXHVGRjBDXHU0RTBEXHU0RjFBXHU0RjVDXHU0RTNBXHU0RjYwXHU3Njg0XHU0RTJBXHU0RUJBXHU1QjY2XHU0RTYwXHU0RTBBXHU0RTBCXHU2NTg3XHU0RTBBXHU0RjIwXHUzMDAyXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS9TcGFjZWQgUmVwZXRpdGlvbiBcdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTcubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIGd1aWRlXG4gIC0gc3BhY2VkLXJlcGV0aXRpb25cbi0tLVxuXG4jIFNwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N1xuXG5CaW5uQWdlbnRYIExlYXJuaW5nIFN5bmMgXHU4RDFGXHU4RDIzXHU2MjhBXHU1QjY2XHU0RTYwXHU2NzUwXHU2NTk5XHU2NTc0XHU3NDA2XHU1MjMwXHU4RkQ5XHU0RTJBIFZhdWx0XHVGRjFCXHU3OTNFXHU1MzNBXHU2M0QyXHU0RUY2ICoqU3BhY2VkIFJlcGV0aXRpb24qKiBcdThEMUZcdThEMjNcdTUyMjRcdTY1QURcdTU0RUFcdTRFOUJcdTk1RUFcdTUzNjFcdTRFQ0FcdTU5MjlcdTk3MDBcdTg5ODFcdTU5MERcdTRFNjBcdTMwMDJCaW5uQWdlbnRYIFx1NEUwRFx1NEYxQVx1NjZGRlx1NEY2MFx1NUI4OVx1ODhDNVx1NzkzRVx1NTMzQVx1NjNEMlx1NEVGNlx1RkYwQ1x1NEUwQlx1OTc2Mlx1NzY4NFx1OEJCRVx1N0Y2RVx1NTNFQVx1OTcwMFx1NUI4Q1x1NjIxMFx1NEUwMFx1NkIyMVx1MzAwMlxuXG4jIyAxLiBcdTVCODlcdTg4QzVcdTVFNzZcdTU0MkZcdTc1MjhcdTYzRDJcdTRFRjZcblxuMS4gXHU2MjUzXHU1RjAwIE9ic2lkaWFuIFx1NzY4NCAqKlx1OEJCRVx1N0Y2RSBcdTIxOTIgXHU3QjJDXHU0RTA5XHU2NUI5XHU2M0QyXHU0RUY2XHVGRjA4Q29tbXVuaXR5IHBsdWdpbnNcdUZGMDkqKlx1MzAwMlxuMi4gXHU1OTgyXHU2NzlDXHU0RUNEXHU1OTA0XHU0RThFXHU1M0Q3XHU5NjUwXHU2QTIxXHU1RjBGXHVGRjBDXHU2MzA5IE9ic2lkaWFuIFx1NjNEMFx1NzkzQVx1NTE3M1x1OTVFRFx1NTNEN1x1OTY1MFx1NkEyMVx1NUYwRlx1MzAwMlxuMy4gXHU3MEI5XHU1MUZCXHUyMDFDXHU2RDRGXHU4OUM4XHUyMDFEXHVGRjBDXHU2NDFDXHU3RDIyICoqU3BhY2VkIFJlcGV0aXRpb24qKlx1RkYwQ1x1NUI4OVx1ODhDNVx1NUU3Nlx1NTQyRlx1NzUyOFx1NUI4M1x1MzAwMlxuNC4gXHU1MjFEXHU2QjIxXHU0RjdGXHU3NTI4XHU0RTBEXHU5NzAwXHU4OTgxXHU0RkVFXHU2NTM5XHU3Qjk3XHU2Q0Q1XHU2MjE2XHU1MjA2XHU5Njk0XHU3QjI2XHU4QkJFXHU3RjZFXHVGRjBDXHU0RkREXHU3NTU5XHU5RUQ4XHU4QkE0XHU1MDNDXHU1MzczXHU1M0VGXHUzMDAyXG5cbiMjIDIuIFx1NzUyOFx1NjgzN1x1NEY4Qlx1NUI4Q1x1NjIxMFx1N0IyQ1x1NEUwMFx1NkIyMVx1NTkwRFx1NEU2MFxuXG4xLiBcdTYyNTNcdTVGMDAgW1swMS1Wb2NhYnVsYXJ5L1NwYWNlZCBSZXBldGl0aW9uIFx1OTVFQVx1NTM2MVx1NzkzQVx1NEY4Ql1dXHUzMDAyXG4yLiBcdTYyNTNcdTVGMDBcdTU0N0RcdTRFRTRcdTk3NjJcdTY3N0ZcdUZGMUFtYWNPUyBcdTYzMDkgXFxgXHUyMzE4IFBcXGBcdUZGMENXaW5kb3dzIC8gTGludXggXHU2MzA5IFxcYEN0cmwgUFxcYFx1MzAwMlxuMy4gXHU2NDFDXHU3RDIyICoqU3BhY2VkIFJlcGV0aXRpb24qKlx1RkYwQ1x1NjI2N1x1ODg0Q1x1MjAxQyoqXHU1OTBEXHU0RTYwXHU2QjY0XHU3QjE0XHU4QkIwXHU0RTJEXHU3Njg0XHU1MzYxXHU3MjQ3KipcdTIwMURcdUZGMDhcdTgyRjFcdTY1ODdcdTc1NENcdTk3NjJcdTRFM0EgXFxgUmV2aWV3IGZsYXNoY2FyZHMgaW4gdGhpcyBub3RlXFxgXHVGRjA5XHUzMDAyXG40LiBcdTUxNDhcdTU3MjhcdTVGQzNcdTkxQ0NcdTU2REVcdTdCNTRcdUZGMENcdTUxOERcdTY2M0VcdTc5M0FcdTdCNTRcdTY4NDhcdUZGMENcdTVFNzZcdTYzMDlcdTc3MUZcdTVCOUVcdTU2REVcdTVGQzZcdTYwQzVcdTUxQjVcdTkwMDlcdTYyRTlcdThCQzRcdTUyMDZcdTMwMDJcdTYzRDJcdTRFRjZcdTRGMUFcdTYzNkVcdTZCNjRcdTVCODlcdTYzOTJcdTRFMEJcdTZCMjFcdTU5MERcdTRFNjBcdTMwMDJcblxuXHU1OTgyXHU2NzlDXHU1M0VBXHU2MEYzXHU3QUNCXHU1MjNCXHU5MUNEXHU1MDVBXHU1MTY4XHU5MEU4XHU2ODM3XHU0RjhCXHUzMDAxXHU0RTBEXHU4MDAzXHU4NjUxXHU1OTBEXHU0RTYwXHU2NUU1XHU2NzFGXHVGRjBDXHU4QkY3XHU2MjY3XHU4ODRDXHUyMDFDKipcdTk2QzZcdTRFMkRcdTU5MERcdTRFNjBcdTZCNjRcdTdCMTRcdThCQjBcdTRFMkRcdTc2ODRcdTUzNjFcdTcyNDcqKlx1MjAxRFx1RkYwOFx1ODJGMVx1NjU4N1x1NzU0Q1x1OTc2Mlx1NEUzQSBcXGBDcmFtIGZsYXNoY2FyZHMgaW4gdGhpcyBub3RlXFxgXHVGRjA5XHUzMDAyXG5cbiMjIDMuIFx1NTIxQlx1NUVGQVx1ODFFQVx1NURGMVx1NzY4NFx1OTVFQVx1NTM2MVxuXG5cdTUxNDhcdTU3MjhcdTUzMDVcdTU0MkJcdTUzNjFcdTcyNDdcdTc2ODRcdTdCMTRcdThCQjBcdTRFMkRcdTUyQTBcdTUxNjVcdTUzNjFcdTdFQzRcdTY4MDdcdTdCN0VcdTMwMDJcdTlFRDhcdThCQTRcdTUzNjFcdTdFQzRcdTY4MDdcdTdCN0VcdTY2MkZcdUZGMUFcblxuXFxgXFxgXFxgbWFya2Rvd25cbiNmbGFzaGNhcmRzXG5cXGBcXGBcXGBcblxuXHU0RTVGXHU1M0VGXHU0RUU1XHU3NTI4XHU1QzQyXHU3RUE3XHU2ODA3XHU3QjdFXHU1MjA2XHU3RUM0XHVGRjBDXHU0RjhCXHU1OTgyXHVGRjFBXG5cblxcYFxcYFxcYG1hcmtkb3duXG4jZmxhc2hjYXJkcy9iaW5uYWdlbnR4L3ZvY2FidWxhcnlcblxcYFxcYFxcYFxuXG5cdTcxMzZcdTU0MEVcdTkwMDlcdTYyRTlcdTRFMDBcdTc5Q0RcdTUzNjFcdTcyNDdcdTY4M0NcdTVGMEZcdUZGMUFcblxuXFxgXFxgXFxgbWFya2Rvd25cbnJlc2lsaWVudCBcdTY2MkZcdTRFQzBcdTRFNDhcdTYxMEZcdTYwMURcdUZGMUY6Olx1NjcwOVx1OTdFN1x1NjAyN1x1NzY4NFx1RkYxQlx1ODBGRFx1NEVDRVx1NTZGMFx1OTZCRVx1NEUyRFx1OEZDNVx1OTAxRlx1NjA2Mlx1NTkwRFx1NzY4NFx1MzAwMlxuXG5cdTY3MDlcdTk3RTdcdTYwMjdcdTc2ODRcdUZGMUJcdTgwRkRcdThGQzVcdTkwMUZcdTYwNjJcdTU5MERcdTc2ODQ6OjpyZXNpbGllbnRcblxuYWx0aG91Z2ggXHU1NDhDIGRlc3BpdGUgXHU1NDBFXHU5NzYyXHU1MjA2XHU1MjJCXHU2M0E1XHU0RUMwXHU0RTQ4XHVGRjFGXG4/XG5hbHRob3VnaCBcdTU0MEVcdTYzQTVcdTVCOENcdTY1NzRcdTRFQ0VcdTUzRTVcdUZGMUJkZXNwaXRlIFx1NTQwRVx1NjNBNVx1NTQwRFx1OEJDRFx1MzAwMVx1NEVFM1x1OEJDRFx1NjIxNlx1NTJBOFx1NTQwRFx1OEJDRFx1MzAwMlxuXFxgXFxgXFxgXG5cbi0gXFxgOjpcXGAgXHU1MjFCXHU1RUZBXHU1MzU1XHU1NDExXHU1MzYxXHVGRjFBXHU1REU2XHU4RkI5XHU2NjJGXHU5NUVFXHU5ODk4XHVGRjBDXHU1M0YzXHU4RkI5XHU2NjJGXHU3QjU0XHU2ODQ4XHUzMDAyXG4tIFxcYDo6OlxcYCBcdTUyMUJcdTVFRkFcdTUzQ0NcdTU0MTFcdTUzNjFcdUZGMUFcdTRFMjRcdTRFMkFcdTY1QjlcdTU0MTFcdTkwRkRcdTRGMUFcdTg4QUJcdTYzRDBcdTk1RUVcdTMwMDJcbi0gXHU1MzU1XHU3MkVDXHU0RTAwXHU4ODRDXHU3Njg0IFxcYD9cXGAgXHU5MDAyXHU1NDA4XHU4RjgzXHU5NTdGXHU3Njg0XHU1OTFBXHU4ODRDXHU3QjU0XHU2ODQ4XHUzMDAyXG5cbiMjIDQuIFx1NkJDRlx1NTkyOVx1NjAwRVx1NEU0OFx1NTkwRFx1NEU2MFxuXG5cdTYyNTNcdTVGMDBcdTU0N0RcdTRFRTRcdTk3NjJcdTY3N0ZcdUZGMENcdTY0MUNcdTdEMjIgKipTcGFjZWQgUmVwZXRpdGlvbioqIFx1NUU3Nlx1NjI2N1x1ODg0Q1x1MjAxQyoqXHU1OTBEXHU0RTYwXHU2MjQwXHU2NzA5XHU3QjE0XHU4QkIwXHU0RTJEXHU3Njg0XHU1MzYxXHU3MjQ3KipcdTIwMURcdUZGMENcdTkwMDlcdTYyRTlcdTUzNjFcdTdFQzRcdTU0MEVcdTVGMDBcdTU5Q0JcdTU5MERcdTRFNjBcdTMwMDJcdTVFRkFcdThCQUVcdTUxNDhcdTU2REVcdTVGQzZcdTUxOERcdTc3MEJcdTdCNTRcdTY4NDhcdUZGMUJcdThCQzRcdTUyMDZcdTUzQ0RcdTY2MjBcdTIwMUNcdThGRDlcdTZCMjFcdTYwRjNcdThENzdcdTY3NjVcdTY3MDlcdTU5MUFcdTk2QkVcdTIwMURcdUZGMENcdTRFMERcdTVGQzVcdThGRkRcdTZDNDJcdTUxNjhcdTkwRThcdTkwMDkgRWFzeVx1MzAwMlxuXG5cdTU5MERcdTRFNjBcdTU0MEVcdUZGMENTcGFjZWQgUmVwZXRpdGlvbiBcdTRGMUFcdTU3MjhcdTUzNjFcdTcyNDdcdTk2NDRcdThGRDFcdTUxOTlcdTUxNjVcdTdDN0JcdTRGM0MgXFxgPCEtLVNSOi4uLi0tPlxcYCBcdTc2ODRcdThDMDNcdTVFQTZcdTZDRThcdTkxQ0FcdTMwMDJcdThGRDlcdTY2MkZcdTU5MERcdTRFNjBcdThCQjBcdTVGNTVcdUZGMENcdTRFMERcdTY2MkZcdTk1MTlcdThCRUZcdUZGMUJcdTRFMERcdTg5ODFcdTYyNEJcdTUyQThcdTRGRUVcdTY1MzlcdTYyMTZcdTUyMjBcdTk2NjRcdTMwMDJcblxuIyMgXHU1RTM4XHU4OUMxXHU5NUVFXHU5ODk4XG5cbi0gKipcdTYyN0VcdTRFMERcdTUyMzBcdTUzNjFcdTdFQzQqKlx1RkYxQVx1Nzg2RVx1OEJBNCBTcGFjZWQgUmVwZXRpdGlvbiBcdTVERjJcdTU0MkZcdTc1MjhcdUZGMENcdTVFNzZcdTRFMTRcdTdCMTRcdThCQjBcdTZCNjNcdTY1ODdcdTU0MkJcdTY3MDkgXFxgI2ZsYXNoY2FyZHNcXGAgXHU2MjE2XHU1MTc2XHU1QzQyXHU3RUE3XHU2ODA3XHU3QjdFXHUzMDAyXG4tICoqXHU1MzYxXHU3MjQ3XHU2Q0ExXHU2NzA5XHU4OEFCXHU4QkM2XHU1MjJCKipcdUZGMUFcdTUxNDhcdTRGN0ZcdTc1MjhcdTlFRDhcdThCQTRcdTUyMDZcdTk2OTRcdTdCMjZcdUZGMENcdTVFNzZcdTc4NkVcdThCQTQgXFxgOjpcXGBcdTMwMDFcXGA6OjpcXGAgXHU2MjE2IFxcYD9cXGAgXHU0RTBEXHU1NzI4XHU0RUUzXHU3ODAxXHU1NzU3XHU0RTJEXHUzMDAyXG4tICoqXHU0RUNBXHU1OTI5XHU2Q0ExXHU2NzA5XHU1MjMwXHU2NzFGXHU1MzYxXHU3MjQ3KipcdUZGMUFcdTYyNjdcdTg4NENcdTIwMUNcdTk2QzZcdTRFMkRcdTU5MERcdTRFNjBcdTZCNjRcdTdCMTRcdThCQjBcdTRFMkRcdTc2ODRcdTUzNjFcdTcyNDdcdTIwMURcdTUzRUZcdTk2OEZcdTY1RjZcdTdFQzNcdTRFNjBcdUZGMENcdTRFMERcdTRGMUFcdTUzRDdcdTUyMzBcdTY3MUZcdTY1RTVcdTk2NTBcdTUyMzZcdTMwMDJcbi0gKipcdTYwRjNcdTU5MERcdTRFNjBcdTY1NzRcdTdCQzdcdTdCMTRcdThCQjAqKlx1RkYxQVx1OEZEOVx1NjYyRlx1NTNFNlx1NEUwMFx1NzlDRFx1NURFNVx1NEY1Q1x1NkQ0MVx1RkYwQ1x1NTNFRlx1N0VEOVx1N0IxNFx1OEJCMFx1NTJBMCBcXGAjcmV2aWV3XFxgXHVGRjFCXHU1MTY1XHU5NUU4XHU5NjM2XHU2QkI1XHU1M0VBXHU0RjdGXHU3NTI4XHU5NUVBXHU1MzYxXHU1MzczXHU1M0VGXHUzMDAyXG5gLFxuICBbYCR7SU5CT1hfRk9MREVSfS9cdTY1MzZcdTk2QzZcdTdCQjFcdTRGN0ZcdTc1MjhcdThCRjRcdTY2MEUubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG5pbmJveF9zdGF0dXM6IHJlZmVyZW5jZVxudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSBpbmJveFxuLS0tXG5cbiMgXHU2NTM2XHU5NkM2XHU3QkIxXHU0RjdGXHU3NTI4XHU4QkY0XHU2NjBFXG5cblx1NjgwN1x1NkNFOFx1MzAwMVx1NzA3NVx1NjExRlx1MzAwMVx1NEUwRFx1NEYxQVx1NUY1Mlx1N0M3Qlx1NzY4NFx1ODg2OFx1OEZCRVx1NTE0OFx1NjUzRVx1NTcyOFx1OEZEOVx1OTFDQ1x1RkYwQ1x1NEUwRFx1OTcwMFx1ODk4MVx1NEUwMFx1NUYwMFx1NTlDQlx1NUMzMVx1NTE5OVx1NUY5N1x1NUI4Q1x1NjU3NFx1MzAwMlxuXG4jIyBcdTZCQ0ZcdTU0NjhcdTY1NzRcdTc0MDZcblxuMS4gXHU4MEZEXHU1OTBEXHU3NTI4XHU3Njg0XHU1MzU1XHU4QkNEXHU2MjE2XHU3N0VEXHU4QkVEXHVGRjBDXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3XV1cdTMwMDJcbjIuIFx1NTNFNVx1NUI1MFx1ODBDQ1x1NTQwRVx1NzY4NFx1ODlDNFx1NTIxOVx1RkYwQ1x1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkfFx1OEJFRFx1NkNENV1dXHUzMDAyXG4zLiBcdTUzOUZcdTY1ODdcdTRFMEVcdTk2MDVcdThCRkJcdThCQjBcdTVGNTVcdUZGMENcdTY1NzRcdTc0MDZcdTUyMzAgW1suLi8wMy1SZWFkaW5nL1x1OTYwNVx1OEJGQlx1N0IxNFx1OEJCMFx1NzkzQVx1NEY4QnxcdTk2MDVcdThCRkJdXVx1MzAwMlxuNC4gXHU4MUVBXHU1REYxXHU1MTk5XHU3Njg0XHU2QkI1XHU4NDNEXHVGRjBDXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDQtV3JpdGluZy9cdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTc5M0FcdTRGOEJ8XHU1MTk5XHU0RjVDXV1cdTMwMDJcbjUuIFx1NURGMlx1NTkwNFx1NzQwNlx1NzY4NFx1Nzg4RVx1NzI0N1x1NTNFRlx1NUY1Mlx1Njg2M1x1MzAwMVx1NzlGQlx1NTJBOFx1NjIxNlx1NTIyMFx1OTY2NFx1RkYxQlx1NjNEMlx1NEVGNlx1NEUwRFx1NEYxQVx1NjZGRlx1NEY2MFx1ODk4Nlx1NzZENlx1OEZEOVx1NEU5Qlx1NTE4NVx1NUJCOVx1MzAwMlxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmQubWRgXTogYCMgXHU4QkNEXHU2QzQ3IERhc2hib2FyZFxuXG5cdThGRDlcdTY2MkZcdThCQ0RcdTZDNDdcdTVFOTNcdTc2ODRcdTUxODVcdTVCQjlcdTU3MzBcdTU2RkVcdTMwMDJcdTY1QjBcdTVFRkFcdTdCMTRcdThCQjBcdTY1RjZcdTRGN0ZcdTc1MjggW1suLi8wNS1UZW1wbGF0ZXMvXHU4QkNEXHU2QzQ3fFx1OEJDRFx1NkM0N1x1NkEyMVx1Njc3Rl1dXHUzMDAyXG5cbiMjIFx1NTE2OFx1OTBFOFx1OEJDRFx1NkM0N1x1RkYwOERhdGF2aWV3XHVGRjA5XG5cblxcYFxcYFxcYGRhdGF2aWV3XG5UQUJMRSBXSVRIT1VUIElEIGZpbGUubGluayBBUyBcIlx1OEJDRFx1NkM0N1wiLCBtZWFuaW5nIEFTIFwiXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XCIsIHN0YXR1cyBBUyBcIlx1NzJCNlx1NjAwMVwiLCBmaWxlLm10aW1lIEFTIFwiXHU2NkY0XHU2NUIwXCJcbkZST00gXCJCaW5uQWdlbnRYLzAxLVZvY2FidWxhcnlcIlxuV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiXG5TT1JUIGZpbGUubXRpbWUgREVTQ1xuXFxgXFxgXFxgXG5cbiMjIFx1NUVGQVx1OEJBRVx1NzY4NCBNT0NcblxuLSBcdTYzMDlcdTRFM0JcdTk4OThcdUZGMUFcdTVCNjZcdTRFNjBcdTMwMDFcdTVERTVcdTRGNUNcdTMwMDFcdTY1QzVcdTg4NENcdTMwMDFcdTYwQzVcdTdFRUFcbi0gXHU2MzA5XHU1MTczXHU3Q0ZCXHVGRjFBXHU1NDBDXHU0RTQ5XHU4QkNEXHUzMDAxXHU1M0NEXHU0RTQ5XHU4QkNEXHUzMDAxXHU2NjEzXHU2REY3XHU4QkNEXHUzMDAxXHU1NkZBXHU1QjlBXHU2NDJEXHU5MTREXG4tIFx1NzkzQVx1NEY4Qlx1RkYxQVtbcmVzaWxpZW50XV1cbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvcmVzaWxpZW50Lm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxubWVhbmluZzogXCJcdTY3MDlcdTk3RTdcdTYwMjdcdTc2ODRcdUZGMUJcdTgwRkRcdThGQzVcdTkwMUZcdTYwNjJcdTU5MERcdTc2ODRcIlxuc3RhdHVzOiBsZWFybmluZ1xudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSB2b2NhYnVsYXJ5XG4gIC0gY2hhcmFjdGVyXG4tLS1cblxuIyByZXNpbGllbnRcblxuIyMgXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XG5cbkFibGUgdG8gcmVjb3ZlciBxdWlja2x5IGFmdGVyIGRpZmZpY3VsdHkgb3IgY2hhbmdlLlxuXG4jIyBcdTUzRDFcdTk3RjNcblxuL3JcdTAyNkFcdTAyQzh6XHUwMjZBbGlcdTAyNTludC9cblxuIyMgXHU1RTM4XHU3NTI4XHU2NDJEXHU5MTREXG5cbi0gcmVzaWxpZW50IHBlb3BsZVxuLSBhIHJlc2lsaWVudCBlY29ub215XG4tIHJlbWFpbiByZXNpbGllbnRcblxuIyMgXHU1MzlGXHU1M0U1XHU0RTBFXHU4QkVEXHU1ODgzXG5cblRoZSB0ZWFtIHJlbWFpbmVkIHJlc2lsaWVudCBhZnRlciBhbiBlYXJseSBzZXRiYWNrLlxuXG4jIyBcdTYyMTFcdTc2ODRcdTRGOEJcdTUzRTVcblxuSSB3YW50IHRvIGJlY29tZSBtb3JlIHJlc2lsaWVudCB3aGVuIGEgcGxhbiBjaGFuZ2VzIHVuZXhwZWN0ZWRseS5cblxuIyMgXHU2NjEzXHU2REY3XHU2REM2XHU3MEI5XG5cbioqcmVzaWxpZW50KiogXHU1RjNBXHU4QzAzXHU1M0Q3XHU2MzJCXHU1NDBFXHU3Njg0XHU2MDYyXHU1OTBEXHU4MEZEXHU1MjlCXHVGRjFCKipwZXJzaXN0ZW50KiogXHU1RjNBXHU4QzAzXHU2MzAxXHU3RUVEXHU1NzVBXHU2MzAxXHUzMDAyXG5cbiMjIFx1NTE3M1x1ODA1NFxuXG4tIFtbMDAtRGFzaGJvYXJkXV1cbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvU3BhY2VkIFJlcGV0aXRpb24gXHU5NUVBXHU1MzYxXHU3OTNBXHU0RjhCLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxuc3RhdHVzOiBleGFtcGxlXG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIHZvY2FidWxhcnlcbiAgLSBzcGFjZWQtcmVwZXRpdGlvblxuLS0tXG5cbiMgU3BhY2VkIFJlcGV0aXRpb24gXHU5NUVBXHU1MzYxXHU3OTNBXHU0RjhCXG5cblx1OEZEOVx1NjYyRlx1NEUwMFx1N0VDNFx1NTNFRlx1NEVFNVx1N0FDQlx1NTM3M1x1NTkwRFx1NEU2MFx1NzY4NFx1NTE2NVx1OTVFOFx1NTM2MVx1NzI0N1x1MzAwMlx1OEJGN1x1NEZERFx1NzU1OVx1NEUwQlx1NEUwMFx1ODg0Q1x1NTM2MVx1N0VDNFx1NjgwN1x1N0I3RVx1RkYwQ1x1NzEzNlx1NTQwRVx1NjI1M1x1NUYwMFx1NTQ3RFx1NEVFNFx1OTc2Mlx1Njc3Rlx1RkYwQ1x1NjQxQ1x1N0QyMiAqKlNwYWNlZCBSZXBldGl0aW9uKiogXHU1RTc2XHU2MjY3XHU4ODRDXHUyMDFDKipcdTU5MERcdTRFNjBcdTZCNjRcdTdCMTRcdThCQjBcdTRFMkRcdTc2ODRcdTUzNjFcdTcyNDcqKlx1MjAxRFx1MzAwMlxuXG4jZmxhc2hjYXJkcy9iaW5uYWdlbnR4L3ZvY2FidWxhcnlcblxuIyMgXHU1MzU1XHU1NDExXHU1MzYxXG5cbnJlc2lsaWVudCBcdTc2ODRcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDlcdTY2MkZcdTRFQzBcdTRFNDhcdUZGMUY6Olx1NjcwOVx1OTdFN1x1NjAyN1x1NzY4NFx1RkYxQlx1ODBGRFx1NTcyOFx1NTZGMFx1OTZCRVx1NjIxNlx1NTNEOFx1NTMxNlx1NTQwRVx1OEZDNVx1OTAxRlx1NjA2Mlx1NTkwRFx1NzY4NFx1MzAwMlxuXG4jIyBcdTUzQ0NcdTU0MTFcdTUzNjFcblxuXHU2NzA5XHU5N0U3XHU2MDI3XHU3Njg0XHVGRjFCXHU4MEZEXHU4RkM1XHU5MDFGXHU2MDYyXHU1OTBEXHU3Njg0Ojo6cmVzaWxpZW50XG5cbiMjIFx1NTkxQVx1ODg0Q1x1NTM2MVxuXG5yZXNpbGllbnQgXHU1NDhDIHBlcnNpc3RlbnQgXHU3Njg0XHU0RkE3XHU5MUNEXHU3MEI5XHU2NzA5XHU0RUMwXHU0RTQ4XHU0RTBEXHU1NDBDXHVGRjFGXG4/XG4qKnJlc2lsaWVudCoqIFx1NUYzQVx1OEMwM1x1NTNEN1x1NjMyQlx1NTQwRVx1NzY4NFx1NjA2Mlx1NTkwRFx1ODBGRFx1NTI5Qlx1RkYxQioqcGVyc2lzdGVudCoqIFx1NUYzQVx1OEMwM1x1NEUwRFx1NjUzRVx1NUYwM1x1MzAwMVx1NjMwMVx1N0VFRFx1NTc1QVx1NjMwMVx1MzAwMlxuXG4tLS1cblxuXHU1OTBEXHU0RTYwXHU1QjhDXHU2MjEwXHU1NDBFXHVGRjBDU3BhY2VkIFJlcGV0aXRpb24gXHU0RjFBXHU4MUVBXHU1MkE4XHU1NzI4XHU1MzYxXHU3MjQ3XHU5NjQ0XHU4RkQxXHU1MkEwXHU1MTY1XHU4QzAzXHU1RUE2XHU2Q0U4XHU5MUNBXHUzMDAyXHU2M0E1XHU0RTBCXHU2NzY1XHU1M0VGXHU0RUU1XHU1M0MyXHU4MDAzIFtbLi4vU3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3fFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N11dXHVGRjBDXHU2MjhBXHU4MUVBXHU1REYxXHU3Njg0XHU1QjY2XHU0RTYwXHU1MTg1XHU1QkI5XHU2NTM5XHU1MTk5XHU2MjEwXHU1MzYxXHU3MjQ3XHUzMDAyXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMi1HcmFtbWFyLzAwLURhc2hib2FyZC5tZGBdOiBgIyBcdThCRURcdTZDRDUgRGFzaGJvYXJkXG5cblx1OEZEOVx1NjYyRlx1OEJFRFx1NkNENVx1NUU5M1x1NzY4NFx1NTE4NVx1NUJCOVx1NTczMFx1NTZGRVx1MzAwMlx1NjVCMFx1NUVGQVx1N0IxNFx1OEJCMFx1NjVGNlx1NEY3Rlx1NzUyOCBbWy4uLzA1LVRlbXBsYXRlcy9cdThCRURcdTZDRDV8XHU4QkVEXHU2Q0Q1XHU2QTIxXHU2NzdGXV1cdTMwMDJcblxuIyMgXHU1MTY4XHU5MEU4XHU4QkVEXHU2Q0Q1XHU3MEI5XHVGRjA4RGF0YXZpZXdcdUZGMDlcblxuXFxgXFxgXFxgZGF0YXZpZXdcblRBQkxFIFdJVEhPVVQgSUQgZmlsZS5saW5rIEFTIFwiXHU4QkVEXHU2Q0Q1XHU3MEI5XCIsIHN0YXR1cyBBUyBcIlx1NzJCNlx1NjAwMVwiLCBmaWxlLm10aW1lIEFTIFwiXHU2NkY0XHU2NUIwXCJcbkZST00gXCJCaW5uQWdlbnRYLzAyLUdyYW1tYXJcIlxuV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiXG5TT1JUIGZpbGUubXRpbWUgREVTQ1xuXFxgXFxgXFxgXG5cbiMjIFx1NUVGQVx1OEJBRVx1NzY4NCBNT0NcblxuLSBcdTY1RjZcdTYwMDFcdTRFMEVcdThCRURcdTYwMDFcbi0gXHU0RUNFXHU1M0U1XG4tIFx1OTc1RVx1OEMxM1x1OEJFRFx1NTJBOFx1OEJDRFxuLSBcdThGREVcdTYzQTVcdTRFMEVcdTg4NTRcdTYzQTVcbi0gXHU3OTNBXHU0RjhCXHVGRjFBW1thbHRob3VnaCBcdTRFMEUgZGVzcGl0ZV1dXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMi1HcmFtbWFyL2FsdGhvdWdoIFx1NEUwRSBkZXNwaXRlLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcImdyYW1tYXJcIlxuc3RhdHVzOiBsZWFybmluZ1xudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSBncmFtbWFyXG4gIC0gY29uY2Vzc2lvblxuLS0tXG5cbiMgYWx0aG91Z2ggXHU0RTBFIGRlc3BpdGVcblxuIyMgXHU0RTAwXHU1M0U1XHU4QkREXHU4OUM0XHU1MjE5XG5cbioqYWx0aG91Z2gqKiBcdTU0MEVcdTYzQTVcdTVCOENcdTY1NzRcdTRFQ0VcdTUzRTVcdUZGMUIqKmRlc3BpdGUqKiBcdTU0MEVcdTYzQTVcdTU0MERcdThCQ0RcdTMwMDFcdTRFRTNcdThCQ0RcdTYyMTZcdTUyQThcdTU0MERcdThCQ0RcdTMwMDJcblxuIyMgXHU3RUQzXHU2Nzg0XHU1MTZDXHU1RjBGXG5cbi0gQWx0aG91Z2ggKyBcdTRFM0JcdThCRUQgKyBcdThDMTNcdThCRUQsIFx1NEUzQlx1NTNFNVx1MzAwMlxuLSBEZXNwaXRlICsgXHU1NDBEXHU4QkNEIC8gZG9pbmcsIFx1NEUzQlx1NTNFNVx1MzAwMlxuXG4jIyBcdTUzOUZcdTUzRTVcdTYyQzZcdTg5RTNcblxuQWx0aG91Z2ggaXQgd2FzIHJhaW5pbmcsIHdlIGtlcHQgd2Fsa2luZy5cblxuRGVzcGl0ZSB0aGUgcmFpbiwgd2Uga2VwdCB3YWxraW5nLlxuXG4jIyBcdTVFMzhcdTg5QzFcdThCRUZcdTUzM0FcblxuXHU0RTBEXHU4OTgxXHU1MTk5XHU2MjEwIFx1MjAxQ2Rlc3BpdGUgaXQgd2FzIHJhaW5pbmdcdTIwMURcdTMwMDJcdTUzRUZcdTY1MzlcdTRFM0EgXHUyMDFDZGVzcGl0ZSB0aGUgcmFpblx1MjAxRCBcdTYyMTYgXHUyMDFDZGVzcGl0ZSB0aGUgZmFjdCB0aGF0IGl0IHdhcyByYWluaW5nXHUyMDFEXHUzMDAyXG5cbiMjIFx1NjVCMFx1OEJFRFx1NTg4M1x1OUE4Q1x1OEJDMVxuXG5BbHRob3VnaCB0aGUgdGFzayB3YXMgZGlmZmljdWx0LCBzaGUgZmluaXNoZWQgaXQgb24gdGltZS5cblxuIyMgXHU1MTczXHU4MDU0XG5cbi0gW1swMC1EYXNoYm9hcmRdXVxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDMtUmVhZGluZy9cdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTc5M0FcdTRGOEIubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxuYmlubmFnZW50X2tpbmQ6IFwicmVhZGluZ19za2lsbFwiXG5zdGF0dXM6IGV4YW1wbGVcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gcmVhZGluZ1xuLS0tXG5cbiMgXHU5NjA1XHU4QkZCXHU3QjE0XHU4QkIwXHU3OTNBXHU0RjhCXG5cbiMjIFx1Njc2NVx1NkU5MFxuXG5cdTU3MjhcdThGRDlcdTkxQ0NcdThCQjBcdTVGNTVcdTY1ODdcdTdBRTBcdTY4MDdcdTk4OThcdTMwMDFcdTRGNUNcdTgwMDVcdTU0OENcdTk0RkVcdTYzQTVcdTMwMDJcblxuIyMgXHU0RTAwXHU1M0U1XHU4QkREXHU2NDU4XHU4OTgxXG5cblx1NTE0OFx1NzUyOFx1ODFFQVx1NURGMVx1NzY4NFx1OEJERFx1NTE5OVx1NEUwMFx1NTNFNVx1RkYwQ1x1NTE4RFx1ODg2NVx1N0VDNlx1ODI4Mlx1MzAwMlxuXG4jIyBcdTUxNzNcdTk1MkVcdTZCQjVcdTg0M0RcdTRFMEVcdThCQzFcdTYzNkVcblxuXHU2NDU4XHU1RjU1XHU1QzExXHU5MUNGXHU1MTczXHU5NTJFXHU1M0U1XHVGRjBDXHU1RTc2XHU4QkY0XHU2NjBFXHU1QjgzXHU0RTNBXHU0RUMwXHU0RTQ4XHU5MUNEXHU4OTgxXHUzMDAyXG5cbiMjIFx1NjVCMFx1OEJDRFx1NEUwRVx1OEJFRFx1NkNENVxuXG4tIFx1OEJDRFx1NkM0N1x1NTNFRlx1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRdXVx1MzAwMlxuLSBcdThCRURcdTZDRDVcdTUzRUZcdTY1NzRcdTc0MDZcdTUyMzAgW1suLi8wMi1HcmFtbWFyLzAwLURhc2hib2FyZHxcdThCRURcdTZDRDUgRGFzaGJvYXJkXV1cdTMwMDJcblxuIyMgXHU2MjExXHU3Njg0XHU4OUMyXHU3MEI5XG5cblx1NTE5OVx1NEUwQlx1OEQ1RVx1NTQwQ1x1MzAwMVx1OEQyOFx1NzU5MVx1NjIxNlx1NTNFRlx1NEVFNVx1OEZDMVx1NzlGQlx1NTIzMFx1NTE3Nlx1NEVENlx1NjU4N1x1N0FFMFx1NzY4NFx1NjBGM1x1NkNENVx1MzAwMlxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDQtV3JpdGluZy9cdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTc5M0FcdTRGOEIubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxuYmlubmFnZW50X2tpbmQ6IFwid3JpdGluZ19za2lsbFwiXG5zdGF0dXM6IGRyYWZ0XG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIHdyaXRpbmdcbi0tLVxuXG4jIFx1NTE5OVx1NEY1Q1x1N0VDM1x1NEU2MFx1NzkzQVx1NEY4QlxuXG4jIyBcdTk4OThcdTc2RUVcblxuRGVzY3JpYmUgYSBoYWJpdCB0aGF0IGhhcyBpbXByb3ZlZCB5b3VyIGxlYXJuaW5nLlxuXG4jIyBWMSBcdTgzNDlcdTdBM0ZcblxuXHU1MTQ4XHU1MTk5XHU1QjhDXHVGRjBDXHU0RTBEXHU1NzI4XHU3QjJDXHU0RTAwXHU5MDREXHU4RkZEXHU2QzQyXHU1QjhDXHU3RjhFXHUzMDAyXG5cbiMjIFx1NEZFRVx1NjUzOVx1OEJCMFx1NUY1NVxuXG4tIFx1NTE4NVx1NUJCOVx1RkYxQVx1ODlDMlx1NzBCOVx1NjYyRlx1NTQyNlx1NkUwNVx1Njk1QVx1RkYxRlxuLSBcdTdFRDNcdTY3ODRcdUZGMUFcdTZCQjVcdTg0M0RcdTY2MkZcdTU0MjZcdTY3MDlcdTRFM0JcdTk4OThcdTUzRTVcdTU0OENcdThCQzFcdTYzNkVcdUZGMUZcbi0gXHU4QkVEXHU4QTAwXHVGRjFBXHU2NjJGXHU1NDI2XHU4MEZEXHU3NTI4XHU2NkY0XHU1MUM2XHU3ODZFXHU3Njg0XHU4QkNEXHU2QzQ3XHU2MjE2XHU1M0U1XHU1RjBGXHVGRjFGXG5cbiMjIFYyIFx1NUI5QVx1N0EzRlxuXG5cdTY4MzlcdTYzNkVcdTRGRUVcdTY1MzlcdThCQjBcdTVGNTVcdTkxQ0RcdTUxOTlcdUZGMENcdTVFNzZcdTRGRERcdTc1NTkgVjEgXHU2NUI5XHU0RkJGXHU2QkQ0XHU4RjgzXHUzMDAyXG5gLFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmlubkFnZW50WExlYXJuaW5nU3luY1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBTeW5jU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgQmlubkFnZW50WFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwicHJldmlldy1sZWFybmluZy1jb250ZXh0XCIsXG4gICAgICBuYW1lOiBcIlByZXZpZXcgbGVhcm5pbmcgY29udGV4dFwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMucHJldmlldygpLFxuICAgIH0pO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJzeW5jLWxlYXJuaW5nLWNvbnRleHRcIixcbiAgICAgIG5hbWU6IFwiU3luYyBhcHByb3ZlZCBsZWFybmluZyBjb250ZXh0XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5zeW5jKCksXG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImluc3RhbGwtbGVhcm5pbmctdGVtcGxhdGVzXCIsXG4gICAgICBuYW1lOiBcIkluaXRpYWxpemUgQmlubkFnZW50WCBsZWFybmluZyBsaWJyYXJ5XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5pbml0aWFsaXplTGVhcm5pbmdMaWJyYXJ5KCksXG4gICAgfSk7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLmhhbmRsZUxheW91dFJlYWR5KCk7XG4gICAgfSk7XG4gICAgdGhpcy5yZWdpc3RlckludGVydmFsKFxuICAgICAgd2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuYXV0b1N5bmMpIHZvaWQgdGhpcy5zeW5jKGZhbHNlKTtcbiAgICAgIH0sIDYwXzAwMCksXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0geyAuLi5ERUZBVUxUX1NFVFRJTkdTLCAuLi4oYXdhaXQgdGhpcy5sb2FkRGF0YSgpKSB9O1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGhhbmRsZUxheW91dFJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLnNldHRpbmdzLmxpYnJhcnlWZXJzaW9uIDwgQ1VSUkVOVF9MSUJSQVJZX1ZFUlNJT04pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZUxlYXJuaW5nTGlicmFyeShmYWxzZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlx1NjcyQVx1NzdFNVx1OTUxOVx1OEJFRlwiO1xuICAgICAgICBuZXcgTm90aWNlKGBCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1NUU5M1x1NTIxRFx1NTlDQlx1NTMxNlx1NTkzMVx1OEQyNVx1RkYxQSR7bWVzc2FnZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYXV0b1N5bmMpIGF3YWl0IHRoaXMuc3luYyhmYWxzZSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbGxlY3RFbnRyaWVzQXN5bmMoKTogUHJvbWlzZTxMZWFybmluZ0NvbnRleHRFbnRyeVtdPiB7XG4gICAgY29uc3QgZm9sZGVycyA9IHNwbGl0U2NvcGUodGhpcy5zZXR0aW5ncy5hbGxvd2VkRm9sZGVycyk7XG4gICAgY29uc3QgdGFncyA9IHNwbGl0U2NvcGUodGhpcy5zZXR0aW5ncy5hbGxvd2VkVGFncykubWFwKCh0YWcpID0+IHRhZy5yZXBsYWNlKC9eIy8sIFwiXCIpKTtcbiAgICBpZiAoIWZvbGRlcnMubGVuZ3RoICYmICF0YWdzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKFwiXHU4QkY3XHU5MDA5XHU2MkU5XHU4MUYzXHU1QzExXHU0RTAwXHU0RTJBXHU1MTQxXHU4QkI4XHU1NDBDXHU2QjY1XHU3Njg0XHU2NTg3XHU0RUY2XHU1OTM5XHU2MjE2XHU2ODA3XHU3QjdFXCIpO1xuICAgIGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHRcbiAgICAgIC5nZXRNYXJrZG93bkZpbGVzKClcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+IGlzQWxsb3dlZChmaWxlLCBmb2xkZXJzLCB0YWdzLCB0aGlzLmFwcCkpO1xuICAgIGlmIChmaWxlcy5sZW5ndGggPiB0aGlzLnNldHRpbmdzLm1heE5vdGVzKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgXHU1MzM5XHU5MTREXHU1MjMwICR7ZmlsZXMubGVuZ3RofSBcdTdCQzdcdTdCMTRcdThCQjBcdUZGMENcdThCRjdcdTdGMjlcdTVDMEZcdTgzMDNcdTU2RjRcdUZGMDhcdTRFMEFcdTk2NTAgJHt0aGlzLnNldHRpbmdzLm1heE5vdGVzfVx1RkYwOWAsXG4gICAgICApO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChcbiAgICAgIGZpbGVzLm1hcChhc3luYyAoZmlsZSkgPT4ge1xuICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xuICAgICAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlciA/PyB7fTtcbiAgICAgICAgY29uc3QgdGFncyA9IHVuaXF1ZVN0cmluZ3MoW1xuICAgICAgICAgIC4uLmFycmF5U3RyaW5ncyhmcm9udG1hdHRlci50YWdzKSxcbiAgICAgICAgICAuLi4oY2FjaGU/LnRhZ3MgPz8gW10pLm1hcCgodGFnKSA9PiB0YWcudGFnLnJlcGxhY2UoL14jLywgXCJcIikpLFxuICAgICAgICBdKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2Vfa2V5OiBmaWxlLnBhdGgsXG4gICAgICAgICAgYXNzZXRfaWQ6XG4gICAgICAgICAgICB0eXBlb2YgZnJvbnRtYXR0ZXIuYmlubmFnZW50X2Fzc2V0X2lkID09PSBcInN0cmluZ1wiXG4gICAgICAgICAgICAgID8gZnJvbnRtYXR0ZXIuYmlubmFnZW50X2Fzc2V0X2lkXG4gICAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgIHRpdGxlOiBTdHJpbmcoZnJvbnRtYXR0ZXIudGl0bGUgPz8gZmlsZS5iYXNlbmFtZSksXG4gICAgICAgICAga2luZDogaW5mZXJLaW5kKGZyb250bWF0dGVyLmJpbm5hZ2VudF9raW5kLCB0YWdzKSxcbiAgICAgICAgICB0YWdzLFxuICAgICAgICAgIGV4Y2VycHQ6IHN1bW1hcml6ZShhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpLCB0aGlzLnNldHRpbmdzLm1heEV4Y2VycHRDaGFyYWN0ZXJzKSxcbiAgICAgICAgICBtb2RpZmllZF9hdDogbmV3IERhdGUoZmlsZS5zdGF0Lm10aW1lKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9O1xuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHJldmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZW50cmllcyA9IGF3YWl0IHRoaXMuY29sbGVjdEVudHJpZXNBc3luYygpO1xuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgYFx1NUMwNlx1NTQwQ1x1NkI2NSAke2VudHJpZXMubGVuZ3RofSBcdTY3NjFcdTVCNjZcdTRFNjBcdTRFMEFcdTRFMEJcdTY1ODdcdUZGMUEke1xuICAgICAgICAgIGVudHJpZXNcbiAgICAgICAgICAgIC5zbGljZSgwLCA0KVxuICAgICAgICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRpdGxlKVxuICAgICAgICAgICAgLmpvaW4oXCJcdTMwMDFcIikgfHwgXCJcdTY1RTBcIlxuICAgICAgICB9YCxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIG5ldyBOb3RpY2UoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlx1NjVFMFx1NkNENVx1OTg4NFx1ODlDOFx1NTQwQ1x1NkI2NVx1ODMwM1x1NTZGNFwiKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbml0aWFsaXplTGVhcm5pbmdMaWJyYXJ5KHNob3dOb3RpY2UgPSB0cnVlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IGluc3RhbGxlZCA9IDA7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoTElCUkFSWV9ST09UKSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKExJQlJBUllfUk9PVCk7XG4gICAgICBpbnN0YWxsZWQgKz0gMTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIExJQlJBUllfRk9MREVSUykge1xuICAgICAgY29uc3QgZm9sZGVyID0gYCR7TElCUkFSWV9ST09UfS8ke25hbWV9YDtcbiAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlcikpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlcik7XG4gICAgICAgIGluc3RhbGxlZCArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBpbnN0YWxsZWQgKz0gYXdhaXQgdGhpcy5taWdyYXRlTWFuYWdlZERhc2hib2FyZHMoKTtcbiAgICBhd2FpdCB0aGlzLnJld3JpdGVNYW5hZ2VkRGFzaGJvYXJkTGlua3MoKTtcbiAgICBpbnN0YWxsZWQgKz0gYXdhaXQgdGhpcy5taWdyYXRlTWFuYWdlZFZvY2FidWxhcnlUZW1wbGF0ZSgpO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGNvbnRlbnRdIG9mIE9iamVjdC5lbnRyaWVzKExFQVJOSU5HX1RFTVBMQVRFUykpIHtcbiAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGAke1RFTVBMQVRFX0ZPTERFUn0vJHtuYW1lfWApKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtURU1QTEFURV9GT0xERVJ9LyR7bmFtZX1gLCBjb250ZW50KTtcbiAgICAgICAgaW5zdGFsbGVkICs9IDE7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BhdGgsIGNvbnRlbnRdIG9mIE9iamVjdC5lbnRyaWVzKExJQlJBUllfTk9URVMpKSB7XG4gICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgY29udGVudCk7XG4gICAgICAgIGluc3RhbGxlZCArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBhd2FpdCB0aGlzLmNvbmZpZ3VyZU9ic2lkaWFuRm9sZGVycygpO1xuICAgIGluc3RhbGxlZCArPSBhd2FpdCB0aGlzLmluc3RhbGxSZXZpZXdTdHlsZVNuaXBwZXQoKTtcbiAgICB0aGlzLnNldHRpbmdzLmxpYnJhcnlWZXJzaW9uID0gQ1VSUkVOVF9MSUJSQVJZX1ZFUlNJT047XG4gICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICBpZiAoc2hvd05vdGljZSkge1xuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgaW5zdGFsbGVkXG4gICAgICAgICAgPyBgQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTVFOTNcdTVERjJcdTUyMURcdTU5Q0JcdTUzMTZcdUZGMDhcdTg4NjVcdTlGNTBcdTYyMTZcdTY2RjRcdTY1QjAgJHtpbnN0YWxsZWR9IFx1OTg3OVx1RkYwOWBcbiAgICAgICAgICA6IFwiQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTVFOTNcdTVERjJcdTVDMzFcdTdFRUFcdUZGMENcdTY3MkFcdTg5ODZcdTc2RDZcdTRGNjBcdTc2ODRcdTRGRUVcdTY1MzlcIixcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtaWdyYXRlTWFuYWdlZERhc2hib2FyZHMoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBsZXQgbWlncmF0ZWQgPSAwO1xuICAgIGZvciAoY29uc3QgW2xlZ2FjeVBhdGgsIHRhcmdldFBhdGhdIG9mIERBU0hCT0FSRF9NSUdSQVRJT05TKSB7XG4gICAgICBjb25zdCBsZWdhY3kgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgobGVnYWN5UGF0aCk7XG4gICAgICBpZiAoIShsZWdhY3kgaW5zdGFuY2VvZiBURmlsZSkgfHwgdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhcmdldFBhdGgpKSBjb250aW51ZTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlbmFtZShsZWdhY3ksIHRhcmdldFBhdGgpO1xuICAgICAgbWlncmF0ZWQgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIG1pZ3JhdGVkO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtaWdyYXRlTWFuYWdlZFZvY2FidWxhcnlUZW1wbGF0ZSgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHBhdGggPSBgJHtURU1QTEFURV9GT0xERVJ9L1x1OEJDRFx1NkM0Ny5tZGA7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSByZXR1cm4gMDtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICBpZiAoXG4gICAgICBjb250ZW50ICE9PSBMRUdBQ1lfVk9DQUJVTEFSWV9URU1QTEFURSAmJlxuICAgICAgY29udGVudCAhPT0gQklESVJFQ1RJT05BTF9WT0NBQlVMQVJZX1RFTVBMQVRFICYmXG4gICAgICBjb250ZW50ICE9PSBTSU1QTEVfVk9DQUJVTEFSWV9URU1QTEFURVxuICAgIClcbiAgICAgIHJldHVybiAwO1xuICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCBWT0NBQlVMQVJZX1RFTVBMQVRFKTtcbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmV3cml0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0XG4gICAgICAuZ2V0TWFya2Rvd25GaWxlcygpXG4gICAgICAuZmlsdGVyKFxuICAgICAgICAoZmlsZSkgPT4gZmlsZS5wYXRoID09PSBgJHtMSUJSQVJZX1JPT1R9Lm1kYCB8fCBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtMSUJSQVJZX1JPT1R9L2ApLFxuICAgICAgKTtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgY29uc3QgdXBkYXRlZCA9IHVwZGF0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcyhjb250ZW50LCBmaWxlLnBhdGgpO1xuICAgICAgaWYgKHVwZGF0ZWQgIT09IGNvbnRlbnQpIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCB1cGRhdGVkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbmZpZ3VyZU9ic2lkaWFuRm9sZGVycygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjb25maWd1cmFibGVWYXVsdCA9IHRoaXMuYXBwLnZhdWx0IGFzIHR5cGVvZiB0aGlzLmFwcC52YXVsdCAmIHtcbiAgICAgIHNldENvbmZpZz86IChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHZvaWQ7XG4gICAgfTtcbiAgICBpZiAodHlwZW9mIGNvbmZpZ3VyYWJsZVZhdWx0LnNldENvbmZpZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjb25maWd1cmFibGVWYXVsdC5zZXRDb25maWcoXCJhdHRhY2htZW50Rm9sZGVyUGF0aFwiLCBBVFRBQ0hNRU5UX0ZPTERFUik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMubWVyZ2VDb25maWdGaWxlKGAke3RoaXMuYXBwLnZhdWx0LmNvbmZpZ0Rpcn0vYXBwLmpzb25gLCB7XG4gICAgICAgIGF0dGFjaG1lbnRGb2xkZXJQYXRoOiBBVFRBQ0hNRU5UX0ZPTERFUixcbiAgICAgIH0pO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLm1lcmdlQ29uZmlnRmlsZShgJHt0aGlzLmFwcC52YXVsdC5jb25maWdEaXJ9L3RlbXBsYXRlcy5qc29uYCwge1xuICAgICAgZm9sZGVyOiBURU1QTEFURV9GT0xERVIsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGluc3RhbGxSZXZpZXdTdHlsZVNuaXBwZXQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBhZGFwdGVyID0gdGhpcy5hcHAudmF1bHQuYWRhcHRlcjtcbiAgICBjb25zdCBzbmlwcGV0Rm9sZGVyID0gYCR7dGhpcy5hcHAudmF1bHQuY29uZmlnRGlyfS9zbmlwcGV0c2A7XG4gICAgY29uc3Qgc25pcHBldFBhdGggPSBgJHtzbmlwcGV0Rm9sZGVyfS8ke1JFVklFV19TVFlMRV9TTklQUEVUX05BTUV9LmNzc2A7XG4gICAgbGV0IGNoYW5nZWQgPSAwO1xuICAgIGlmICghKGF3YWl0IGFkYXB0ZXIuZXhpc3RzKHNuaXBwZXRGb2xkZXIpKSkge1xuICAgICAgYXdhaXQgYWRhcHRlci5ta2RpcihzbmlwcGV0Rm9sZGVyKTtcbiAgICB9XG4gICAgaWYgKCEoYXdhaXQgYWRhcHRlci5leGlzdHMoc25pcHBldFBhdGgpKSkge1xuICAgICAgYXdhaXQgYWRhcHRlci53cml0ZShzbmlwcGV0UGF0aCwgUkVWSUVXX1NUWUxFX1NOSVBQRVQpO1xuICAgICAgY2hhbmdlZCArPSAxO1xuICAgIH1cblxuICAgIGNvbnN0IGFwcGVhcmFuY2VQYXRoID0gYCR7dGhpcy5hcHAudmF1bHQuY29uZmlnRGlyfS9hcHBlYXJhbmNlLmpzb25gO1xuICAgIGxldCBhcHBlYXJhbmNlOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGlmIChhd2FpdCBhZGFwdGVyLmV4aXN0cyhhcHBlYXJhbmNlUGF0aCkpIHtcbiAgICAgIGNvbnN0IHJhdyA9IGF3YWl0IGFkYXB0ZXIucmVhZChhcHBlYXJhbmNlUGF0aCk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJzZWQ6IHVua25vd24gPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICAgIGlmIChwYXJzZWQgJiYgdHlwZW9mIHBhcnNlZCA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgYXBwZWFyYW5jZSA9IHBhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXHU2NUUwXHU2Q0Q1XHU1NDJGXHU3NTI4IEJpbm5BZ2VudFggXHU5NUVBXHU1MzYxXHU2ODM3XHU1RjBGXHVGRjFBJHthcHBlYXJhbmNlUGF0aH0gXHU0RTBEXHU2NjJGXHU2NzA5XHU2NTQ4XHU3Njg0IEpTT05gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZW5hYmxlZCA9IGFycmF5U3RyaW5ncyhhcHBlYXJhbmNlLmVuYWJsZWRDc3NTbmlwcGV0cyk7XG4gICAgaWYgKCFlbmFibGVkLmluY2x1ZGVzKFJFVklFV19TVFlMRV9TTklQUEVUX05BTUUpKSB7XG4gICAgICBhd2FpdCBhZGFwdGVyLndyaXRlKFxuICAgICAgICBhcHBlYXJhbmNlUGF0aCxcbiAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAge1xuICAgICAgICAgICAgLi4uYXBwZWFyYW5jZSxcbiAgICAgICAgICAgIGVuYWJsZWRDc3NTbmlwcGV0czogWy4uLmVuYWJsZWQsIFJFVklFV19TVFlMRV9TTklQUEVUX05BTUVdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgbnVsbCxcbiAgICAgICAgICAyLFxuICAgICAgICApfVxcbmAsXG4gICAgICApO1xuICAgICAgY2hhbmdlZCArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gY2hhbmdlZDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbWVyZ2VDb25maWdGaWxlKHBhdGg6IHN0cmluZywgcGF0Y2g6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgbGV0IGN1cnJlbnQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgaWYgKGF3YWl0IGFkYXB0ZXIuZXhpc3RzKHBhdGgpKSB7XG4gICAgICBjb25zdCByYXcgPSBhd2FpdCBhZGFwdGVyLnJlYWQocGF0aCk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJzZWQ6IHVua25vd24gPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICAgIGlmIChwYXJzZWQgJiYgdHlwZW9mIHBhcnNlZCA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgY3VycmVudCA9IHBhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXHU2NUUwXHU2Q0Q1XHU2NkY0XHU2NUIwIE9ic2lkaWFuIFx1OTE0RFx1N0Y2RVx1RkYxQSR7cGF0aH0gXHU0RTBEXHU2NjJGXHU2NzA5XHU2NTQ4XHU3Njg0IEpTT05gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdXBkYXRlZCA9IHsgLi4uY3VycmVudCwgLi4ucGF0Y2ggfTtcbiAgICBpZiAoSlNPTi5zdHJpbmdpZnkodXBkYXRlZCkgIT09IEpTT04uc3RyaW5naWZ5KGN1cnJlbnQpKSB7XG4gICAgICBhd2FpdCBhZGFwdGVyLndyaXRlKHBhdGgsIGAke0pTT04uc3RyaW5naWZ5KHVwZGF0ZWQsIG51bGwsIDIpfVxcbmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc3luYyhzaG93Tm90aWNlID0gdHJ1ZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQgfHwgIXRoaXMuc2V0dGluZ3Muc3luY1NlY3JldCkge1xuICAgICAgaWYgKHNob3dOb3RpY2UpIG5ldyBOb3RpY2UoXCJcdThCRjdcdTUxNDhcdTU3MjhcdTYzRDJcdTRFRjZcdThCQkVcdTdGNkVcdTRFMkRcdTU4NkJcdTUxOTkgQmlubkFnZW50WCBcdThGREVcdTYzQTVcdTUxRURcdTYzNkVcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBleHBvcnRlZCA9IGF3YWl0IHRoaXMucHVsbFBlbmRpbmdBc3NldHMoKTtcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCB0aGlzLmNvbGxlY3RFbnRyaWVzQXN5bmMoKTtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7dGhpcy5zZXR0aW5ncy5hcGlCYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vdjEvb2JzaWRpYW4tc3luYy8ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLnNldHRpbmdzLmNvbm5lY3Rpb25JZCl9L2ltcG9ydGAsXG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5zZXR0aW5ncy5zeW5jU2VjcmV0fWAsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzY2hlbWFfdmVyc2lvbjogXCJsZWFybmluZy1jb250ZXh0L3YxXCIsXG4gICAgICAgICAgdmF1bHRfbmFtZTogdGhpcy5hcHAudmF1bHQuZ2V0TmFtZSgpLFxuICAgICAgICAgIGVudHJpZXMsXG4gICAgICAgIH0pLFxuICAgICAgICB0aHJvdzogZmFsc2UsXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCaW5uQWdlbnRYIFx1NjJEMlx1N0VERFx1NTQwQ1x1NkI2NVx1RkYwOCR7cmVzcG9uc2Uuc3RhdHVzfVx1RkYwOWApO1xuICAgICAgY29uc3QgcmVzdWx0ID0gcmVzcG9uc2UuanNvbiBhcyBJbXBvcnRSZXNwb25zZTtcbiAgICAgIGNvbnN0IG9yZ2FuaXplZCA9IGF3YWl0IHRoaXMuYXBwbHlPcmdhbml6YXRpb25QbGFuKHJlc3VsdC5vcmdhbml6YXRpb24pO1xuICAgICAgY29uc3Qgb3JnYW5pemF0aW9uU3VtbWFyeSA9IHN1bW1hcml6ZU9yZ2FuaXphdGlvbihyZXN1bHQub3JnYW5pemF0aW9uLCBvcmdhbml6ZWQpO1xuICAgICAgY29uc3Qgc3luY1N1bW1hcnkgPVxuICAgICAgICBgXHU2M0E1XHU2NTM2ICR7ZXhwb3J0ZWR9IFx1Njc2MVx1OEQ0NFx1NEVBN1x1RkYwQ1x1NEUwQVx1NEYyMCAke2VudHJpZXMubGVuZ3RofSBcdTY3NjFcdTVCNjZcdTRFNjBcdTRFMEFcdTRFMEJcdTY1ODdcdUZGMUJgICsgb3JnYW5pemF0aW9uU3VtbWFyeTtcbiAgICAgIHRoaXMuc2V0dGluZ3MubGFzdFN5bmNlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0U3luY0Vycm9yID0gXCJcIjtcbiAgICAgIHRoaXMuc2V0dGluZ3MubGFzdFN5bmNTdW1tYXJ5ID0gc3luY1N1bW1hcnk7XG4gICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgaWYgKHNob3dOb3RpY2UpIG5ldyBOb3RpY2UoYFx1NTNDQ1x1NTQxMVx1NTQwQ1x1NkI2NVx1NUI4Q1x1NjIxMFx1RkYxQSR7c3luY1N1bW1hcnl9YCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU1NDBDXHU2QjY1XHU1OTMxXHU4RDI1XCI7XG4gICAgICB0aGlzLnNldHRpbmdzLmxhc3RTeW5jRXJyb3IgPSBtZXNzYWdlO1xuICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIGlmIChzaG93Tm90aWNlKSBuZXcgTm90aWNlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgYXBwbHlPcmdhbml6YXRpb25QbGFuKHBsYW46IE9yZ2FuaXphdGlvblBsYW4gfCBudWxsKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBpZiAocGxhbj8uc3RhdHVzICE9PSBcInBsYW5uZWRcIiB8fCAhcGxhbi5hY3Rpb25zLmxlbmd0aCkgcmV0dXJuIDA7XG4gICAgY29uc3QgYWxsb3dlZFRhcmdldHMgPSBuZXcgU2V0KFtcbiAgICAgIGAke0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeWAsXG4gICAgICBgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXJgLFxuICAgICAgYCR7TElCUkFSWV9ST09UfS8wMy1SZWFkaW5nYCxcbiAgICAgIGAke0xJQlJBUllfUk9PVH0vMDQtV3JpdGluZ2AsXG4gICAgXSk7XG4gICAgY29uc3QgY29tcGxldGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgYWN0aW9uIG9mIHBsYW4uYWN0aW9ucykge1xuICAgICAgaWYgKCFhY3Rpb24uc291cmNlX2tleS5zdGFydHNXaXRoKGAke0lOQk9YX0ZPTERFUn0vYCkpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFhbGxvd2VkVGFyZ2V0cy5oYXMoYWN0aW9uLnRhcmdldF9mb2xkZXIpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gYWN0aW9uLnNvdXJjZV9rZXkuc2xpY2UoYWN0aW9uLnNvdXJjZV9rZXkubGFzdEluZGV4T2YoXCIvXCIpICsgMSk7XG4gICAgICBjb25zdCBleHRlbnNpb25JbmRleCA9IGZpbGVOYW1lLmxhc3RJbmRleE9mKFwiLlwiKTtcbiAgICAgIGNvbnN0IGJhc2VOYW1lID0gZXh0ZW5zaW9uSW5kZXggPiAwID8gZmlsZU5hbWUuc2xpY2UoMCwgZXh0ZW5zaW9uSW5kZXgpIDogZmlsZU5hbWU7XG4gICAgICBjb25zdCBleHRlbnNpb24gPSBleHRlbnNpb25JbmRleCA+IDAgPyBmaWxlTmFtZS5zbGljZShleHRlbnNpb25JbmRleCArIDEpIDogXCJtZFwiO1xuICAgICAgY29uc3QgYmFzZVBhdGggPSBgJHthY3Rpb24udGFyZ2V0X2ZvbGRlcn0vJHtmaWxlTmFtZX1gO1xuICAgICAgY29uc3QgcmV0cnlQYXRoID0gYCR7YWN0aW9uLnRhcmdldF9mb2xkZXJ9LyR7YmFzZU5hbWV9LSR7YWN0aW9uLmFjdGlvbl9pZC5zbGljZSgwLCA2KX0uJHtleHRlbnNpb259YDtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChhY3Rpb24uc291cmNlX2tleSk7XG4gICAgICBpZiAoIShzb3VyY2UgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChiYXNlUGF0aCkgaW5zdGFuY2VvZiBURmlsZSB8fFxuICAgICAgICAgIHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChyZXRyeVBhdGgpIGluc3RhbmNlb2YgVEZpbGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29tcGxldGVkLnB1c2goYWN0aW9uLmFjdGlvbl9pZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCB0YXJnZXRQYXRoID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGJhc2VQYXRoKSA/IHJldHJ5UGF0aCA6IGJhc2VQYXRoO1xuICAgICAgaWYgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0YXJnZXRQYXRoKSkgY29udGludWU7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZW5hbWUoc291cmNlLCB0YXJnZXRQYXRoKTtcbiAgICAgIGNvbXBsZXRlZC5wdXNoKGFjdGlvbi5hY3Rpb25faWQpO1xuICAgIH1cbiAgICBpZiAoY29tcGxldGVkLmxlbmd0aCAhPT0gcGxhbi5hY3Rpb25zLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ib3ggXHU2NTc0XHU3NDA2XHU2NzJBXHU1MTY4XHU5MEU4XHU1QjhDXHU2MjEwXHVGRjFCXHU2NzJBXHU3OUZCXHU1MkE4XHU3Njg0XHU3QjE0XHU4QkIwXHU0RjFBXHU0RkREXHU3NTU5XHU1NzI4XHU1MzlGXHU1OTA0XHVGRjBDXHU0RTBCXHU2QjIxXHU1NDBDXHU2QjY1XHU5MUNEXHU4QkQ1XCIpO1xuICAgIH1cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHt0aGlzLnNldHRpbmdzLmFwaUJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS92MS9vYnNpZGlhbi1zeW5jLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuc2V0dGluZ3MuY29ubmVjdGlvbklkKX0vb3JnYW5pemVyLXJ1bnMvJHtlbmNvZGVVUklDb21wb25lbnQocGxhbi5ydW5faWQpfS9hY2tgLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuc2V0dGluZ3Muc3luY1NlY3JldH1gLFxuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGNvbXBsZXRlZF9hY3Rpb25faWRzOiBjb21wbGV0ZWQgfSksXG4gICAgICB0aHJvdzogZmFsc2UsXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbmJveCBcdTY1NzRcdTc0MDZcdTU2REVcdTYyNjdcdTU5MzFcdThEMjVcdUZGMDgke3Jlc3BvbnNlLnN0YXR1c31cdUZGMDlgKTtcbiAgICByZXR1cm4gY29tcGxldGVkLmxlbmd0aDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHVsbFBlbmRpbmdBc3NldHMoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBiYXNlID0gdGhpcy5zZXR0aW5ncy5hcGlCYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgICBjb25zdCBoZWFkZXJzID0geyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5zZXR0aW5ncy5zeW5jU2VjcmV0fWAgfTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHtiYXNlfS92MS9vYnNpZGlhbi1zeW5jLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuc2V0dGluZ3MuY29ubmVjdGlvbklkKX0vZXhwb3J0c2AsXG4gICAgICBtZXRob2Q6IFwiR0VUXCIsXG4gICAgICBoZWFkZXJzLFxuICAgICAgdGhyb3c6IGZhbHNlLFxuICAgIH0pO1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMClcbiAgICAgIHRocm93IG5ldyBFcnJvcihgXHU2NUUwXHU2Q0Q1XHU4QkZCXHU1M0Q2XHU1Rjg1XHU1NDBDXHU2QjY1XHU4RDQ0XHU0RUE3XHVGRjA4JHtyZXNwb25zZS5zdGF0dXN9XHVGRjA5YCk7XG4gICAgY29uc3QgZXhwb3J0cyA9IHJlc3BvbnNlLmpzb24gYXMgUGVuZGluZ0Fzc2V0RXhwb3J0W107XG4gICAgbGV0IGNvbXBsZXRlZCA9IDA7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGV4cG9ydHMpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSBhd2FpdCB0aGlzLmNyZWF0ZUFzc2V0Tm90ZShpdGVtKTtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgY29uc3QgZGlnZXN0ID0gYXdhaXQgc2hhMjU2KGNvbnRlbnQpO1xuICAgICAgY29uc3QgYWNrID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7YmFzZX0vdjEvb2JzaWRpYW4tc3luYy8ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLnNldHRpbmdzLmNvbm5lY3Rpb25JZCl9L2V4cG9ydHMvJHtlbmNvZGVVUklDb21wb25lbnQoaXRlbS5hc3NldF9pZCl9L2Fja2AsXG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4uaGVhZGVycywgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHNvdXJjZV9rZXk6IGZpbGUucGF0aCxcbiAgICAgICAgICBjb250ZW50X2hhc2g6IGRpZ2VzdCxcbiAgICAgICAgICBtb2RpZmllZF9hdDogbmV3IERhdGUoZmlsZS5zdGF0Lm10aW1lKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgIHZhdWx0X25hbWU6IHRoaXMuYXBwLnZhdWx0LmdldE5hbWUoKSxcbiAgICAgICAgfSksXG4gICAgICAgIHRocm93OiBmYWxzZSxcbiAgICAgIH0pO1xuICAgICAgaWYgKGFjay5zdGF0dXMgPCAyMDAgfHwgYWNrLnN0YXR1cyA+PSAzMDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXHU4RDQ0XHU0RUE3XHU1NDBDXHU2QjY1XHU1NkRFXHU2MjY3XHU1OTMxXHU4RDI1XHVGRjA4JHthY2suc3RhdHVzfVx1RkYwOWApO1xuICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgfVxuICAgIHJldHVybiBjb21wbGV0ZWQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZUFzc2V0Tm90ZShpdGVtOiBQZW5kaW5nQXNzZXRFeHBvcnQpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoTElCUkFSWV9ST09UKSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKExJQlJBUllfUk9PVCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKElOQk9YX0ZPTERFUikpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihJTkJPWF9GT0xERVIpO1xuICAgIH1cbiAgICBjb25zdCBmb2xkZXIgPSBJTkJPWF9GT0xERVI7XG4gICAgY29uc3QgZmlsZW5hbWUgPSBgJHtzYWZlRmlsZW5hbWUoaXRlbS50aXRsZSl9LSR7aXRlbS5hc3NldF9pZC5zbGljZSgtMTApfS5tZGA7XG4gICAgY29uc3QgcGF0aCA9IGAke2ZvbGRlcn0vJHtmaWxlbmFtZX1gO1xuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuICAgIGlmIChleGlzdGluZyBpbnN0YW5jZW9mIFRGaWxlKSByZXR1cm4gZXhpc3Rpbmc7XG4gICAgY29uc3QgdGFncyA9IHVuaXF1ZVN0cmluZ3MoW1wiYmlubmFnZW50XCIsIGl0ZW0ua2luZCwgLi4uaXRlbS50YWdzXSk7XG4gICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBbXG4gICAgICBcIi0tLVwiLFxuICAgICAgJ2Jpbm5hZ2VudF9zY2hlbWE6IFwiYXNzZXQvdjFcIicsXG4gICAgICBgYmlubmFnZW50X2Fzc2V0X2lkOiBcIiR7eWFtbFN0cmluZyhpdGVtLmFzc2V0X2lkKX1cImAsXG4gICAgICBgYmlubmFnZW50X2tpbmQ6IFwiJHt5YW1sU3RyaW5nKGl0ZW0ua2luZCl9XCJgLFxuICAgICAgYGJpbm5hZ2VudF9zb3VyY2VfdHlwZTogXCIke3lhbWxTdHJpbmcoaXRlbS5zb3VyY2VfdHlwZSl9XCJgLFxuICAgICAgXCJpbmJveF9zdGF0dXM6IHVucHJvY2Vzc2VkXCIsXG4gICAgICBgdGl0bGU6IFwiJHt5YW1sU3RyaW5nKGl0ZW0udGl0bGUpfVwiYCxcbiAgICAgIC4uLihpdGVtLnNvdXJjZV90YXNrX2lkXG4gICAgICAgID8gW2BiaW5uYWdlbnRfc291cmNlX3Rhc2tfaWQ6IFwiJHt5YW1sU3RyaW5nKGl0ZW0uc291cmNlX3Rhc2tfaWQpfVwiYF1cbiAgICAgICAgOiBbXSksXG4gICAgICBcInRhZ3M6XCIsXG4gICAgICAuLi50YWdzLm1hcCgodGFnKSA9PiBgICAtICR7dGFnfWApLFxuICAgICAgXCItLS1cIixcbiAgICAgIFwiXCIsXG4gICAgICBgIyAke2l0ZW0udGl0bGV9YCxcbiAgICAgIFwiXCIsXG4gICAgXTtcbiAgICBjb25zdCBib2R5ID0gaXRlbS5pbml0aWFsX2NvbnRlbnQ/LnRyaW0oKVxuICAgICAgPyBbXCIjIyBcdTVCNjZcdTRFNjBcdTczQjBcdTU3M0FcIiwgXCJcIiwgaXRlbS5pbml0aWFsX2NvbnRlbnQudHJpbSgpLCBcIlwiLCBcIiMjIFx1NjIxMVx1NzY4NFx1NzQwNlx1ODlFM1wiLCBcIlwiXVxuICAgICAgOiBbXCIjIyBcdTY3MDBcdTUyMURcdThCRURcdTU4ODNcIiwgXCJcIiwgXCIjIyBcdTYyMTFcdTc2ODRcdTc0MDZcdTg5RTNcIiwgXCJcIiwgXCIjIyBcdTUzRUZcdThGQzFcdTc5RkJcdTg5QzRcdTUyMTlcIiwgXCJcIiwgXCIjIyBcdTY1QjBcdThCRURcdTU4ODNcdTlBOENcdThCQzFcIiwgXCJcIl07XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCBbLi4uZnJvbnRtYXR0ZXIsIC4uLmJvZHldLmpvaW4oXCJcXG5cIikpO1xuICB9XG59XG5cbmNsYXNzIEJpbm5BZ2VudFhTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBCaW5uQWdlbnRYTGVhcm5pbmdTeW5jUGx1Z2luLFxuICApIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gIH1cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdThENDRcdTRFQTdcdTU0MENcdTZCNjVcIiB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJcdTRFQzVcdTU0MENcdTZCNjVcdTRGNjBcdTY2MEVcdTc4NkVcdTUxNDFcdThCQjhcdTc2ODRcdTgzMDNcdTU2RjRcdTMwMDJcdTc2N0JcdTVGNTVcdTg5RTZcdTUzRDFcdTc2ODRcdTY1NzRcdTc0MDZcdTUzRUFcdTRGMUFcdTYyOEEgMDAtSW5ib3ggXHU3QjE0XHU4QkIwXHU3OUZCXHU1MkE4XHU1MjMwIEJpbm5BZ2VudFggXHU3Njg0XHU4QkNEXHU2QzQ3XHUzMDAxXHU4QkVEXHU2Q0Q1XHUzMDAxXHU5NjA1XHU4QkZCXHU2MjE2XHU1MTk5XHU0RjVDXHU3NkVFXHU1RjU1XHVGRjFCXHU0RTBEXHU0RjFBXHU1MjIwXHU5NjY0XHUzMDAxXHU2NTM5XHU1MTk5XHU2MjE2XHU3OUZCXHU1MUZBXHU2MjU4XHU3QkExXHU3NkVFXHU1RjU1XHUzMDAyXCIsXG4gICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTIxRFx1NTlDQlx1NTMxNlx1NUI2Nlx1NEU2MFx1NUU5M1wiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiXHU1MjFCXHU1RUZBIDAwXHUyMDEzMDYgXHU3NkVFXHU1RjU1XHUzMDAxTU9DIC8gRGF0YXZpZXcgRGFzaGJvYXJkXHUzMDAxXHU2NTJGXHU2MzAxXHU5NUVBXHU1MzYxXHU3Njg0XHU4QkNEXHU2QzQ3XHU2QTIxXHU2NzdGXHUzMDAxU3BhY2VkIFJlcGV0aXRpb24gXHU2MzA3XHU1MzU3XHU0RTBFXHU1MTY1XHU5NUU4XHU3OTNBXHU0RjhCXHVGRjFCXHU0RTBEXHU0RjFBXHU4OTg2XHU3NkQ2XHU0RjYwXHU3Njg0XHU0RkVFXHU2NTM5XHUzMDAyXCIsXG4gICAgICApXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiXHU2OEMwXHU2N0U1XHU1RTc2XHU4ODY1XHU5RjUwXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmluaXRpYWxpemVMZWFybmluZ0xpYnJhcnkoKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTgxRUFcdTUyQThcdTUzQ0NcdTU0MTFcdTU0MENcdTZCNjVcIilcbiAgICAgIC5zZXREZXNjKFwiT2JzaWRpYW4gXHU1NDJGXHU1MkE4XHU1NDBFXHU1M0NBXHU2QkNGIDYwIFx1NzlEMlx1NTQwQ1x1NkI2NVx1NEUwMFx1NkIyMVx1NURGMlx1NjM4OFx1Njc0M1x1ODMwM1x1NTZGNFx1RkYxQlx1NTNFRlx1OTY4Rlx1NjVGNlx1NTE3M1x1OTVFRFx1NUU3Nlx1NjUzOVx1NzUyOFx1NjI0Qlx1NTJBOFx1NTQ3RFx1NEVFNFx1MzAwMlwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxuICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b1N5bmMpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9TeW5jID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU2NzAwXHU4RkQxXHU1NDBDXHU2QjY1XCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdFN5bmNFcnJvclxuICAgICAgICAgID8gYFx1NTkzMVx1OEQyNVx1RkYxQSR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdFN5bmNFcnJvcn1gXG4gICAgICAgICAgOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sYXN0U3luY2VkQXRcbiAgICAgICAgICAgID8gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdFN5bmNlZEF0fVx1RkYxQiR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdFN5bmNTdW1tYXJ5IHx8IFwiXHU1NDBDXHU2QjY1XHU1QjhDXHU2MjEwXCJ9YFxuICAgICAgICAgICAgOiBcIlx1NUMxQVx1NjcyQVx1NUI4Q1x1NjIxMFx1NTQwQ1x1NkI2NVwiLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1MTQxXHU4QkI4XHU3Njg0XHU2NTg3XHU0RUY2XHU1OTM5XCIpXG4gICAgICAuc2V0RGVzYyhcIlx1OTAxN1x1NTNGN1x1NTIwNlx1OTY5NFx1RkYwQ1x1NEY4Qlx1NTk4MiBCaW5uQWdlbnRYLCBcdTgyRjFcdThCRUQvXHU4QkVEXHU2Q0Q1XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbGxvd2VkRm9sZGVycykub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxsb3dlZEZvbGRlcnMgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTUxNDFcdThCQjhcdTc2ODRcdTY4MDdcdTdCN0VcIilcbiAgICAgIC5zZXREZXNjKFwiXHU1M0VGXHU5MDA5XHVGRjBDXHU5MDE3XHU1M0Y3XHU1MjA2XHU5Njk0XHVGRjBDXHU0RjhCXHU1OTgyIGJpbm5hZ2VudC12b2NhYnVsYXJ5LCBncmFtbWFyXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbGxvd2VkVGFncykub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxsb3dlZFRhZ3MgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCaW5uQWdlbnRYIFx1NTczMFx1NTc0MFwiKVxuICAgICAgLnNldERlc2MoXCJcdTY3MkNcdTY3M0FcdTlFRDhcdThCQTRcdUZGMUFodHRwOi8vMTI3LjAuMC4xOjgwMDAvbGVhcm5lclwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYXBpQmFzZVVybCkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYXBpQmFzZVVybCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoXCJcdThGREVcdTYzQTUgSURcIikuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29ubmVjdGlvbklkKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29ubmVjdGlvbklkID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSksXG4gICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1NDBDXHU2QjY1XHU1QkM2XHU5NEE1XCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NzUzMSBCaW5uQWdlbnRYIFx1NzY4NFx1OEZERVx1NjNBNVx1NTQxMVx1NUJGQ1x1NzUxRlx1NjIxMFx1RkYxQlx1NEVDNVx1NEZERFx1NUI1OFx1NTcyOFx1NjcyQ1x1NjczQSBPYnNpZGlhbiBcdTYzRDJcdTRFRjZcdThCQkVcdTdGNkVcdTRFMkRcdTMwMDJcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnN5bmNTZWNyZXQpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN5bmNTZWNyZXQgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN1bW1hcml6ZU9yZ2FuaXphdGlvbihwbGFuOiBPcmdhbml6YXRpb25QbGFuIHwgbnVsbCwgb3JnYW5pemVkOiBudW1iZXIpOiBzdHJpbmcge1xuICBpZiAoIXBsYW4pIHJldHVybiBcIlx1NjcyQ1x1OEY2RVx1NkNBMVx1NjcwOVx1NjM5Mlx1OTYxRlx1NzY4NCBJbmJveCBcdTY1NzRcdTc0MDZcdTRFRkJcdTUyQTFcdTMwMDJcIjtcbiAgaWYgKHBsYW4uc3RhdHVzID09PSBcIm5vb3BcIikgcmV0dXJuIFwiSW5ib3ggXHU0RTJEXHU2Q0ExXHU2NzA5XHU1Rjg1XHU2NTc0XHU3NDA2XHU3QjE0XHU4QkIwXHUzMDAyXCI7XG4gIGlmIChwbGFuLnN0YXR1cyA9PT0gXCJxdWV1ZWRcIikge1xuICAgIHJldHVybiAoXG4gICAgICBgSW5ib3ggXHU2NzA5ICR7cGxhbi5pbmJveF9jb3VudH0gXHU2NzYxXHU1Rjg1XHU2NTc0XHU3NDA2XHU3QjE0XHU4QkIwXHVGRjBDXHU1M0VGXHU5NzYwXHU1MjA2XHU3QzdCICR7cGxhbi5jbGFzc2lmaWVkX2NvdW50fSBcdTY3NjFcdUZGMUJgICtcbiAgICAgIFwiXHU2NzJDXHU4RjZFXHU2NzJBXHU3OUZCXHU1MkE4XHVGRjBDXHU0RUZCXHU1MkExXHU0RjFBXHU1NzI4XHU0RTBCXHU2QjIxXHU1NDBDXHU2QjY1XHU5MUNEXHU4QkQ1XHUzMDAyXCJcbiAgICApO1xuICB9XG4gIGNvbnN0IGZvbGRlckxhYmVsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICBbYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5YF06IFwiXHU4QkNEXHU2QzQ3XCIsXG4gICAgW2Ake0xJQlJBUllfUk9PVH0vMDItR3JhbW1hcmBdOiBcIlx1OEJFRFx1NkNENVwiLFxuICAgIFtgJHtMSUJSQVJZX1JPT1R9LzAzLVJlYWRpbmdgXTogXCJcdTk2MDVcdThCRkJcIixcbiAgICBbYCR7TElCUkFSWV9ST09UfS8wNC1Xcml0aW5nYF06IFwiXHU1MTk5XHU0RjVDXCIsXG4gIH07XG4gIGNvbnN0IGNvdW50cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gIGZvciAoY29uc3QgYWN0aW9uIG9mIHBsYW4uYWN0aW9ucykge1xuICAgIGNvbnN0IGxhYmVsID0gZm9sZGVyTGFiZWxzW2FjdGlvbi50YXJnZXRfZm9sZGVyXSA/PyBhY3Rpb24udGFyZ2V0X2ZvbGRlcjtcbiAgICBjb3VudHMuc2V0KGxhYmVsLCAoY291bnRzLmdldChsYWJlbCkgPz8gMCkgKyAxKTtcbiAgfVxuICBjb25zdCBkZXN0aW5hdGlvbnMgPSBbLi4uY291bnRzLmVudHJpZXMoKV1cbiAgICAubWFwKChbbGFiZWwsIGNvdW50XSkgPT4gYCR7bGFiZWx9ICR7Y291bnR9IFx1Njc2MWApXG4gICAgLmpvaW4oXCJcdTMwMDFcIik7XG4gIHJldHVybiBgXHU2NTc0XHU3NDA2XHU1QjhDXHU2MjEwXHVGRjFBXHU3OUZCXHU1MkE4ICR7b3JnYW5pemVkfSBcdTY3NjEgSW5ib3ggXHU3QjE0XHU4QkIwXHVGRjA4JHtkZXN0aW5hdGlvbnN9XHVGRjA5XHUzMDAyYDtcbn1cblxuZnVuY3Rpb24gc3BsaXRTY29wZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gdmFsdWVcbiAgICAuc3BsaXQoXCIsXCIpXG4gICAgLm1hcCgocGFydCkgPT4gcGFydC50cmltKCkucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgXCJcIikpXG4gICAgLmZpbHRlcihCb29sZWFuKTtcbn1cbmZ1bmN0aW9uIGFycmF5U3RyaW5ncyh2YWx1ZTogdW5rbm93bik6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpXG4gICAgPyB2YWx1ZS5maWx0ZXIoKGl0ZW0pOiBpdGVtIGlzIHN0cmluZyA9PiB0eXBlb2YgaXRlbSA9PT0gXCJzdHJpbmdcIilcbiAgICA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBbdmFsdWVdXG4gICAgICA6IFtdO1xufVxuZnVuY3Rpb24gdW5pcXVlU3RyaW5ncyh2YWx1ZXM6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuICByZXR1cm4gWy4uLm5ldyBTZXQodmFsdWVzLm1hcCgodmFsdWUpID0+IHZhbHVlLnJlcGxhY2UoL14jLywgXCJcIikudHJpbSgpKS5maWx0ZXIoQm9vbGVhbikpXTtcbn1cbmZ1bmN0aW9uIGlzQWxsb3dlZChmaWxlOiBURmlsZSwgZm9sZGVyczogc3RyaW5nW10sIHRhZ3M6IHN0cmluZ1tdLCBhcHA6IEFwcCk6IGJvb2xlYW4ge1xuICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgaWYgKFxuICAgIGZpbGUucGF0aC5zdGFydHNXaXRoKGAke1RFTVBMQVRFX0ZPTERFUn0vYCkgfHxcbiAgICBmaWxlLnBhdGguc3RhcnRzV2l0aChcIkJpbm5BZ2VudFgvVGVtcGxhdGVzL1wiKSB8fFxuICAgIGZpbGUuYmFzZW5hbWUgPT09IFwiRGFzaGJvYXJkXCIgfHxcbiAgICBmaWxlLmJhc2VuYW1lID09PSBcIjAwLURhc2hib2FyZFwiIHx8XG4gICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKExJQlJBUllfTk9URVMsIGZpbGUucGF0aCkgfHxcbiAgICBjYWNoZT8uZnJvbnRtYXR0ZXI/LmJpbm5hZ2VudF9zeW5jID09PSBmYWxzZVxuICApXG4gICAgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBwYXRoQWxsb3dlZCA9IGZvbGRlcnMuc29tZShcbiAgICAoZm9sZGVyKSA9PiBmaWxlLnBhdGggPT09IGZvbGRlciB8fCBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtmb2xkZXJ9L2ApLFxuICApO1xuICBjb25zdCBmaWxlVGFncyA9IHVuaXF1ZVN0cmluZ3MoW1xuICAgIC4uLihjYWNoZT8udGFncyA/PyBbXSkubWFwKCh0YWcpID0+IHRhZy50YWcpLFxuICAgIC4uLmFycmF5U3RyaW5ncyhjYWNoZT8uZnJvbnRtYXR0ZXI/LnRhZ3MpLFxuICBdKTtcbiAgcmV0dXJuIHBhdGhBbGxvd2VkIHx8IHRhZ3Muc29tZSgodGFnKSA9PiBmaWxlVGFncy5pbmNsdWRlcyh0YWcpKTtcbn1cbmZ1bmN0aW9uIGluZmVyS2luZCh2YWx1ZTogdW5rbm93biwgdGFnczogc3RyaW5nW10pOiBMZWFybmluZ0tpbmQge1xuICBjb25zdCBjYW5kaWRhdGUgPVxuICAgIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyB2YWx1ZVxuICAgICAgOiB0YWdzLmZpbmQoKHRhZykgPT5cbiAgICAgICAgICBbXG4gICAgICAgICAgICBcInZvY2FidWxhcnlcIixcbiAgICAgICAgICAgIFwiZ3JhbW1hclwiLFxuICAgICAgICAgICAgXCJ3cml0aW5nX2V4cHJlc3Npb25cIixcbiAgICAgICAgICAgIFwicmVhZGluZ19za2lsbFwiLFxuICAgICAgICAgICAgXCJleGFtX3NraWxsXCIsXG4gICAgICAgICAgICBcIndyaXRpbmdfc2tpbGxcIixcbiAgICAgICAgICBdLmluY2x1ZGVzKHRhZyksXG4gICAgICAgICk7XG4gIHJldHVybiAoXG4gICAgW1xuICAgICAgXCJ2b2NhYnVsYXJ5XCIsXG4gICAgICBcImdyYW1tYXJcIixcbiAgICAgIFwid3JpdGluZ19leHByZXNzaW9uXCIsXG4gICAgICBcInJlYWRpbmdfc2tpbGxcIixcbiAgICAgIFwiZXhhbV9za2lsbFwiLFxuICAgICAgXCJ3cml0aW5nX3NraWxsXCIsXG4gICAgXSBhcyBzdHJpbmdbXVxuICApLmluY2x1ZGVzKGNhbmRpZGF0ZSA/PyBcIlwiKVxuICAgID8gKGNhbmRpZGF0ZSBhcyBMZWFybmluZ0tpbmQpXG4gICAgOiBcInJlYWRpbmdfc2tpbGxcIjtcbn1cbmZ1bmN0aW9uIHVwZGF0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcyhtYXJrZG93bjogc3RyaW5nLCBzb3VyY2VQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgdXBkYXRlZCA9IG1hcmtkb3duXG4gICAgLnJlcGxhY2VBbGwoXCJCaW5uQWdlbnRYLzAxLVZvY2FidWxhcnkvRGFzaGJvYXJkXCIsIFwiQmlubkFnZW50WC8wMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFwiQmlubkFnZW50WC8wMi1HcmFtbWFyL0Rhc2hib2FyZFwiLCBcIkJpbm5BZ2VudFgvMDItR3JhbW1hci8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIi4uLzAxLVZvY2FidWxhcnkvRGFzaGJvYXJkXCIsIFwiLi4vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIi4uLzAyLUdyYW1tYXIvRGFzaGJvYXJkXCIsIFwiLi4vMDItR3JhbW1hci8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIltbMDEtVm9jYWJ1bGFyeS9EYXNoYm9hcmRcIiwgXCJbWzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJbWzAyLUdyYW1tYXIvRGFzaGJvYXJkXCIsIFwiW1swMi1HcmFtbWFyLzAwLURhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFwiW1tEYXNoYm9hcmR8XHU2MDNCIERhc2hib2FyZFwiLCBcIltbMDAtRGFzaGJvYXJkfFx1NjAzQiBEYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcbiAgICAgICdXSEVSRSBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIiBBTkQgIWNvbnRhaW5zKGZpbGUucGF0aCwgXCIvMDUtVGVtcGxhdGVzL1wiKScsXG4gICAgICAnV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiIEFORCAhY29udGFpbnMoZmlsZS5wYXRoLCBcIi8wNS1UZW1wbGF0ZXMvXCIpJyxcbiAgICApO1xuICBpZiAoXG4gICAgc291cmNlUGF0aC5zdGFydHNXaXRoKGAke0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS9gKSB8fFxuICAgIHNvdXJjZVBhdGguc3RhcnRzV2l0aChgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXIvYClcbiAgKSB7XG4gICAgdXBkYXRlZCA9IHVwZGF0ZWQucmVwbGFjZUFsbChcIltbRGFzaGJvYXJkXV1cIiwgXCJbWzAwLURhc2hib2FyZF1dXCIpO1xuICB9XG4gIGlmIChzb3VyY2VQYXRoLmVuZHNXaXRoKFwiL0Rhc2hib2FyZC5tZFwiKSB8fCBzb3VyY2VQYXRoLmVuZHNXaXRoKFwiLzAwLURhc2hib2FyZC5tZFwiKSkge1xuICAgIHVwZGF0ZWQgPSB1cGRhdGVkLnJlcGxhY2VBbGwoXG4gICAgICAnV0hFUkUgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCInLFxuICAgICAgJ1dIRVJFIGZpbGUubmFtZSAhPSBcIjAwLURhc2hib2FyZFwiIEFORCBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIicsXG4gICAgKTtcbiAgfVxuICByZXR1cm4gdXBkYXRlZDtcbn1cbmZ1bmN0aW9uIHN1bW1hcml6ZShtYXJrZG93bjogc3RyaW5nLCBsaW1pdDogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuIG1hcmtkb3duXG4gICAgLnJlcGxhY2UoL14tLS1bXFxzXFxTXSo/LS0tXFxzKi91LCBcIlwiKVxuICAgIC5yZXBsYWNlKC9gYGBbXFxzXFxTXSo/YGBgL2d1LCBcIlwiKVxuICAgIC5yZXBsYWNlKC8hPyhcXFsoW15cXF1dKilcXF1cXChbXildKlxcKSkvZ3UsIFwiJDJcIilcbiAgICAucmVwbGFjZSgvWyM+Kl9gXS9ndSwgXCIgXCIpXG4gICAgLnJlcGxhY2UoL1xccysvZ3UsIFwiIFwiKVxuICAgIC50cmltKClcbiAgICAuc2xpY2UoMCwgbGltaXQpO1xufVxuZnVuY3Rpb24gc2FmZUZpbGVuYW1lKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gKFxuICAgIHZhbHVlXG4gICAgICAucmVwbGFjZSgvW1xcXFwvOio/XCI8PnxdL2csIFwiLVwiKVxuICAgICAgLnRyaW0oKVxuICAgICAgLnNsaWNlKDAsIDgwKSB8fCBcImFzc2V0XCJcbiAgKTtcbn1cbmZ1bmN0aW9uIHlhbWxTdHJpbmcodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cXFxcL2csIFwiXFxcXFxcXFxcIikucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xufVxuYXN5bmMgZnVuY3Rpb24gc2hhMjU2KHZhbHVlOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBkaWdlc3QgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChcIlNIQS0yNTZcIiwgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHZhbHVlKSk7XG4gIHJldHVybiBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KGRpZ2VzdCksIChieXRlKSA9PiBieXRlLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpLmpvaW4oXCJcIik7XG59XG4iXSwKICAibWFwcGluZ3MiOiAieWFBQUEsSUFBQUEsRUFBQSxHQUFBQyxFQUFBRCxFQUFBLGFBQUFFLElBQUEsZUFBQUMsRUFBQUgsR0FBQSxJQUFBSSxFQUFrRixvQkFrRTVFQyxFQUFlLGFBQ2ZDLEVBQWtCLENBQ3RCLFdBQ0EsZ0JBQ0EsYUFDQSxhQUNBLGFBQ0EsZUFDQSxnQkFDRixFQUNNQyxFQUFlLEdBQUdGLENBQVksWUFDOUJHLEVBQWtCLEdBQUdILENBQVksZ0JBQ2pDSSxFQUFvQixHQUFHSixDQUFZLGtCQUNuQ0ssRUFBMEIsRUFDMUJDLEVBQXVCLENBQzNCLENBQUMsR0FBR04sQ0FBWSxnQkFBaUIsR0FBR0EsQ0FBWSxrQkFBa0IsRUFDbEUsQ0FBQyxHQUFHQSxDQUFZLDhCQUErQixHQUFHQSxDQUFZLGdDQUFnQyxFQUM5RixDQUFDLEdBQUdBLENBQVksMkJBQTRCLEdBQUdBLENBQVksNkJBQTZCLENBQzFGLEVBRU1PLEVBQWlDLENBQ3JDLFdBQVksZ0NBQ1osYUFBYyxHQUNkLFdBQVksR0FDWixlQUFnQixhQUNoQixZQUFhLEdBQ2IsU0FBVSxHQUNWLHFCQUFzQixJQUN0QixTQUFVLEdBQ1YsZUFBZ0IsRUFDaEIsYUFBYyxHQUNkLGNBQWUsR0FDZixnQkFBaUIsRUFDbkIsRUFFTUMsRUFDSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUVJQyxFQUNKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFFSUMsRUFDSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFFSUMsRUFDSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFFSUMsRUFBNEIsK0JBQzVCQyxFQUF1QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUE4SXZCQyxFQUE2QyxDQUNqRCxrQkFBU0gsRUFDVCxrQkFDRTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFDRiw4QkFDRTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFDRiw4QkFDRTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsQ0FDSixFQUVNSSxFQUF3QyxDQUM1QyxDQUFDLEdBQUdmLENBQVksa0JBQWtCLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF5QnJDLENBQUMsR0FBR0EsQ0FBWSw4QkFBVSxFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBb0Q3QixDQUFDLEdBQUdBLENBQVksZ0RBQTRCLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQXVFL0MsQ0FBQyxHQUFHRSxDQUFZLGdEQUFhLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQW9CaEMsQ0FBQyxHQUFHRixDQUFZLGdDQUFnQyxFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBbUJuRCxDQUFDLEdBQUdBLENBQVksNkJBQTZCLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQTRDaEQsQ0FBQyxHQUFHQSxDQUFZLDhEQUEwQyxFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFtQzdELENBQUMsR0FBR0EsQ0FBWSw2QkFBNkIsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFxQmhELENBQUMsR0FBR0EsQ0FBWSx3Q0FBbUMsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQXdDdEQsQ0FBQyxHQUFHQSxDQUFZLHFEQUF1QixFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFB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RUFBRSxTQUFTLEVBQUcsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQ2pHIiwKICAibmFtZXMiOiBbIm1haW5fZXhwb3J0cyIsICJfX2V4cG9ydCIsICJCaW5uQWdlbnRYTGVhcm5pbmdTeW5jUGx1Z2luIiwgIl9fdG9Db21tb25KUyIsICJpbXBvcnRfb2JzaWRpYW4iLCAiTElCUkFSWV9ST09UIiwgIkxJQlJBUllfRk9MREVSUyIsICJJTkJPWF9GT0xERVIiLCAiVEVNUExBVEVfRk9MREVSIiwgIkFUVEFDSE1FTlRfRk9MREVSIiwgIkNVUlJFTlRfTElCUkFSWV9WRVJTSU9OIiwgIkRBU0hCT0FSRF9NSUdSQVRJT05TIiwgIkRFRkFVTFRfU0VUVElOR1MiLCAiTEVHQUNZX1ZPQ0FCVUxBUllfVEVNUExBVEUiLCAiQklESVJFQ1RJT05BTF9WT0NBQlVMQVJZX1RFTVBMQVRFIiwgIlNJTVBMRV9WT0NBQlVMQVJZX1RFTVBMQVRFIiwgIlZPQ0FCVUxBUllfVEVNUExBVEUiLCAiUkVWSUVXX1NUWUxFX1NOSVBQRVRfTkFNRSIsICJSRVZJRVdfU1RZTEVfU05JUFBFVCIsICJMRUFSTklOR19URU1QTEFURVMiLCAiTElCUkFSWV9OT1RFUyIsICJCaW5uQWdlbnRYU2V0dGluZ1RhYiIsICJlcnJvciIsICJtZXNzYWdlIiwgImZvbGRlcnMiLCAic3BsaXRTY29wZSIsICJ0YWdzIiwgInRhZyIsICJmaWxlcyIsICJmaWxlIiwgImlzQWxsb3dlZCIsICJjYWNoZSIsICJmcm9udG1hdHRlciIsICJ1bmlxdWVTdHJpbmdzIiwgImFycmF5U3RyaW5ncyIsICJpbmZlcktpbmQiLCAic3VtbWFyaXplIiwgImVudHJpZXMiLCAiZW50cnkiLCAic2hvd05vdGljZSIsICJpbnN0YWxsZWQiLCAibmFtZSIsICJmb2xkZXIiLCAiY29udGVudCIsICJwYXRoIiwgIm1pZ3JhdGVkIiwgImxlZ2FjeVBhdGgiLCAidGFyZ2V0UGF0aCIsICJsZWdhY3kiLCAidXBkYXRlZCIsICJ1cGRhdGVNYW5hZ2VkRGFzaGJvYXJkTGlua3MiLCAiY29uZmlndXJhYmxlVmF1bHQiLCAiYWRhcHRlciIsICJzbmlwcGV0Rm9sZGVyIiwgInNuaXBwZXRQYXRoIiwgImNoYW5nZWQiLCAiYXBwZWFyYW5jZVBhdGgiLCAiYXBwZWFyYW5jZSIsICJyYXciLCAicGFyc2VkIiwgImVuYWJsZWQiLCAicGF0Y2giLCAiY3VycmVudCIsICJleHBvcnRlZCIsICJyZXNwb25zZSIsICJyZXN1bHQiLCAib3JnYW5pemVkIiwgIm9yZ2FuaXphdGlvblN1bW1hcnkiLCAic3VtbWFyaXplT3JnYW5pemF0aW9uIiwgInN5bmNTdW1tYXJ5IiwgInBsYW4iLCAiYWxsb3dlZFRhcmdldHMiLCAiY29tcGxldGVkIiwgImFjdGlvbiIsICJmaWxlTmFtZSIsICJleHRlbnNpb25JbmRleCIsICJiYXNlTmFtZSIsICJleHRlbnNpb24iLCAiYmFzZVBhdGgiLCAicmV0cnlQYXRoIiwgInNvdXJjZSIsICJiYXNlIiwgImhlYWRlcnMiLCAiZXhwb3J0cyIsICJpdGVtIiwgImRpZ2VzdCIsICJzaGEyNTYiLCAiYWNrIiwgImZpbGVuYW1lIiwgInNhZmVGaWxlbmFtZSIsICJleGlzdGluZyIsICJ5YW1sU3RyaW5nIiwgImJvZHkiLCAiYXBwIiwgInBsdWdpbiIsICJjb250YWluZXJFbCIsICJidXR0b24iLCAidG9nZ2xlIiwgInZhbHVlIiwgInRleHQiLCAiZm9sZGVyTGFiZWxzIiwgImNvdW50cyIsICJsYWJlbCIsICJkZXN0aW5hdGlvbnMiLCAiY291bnQiLCAicGFydCIsICJ2YWx1ZXMiLCAicGF0aEFsbG93ZWQiLCAiZmlsZVRhZ3MiLCAiY2FuZGlkYXRlIiwgIm1hcmtkb3duIiwgInNvdXJjZVBhdGgiLCAibGltaXQiLCAiYnl0ZSJdCn0K
