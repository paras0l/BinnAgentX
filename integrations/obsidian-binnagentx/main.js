"use strict";
var _ = Object.defineProperty;
var O = Object.getOwnPropertyDescriptor;
var I = Object.getOwnPropertyNames;
var C = Object.prototype.hasOwnProperty;
var F = (i, n) => {
    for (var t in n) _(i, t, { get: n[t], enumerable: !0 });
  },
  L = (i, n, t, a) => {
    if ((n && typeof n == "object") || typeof n == "function")
      for (let e of I(n))
        !C.call(i, e) &&
          e !== t &&
          _(i, e, { get: () => n[e], enumerable: !(a = O(n, e)) || a.enumerable });
    return i;
  };
var V = (i) => L(_({}, "__esModule", { value: !0 }), i);
var Q = {};
F(Q, { default: () => f });
module.exports = V(Q);
var c = require("obsidian"),
  o = "BinnAgentX",
  N = [
    "00-Inbox",
    "01-Vocabulary",
    "02-Grammar",
    "03-Reading",
    "04-Writing",
    "05-Templates",
    "06-Attachments",
  ],
  b = `${o}/00-Inbox`,
  y = `${o}/05-Templates`,
  k = `${o}/06-Attachments`,
  E = 6,
  X = [
    [`${o}/Dashboard.md`, `${o}/00-Dashboard.md`],
    [`${o}/01-Vocabulary/Dashboard.md`, `${o}/01-Vocabulary/00-Dashboard.md`],
    [`${o}/02-Grammar/Dashboard.md`, `${o}/02-Grammar/00-Dashboard.md`],
  ],
  R = {
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
  z = `---
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

> \u5148\u586B\u5199\u201C\u6838\u5FC3\u542B\u4E49\u201D\u3002\u4E0B\u9762\u4E24\u5F20\u5361\u4F1A\u590D\u7528\u540C\u4E00\u4EFD\u5185\u5BB9\uFF0C\u4E0D\u9700\u8981\u91CD\u590D\u7EF4\u62A4\u91CA\u4E49\u3002

{{title}} \u7684\u6838\u5FC3\u542B\u4E49\u662F\u4EC0\u4E48\uFF1F::![[#\u6838\u5FC3\u542B\u4E49]]

\u4E0B\u9762\u8FD9\u6BB5\u542B\u4E49\u5BF9\u5E94\u54EA\u4E2A\u5355\u8BCD\u6216\u77ED\u8BED\uFF1F ![[#\u6838\u5FC3\u542B\u4E49]]::{{title}}

## \u5173\u8054
- [[BinnAgentX/01-Vocabulary/00-Dashboard|\u8BCD\u6C47 Dashboard]]
- [[BinnAgentX/Spaced Repetition \u4F7F\u7528\u6307\u5357|Spaced Repetition \u4F7F\u7528\u6307\u5357]]
`,
  W = `---
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
  T = `---
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
  v = "binnagentx-spaced-repetition",
  G = `/* BinnAgentX vocabulary review cards */
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
  U = {
    "\u8BCD\u6C47.md": T,
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
  B = {
    [`${o}/00-Dashboard.md`]: `# BinnAgentX \u5B66\u4E60\u5730\u56FE

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
    [`${o}/\u4F7F\u7528\u6307\u5357.md`]: `---
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
    [`${o}/Spaced Repetition \u4F7F\u7528\u6307\u5357.md`]: `---
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
    [`${b}/\u6536\u96C6\u7BB1\u4F7F\u7528\u8BF4\u660E.md`]: `---
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
    [`${o}/01-Vocabulary/00-Dashboard.md`]: `# \u8BCD\u6C47 Dashboard

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
    [`${o}/01-Vocabulary/resilient.md`]: `---
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
    [`${o}/01-Vocabulary/Spaced Repetition \u95EA\u5361\u793A\u4F8B.md`]: `---
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
    [`${o}/02-Grammar/00-Dashboard.md`]: `# \u8BED\u6CD5 Dashboard

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
    [`${o}/02-Grammar/although \u4E0E despite.md`]: `---
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
    [`${o}/03-Reading/\u9605\u8BFB\u7B14\u8BB0\u793A\u4F8B.md`]: `---
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
    [`${o}/04-Writing/\u5199\u4F5C\u7EC3\u4E60\u793A\u4F8B.md`]: `---
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
  f = class extends c.Plugin {
    settings = R;
    async onload() {
      (await this.loadSettings(),
        this.addSettingTab(new S(this.app, this)),
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
      this.settings = { ...R, ...(await this.loadData()) };
    }
    async saveSettings() {
      await this.saveData(this.settings);
    }
    async handleLayoutReady() {
      if (this.settings.libraryVersion < E)
        try {
          await this.initializeLearningLibrary(!1);
        } catch (n) {
          let t = n instanceof Error ? n.message : "\u672A\u77E5\u9519\u8BEF";
          new c.Notice(`BinnAgentX \u5B66\u4E60\u5E93\u521D\u59CB\u5316\u5931\u8D25\uFF1A${t}`);
        }
      this.settings.autoSync && (await this.sync(!1));
    }
    async collectEntriesAsync(n = new Set()) {
      let t = P(this.settings.allowedFolders),
        a = P(this.settings.allowedTags).map((s) => s.replace(/^#/, ""));
      if (!t.length && !a.length)
        throw new Error(
          "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u5141\u8BB8\u540C\u6B65\u7684\u6587\u4EF6\u5939\u6216\u6807\u7B7E",
        );
      let e = this.app.vault.getMarkdownFiles().filter((s) => H(s, t, a, this.app));
      if (e.length > this.settings.maxNotes)
        throw new Error(
          `\u5339\u914D\u5230 ${e.length} \u7BC7\u7B14\u8BB0\uFF0C\u8BF7\u7F29\u5C0F\u8303\u56F4\uFF08\u4E0A\u9650 ${this.settings.maxNotes}\uFF09`,
        );
      return Promise.all(
        e.map(async (s) => {
          let r = this.app.metadataCache.getFileCache(s),
            l = r?.frontmatter ?? {},
            g = D([...x(l.tags), ...(r?.tags ?? []).map((p) => p.tag.replace(/^#/, ""))]),
            d = await this.app.vault.read(s),
            u =
              t.find((p) => s.path.startsWith(p)) ??
              `${s.path.slice(0, s.path.lastIndexOf("/") + 1)}`;
          return {
            source_key: s.path,
            asset_id: typeof l.binnagent_asset_id == "string" ? l.binnagent_asset_id : void 0,
            title: String(l.title ?? s.basename),
            kind: J(l.binnagent_kind, g),
            tags: g,
            excerpt: q(d, this.settings.maxExcerptCharacters),
            modified_at: new Date(s.stat.mtime).toISOString(),
            ...(n.has(s.path)
              ? { authorized_content: { scope_prefix: u, content: d, content_hash: await A(d) } }
              : {}),
          };
        }),
      );
    }
    async preview() {
      try {
        let n = await this.collectEntriesAsync();
        new c.Notice(
          `\u5C06\u540C\u6B65 ${n.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF1A${
            n
              .slice(0, 4)
              .map((t) => t.title)
              .join("\u3001") || "\u65E0"
          }`,
        );
      } catch (n) {
        new c.Notice(
          n instanceof Error ? n.message : "\u65E0\u6CD5\u9884\u89C8\u540C\u6B65\u8303\u56F4",
        );
      }
    }
    async initializeLearningLibrary(n = !0) {
      let t = 0;
      this.app.vault.getAbstractFileByPath(o) || (await this.app.vault.createFolder(o), (t += 1));
      for (let a of N) {
        let e = `${o}/${a}`;
        this.app.vault.getAbstractFileByPath(e) || (await this.app.vault.createFolder(e), (t += 1));
      }
      ((t += await this.migrateManagedDashboards()),
        await this.rewriteManagedDashboardLinks(),
        (t += await this.migrateManagedVocabularyTemplate()));
      for (let [a, e] of Object.entries(U))
        this.app.vault.getAbstractFileByPath(`${y}/${a}`) ||
          (await this.app.vault.create(`${y}/${a}`, e), (t += 1));
      for (let [a, e] of Object.entries(B))
        this.app.vault.getAbstractFileByPath(a) || (await this.app.vault.create(a, e), (t += 1));
      (await this.configureObsidianFolders(),
        (t += await this.installReviewStyleSnippet()),
        (this.settings.libraryVersion = E),
        await this.saveSettings(),
        n &&
          new c.Notice(
            t
              ? `BinnAgentX \u5B66\u4E60\u5E93\u5DF2\u521D\u59CB\u5316\uFF08\u8865\u9F50\u6216\u66F4\u65B0 ${t} \u9879\uFF09`
              : "BinnAgentX \u5B66\u4E60\u5E93\u5DF2\u5C31\u7EEA\uFF0C\u672A\u8986\u76D6\u4F60\u7684\u4FEE\u6539",
          ));
    }
    async migrateManagedDashboards() {
      let n = 0;
      for (let [t, a] of X) {
        let e = this.app.vault.getAbstractFileByPath(t);
        !(e instanceof c.TFile) ||
          this.app.vault.getAbstractFileByPath(a) ||
          (await this.app.vault.rename(e, a), (n += 1));
      }
      return n;
    }
    async migrateManagedVocabularyTemplate() {
      let n = `${y}/\u8BCD\u6C47.md`,
        t = this.app.vault.getAbstractFileByPath(n);
      if (!(t instanceof c.TFile)) return 0;
      let a = await this.app.vault.read(t);
      return a !== z && a !== M && a !== W ? 0 : (await this.app.vault.modify(t, T), 1);
    }
    async rewriteManagedDashboardLinks() {
      let n = this.app.vault
        .getMarkdownFiles()
        .filter((t) => t.path === `${o}.md` || t.path.startsWith(`${o}/`));
      for (let t of n) {
        let a = await this.app.vault.read(t),
          e = Y(a, t.path);
        e !== a && (await this.app.vault.modify(t, e));
      }
    }
    async configureObsidianFolders() {
      let n = this.app.vault;
      (typeof n.setConfig == "function"
        ? n.setConfig("attachmentFolderPath", k)
        : await this.mergeConfigFile(`${this.app.vault.configDir}/app.json`, {
            attachmentFolderPath: k,
          }),
        await this.mergeConfigFile(`${this.app.vault.configDir}/templates.json`, { folder: y }));
    }
    async installReviewStyleSnippet() {
      let n = this.app.vault.adapter,
        t = `${this.app.vault.configDir}/snippets`,
        a = `${t}/${v}.css`,
        e = 0;
      ((await n.exists(t)) || (await n.mkdir(t)),
        (await n.exists(a)) || (await n.write(a, G), (e += 1)));
      let s = `${this.app.vault.configDir}/appearance.json`,
        r = {};
      if (await n.exists(s)) {
        let g = await n.read(s);
        try {
          let d = JSON.parse(g);
          d && typeof d == "object" && !Array.isArray(d) && (r = d);
        } catch {
          throw new Error(
            `\u65E0\u6CD5\u542F\u7528 BinnAgentX \u95EA\u5361\u6837\u5F0F\uFF1A${s} \u4E0D\u662F\u6709\u6548\u7684 JSON`,
          );
        }
      }
      let l = x(r.enabledCssSnippets);
      return (
        l.includes(v) ||
          (await n.write(
            s,
            `${JSON.stringify({ ...r, enabledCssSnippets: [...l, v] }, null, 2)}
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
        let r = await a.read(n);
        try {
          let l = JSON.parse(r);
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
          new c.Notice(
            "\u8BF7\u5148\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u586B\u5199 BinnAgentX \u8FDE\u63A5\u51ED\u636E",
          );
        return;
      }
      try {
        let t = await this.pullPendingAssets(),
          a = await this.collectEntriesAsync(),
          e = await this.importEntries(a),
          s = new Set(e.organization?.needs_full_content_source_keys ?? []);
        if (s.size) {
          let d = await this.collectEntriesAsync(s),
            u = [...s].filter((p) => !d.some((h) => h.source_key === p && h.authorized_content));
          if (u.length)
            throw new Error(
              `\u65E0\u6CD5\u8BFB\u53D6\u670D\u52A1\u5668\u8BF7\u6C42\u7684\u6388\u6743\u539F\u6587\uFF1A${u.join("\u3001")}`,
            );
          e = await this.importEntries(d);
        }
        let r = await this.applyOrganizationPlan(e.organization),
          l = j(e.organization, r),
          g =
            `\u63A5\u6536 ${t} \u6761\u8D44\u4EA7\uFF0C\u4E0A\u4F20 ${a.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF1B` +
            l;
        ((this.settings.lastSyncedAt = new Date().toISOString()),
          (this.settings.lastSyncError = ""),
          (this.settings.lastSyncSummary = g),
          await this.saveSettings(),
          n && new c.Notice(`\u53CC\u5411\u540C\u6B65\u5B8C\u6210\uFF1A${g}`));
      } catch (t) {
        let a = t instanceof Error ? t.message : "\u540C\u6B65\u5931\u8D25";
        ((this.settings.lastSyncError = a), await this.saveSettings(), n && new c.Notice(a));
      }
    }
    async importEntries(n) {
      let t = await (0, c.requestUrl)({
        url: `${this.settings.apiBaseUrl.replace(/\/$/, "")}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/import`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.settings.syncSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schema_version: "learning-context/v1",
          vault_name: this.app.vault.getName(),
          entries: n,
        }),
        throw: !1,
      });
      if (t.status < 200 || t.status >= 300)
        throw new Error(`BinnAgentX \u62D2\u7EDD\u540C\u6B65\uFF08${t.status}\uFF09`);
      return t.json;
    }
    async applyOrganizationPlan(n) {
      if (n?.status !== "planned" || !n.actions.length) return 0;
      let t = new Set([
          `${o}/01-Vocabulary`,
          `${o}/02-Grammar`,
          `${o}/03-Reading`,
          `${o}/04-Writing`,
        ]),
        a = [],
        e = {};
      for (let r of n.actions) {
        if (!r.source_key.startsWith(`${b}/`) || !t.has(r.target_folder)) continue;
        let l = r.source_key.slice(r.source_key.lastIndexOf("/") + 1),
          g = l.lastIndexOf("."),
          d = g > 0 ? l.slice(0, g) : l,
          u = g > 0 ? l.slice(g + 1) : "md",
          p = `${r.target_folder}/${l}`,
          h = `${r.target_folder}/${d}-${r.action_id.slice(0, 6)}.${u}`,
          $ = this.app.vault.getAbstractFileByPath(r.source_key);
        if (!($ instanceof c.TFile)) {
          (this.app.vault.getAbstractFileByPath(p) instanceof c.TFile ||
            this.app.vault.getAbstractFileByPath(h) instanceof c.TFile) &&
            (a.push(r.action_id),
            (e[r.action_id] = this.app.vault.getAbstractFileByPath(p) instanceof c.TFile ? p : h));
          continue;
        }
        let w = this.app.vault.getAbstractFileByPath(p) ? h : p;
        this.app.vault.getAbstractFileByPath(w) ||
          (await this.app.vault.rename($, w), a.push(r.action_id), (e[r.action_id] = w));
      }
      if (a.length !== n.actions.length)
        throw new Error(
          "Inbox \u6574\u7406\u672A\u5168\u90E8\u5B8C\u6210\uFF1B\u672A\u79FB\u52A8\u7684\u7B14\u8BB0\u4F1A\u4FDD\u7559\u5728\u539F\u5904\uFF0C\u4E0B\u6B21\u540C\u6B65\u91CD\u8BD5",
        );
      let s = await (0, c.requestUrl)({
        url: `${this.settings.apiBaseUrl.replace(/\/$/, "")}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/organizer-runs/${encodeURIComponent(n.run_id)}/ack`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.settings.syncSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed_action_ids: a, completed_source_keys: e }),
        throw: !1,
      });
      if (s.status < 200 || s.status >= 300)
        throw new Error(`Inbox \u6574\u7406\u56DE\u6267\u5931\u8D25\uFF08${s.status}\uFF09`);
      return a.length;
    }
    async pullPendingAssets() {
      let n = this.settings.apiBaseUrl.replace(/\/$/, ""),
        t = { Authorization: `Bearer ${this.settings.syncSecret}` },
        a = await (0, c.requestUrl)({
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
      for (let r of e) {
        let l =
            r.operation === "APPEND_PATCH"
              ? await this.applyAssetPatch(r)
              : await this.createAssetNote(r),
          g = await this.app.vault.read(l),
          d = await A(g),
          u = await (0, c.requestUrl)({
            url: `${n}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports/${encodeURIComponent(r.asset_id)}/ack`,
            method: "POST",
            headers: { ...t, "Content-Type": "application/json" },
            body: JSON.stringify({
              source_key: l.path,
              content_hash: d,
              modified_at: new Date(l.stat.mtime).toISOString(),
              vault_name: this.app.vault.getName(),
              export_id: r.export_id,
            }),
            throw: !1,
          });
        if (u.status < 200 || u.status >= 300)
          throw new Error(
            `\u8D44\u4EA7\u540C\u6B65\u56DE\u6267\u5931\u8D25\uFF08${u.status}\uFF09`,
          );
        s += 1;
      }
      return s;
    }
    async applyAssetPatch(n) {
      let t = this.findAssetFile(n);
      if (!(t instanceof c.TFile))
        throw new Error(
          `\u65E0\u6CD5\u5B9A\u4F4D\u5F85\u66F4\u65B0\u8D44\u4EA7\uFF1A${n.asset_id}`,
        );
      let a = await this.app.vault.read(t),
        e = await A(a),
        s = n.knowledge_proposal_id ? `<!-- knowledge_proposal:${n.knowledge_proposal_id} -->` : "";
      if (s && a.includes(s)) return t;
      if (n.expected_content_hash && e !== n.expected_content_hash)
        throw new Error(
          `\u8D44\u4EA7\u5DF2\u5728 Obsidian \u4E2D\u4FEE\u6539\uFF0C\u62D2\u7EDD\u8986\u76D6\uFF1A${t.path}`,
        );
      if (!n.patch_content)
        throw new Error(`\u8D44\u4EA7\u8865\u4E01\u4E3A\u7A7A\uFF1A${n.export_id}`);
      return (await this.app.vault.modify(t, `${a.trimEnd()}${n.patch_content}`), t);
    }
    findAssetFile(n) {
      if (n.source_key) {
        let t = this.app.vault.getAbstractFileByPath(n.source_key);
        if (t instanceof c.TFile) return t;
      }
      for (let t of this.app.vault.getMarkdownFiles())
        if (this.app.metadataCache.getFileCache(t)?.frontmatter?.binnagent_asset_id === n.asset_id)
          return t;
      return null;
    }
    async createAssetNote(n) {
      (this.app.vault.getAbstractFileByPath(o) || (await this.app.vault.createFolder(o)),
        this.app.vault.getAbstractFileByPath(b) || (await this.app.vault.createFolder(b)));
      let t = b,
        a = `${K(n.title)}-${n.asset_id.slice(-10)}.md`,
        e = `${t}/${a}`,
        s = this.app.vault.getAbstractFileByPath(e);
      if (s instanceof c.TFile) return s;
      let r = D(["binnagent", n.kind, ...n.tags]),
        l = [
          "---",
          'binnagent_schema: "asset/v1"',
          `binnagent_asset_id: "${m(n.asset_id)}"`,
          `binnagent_kind: "${m(n.kind)}"`,
          `binnagent_source_type: "${m(n.source_type)}"`,
          "inbox_status: unprocessed",
          `title: "${m(n.title)}"`,
          ...(n.source_task_id ? [`binnagent_source_task_id: "${m(n.source_task_id)}"`] : []),
          "tags:",
          ...r.map((d) => `  - ${d}`),
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
  S = class extends c.PluginSettingTab {
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
        new c.Setting(t)
          .setName("\u521D\u59CB\u5316\u5B66\u4E60\u5E93")
          .setDesc(
            "\u521B\u5EFA 00\u201306 \u76EE\u5F55\u3001MOC / Dataview Dashboard\u3001\u652F\u6301\u95EA\u5361\u7684\u8BCD\u6C47\u6A21\u677F\u3001Spaced Repetition \u6307\u5357\u4E0E\u5165\u95E8\u793A\u4F8B\uFF1B\u4E0D\u4F1A\u8986\u76D6\u4F60\u7684\u4FEE\u6539\u3002",
          )
          .addButton((a) =>
            a.setButtonText("\u68C0\u67E5\u5E76\u8865\u9F50").onClick(async () => {
              await this.plugin.initializeLearningLibrary();
            }),
          ),
        new c.Setting(t)
          .setName("\u81EA\u52A8\u53CC\u5411\u540C\u6B65")
          .setDesc(
            "Obsidian \u542F\u52A8\u540E\u53CA\u6BCF 60 \u79D2\u540C\u6B65\u4E00\u6B21\u5DF2\u6388\u6743\u8303\u56F4\uFF1B\u53EF\u968F\u65F6\u5173\u95ED\u5E76\u6539\u7528\u624B\u52A8\u547D\u4EE4\u3002",
          )
          .addToggle((a) =>
            a.setValue(this.plugin.settings.autoSync).onChange(async (e) => {
              ((this.plugin.settings.autoSync = e), await this.plugin.saveSettings());
            }),
          ),
        new c.Setting(t)
          .setName("\u6700\u8FD1\u540C\u6B65")
          .setDesc(
            this.plugin.settings.lastSyncError
              ? `\u5931\u8D25\uFF1A${this.plugin.settings.lastSyncError}`
              : this.plugin.settings.lastSyncedAt
                ? `${this.plugin.settings.lastSyncedAt}\uFF1B${this.plugin.settings.lastSyncSummary || "\u540C\u6B65\u5B8C\u6210"}`
                : "\u5C1A\u672A\u5B8C\u6210\u540C\u6B65",
          ),
        new c.Setting(t)
          .setName("\u5141\u8BB8\u7684\u6587\u4EF6\u5939")
          .setDesc(
            "\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 BinnAgentX, \u82F1\u8BED/\u8BED\u6CD5",
          )
          .addText((a) =>
            a.setValue(this.plugin.settings.allowedFolders).onChange(async (e) => {
              ((this.plugin.settings.allowedFolders = e), await this.plugin.saveSettings());
            }),
          ),
        new c.Setting(t)
          .setName("\u5141\u8BB8\u7684\u6807\u7B7E")
          .setDesc(
            "\u53EF\u9009\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 binnagent-vocabulary, grammar",
          )
          .addText((a) =>
            a.setValue(this.plugin.settings.allowedTags).onChange(async (e) => {
              ((this.plugin.settings.allowedTags = e), await this.plugin.saveSettings());
            }),
          ),
        new c.Setting(t)
          .setName("BinnAgentX \u5730\u5740")
          .setDesc("\u672C\u673A\u9ED8\u8BA4\uFF1Ahttp://127.0.0.1:8000/learner")
          .addText((a) =>
            a.setValue(this.plugin.settings.apiBaseUrl).onChange(async (e) => {
              ((this.plugin.settings.apiBaseUrl = e), await this.plugin.saveSettings());
            }),
          ),
        new c.Setting(t).setName("\u8FDE\u63A5 ID").addText((a) =>
          a.setValue(this.plugin.settings.connectionId).onChange(async (e) => {
            ((this.plugin.settings.connectionId = e), await this.plugin.saveSettings());
          }),
        ),
        new c.Setting(t)
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
function j(i, n) {
  if (!i) return "\u672C\u8F6E\u6CA1\u6709\u6392\u961F\u7684 Inbox \u6574\u7406\u4EFB\u52A1\u3002";
  if (i.status === "noop") return "Inbox \u4E2D\u6CA1\u6709\u5F85\u6574\u7406\u7B14\u8BB0\u3002";
  if (i.status === "queued")
    return `Inbox \u6709 ${i.inbox_count} \u6761\u5F85\u6574\u7406\u7B14\u8BB0\uFF0C\u53EF\u9760\u5206\u7C7B ${i.classified_count} \u6761\uFF1B\u672C\u8F6E\u672A\u79FB\u52A8\uFF0C\u4EFB\u52A1\u4F1A\u5728\u4E0B\u6B21\u540C\u6B65\u91CD\u8BD5\u3002`;
  let t = {
      [`${o}/01-Vocabulary`]: "\u8BCD\u6C47",
      [`${o}/02-Grammar`]: "\u8BED\u6CD5",
      [`${o}/03-Reading`]: "\u9605\u8BFB",
      [`${o}/04-Writing`]: "\u5199\u4F5C",
    },
    a = new Map();
  for (let s of i.actions) {
    let r = t[s.target_folder] ?? s.target_folder;
    a.set(r, (a.get(r) ?? 0) + 1);
  }
  let e = [...a.entries()].map(([s, r]) => `${s} ${r} \u6761`).join("\u3001");
  return `\u6574\u7406\u5B8C\u6210\uFF1A\u79FB\u52A8 ${n} \u6761 Inbox \u7B14\u8BB0\uFF08${e}\uFF09\u3002`;
}
function P(i) {
  return i
    .split(",")
    .map((n) => n.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
}
function x(i) {
  return Array.isArray(i) ? i.filter((n) => typeof n == "string") : typeof i == "string" ? [i] : [];
}
function D(i) {
  return [...new Set(i.map((n) => n.replace(/^#/, "").trim()).filter(Boolean))];
}
function H(i, n, t, a) {
  let e = a.metadataCache.getFileCache(i);
  if (
    i.path.startsWith(`${y}/`) ||
    i.path.startsWith("BinnAgentX/Templates/") ||
    i.basename === "Dashboard" ||
    i.basename === "00-Dashboard" ||
    Object.prototype.hasOwnProperty.call(B, i.path) ||
    e?.frontmatter?.binnagent_sync === !1
  )
    return !1;
  let s = n.some((l) => i.path === l || i.path.startsWith(`${l}/`)),
    r = D([...(e?.tags ?? []).map((l) => l.tag), ...x(e?.frontmatter?.tags)]);
  return s || t.some((l) => r.includes(l));
}
function J(i, n) {
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
function Y(i, n) {
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
    (n.startsWith(`${o}/01-Vocabulary/`) || n.startsWith(`${o}/02-Grammar/`)) &&
      (t = t.replaceAll("[[Dashboard]]", "[[00-Dashboard]]")),
    (n.endsWith("/Dashboard.md") || n.endsWith("/00-Dashboard.md")) &&
      (t = t.replaceAll(
        'WHERE file.name != "Dashboard"',
        'WHERE file.name != "00-Dashboard" AND file.name != "Dashboard"',
      )),
    t
  );
}
function q(i, n) {
  return i
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/```[\s\S]*?```/gu, "")
    .replace(/!?(\[([^\]]*)\]\([^)]*\))/gu, "$2")
    .replace(/[#>*_`]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, n);
}
function K(i) {
  return (
    i
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim()
      .slice(0, 80) || "asset"
  );
}
function m(i) {
  return i.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
async function A(i) {
  let n = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(i));
  return Array.from(new Uint8Array(n), (t) => t.toString(16).padStart(2, "0")).join("");
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEFwcCwgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIFRGaWxlLCByZXF1ZXN0VXJsIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbnR5cGUgTGVhcm5pbmdLaW5kID1cbiAgfCBcInZvY2FidWxhcnlcIlxuICB8IFwiZ3JhbW1hclwiXG4gIHwgXCJ3cml0aW5nX2V4cHJlc3Npb25cIlxuICB8IFwicmVhZGluZ19za2lsbFwiXG4gIHwgXCJleGFtX3NraWxsXCJcbiAgfCBcIndyaXRpbmdfc2tpbGxcIjtcblxuaW50ZXJmYWNlIFN5bmNTZXR0aW5ncyB7XG4gIGFwaUJhc2VVcmw6IHN0cmluZztcbiAgY29ubmVjdGlvbklkOiBzdHJpbmc7XG4gIHN5bmNTZWNyZXQ6IHN0cmluZztcbiAgYWxsb3dlZEZvbGRlcnM6IHN0cmluZztcbiAgYWxsb3dlZFRhZ3M6IHN0cmluZztcbiAgbWF4Tm90ZXM6IG51bWJlcjtcbiAgbWF4RXhjZXJwdENoYXJhY3RlcnM6IG51bWJlcjtcbiAgYXV0b1N5bmM6IGJvb2xlYW47XG4gIGxpYnJhcnlWZXJzaW9uOiBudW1iZXI7XG4gIGxhc3RTeW5jZWRBdDogc3RyaW5nO1xuICBsYXN0U3luY0Vycm9yOiBzdHJpbmc7XG4gIGxhc3RTeW5jU3VtbWFyeTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTGVhcm5pbmdDb250ZXh0RW50cnkge1xuICBzb3VyY2Vfa2V5OiBzdHJpbmc7XG4gIGFzc2V0X2lkPzogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHRhZ3M6IHN0cmluZ1tdO1xuICBleGNlcnB0OiBzdHJpbmc7XG4gIG1vZGlmaWVkX2F0OiBzdHJpbmc7XG4gIGF1dGhvcml6ZWRfY29udGVudD86IHtcbiAgICBzY29wZV9wcmVmaXg6IHN0cmluZztcbiAgICBjb250ZW50OiBzdHJpbmc7XG4gICAgY29udGVudF9oYXNoOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBQZW5kaW5nQXNzZXRFeHBvcnQge1xuICBleHBvcnRfaWQ6IHN0cmluZztcbiAgYXNzZXRfaWQ6IHN0cmluZztcbiAga2luZDogTGVhcm5pbmdLaW5kO1xuICB0aXRsZTogc3RyaW5nO1xuICB0YWdzOiBzdHJpbmdbXTtcbiAgc291cmNlX3R5cGU6IHN0cmluZztcbiAgc291cmNlX3Rhc2tfaWQ6IHN0cmluZyB8IG51bGw7XG4gIGluaXRpYWxfY29udGVudDogc3RyaW5nIHwgbnVsbDtcbiAgb3BlcmF0aW9uOiBcIkNSRUFURVwiIHwgXCJBUFBFTkRfUEFUQ0hcIjtcbiAgc291cmNlX2tleTogc3RyaW5nIHwgbnVsbDtcbiAgZXhwZWN0ZWRfY29udGVudF9oYXNoOiBzdHJpbmcgfCBudWxsO1xuICBwYXRjaF9jb250ZW50OiBzdHJpbmcgfCBudWxsO1xuICBrbm93bGVkZ2VfcHJvcG9zYWxfaWQ6IHN0cmluZyB8IG51bGw7XG59XG5cbmludGVyZmFjZSBPcmdhbml6YXRpb25BY3Rpb24ge1xuICBhY3Rpb25faWQ6IHN0cmluZztcbiAgc291cmNlX2tleTogc3RyaW5nO1xuICB0YXJnZXRfZm9sZGVyOiBzdHJpbmc7XG4gIGtpbmQ6IExlYXJuaW5nS2luZDtcbiAgcmVhc29uOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBPcmdhbml6YXRpb25QbGFuIHtcbiAgcnVuX2lkOiBzdHJpbmc7XG4gIHN0YXR1czogXCJxdWV1ZWRcIiB8IFwicGxhbm5lZFwiIHwgXCJub29wXCI7XG4gIGluYm94X2NvdW50OiBudW1iZXI7XG4gIGNsYXNzaWZpZWRfY291bnQ6IG51bWJlcjtcbiAgYWN0aW9uczogT3JnYW5pemF0aW9uQWN0aW9uW107XG4gIGtub3dsZWRnZV9zdGF0dXM6IHN0cmluZztcbiAgbmVlZHNfZnVsbF9jb250ZW50X3NvdXJjZV9rZXlzOiBzdHJpbmdbXTtcbn1cblxuaW50ZXJmYWNlIEltcG9ydFJlc3BvbnNlIHtcbiAgaW1wb3J0ZWQ6IG51bWJlcjtcbiAgb3JnYW5pemF0aW9uOiBPcmdhbml6YXRpb25QbGFuIHwgbnVsbDtcbn1cblxuY29uc3QgTElCUkFSWV9ST09UID0gXCJCaW5uQWdlbnRYXCI7XG5jb25zdCBMSUJSQVJZX0ZPTERFUlMgPSBbXG4gIFwiMDAtSW5ib3hcIixcbiAgXCIwMS1Wb2NhYnVsYXJ5XCIsXG4gIFwiMDItR3JhbW1hclwiLFxuICBcIjAzLVJlYWRpbmdcIixcbiAgXCIwNC1Xcml0aW5nXCIsXG4gIFwiMDUtVGVtcGxhdGVzXCIsXG4gIFwiMDYtQXR0YWNobWVudHNcIixcbl0gYXMgY29uc3Q7XG5jb25zdCBJTkJPWF9GT0xERVIgPSBgJHtMSUJSQVJZX1JPT1R9LzAwLUluYm94YDtcbmNvbnN0IFRFTVBMQVRFX0ZPTERFUiA9IGAke0xJQlJBUllfUk9PVH0vMDUtVGVtcGxhdGVzYDtcbmNvbnN0IEFUVEFDSE1FTlRfRk9MREVSID0gYCR7TElCUkFSWV9ST09UfS8wNi1BdHRhY2htZW50c2A7XG5jb25zdCBDVVJSRU5UX0xJQlJBUllfVkVSU0lPTiA9IDY7XG5jb25zdCBEQVNIQk9BUkRfTUlHUkFUSU9OUyA9IFtcbiAgW2Ake0xJQlJBUllfUk9PVH0vRGFzaGJvYXJkLm1kYCwgYCR7TElCUkFSWV9ST09UfS8wMC1EYXNoYm9hcmQubWRgXSxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS9EYXNoYm9hcmQubWRgLCBgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkLm1kYF0sXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXIvRGFzaGJvYXJkLm1kYCwgYCR7TElCUkFSWV9ST09UfS8wMi1HcmFtbWFyLzAwLURhc2hib2FyZC5tZGBdLFxuXSBhcyBjb25zdDtcblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU3luY1NldHRpbmdzID0ge1xuICBhcGlCYXNlVXJsOiBcImh0dHA6Ly8xMjcuMC4wLjE6ODAwMC9sZWFybmVyXCIsXG4gIGNvbm5lY3Rpb25JZDogXCJcIixcbiAgc3luY1NlY3JldDogXCJcIixcbiAgYWxsb3dlZEZvbGRlcnM6IFwiQmlubkFnZW50WFwiLFxuICBhbGxvd2VkVGFnczogXCJcIixcbiAgbWF4Tm90ZXM6IDgwLFxuICBtYXhFeGNlcnB0Q2hhcmFjdGVyczogOTAwLFxuICBhdXRvU3luYzogdHJ1ZSxcbiAgbGlicmFyeVZlcnNpb246IDAsXG4gIGxhc3RTeW5jZWRBdDogXCJcIixcbiAgbGFzdFN5bmNFcnJvcjogXCJcIixcbiAgbGFzdFN5bmNTdW1tYXJ5OiBcIlwiLFxufTtcblxuY29uc3QgTEVHQUNZX1ZPQ0FCVUxBUllfVEVNUExBVEUgPVxuICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJ2b2NhYnVsYXJ5XCJcXG5tZWFuaW5nOiBcIlwiXFxuc3RhdHVzOiBsZWFybmluZ1xcbmNyZWF0ZWQ6IHt7ZGF0ZX19XFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHZvY2FidWxhcnlcXG4tLS1cXG5cXG4jIHt7dGl0bGV9fVxcblxcbiMjIFx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVxcblxcbiMjIFx1NTNEMVx1OTdGM1xcblxcbiMjIFx1NUUzOFx1NzUyOFx1NjQyRFx1OTE0RFxcblxcbiMjIFx1NTM5Rlx1NTNFNVx1NEUwRVx1OEJFRFx1NTg4M1xcblxcbiMjIFx1NjIxMVx1NzY4NFx1NEY4Qlx1NTNFNVxcblxcbiMjIFx1NjYxM1x1NkRGN1x1NkRDNlx1NzBCOVxcblxcbiMjIFx1NTE3M1x1ODA1NFxcbi0gW1tCaW5uQWdlbnRYLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRdXVxcbic7XG5cbmNvbnN0IEJJRElSRUNUSU9OQUxfVk9DQUJVTEFSWV9URU1QTEFURSA9XG4gICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxcbm1lYW5pbmc6IFwiXCJcXG5zdGF0dXM6IGxlYXJuaW5nXFxuY3JlYXRlZDogXCJ7e2RhdGV9fVwiXFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHZvY2FidWxhcnlcXG4gIC0gZmxhc2hjYXJkcy9iaW5uYWdlbnR4L3ZvY2FidWxhcnlcXG4tLS1cXG5cXG4jIHt7dGl0bGV9fVxcblxcbiMjIFx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVxcblxcbiMjIFx1NTNEMVx1OTdGM1xcblxcbiMjIFx1NUUzOFx1NzUyOFx1NjQyRFx1OTE0RFxcblxcbiMjIFx1NTM5Rlx1NTNFNVx1NEUwRVx1OEJFRFx1NTg4M1xcblxcbiMjIFx1NjIxMVx1NzY4NFx1NEY4Qlx1NTNFNVxcblxcbiMjIFx1NjYxM1x1NkRGN1x1NkRDNlx1NzBCOVxcblxcbiMjIFx1OTVFQVx1NTM2MVxcblxcbj4gXHU1MTQ4XHU1ODZCXHU1MTk5XHUyMDFDXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XHUyMDFEXHUzMDAyXHU0RTBCXHU5NzYyXHU0RTI0XHU1RjIwXHU1MzYxXHU0RjFBXHU1OTBEXHU3NTI4XHU1NDBDXHU0RTAwXHU0RUZEXHU1MTg1XHU1QkI5XHVGRjBDXHU0RTBEXHU5NzAwXHU4OTgxXHU5MUNEXHU1OTBEXHU3RUY0XHU2MkE0XHU5MUNBXHU0RTQ5XHUzMDAyXFxuXFxue3t0aXRsZX19IFx1NzY4NFx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVx1NjYyRlx1NEVDMFx1NEU0OFx1RkYxRjo6IVtbI1x1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OV1dXFxuXFxuXHU0RTBCXHU5NzYyXHU4RkQ5XHU2QkI1XHU1NDJCXHU0RTQ5XHU1QkY5XHU1RTk0XHU1NEVBXHU0RTJBXHU1MzU1XHU4QkNEXHU2MjE2XHU3N0VEXHU4QkVEXHVGRjFGICFbWyNcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDldXTo6e3t0aXRsZX19XFxuXFxuIyMgXHU1MTczXHU4MDU0XFxuLSBbW0Jpbm5BZ2VudFgvMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dXFxuLSBbW0Jpbm5BZ2VudFgvU3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3fFNwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N11dXFxuJztcblxuY29uc3QgU0lNUExFX1ZPQ0FCVUxBUllfVEVNUExBVEUgPVxuICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJ2b2NhYnVsYXJ5XCJcXG5tZWFuaW5nOiBcIlwiXFxuc3RhdHVzOiBsZWFybmluZ1xcbmNyZWF0ZWQ6IFwie3tkYXRlfX1cIlxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSB2b2NhYnVsYXJ5XFxuICAtIGZsYXNoY2FyZHMvYmlubmFnZW50eC92b2NhYnVsYXJ5XFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDlcXG5cXG4jIyBcdTUzRDFcdTk3RjNcXG5cXG4jIyBcdTVFMzhcdTc1MjhcdTY0MkRcdTkxNERcXG5cXG4jIyBcdTUzOUZcdTUzRTVcdTRFMEVcdThCRURcdTU4ODNcXG5cXG4jIyBcdTYyMTFcdTc2ODRcdTRGOEJcdTUzRTVcXG5cXG4jIyBcdTY2MTNcdTZERjdcdTZEQzZcdTcwQjlcXG5cXG4jIyBcdTk1RUFcdTUzNjFcXG5cXG4+IFx1NTE0OFx1NTg2Qlx1NTE5OVx1MjAxQ1x1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVx1MjAxRFx1MzAwMlx1NEUwQlx1OTc2Mlx1NzY4NFx1NTM2MVx1NzI0N1x1NEYxQVx1NTkwRFx1NzUyOFx1OEZEOVx1NEVGRFx1NTE4NVx1NUJCOVx1RkYwQ1x1NEUwRFx1OTcwMFx1ODk4MVx1OTFDRFx1NTkwRFx1N0VGNFx1NjJBNFx1OTFDQVx1NEU0OVx1MzAwMlxcblxcbnt7dGl0bGV9fSBcdTc2ODRcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDlcdTY2MkZcdTRFQzBcdTRFNDhcdUZGMUY6OiFbWyNcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDldXVxcblxcbiMjIFx1NTE3M1x1ODA1NFxcbi0gW1tCaW5uQWdlbnRYLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRdXVxcbi0gW1tCaW5uQWdlbnRYL1NwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N3xTcGFjZWQgUmVwZXRpdGlvbiBcdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTddXVxcbic7XG5cbmNvbnN0IFZPQ0FCVUxBUllfVEVNUExBVEUgPVxuICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJ2b2NhYnVsYXJ5XCJcXG5tZWFuaW5nOiBcIlwiXFxuc3RhdHVzOiBsZWFybmluZ1xcbmNyZWF0ZWQ6IFwie3tkYXRlfX1cIlxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSB2b2NhYnVsYXJ5XFxuICAtIGZsYXNoY2FyZHMvYmlubmFnZW50eC92b2NhYnVsYXJ5XFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDlcXG5cXG4jIyBcdTUzRDFcdTk3RjNcXG5cXG4jIyBcdTVFMzhcdTc1MjhcdTY0MkRcdTkxNERcXG5cXG4jIyBcdTUzOUZcdTUzRTVcdTRFMEVcdThCRURcdTU4ODNcXG5cXG4jIyBcdTYyMTFcdTc2ODRcdTRGOEJcdTUzRTVcXG5cXG4jIyBcdTY2MTNcdTZERjdcdTZEQzZcdTcwQjlcXG5cXG4jIyBcdTk1RUFcdTUzNjFcXG5cXG4+IFshYmlubi1wcm9tcHRdIFx1NTM1NVx1OEJDRFx1NTZERVx1NUZDNlxcbj4gIyB7e3RpdGxlfX1cXG4+IFx1NTE0OFx1OEJGNFx1NTFGQVx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVx1RkYwQ1x1NTE4RFx1NTZERVx1NUZDNlx1NEUwMFx1NEUyQVx1NjQyRFx1OTE0RFx1NjIxNlx1NEY4Qlx1NTNFNVx1MzAwMlxcbj9cXG4+IFshYmlubi1tZWFuaW5nXSBcdTY4MzhcdTVGQzNcdTkxQ0FcdTRFNDlcXG4+ICFbWyNcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDldXVxcbi0tLVxcbj4gWyFiaW5uLXNvdW5kXSBcdTUzRDFcdTk3RjNcXG4+ICFbWyNcdTUzRDFcdTk3RjNdXVxcbi0tLVxcbj4gWyFiaW5uLWNvbGxvY2F0aW9uc10gXHU1RTM4XHU3NTI4XHU2NDJEXHU5MTREXFxuPiAhW1sjXHU1RTM4XHU3NTI4XHU2NDJEXHU5MTREXV1cXG4tLS1cXG4+IFshYmlubi1leGFtcGxlXSBcdTYyMTFcdTc2ODRcdTRGOEJcdTUzRTVcXG4+ICFbWyNcdTYyMTFcdTc2ODRcdTRGOEJcdTUzRTVdXVxcbi0tLVxcbj4gWyFiaW5uLWNvbnRyYXN0XSBcdTY2MTNcdTZERjdcdTZEQzZcdTcwQjlcXG4+ICFbWyNcdTY2MTNcdTZERjdcdTZEQzZcdTcwQjldXVxcblxcbiMjIFx1NTE3M1x1ODA1NFxcbi0gW1tCaW5uQWdlbnRYLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRdXVxcbi0gW1tCaW5uQWdlbnRYL1NwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N3xTcGFjZWQgUmVwZXRpdGlvbiBcdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTddXVxcbic7XG5cbmNvbnN0IFJFVklFV19TVFlMRV9TTklQUEVUX05BTUUgPSBcImJpbm5hZ2VudHgtc3BhY2VkLXJlcGV0aXRpb25cIjtcbmNvbnN0IFJFVklFV19TVFlMRV9TTklQUEVUID0gYC8qIEJpbm5BZ2VudFggdm9jYWJ1bGFyeSByZXZpZXcgY2FyZHMgKi9cbi5zci1jYXJkLWNvbnRhaW5lciAuc3Itc2Nyb2xsLXdyYXBwZXIge1xuICBiYWNrZ3JvdW5kOlxuICAgIHJhZGlhbC1ncmFkaWVudChcbiAgICAgIGNpcmNsZSBhdCAxMiUgMCUsXG4gICAgICBjb2xvci1taXgoaW4gc3JnYiwgdmFyKC0taW50ZXJhY3RpdmUtYWNjZW50KSAxNCUsIHRyYW5zcGFyZW50KSxcbiAgICAgIHRyYW5zcGFyZW50IDM4JVxuICAgICksXG4gICAgdmFyKC0tYmFja2dyb3VuZC1wcmltYXJ5KTtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5zci1jb250ZW50LFxuLnNyLWNhcmQtY29udGFpbmVyIC5zci1jb250ZXh0IHtcbiAgd2lkdGg6IG1pbig5MjBweCwgMTAwJSk7XG4gIG1hcmdpbi1pbmxpbmU6IGF1dG87XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuc3ItY29udGVudCB7XG4gIHBhZGRpbmc6IGNsYW1wKDE4cHgsIDN2dywgMzhweCk7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuc3ItY29udGV4dCB7XG4gIHBhZGRpbmc6IDEwcHggY2xhbXAoMThweCwgM3Z3LCAzOHB4KSA0cHg7XG4gIGZvbnQtc2l6ZTogMC43OGVtO1xuICBsZXR0ZXItc3BhY2luZzogMC4wMmVtO1xuICBvcGFjaXR5OiAwLjcyO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLmNhbGxvdXRbZGF0YS1jYWxsb3V0Xj1cImJpbm4tXCJdIHtcbiAgbWFyZ2luOiAxMnB4IDA7XG4gIHBhZGRpbmc6IDE0cHggMTZweDtcbiAgYm9yZGVyOiAxcHggc29saWQgY29sb3ItbWl4KGluIHNyZ2IsIHJnYih2YXIoLS1jYWxsb3V0LWNvbG9yKSkgMzQlLCB0cmFuc3BhcmVudCk7XG4gIGJvcmRlci1yYWRpdXM6IDE2cHg7XG4gIGJhY2tncm91bmQ6IGNvbG9yLW1peChcbiAgICBpbiBzcmdiLFxuICAgIHJnYih2YXIoLS1jYWxsb3V0LWNvbG9yKSkgMTAlLFxuICAgIHZhcigtLWJhY2tncm91bmQtcHJpbWFyeSlcbiAgKTtcbiAgYm94LXNoYWRvdzogMCA4cHggMjRweCByZ2IoMCAwIDAgLyAwLjA2KTtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5jYWxsb3V0W2RhdGEtY2FsbG91dF49XCJiaW5uLVwiXSAuY2FsbG91dC10aXRsZSB7XG4gIGdhcDogOHB4O1xuICBmb250LXNpemU6IDAuNzhyZW07XG4gIGZvbnQtd2VpZ2h0OiA4MDA7XG4gIGxldHRlci1zcGFjaW5nOiAwLjA4ZW07XG4gIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXQ9XCJiaW5uLXByb21wdFwiXSB7XG4gIC0tY2FsbG91dC1jb2xvcjogNzgsIDEyMSwgMjU1O1xuICAtLWNhbGxvdXQtaWNvbjogbHVjaWRlLWJyYWluLWNpcmN1aXQ7XG4gIHBhZGRpbmc6IGNsYW1wKDIycHgsIDR2dywgNDRweCk7XG4gIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgYmFja2dyb3VuZDpcbiAgICBsaW5lYXItZ3JhZGllbnQoMTQ1ZGVnLCByZ2IoNzggMTIxIDI1NSAvIDAuMTgpLCByZ2IoMTI2IDg2IDIyNCAvIDAuMSkpLFxuICAgIHZhcigtLWJhY2tncm91bmQtcHJpbWFyeSk7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lclxuICAuY2FsbG91dFtkYXRhLWNhbGxvdXQ9XCJiaW5uLXByb21wdFwiXVxuICA+IC5jYWxsb3V0LXRpdGxlIHtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXQ9XCJiaW5uLXByb21wdFwiXSBoMSB7XG4gIG1hcmdpbjogMC4yZW0gMDtcbiAgZm9udC1zaXplOiBjbGFtcCgyLjVyZW0sIDh2dywgNXJlbSk7XG4gIGxpbmUtaGVpZ2h0OiAxO1xuICBsZXR0ZXItc3BhY2luZzogMC4wMjVlbTtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5jYWxsb3V0W2RhdGEtY2FsbG91dD1cImJpbm4tcHJvbXB0XCJdIHA6bGFzdC1jaGlsZCB7XG4gIG1hcmdpbi1ib3R0b206IDA7XG4gIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTtcbiAgZm9udC1zaXplOiAwLjk2cmVtO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLmNhbGxvdXRbZGF0YS1jYWxsb3V0PVwiYmlubi1tZWFuaW5nXCJdIHtcbiAgLS1jYWxsb3V0LWNvbG9yOiAxMTcsIDgzLCAyMTA7XG4gIC0tY2FsbG91dC1pY29uOiBsdWNpZGUtbGFuZ3VhZ2VzO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLmNhbGxvdXRbZGF0YS1jYWxsb3V0PVwiYmlubi1zb3VuZFwiXSB7XG4gIC0tY2FsbG91dC1jb2xvcjogMTQsIDE1MSwgMTc4O1xuICAtLWNhbGxvdXQtaWNvbjogbHVjaWRlLXZvbHVtZS0yO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLmNhbGxvdXRbZGF0YS1jYWxsb3V0PVwiYmlubi1jb2xsb2NhdGlvbnNcIl0ge1xuICAtLWNhbGxvdXQtY29sb3I6IDIxNywgMTM5LCAyNTtcbiAgLS1jYWxsb3V0LWljb246IGx1Y2lkZS1ibG9ja3M7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXQ9XCJiaW5uLWV4YW1wbGVcIl0ge1xuICAtLWNhbGxvdXQtY29sb3I6IDQyLCAxNTcsIDkyO1xuICAtLWNhbGxvdXQtaWNvbjogbHVjaWRlLW1lc3NhZ2Utc3F1YXJlLXF1b3RlO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLmNhbGxvdXRbZGF0YS1jYWxsb3V0PVwiYmlubi1jb250cmFzdFwiXSB7XG4gIC0tY2FsbG91dC1jb2xvcjogMjE0LCA4MiwgMTE2O1xuICAtLWNhbGxvdXQtaWNvbjogbHVjaWRlLWdpdC1jb21wYXJlLWFycm93cztcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5jYWxsb3V0W2RhdGEtY2FsbG91dF49XCJiaW5uLVwiXSAubWFya2Rvd24tZW1iZWQge1xuICBtYXJnaW46IDA7XG4gIHBhZGRpbmc6IDA7XG4gIGJvcmRlci1pbmxpbmUtc3RhcnQ6IDA7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuY2FsbG91dFtkYXRhLWNhbGxvdXRePVwiYmlubi1cIl0gLm1hcmtkb3duLWVtYmVkLWxpbmsge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLmNhbGxvdXRbZGF0YS1jYWxsb3V0Xj1cImJpbm4tXCJdIGgyIHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5zci1yZXNwb25zZSA+IGhyIHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuLnNyLWNhcmQtY29udGFpbmVyIC5zci1yZXNwb25zZSB7XG4gIGdhcDogMTBweDtcbiAgcGFkZGluZzogMTJweCBjbGFtcCgxNHB4LCAydncsIDI0cHgpO1xuICBiYWNrZ3JvdW5kOiBjb2xvci1taXgoaW4gc3JnYiwgdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpIDg2JSwgdHJhbnNwYXJlbnQpO1xuICBiYWNrZHJvcC1maWx0ZXI6IGJsdXIoMTRweCk7XG59XG5cbi5zci1jYXJkLWNvbnRhaW5lciAuc3ItcmVzcG9uc2UtYnV0dG9uIHtcbiAgbWluLWhlaWdodDogNTJweDtcbiAgYm9yZGVyLXJhZGl1czogMTNweDtcbiAgZm9udC13ZWlnaHQ6IDc1MDtcbiAgYm94LXNoYWRvdzogMCA2cHggMTZweCByZ2IoMCAwIDAgLyAwLjEpO1xufVxuXG4uc3ItY2FyZC1jb250YWluZXIgLnNyLXNob3ctYW5zd2VyLWJ1dHRvbiB7XG4gIGJvcmRlcjogMDtcbiAgY29sb3I6IHdoaXRlO1xuICBiYWNrZ3JvdW5kOiBsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjNGU3OWZmLCAjNzY1NmQ4KTtcbn1cbmA7XG5cbmNvbnN0IExFQVJOSU5HX1RFTVBMQVRFUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgXCJcdThCQ0RcdTZDNDcubWRcIjogVk9DQUJVTEFSWV9URU1QTEFURSxcbiAgXCJcdThCRURcdTZDRDUubWRcIjpcbiAgICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJncmFtbWFyXCJcXG5zdGF0dXM6IGxlYXJuaW5nXFxuY3JlYXRlZDoge3tkYXRlfX1cXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gZ3JhbW1hclxcbi0tLVxcblxcbiMge3t0aXRsZX19XFxuXFxuIyMgXHU0RTAwXHU1M0U1XHU4QkREXHU4OUM0XHU1MjE5XFxuXFxuIyMgXHU3RUQzXHU2Nzg0XHU1MTZDXHU1RjBGXFxuXFxuIyMgXHU1MjI0XHU2NUFEXHU3RUJGXHU3RDIyXFxuXFxuIyMgXHU1MzlGXHU1M0U1XHU2MkM2XHU4OUUzXFxuXFxuIyMgXHU1RTM4XHU4OUMxXHU4QkVGXHU1MzNBXFxuXFxuIyMgXHU2NUIwXHU4QkVEXHU1ODgzXHU5QThDXHU4QkMxXFxuXFxuIyMgXHU1MTczXHU4MDU0XFxuLSBbW0Jpbm5BZ2VudFgvMDItR3JhbW1hci8wMC1EYXNoYm9hcmR8XHU4QkVEXHU2Q0Q1IERhc2hib2FyZF1dXFxuJyxcbiAgXCJcdTUxOTlcdTRGNUNcdTg4NjhcdThGQkUubWRcIjpcbiAgICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJ3cml0aW5nX2V4cHJlc3Npb25cIlxcbmNyZWF0ZWQ6IHt7ZGF0ZX19XFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHdyaXRpbmctZXhwcmVzc2lvblxcbi0tLVxcblxcbiMge3t0aXRsZX19XFxuXFxuIyMgXHU4ODY4XHU4RkJFXHU1MjlGXHU4MEZEXFxuXFxuIyMgXHU1M0U1XHU1RjBGXHU5QUE4XHU2N0I2XFxuXFxuIyMgXHU1MzlGXHU1OUNCXHU4MzAzXHU0RjhCXFxuXFxuIyMgXHU2MjExXHU3Njg0XHU2NTM5XHU1MTk5XFxuXFxuIyMgXHU1M0VGXHU2NkZGXHU2MzYyXHU4QkNEXHU2OUZEXFxuJyxcbiAgXCJcdTk2MDVcdThCRkJcdTdCNTZcdTc1NjUubWRcIjpcbiAgICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJyZWFkaW5nX3NraWxsXCJcXG5jcmVhdGVkOiB7e2RhdGV9fVxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSByZWFkaW5nLXNraWxsXFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTkwMDJcdTc1MjhcdTU3M0FcdTY2NkZcXG5cXG4jIyBcdTY0Q0RcdTRGNUNcdTZCNjVcdTlBQTRcXG5cXG4jIyBcdThCQzFcdTYzNkVcdTVCOUFcdTRGNERcXG5cXG4jIyBcdTU5MzFcdThEMjVcdTRGRTFcdTUzRjdcXG5cXG4jIyBcdTY1QjBcdTY1ODdcdTdBRTBcdTlBOENcdThCQzFcXG4nLFxufTtcblxuY29uc3QgTElCUkFSWV9OT1RFUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDAtRGFzaGJvYXJkLm1kYF06IGAjIEJpbm5BZ2VudFggXHU1QjY2XHU0RTYwXHU1NzMwXHU1NkZFXG5cblx1N0IyQ1x1NEUwMFx1NkIyMVx1NEY3Rlx1NzUyOFx1OEJGN1x1NTE0OFx1OEJGQiBbW1x1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N11dIFx1NTQ4QyBbW1NwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N11dXHUzMDAyXHU0RTRCXHU1NDBFXHU0RUNFIFtbMDAtSW5ib3gvXHU2NTM2XHU5NkM2XHU3QkIxXHU0RjdGXHU3NTI4XHU4QkY0XHU2NjBFfFx1NjUzNlx1OTZDNlx1N0JCMV1dIFx1NUYwMFx1NTlDQlx1RkYwQ1x1NjI4QVx1Nzg4RVx1NzI0N1x1NUI5QVx1NjcxRlx1NjU3NFx1NzQwNlx1NTIzMFx1NEUwQlx1OTc2Mlx1NzY4NFx1OTg4Nlx1NTdERlx1NzZFRVx1NUY1NVx1MzAwMlxuXG4jIyBcdTUxODVcdTVCQjlcdTU3MzBcdTU2RkVcdUZGMDhNT0NcdUZGMDlcblxuLSBbWzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRdXVxuLSBbWzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkfFx1OEJFRFx1NkNENSBEYXNoYm9hcmRdXVxuLSBbWzAzLVJlYWRpbmcvXHU5NjA1XHU4QkZCXHU3QjE0XHU4QkIwXHU3OTNBXHU0RjhCfFx1OTYwNVx1OEJGQl1dXG4tIFtbMDQtV3JpdGluZy9cdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTc5M0FcdTRGOEJ8XHU1MTk5XHU0RjVDXV1cbi0gW1swNS1UZW1wbGF0ZXMvXHU4QkNEXHU2QzQ3fFx1N0IxNFx1OEJCMFx1NkEyMVx1Njc3Rl1dXG4tIFtbMDEtVm9jYWJ1bGFyeS9TcGFjZWQgUmVwZXRpdGlvbiBcdTk1RUFcdTUzNjFcdTc5M0FcdTRGOEJ8XHU1M0VGXHU1OTBEXHU0RTYwXHU3Njg0XHU5NUVBXHU1MzYxXHU3OTNBXHU0RjhCXV1cblxuIyMgXHU2NzAwXHU4RkQxXHU2NkY0XHU2NUIwXHVGRjA4RGF0YXZpZXdcdUZGMDlcblxuXFxgXFxgXFxgZGF0YXZpZXdcblRBQkxFIFdJVEhPVVQgSUQgZmlsZS5saW5rIEFTIFwiXHU3QjE0XHU4QkIwXCIsIGJpbm5hZ2VudF9raW5kIEFTIFwiXHU3QzdCXHU1NzhCXCIsIGZpbGUubXRpbWUgQVMgXCJcdTY2RjRcdTY1QjBcdTY1RjZcdTk1RjRcIlxuRlJPTSBcIkJpbm5BZ2VudFhcIlxuV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiIEFORCAhY29udGFpbnMoZmlsZS5wYXRoLCBcIi8wNS1UZW1wbGF0ZXMvXCIpXG5TT1JUIGZpbGUubXRpbWUgREVTQ1xuTElNSVQgMTJcblxcYFxcYFxcYFxuXG4+IFx1NjcyQVx1NUI4OVx1ODhDNSBEYXRhdmlldyBcdTY1RjZcdUZGMENcdTRFMEFcdTk3NjJcdTc2ODRcdTY3RTVcdThCRTJcdTRGMUFcdTY2M0VcdTc5M0FcdTRFM0FcdTRFRTNcdTc4MDFcdTU3NTdcdUZGMUJNT0MgXHU5NEZFXHU2M0E1XHU0RUNEXHU1M0VGXHU2QjYzXHU1RTM4XHU0RjdGXHU3NTI4XHUzMDAyXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS9cdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTcubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIGd1aWRlXG4tLS1cblxuIyBCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1NUU5M1x1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N1xuXG5cdThGRDlcdTU5NTdcdTc2RUVcdTVGNTVcdTYyOEFcdTIwMUNcdTVGRUJcdTkwMUZcdThCQjBcdTVGNTVcdTIwMURcdTU0OENcdTIwMUNcdTk1N0ZcdTY3MUZcdTY1NzRcdTc0MDZcdTIwMURcdTUyMDZcdTVGMDBcdTMwMDJcdTY3MDBcdTdCODBcdTUzNTVcdTc2ODRcdTc1MjhcdTZDRDVcdTUzRUFcdTY3MDlcdTRFMDlcdTZCNjVcdUZGMUEqKlx1NTE0OFx1NjUzNlx1OTZDNlx1MzAwMVx1NTE4RFx1NjU3NFx1NzQwNlx1MzAwMVx1NUUzOFx1NTZERVx1OTg3RSoqXHUzMDAyXG5cbiMjIFx1NzZFRVx1NUY1NVx1OEJGNFx1NjYwRVxuXG58IFx1NjU4N1x1NEVGNlx1NTkzOSB8IFx1NzUyOFx1OTAxNCB8IFx1NEVDMFx1NEU0OFx1NjVGNlx1NTAxOVx1NjUzRVx1OEZEQlx1NTNCQiB8XG58IC0tLSB8IC0tLSB8IC0tLSB8XG58IFxcYDAwLUluYm94L1xcYCB8IFx1NjUzNlx1OTZDNlx1N0JCMSB8IEJpbm5BZ2VudFggXHU1NDBDXHU2QjY1XHU2NzY1XHU3Njg0XHU2ODA3XHU2Q0U4XHUzMDAxXHU5NjhGXHU2MjRCXHU4QkIwXHU0RTBCXHU3Njg0XHU1M0U1XHU1QjUwXHUzMDAxXHU4RkQ4XHU0RTBEXHU3N0U1XHU5MDUzXHU1OTgyXHU0RjU1XHU1MjA2XHU3QzdCXHU3Njg0XHU3ODhFXHU3MjQ3IHxcbnwgXFxgMDEtVm9jYWJ1bGFyeS9cXGAgfCBcdThCQ0RcdTZDNDcgfCBcdTVERjJcdTdFQ0ZcdTg4NjVcdTUxNDVcdTRFODZcdTU0MkJcdTRFNDlcdTMwMDFcdTY0MkRcdTkxNERcdTMwMDFcdThCRURcdTU4ODNcdTYyMTZcdTRGOEJcdTUzRTVcdTc2ODRcdTUzNTVcdThCQ0RcdTU0OENcdTc3RURcdThCRUQgfFxufCBcXGAwMi1HcmFtbWFyL1xcYCB8IFx1OEJFRFx1NkNENSB8IFx1ODBGRFx1OEJGNFx1NkUwNVx1ODlDNFx1NTIxOVx1MzAwMVx1N0VEM1x1Njc4NFx1MzAwMVx1OEJFRlx1NTMzQVx1NTQ4Q1x1OUE4Q1x1OEJDMVx1NEY4Qlx1NTNFNVx1NzY4NFx1OEJFRFx1NkNENVx1NzBCOSB8XG58IFxcYDAzLVJlYWRpbmcvXFxgIHwgXHU5NjA1XHU4QkZCIHwgXHU2NTg3XHU3QUUwXHU1MzlGXHU2NTg3XHUzMDAxXHU0RTY2XHU3QzREXHU2NDU4XHU4QkIwXHUzMDAxXHU2NDU4XHU4OTgxXHUzMDAxXHU4QkMxXHU2MzZFXHU1NDhDXHU5NjA1XHU4QkZCXHU3QjU2XHU3NTY1IHxcbnwgXFxgMDQtV3JpdGluZy9cXGAgfCBcdTUxOTlcdTRGNUMgfCBcdTgyRjFcdTY1ODdcdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTMwMDFWMS9WMiBcdTRGRUVcdTY1MzlcdThGQzdcdTdBMEJcdTU0OENcdTUzRUZcdThGQzFcdTc5RkJcdTg4NjhcdThGQkUgfFxufCBcXGAwNS1UZW1wbGF0ZXMvXFxgIHwgXHU2QTIxXHU2NzdGIHwgT2JzaWRpYW4gVGVtcGxhdGVzIFx1NjgzOFx1NUZDM1x1NjNEMlx1NEVGNlx1NEY3Rlx1NzUyOFx1NzY4NFx1N0IxNFx1OEJCMFx1NkEyMVx1Njc3RiB8XG58IFxcYDA2LUF0dGFjaG1lbnRzL1xcYCB8IFx1OTY0NFx1NEVGNiB8IFx1NTZGRVx1NzI0N1x1MzAwMVBERlx1MzAwMVx1OTdGM1x1OTg5MVx1N0I0OVx1OTc1RSBNYXJrZG93biBcdTY1ODdcdTRFRjYgfFxuXG4jIyBcdTYzQThcdTgzNTBcdTVERTVcdTRGNUNcdTZENDFcblxuMS4gKipcdTk2OEZcdTY1RjZcdTY1MzZcdTk2QzYqKlx1RkYxQVx1NTE0OFx1NjI4QVx1NTE4NVx1NUJCOVx1NjUzRVx1OEZEQiBcXGAwMC1JbmJveC9cXGBcdUZGMENcdTRFMERcdTg5ODFcdTU2RTBcdTRFM0FcdTUyMDZcdTdDN0JcdTgwMENcdTYyNTNcdTY1QURcdTVCNjZcdTRFNjBcdTMwMDJcbjIuICoqXHU2QkNGXHU1NDY4XHU2NTc0XHU3NDA2KipcdUZGMUFcdTRFM0FcdTY3MDlcdTRFRjdcdTUwM0NcdTc2ODRcdTc4OEVcdTcyNDdcdTg4NjVcdTRFMEFcdTgxRUFcdTVERjFcdTc2ODRcdTg5RTNcdTkxQ0FcdTU0OENcdTRGOEJcdTUzRTVcdUZGMENcdTUxOERcdTc5RkJcdTUyQThcdTUyMzBcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTMwMDFcdTk2MDVcdThCRkJcdTYyMTZcdTUxOTlcdTRGNUNcdTc2RUVcdTVGNTVcdTMwMDJcbjMuICoqXHU1RUZBXHU3QUNCXHU4RkRFXHU2M0E1KipcdUZGMUFcdTc1MjggXFxgW1tcdTdCMTRcdThCQjBcdTU0MERdXVxcYCBcdTYyOEFcdTc2RjhcdTUxNzNcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTU0OENcdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTRFOTJcdTc2RjhcdTk0RkVcdTYzQTVcdTMwMDJcbjQuICoqXHU1NkRFXHU1MjMwXHU1NzMwXHU1NkZFKipcdUZGMUFcdTRFQ0UgW1swMC1EYXNoYm9hcmR8XHU2MDNCIERhc2hib2FyZF1dXHUzMDAxW1swMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZHxcdThCQ0RcdTZDNDcgRGFzaGJvYXJkXV0gXHU2MjE2IFtbMDItR3JhbW1hci8wMC1EYXNoYm9hcmR8XHU4QkVEXHU2Q0Q1IERhc2hib2FyZF1dIFx1NkQ0Rlx1ODlDOFx1NTQ4Q1x1NTkwRFx1NEU2MFx1MzAwMlxuXG4jIyBcdTZBMjFcdTY3N0ZcdTYwMEVcdTRFNDhcdTc1MjhcblxuXHU2M0QyXHU0RUY2XHU0RjFBXHU2MjhBIE9ic2lkaWFuIFx1NzY4NFx1NkEyMVx1Njc3Rlx1NjU4N1x1NEVGNlx1NTkzOVx1OEJCRVx1NEUzQSBcXGBCaW5uQWdlbnRYLzA1LVRlbXBsYXRlc1xcYFx1MzAwMlx1NTQyRlx1NzUyOCBPYnNpZGlhbiBcdTc2ODQgKipUZW1wbGF0ZXNcdUZGMDhcdTZBMjFcdTY3N0ZcdUZGMDlcdTY4MzhcdTVGQzNcdTYzRDJcdTRFRjYqKiBcdTU0MEVcdUZGMENcdTY1QjBcdTVFRkFcdTdCMTRcdThCQjBcdTVFNzZcdTYyNjdcdTg4NENcdTIwMUNcdTYzRDJcdTUxNjVcdTZBMjFcdTY3N0ZcdTIwMURcdUZGMENcdTUxOERcdTkwMDlcdTYyRTlcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTMwMDFcdTk2MDVcdThCRkJcdTdCNTZcdTc1NjVcdTYyMTZcdTUxOTlcdTRGNUNcdTg4NjhcdThGQkVcdTZBMjFcdTY3N0ZcdTMwMDJcblxuIyMgXHU5NUY0XHU5Njk0XHU5MUNEXHU1OTBEXHU2MDBFXHU0RTQ4XHU3NTI4XG5cbkJpbm5BZ2VudFggTGVhcm5pbmcgU3luYyBcdTRGN0ZcdTc1MjhcdTc5M0VcdTUzM0FcdTYzRDJcdTRFRjYgKipTcGFjZWQgUmVwZXRpdGlvbioqIFx1NjNEMFx1NEY5Qlx1OTVFQVx1NTM2MVx1NTkwRFx1NEU2MFx1MzAwMlx1N0IyQ1x1NEUwMFx1NkIyMVx1NEY3Rlx1NzUyOFx1OEJGN1x1NjMwOSBbW1NwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N11dIFx1NUI4Q1x1NjIxMFx1NUI4OVx1ODhDNVx1RkYwQ1x1NTE4RFx1NjI1M1x1NUYwMCBbWzAxLVZvY2FidWxhcnkvU3BhY2VkIFJlcGV0aXRpb24gXHU5NUVBXHU1MzYxXHU3OTNBXHU0RjhCXV0gXHU1MDVBXHU0RTAwXHU2QjIxXHU3RUMzXHU0RTYwXHUzMDAyXG5cbiMjIERhc2hib2FyZCBcdTU0OEMgRGF0YXZpZXdcblxuRGFzaGJvYXJkIFx1NjcyQ1x1OEVBQlx1NjYyRlx1NTE4NVx1NUJCOVx1NTczMFx1NTZGRVx1RkYwOE1PQ1x1RkYwOVx1RkYwQ1x1OTFDQ1x1OTc2Mlx1NzY4NFx1NjY2RVx1OTAxQVx1OTRGRVx1NjNBNVx1NEUwRFx1NEY5RFx1OEQ1Nlx1NEVGQlx1NEY1NVx1NjNEMlx1NEVGNlx1MzAwMlx1NUI4OVx1ODhDNVx1NUU3Nlx1NTQyRlx1NzUyOFx1NzkzRVx1NTMzQVx1NjNEMlx1NEVGNiAqKkRhdGF2aWV3KiogXHU1NDBFXHVGRjBDXHU4QkNEXHU2QzQ3XHUzMDAxXHU4QkVEXHU2Q0Q1XHU1NDhDXHU2NzAwXHU4RkQxXHU2NkY0XHU2NUIwXHU1MjE3XHU4ODY4XHU0RjFBXHU4MUVBXHU1MkE4XHU3NTFGXHU2MjEwXHVGRjFCXHU2NzJBXHU1Qjg5XHU4OEM1XHU2NUY2XHU1M0VBXHU0RjFBXHU3NzBCXHU1MjMwXHU2N0U1XHU4QkUyXHU0RUUzXHU3ODAxXHU1NzU3XHVGRjBDXHU0RTBEXHU1RjcxXHU1NENEXHU1MTc2XHU0RUQ2XHU3QjE0XHU4QkIwXHUzMDAyXG5cbiMjIFx1OTY0NFx1NEVGNlxuXG5cdTYzRDJcdTRFRjZcdTRGMUFcdTYyOEEgT2JzaWRpYW4gXHU3Njg0XHU5RUQ4XHU4QkE0XHU5NjQ0XHU0RUY2XHU0RjREXHU3RjZFXHU4QkJFXHU0RTNBIFxcYEJpbm5BZ2VudFgvMDYtQXR0YWNobWVudHNcXGBcdTMwMDJcdTRFNEJcdTU0MEVcdTdDOThcdThEMzRcdTU2RkVcdTcyNDdcdTYyMTZcdTUyQTBcdTUxNjUgUERGIFx1NjVGNlx1RkYwQ1x1OTY0NFx1NEVGNlx1NEYxQVx1OTZDNlx1NEUyRFx1NUI1OFx1NjUzRVx1RkYwQ1x1NkI2M1x1NjU4N1x1NEVDRFx1NTNFRlx1NzUyOCBPYnNpZGlhbiBcdTk0RkVcdTYzQTVcdTVGMTVcdTc1MjhcdTMwMDJcblxuIyMgXHU0RTBEXHU0RjFBXHU1M0QxXHU3NTFGXHU0RUMwXHU0RTQ4XG5cbi0gXHU1MjFEXHU1OUNCXHU1MzE2XHU1M0VGXHU0RUU1XHU5MUNEXHU1OTBEXHU2MjY3XHU4ODRDXHVGRjBDXHU0RjQ2XHU0RTBEXHU0RjFBXHU4OTg2XHU3NkQ2XHU1NDBDXHU1NDBEXHU2NTg3XHU0RUY2XHU2MjE2XHU0RjYwXHU1REYyXHU3RUNGXHU0RkVFXHU2NTM5XHU3Njg0XHU2QTIxXHU2NzdGXHUzMDAyXG4tIFx1NjNEMlx1NEVGNlx1NEUwRFx1NEYxQVx1ODFFQVx1NTJBOFx1NjZGRlx1NEY2MFx1NzlGQlx1NTJBOFx1MzAwMVx1NTIyMFx1OTY2NFx1NjIxNlx1MjAxQ1x1NjU3NFx1NzQwNlx1NUI4Q1x1NjIxMFx1MjAxRFx1NjUzNlx1OTZDNlx1N0JCMVx1OTFDQ1x1NzY4NFx1NTE4NVx1NUJCOVx1MzAwMlxuLSBcdTYzMDdcdTUzNTdcdTMwMDFEYXNoYm9hcmQgXHU1NDhDXHU1MjFEXHU1OUNCXHU1MzE2XHU3OTNBXHU0RjhCXHU1RTI2XHU2NzA5IFxcYGJpbm5hZ2VudF9zeW5jOiBmYWxzZVxcYFx1RkYwQ1x1NEUwRFx1NEYxQVx1NEY1Q1x1NEUzQVx1NEY2MFx1NzY4NFx1NEUyQVx1NEVCQVx1NUI2Nlx1NEU2MFx1NEUwQVx1NEUwQlx1NjU4N1x1NEUwQVx1NEYyMFx1MzAwMlxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vU3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3Lm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSBndWlkZVxuICAtIHNwYWNlZC1yZXBldGl0aW9uXG4tLS1cblxuIyBTcGFjZWQgUmVwZXRpdGlvbiBcdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTdcblxuQmlubkFnZW50WCBMZWFybmluZyBTeW5jIFx1OEQxRlx1OEQyM1x1NjI4QVx1NUI2Nlx1NEU2MFx1Njc1MFx1NjU5OVx1NjU3NFx1NzQwNlx1NTIzMFx1OEZEOVx1NEUyQSBWYXVsdFx1RkYxQlx1NzkzRVx1NTMzQVx1NjNEMlx1NEVGNiAqKlNwYWNlZCBSZXBldGl0aW9uKiogXHU4RDFGXHU4RDIzXHU1MjI0XHU2NUFEXHU1NEVBXHU0RTlCXHU5NUVBXHU1MzYxXHU0RUNBXHU1OTI5XHU5NzAwXHU4OTgxXHU1OTBEXHU0RTYwXHUzMDAyQmlubkFnZW50WCBcdTRFMERcdTRGMUFcdTY2RkZcdTRGNjBcdTVCODlcdTg4QzVcdTc5M0VcdTUzM0FcdTYzRDJcdTRFRjZcdUZGMENcdTRFMEJcdTk3NjJcdTc2ODRcdThCQkVcdTdGNkVcdTUzRUFcdTk3MDBcdTVCOENcdTYyMTBcdTRFMDBcdTZCMjFcdTMwMDJcblxuIyMgMS4gXHU1Qjg5XHU4OEM1XHU1RTc2XHU1NDJGXHU3NTI4XHU2M0QyXHU0RUY2XG5cbjEuIFx1NjI1M1x1NUYwMCBPYnNpZGlhbiBcdTc2ODQgKipcdThCQkVcdTdGNkUgXHUyMTkyIFx1N0IyQ1x1NEUwOVx1NjVCOVx1NjNEMlx1NEVGNlx1RkYwOENvbW11bml0eSBwbHVnaW5zXHVGRjA5KipcdTMwMDJcbjIuIFx1NTk4Mlx1Njc5Q1x1NEVDRFx1NTkwNFx1NEU4RVx1NTNEN1x1OTY1MFx1NkEyMVx1NUYwRlx1RkYwQ1x1NjMwOSBPYnNpZGlhbiBcdTYzRDBcdTc5M0FcdTUxNzNcdTk1RURcdTUzRDdcdTk2NTBcdTZBMjFcdTVGMEZcdTMwMDJcbjMuIFx1NzBCOVx1NTFGQlx1MjAxQ1x1NkQ0Rlx1ODlDOFx1MjAxRFx1RkYwQ1x1NjQxQ1x1N0QyMiAqKlNwYWNlZCBSZXBldGl0aW9uKipcdUZGMENcdTVCODlcdTg4QzVcdTVFNzZcdTU0MkZcdTc1MjhcdTVCODNcdTMwMDJcbjQuIFx1NTIxRFx1NkIyMVx1NEY3Rlx1NzUyOFx1NEUwRFx1OTcwMFx1ODk4MVx1NEZFRVx1NjUzOVx1N0I5N1x1NkNENVx1NjIxNlx1NTIwNlx1OTY5NFx1N0IyNlx1OEJCRVx1N0Y2RVx1RkYwQ1x1NEZERFx1NzU1OVx1OUVEOFx1OEJBNFx1NTAzQ1x1NTM3M1x1NTNFRlx1MzAwMlxuXG4jIyAyLiBcdTc1MjhcdTY4MzdcdTRGOEJcdTVCOENcdTYyMTBcdTdCMkNcdTRFMDBcdTZCMjFcdTU5MERcdTRFNjBcblxuMS4gXHU2MjUzXHU1RjAwIFtbMDEtVm9jYWJ1bGFyeS9TcGFjZWQgUmVwZXRpdGlvbiBcdTk1RUFcdTUzNjFcdTc5M0FcdTRGOEJdXVx1MzAwMlxuMi4gXHU2MjUzXHU1RjAwXHU1NDdEXHU0RUU0XHU5NzYyXHU2NzdGXHVGRjFBbWFjT1MgXHU2MzA5IFxcYFx1MjMxOCBQXFxgXHVGRjBDV2luZG93cyAvIExpbnV4IFx1NjMwOSBcXGBDdHJsIFBcXGBcdTMwMDJcbjMuIFx1NjQxQ1x1N0QyMiAqKlNwYWNlZCBSZXBldGl0aW9uKipcdUZGMENcdTYyNjdcdTg4NENcdTIwMUMqKlx1NTkwRFx1NEU2MFx1NkI2NFx1N0IxNFx1OEJCMFx1NEUyRFx1NzY4NFx1NTM2MVx1NzI0NyoqXHUyMDFEXHVGRjA4XHU4MkYxXHU2NTg3XHU3NTRDXHU5NzYyXHU0RTNBIFxcYFJldmlldyBmbGFzaGNhcmRzIGluIHRoaXMgbm90ZVxcYFx1RkYwOVx1MzAwMlxuNC4gXHU1MTQ4XHU1NzI4XHU1RkMzXHU5MUNDXHU1NkRFXHU3QjU0XHVGRjBDXHU1MThEXHU2NjNFXHU3OTNBXHU3QjU0XHU2ODQ4XHVGRjBDXHU1RTc2XHU2MzA5XHU3NzFGXHU1QjlFXHU1NkRFXHU1RkM2XHU2MEM1XHU1MUI1XHU5MDA5XHU2MkU5XHU4QkM0XHU1MjA2XHUzMDAyXHU2M0QyXHU0RUY2XHU0RjFBXHU2MzZFXHU2QjY0XHU1Qjg5XHU2MzkyXHU0RTBCXHU2QjIxXHU1OTBEXHU0RTYwXHUzMDAyXG5cblx1NTk4Mlx1Njc5Q1x1NTNFQVx1NjBGM1x1N0FDQlx1NTIzQlx1OTFDRFx1NTA1QVx1NTE2OFx1OTBFOFx1NjgzN1x1NEY4Qlx1MzAwMVx1NEUwRFx1ODAwM1x1ODY1MVx1NTkwRFx1NEU2MFx1NjVFNVx1NjcxRlx1RkYwQ1x1OEJGN1x1NjI2N1x1ODg0Q1x1MjAxQyoqXHU5NkM2XHU0RTJEXHU1OTBEXHU0RTYwXHU2QjY0XHU3QjE0XHU4QkIwXHU0RTJEXHU3Njg0XHU1MzYxXHU3MjQ3KipcdTIwMURcdUZGMDhcdTgyRjFcdTY1ODdcdTc1NENcdTk3NjJcdTRFM0EgXFxgQ3JhbSBmbGFzaGNhcmRzIGluIHRoaXMgbm90ZVxcYFx1RkYwOVx1MzAwMlxuXG4jIyAzLiBcdTUyMUJcdTVFRkFcdTgxRUFcdTVERjFcdTc2ODRcdTk1RUFcdTUzNjFcblxuXHU1MTQ4XHU1NzI4XHU1MzA1XHU1NDJCXHU1MzYxXHU3MjQ3XHU3Njg0XHU3QjE0XHU4QkIwXHU0RTJEXHU1MkEwXHU1MTY1XHU1MzYxXHU3RUM0XHU2ODA3XHU3QjdFXHUzMDAyXHU5RUQ4XHU4QkE0XHU1MzYxXHU3RUM0XHU2ODA3XHU3QjdFXHU2NjJGXHVGRjFBXG5cblxcYFxcYFxcYG1hcmtkb3duXG4jZmxhc2hjYXJkc1xuXFxgXFxgXFxgXG5cblx1NEU1Rlx1NTNFRlx1NEVFNVx1NzUyOFx1NUM0Mlx1N0VBN1x1NjgwN1x1N0I3RVx1NTIwNlx1N0VDNFx1RkYwQ1x1NEY4Qlx1NTk4Mlx1RkYxQVxuXG5cXGBcXGBcXGBtYXJrZG93blxuI2ZsYXNoY2FyZHMvYmlubmFnZW50eC92b2NhYnVsYXJ5XG5cXGBcXGBcXGBcblxuXHU3MTM2XHU1NDBFXHU5MDA5XHU2MkU5XHU0RTAwXHU3OUNEXHU1MzYxXHU3MjQ3XHU2ODNDXHU1RjBGXHVGRjFBXG5cblxcYFxcYFxcYG1hcmtkb3duXG5yZXNpbGllbnQgXHU2NjJGXHU0RUMwXHU0RTQ4XHU2MTBGXHU2MDFEXHVGRjFGOjpcdTY3MDlcdTk3RTdcdTYwMjdcdTc2ODRcdUZGMUJcdTgwRkRcdTRFQ0VcdTU2RjBcdTk2QkVcdTRFMkRcdThGQzVcdTkwMUZcdTYwNjJcdTU5MERcdTc2ODRcdTMwMDJcblxuXHU2NzA5XHU5N0U3XHU2MDI3XHU3Njg0XHVGRjFCXHU4MEZEXHU4RkM1XHU5MDFGXHU2MDYyXHU1OTBEXHU3Njg0Ojo6cmVzaWxpZW50XG5cbmFsdGhvdWdoIFx1NTQ4QyBkZXNwaXRlIFx1NTQwRVx1OTc2Mlx1NTIwNlx1NTIyQlx1NjNBNVx1NEVDMFx1NEU0OFx1RkYxRlxuP1xuYWx0aG91Z2ggXHU1NDBFXHU2M0E1XHU1QjhDXHU2NTc0XHU0RUNFXHU1M0U1XHVGRjFCZGVzcGl0ZSBcdTU0MEVcdTYzQTVcdTU0MERcdThCQ0RcdTMwMDFcdTRFRTNcdThCQ0RcdTYyMTZcdTUyQThcdTU0MERcdThCQ0RcdTMwMDJcblxcYFxcYFxcYFxuXG4tIFxcYDo6XFxgIFx1NTIxQlx1NUVGQVx1NTM1NVx1NTQxMVx1NTM2MVx1RkYxQVx1NURFNlx1OEZCOVx1NjYyRlx1OTVFRVx1OTg5OFx1RkYwQ1x1NTNGM1x1OEZCOVx1NjYyRlx1N0I1NFx1Njg0OFx1MzAwMlxuLSBcXGA6OjpcXGAgXHU1MjFCXHU1RUZBXHU1M0NDXHU1NDExXHU1MzYxXHVGRjFBXHU0RTI0XHU0RTJBXHU2NUI5XHU1NDExXHU5MEZEXHU0RjFBXHU4OEFCXHU2M0QwXHU5NUVFXHUzMDAyXG4tIFx1NTM1NVx1NzJFQ1x1NEUwMFx1ODg0Q1x1NzY4NCBcXGA/XFxgIFx1OTAwMlx1NTQwOFx1OEY4M1x1OTU3Rlx1NzY4NFx1NTkxQVx1ODg0Q1x1N0I1NFx1Njg0OFx1MzAwMlxuXG4jIyA0LiBcdTZCQ0ZcdTU5MjlcdTYwMEVcdTRFNDhcdTU5MERcdTRFNjBcblxuXHU2MjUzXHU1RjAwXHU1NDdEXHU0RUU0XHU5NzYyXHU2NzdGXHVGRjBDXHU2NDFDXHU3RDIyICoqU3BhY2VkIFJlcGV0aXRpb24qKiBcdTVFNzZcdTYyNjdcdTg4NENcdTIwMUMqKlx1NTkwRFx1NEU2MFx1NjI0MFx1NjcwOVx1N0IxNFx1OEJCMFx1NEUyRFx1NzY4NFx1NTM2MVx1NzI0NyoqXHUyMDFEXHVGRjBDXHU5MDA5XHU2MkU5XHU1MzYxXHU3RUM0XHU1NDBFXHU1RjAwXHU1OUNCXHU1OTBEXHU0RTYwXHUzMDAyXHU1RUZBXHU4QkFFXHU1MTQ4XHU1NkRFXHU1RkM2XHU1MThEXHU3NzBCXHU3QjU0XHU2ODQ4XHVGRjFCXHU4QkM0XHU1MjA2XHU1M0NEXHU2NjIwXHUyMDFDXHU4RkQ5XHU2QjIxXHU2MEYzXHU4RDc3XHU2NzY1XHU2NzA5XHU1OTFBXHU5NkJFXHUyMDFEXHVGRjBDXHU0RTBEXHU1RkM1XHU4RkZEXHU2QzQyXHU1MTY4XHU5MEU4XHU5MDA5IEVhc3lcdTMwMDJcblxuXHU1OTBEXHU0RTYwXHU1NDBFXHVGRjBDU3BhY2VkIFJlcGV0aXRpb24gXHU0RjFBXHU1NzI4XHU1MzYxXHU3MjQ3XHU5NjQ0XHU4RkQxXHU1MTk5XHU1MTY1XHU3QzdCXHU0RjNDIFxcYDwhLS1TUjouLi4tLT5cXGAgXHU3Njg0XHU4QzAzXHU1RUE2XHU2Q0U4XHU5MUNBXHUzMDAyXHU4RkQ5XHU2NjJGXHU1OTBEXHU0RTYwXHU4QkIwXHU1RjU1XHVGRjBDXHU0RTBEXHU2NjJGXHU5NTE5XHU4QkVGXHVGRjFCXHU0RTBEXHU4OTgxXHU2MjRCXHU1MkE4XHU0RkVFXHU2NTM5XHU2MjE2XHU1MjIwXHU5NjY0XHUzMDAyXG5cbiMjIFx1NUUzOFx1ODlDMVx1OTVFRVx1OTg5OFxuXG4tICoqXHU2MjdFXHU0RTBEXHU1MjMwXHU1MzYxXHU3RUM0KipcdUZGMUFcdTc4NkVcdThCQTQgU3BhY2VkIFJlcGV0aXRpb24gXHU1REYyXHU1NDJGXHU3NTI4XHVGRjBDXHU1RTc2XHU0RTE0XHU3QjE0XHU4QkIwXHU2QjYzXHU2NTg3XHU1NDJCXHU2NzA5IFxcYCNmbGFzaGNhcmRzXFxgIFx1NjIxNlx1NTE3Nlx1NUM0Mlx1N0VBN1x1NjgwN1x1N0I3RVx1MzAwMlxuLSAqKlx1NTM2MVx1NzI0N1x1NkNBMVx1NjcwOVx1ODhBQlx1OEJDNlx1NTIyQioqXHVGRjFBXHU1MTQ4XHU0RjdGXHU3NTI4XHU5RUQ4XHU4QkE0XHU1MjA2XHU5Njk0XHU3QjI2XHVGRjBDXHU1RTc2XHU3ODZFXHU4QkE0IFxcYDo6XFxgXHUzMDAxXFxgOjo6XFxgIFx1NjIxNiBcXGA/XFxgIFx1NEUwRFx1NTcyOFx1NEVFM1x1NzgwMVx1NTc1N1x1NEUyRFx1MzAwMlxuLSAqKlx1NEVDQVx1NTkyOVx1NkNBMVx1NjcwOVx1NTIzMFx1NjcxRlx1NTM2MVx1NzI0NyoqXHVGRjFBXHU2MjY3XHU4ODRDXHUyMDFDXHU5NkM2XHU0RTJEXHU1OTBEXHU0RTYwXHU2QjY0XHU3QjE0XHU4QkIwXHU0RTJEXHU3Njg0XHU1MzYxXHU3MjQ3XHUyMDFEXHU1M0VGXHU5NjhGXHU2NUY2XHU3RUMzXHU0RTYwXHVGRjBDXHU0RTBEXHU0RjFBXHU1M0Q3XHU1MjMwXHU2NzFGXHU2NUU1XHU5NjUwXHU1MjM2XHUzMDAyXG4tICoqXHU2MEYzXHU1OTBEXHU0RTYwXHU2NTc0XHU3QkM3XHU3QjE0XHU4QkIwKipcdUZGMUFcdThGRDlcdTY2MkZcdTUzRTZcdTRFMDBcdTc5Q0RcdTVERTVcdTRGNUNcdTZENDFcdUZGMENcdTUzRUZcdTdFRDlcdTdCMTRcdThCQjBcdTUyQTAgXFxgI3Jldmlld1xcYFx1RkYxQlx1NTE2NVx1OTVFOFx1OTYzNlx1NkJCNVx1NTNFQVx1NEY3Rlx1NzUyOFx1OTVFQVx1NTM2MVx1NTM3M1x1NTNFRlx1MzAwMlxuYCxcbiAgW2Ake0lOQk9YX0ZPTERFUn0vXHU2NTM2XHU5NkM2XHU3QkIxXHU0RjdGXHU3NTI4XHU4QkY0XHU2NjBFLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuaW5ib3hfc3RhdHVzOiByZWZlcmVuY2VcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gaW5ib3hcbi0tLVxuXG4jIFx1NjUzNlx1OTZDNlx1N0JCMVx1NEY3Rlx1NzUyOFx1OEJGNFx1NjYwRVxuXG5cdTY4MDdcdTZDRThcdTMwMDFcdTcwNzVcdTYxMUZcdTMwMDFcdTRFMERcdTRGMUFcdTVGNTJcdTdDN0JcdTc2ODRcdTg4NjhcdThGQkVcdTUxNDhcdTY1M0VcdTU3MjhcdThGRDlcdTkxQ0NcdUZGMENcdTRFMERcdTk3MDBcdTg5ODFcdTRFMDBcdTVGMDBcdTU5Q0JcdTVDMzFcdTUxOTlcdTVGOTdcdTVCOENcdTY1NzRcdTMwMDJcblxuIyMgXHU2QkNGXHU1NDY4XHU2NTc0XHU3NDA2XG5cbjEuIFx1ODBGRFx1NTkwRFx1NzUyOFx1NzY4NFx1NTM1NVx1OEJDRFx1NjIxNlx1NzdFRFx1OEJFRFx1RkYwQ1x1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0N11dXHUzMDAyXG4yLiBcdTUzRTVcdTVCNTBcdTgwQ0NcdTU0MEVcdTc2ODRcdTg5QzRcdTUyMTlcdUZGMENcdTY1NzRcdTc0MDZcdTUyMzAgW1suLi8wMi1HcmFtbWFyLzAwLURhc2hib2FyZHxcdThCRURcdTZDRDVdXVx1MzAwMlxuMy4gXHU1MzlGXHU2NTg3XHU0RTBFXHU5NjA1XHU4QkZCXHU4QkIwXHU1RjU1XHVGRjBDXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDMtUmVhZGluZy9cdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTc5M0FcdTRGOEJ8XHU5NjA1XHU4QkZCXV1cdTMwMDJcbjQuIFx1ODFFQVx1NURGMVx1NTE5OVx1NzY4NFx1NkJCNVx1ODQzRFx1RkYwQ1x1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzA0LVdyaXRpbmcvXHU1MTk5XHU0RjVDXHU3RUMzXHU0RTYwXHU3OTNBXHU0RjhCfFx1NTE5OVx1NEY1Q11dXHUzMDAyXG41LiBcdTVERjJcdTU5MDRcdTc0MDZcdTc2ODRcdTc4OEVcdTcyNDdcdTUzRUZcdTVGNTJcdTY4NjNcdTMwMDFcdTc5RkJcdTUyQThcdTYyMTZcdTUyMjBcdTk2NjRcdUZGMUJcdTYzRDJcdTRFRjZcdTRFMERcdTRGMUFcdTY2RkZcdTRGNjBcdTg5ODZcdTc2RDZcdThGRDlcdTRFOUJcdTUxODVcdTVCQjlcdTMwMDJcbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkLm1kYF06IGAjIFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRcblxuXHU4RkQ5XHU2NjJGXHU4QkNEXHU2QzQ3XHU1RTkzXHU3Njg0XHU1MTg1XHU1QkI5XHU1NzMwXHU1NkZFXHUzMDAyXHU2NUIwXHU1RUZBXHU3QjE0XHU4QkIwXHU2NUY2XHU0RjdGXHU3NTI4IFtbLi4vMDUtVGVtcGxhdGVzL1x1OEJDRFx1NkM0N3xcdThCQ0RcdTZDNDdcdTZBMjFcdTY3N0ZdXVx1MzAwMlxuXG4jIyBcdTUxNjhcdTkwRThcdThCQ0RcdTZDNDdcdUZGMDhEYXRhdmlld1x1RkYwOVxuXG5cXGBcXGBcXGBkYXRhdmlld1xuVEFCTEUgV0lUSE9VVCBJRCBmaWxlLmxpbmsgQVMgXCJcdThCQ0RcdTZDNDdcIiwgbWVhbmluZyBBUyBcIlx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVwiLCBzdGF0dXMgQVMgXCJcdTcyQjZcdTYwMDFcIiwgZmlsZS5tdGltZSBBUyBcIlx1NjZGNFx1NjVCMFwiXG5GUk9NIFwiQmlubkFnZW50WC8wMS1Wb2NhYnVsYXJ5XCJcbldIRVJFIGZpbGUubmFtZSAhPSBcIjAwLURhc2hib2FyZFwiIEFORCBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIlxuU09SVCBmaWxlLm10aW1lIERFU0NcblxcYFxcYFxcYFxuXG4jIyBcdTVFRkFcdThCQUVcdTc2ODQgTU9DXG5cbi0gXHU2MzA5XHU0RTNCXHU5ODk4XHVGRjFBXHU1QjY2XHU0RTYwXHUzMDAxXHU1REU1XHU0RjVDXHUzMDAxXHU2NUM1XHU4ODRDXHUzMDAxXHU2MEM1XHU3RUVBXG4tIFx1NjMwOVx1NTE3M1x1N0NGQlx1RkYxQVx1NTQwQ1x1NEU0OVx1OEJDRFx1MzAwMVx1NTNDRFx1NEU0OVx1OEJDRFx1MzAwMVx1NjYxM1x1NkRGN1x1OEJDRFx1MzAwMVx1NTZGQVx1NUI5QVx1NjQyRFx1OTE0RFxuLSBcdTc5M0FcdTRGOEJcdUZGMUFbW3Jlc2lsaWVudF1dXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5L3Jlc2lsaWVudC5tZGBdOiBgLS0tXG5iaW5uYWdlbnRfc3luYzogZmFsc2VcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXG5iaW5uYWdlbnRfa2luZDogXCJ2b2NhYnVsYXJ5XCJcbm1lYW5pbmc6IFwiXHU2NzA5XHU5N0U3XHU2MDI3XHU3Njg0XHVGRjFCXHU4MEZEXHU4RkM1XHU5MDFGXHU2MDYyXHU1OTBEXHU3Njg0XCJcbnN0YXR1czogbGVhcm5pbmdcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gdm9jYWJ1bGFyeVxuICAtIGNoYXJhY3RlclxuLS0tXG5cbiMgcmVzaWxpZW50XG5cbiMjIFx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVxuXG5BYmxlIHRvIHJlY292ZXIgcXVpY2tseSBhZnRlciBkaWZmaWN1bHR5IG9yIGNoYW5nZS5cblxuIyMgXHU1M0QxXHU5N0YzXG5cbi9yXHUwMjZBXHUwMkM4elx1MDI2QWxpXHUwMjU5bnQvXG5cbiMjIFx1NUUzOFx1NzUyOFx1NjQyRFx1OTE0RFxuXG4tIHJlc2lsaWVudCBwZW9wbGVcbi0gYSByZXNpbGllbnQgZWNvbm9teVxuLSByZW1haW4gcmVzaWxpZW50XG5cbiMjIFx1NTM5Rlx1NTNFNVx1NEUwRVx1OEJFRFx1NTg4M1xuXG5UaGUgdGVhbSByZW1haW5lZCByZXNpbGllbnQgYWZ0ZXIgYW4gZWFybHkgc2V0YmFjay5cblxuIyMgXHU2MjExXHU3Njg0XHU0RjhCXHU1M0U1XG5cbkkgd2FudCB0byBiZWNvbWUgbW9yZSByZXNpbGllbnQgd2hlbiBhIHBsYW4gY2hhbmdlcyB1bmV4cGVjdGVkbHkuXG5cbiMjIFx1NjYxM1x1NkRGN1x1NkRDNlx1NzBCOVxuXG4qKnJlc2lsaWVudCoqIFx1NUYzQVx1OEMwM1x1NTNEN1x1NjMyQlx1NTQwRVx1NzY4NFx1NjA2Mlx1NTkwRFx1ODBGRFx1NTI5Qlx1RkYxQioqcGVyc2lzdGVudCoqIFx1NUYzQVx1OEMwM1x1NjMwMVx1N0VFRFx1NTc1QVx1NjMwMVx1MzAwMlxuXG4jIyBcdTUxNzNcdTgwNTRcblxuLSBbWzAwLURhc2hib2FyZF1dXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5L1NwYWNlZCBSZXBldGl0aW9uIFx1OTVFQVx1NTM2MVx1NzkzQVx1NEY4Qi5tZGBdOiBgLS0tXG5iaW5uYWdlbnRfc3luYzogZmFsc2VcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXG5iaW5uYWdlbnRfa2luZDogXCJ2b2NhYnVsYXJ5XCJcbnN0YXR1czogZXhhbXBsZVxudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSB2b2NhYnVsYXJ5XG4gIC0gc3BhY2VkLXJlcGV0aXRpb25cbi0tLVxuXG4jIFNwYWNlZCBSZXBldGl0aW9uIFx1OTVFQVx1NTM2MVx1NzkzQVx1NEY4QlxuXG5cdThGRDlcdTY2MkZcdTRFMDBcdTdFQzRcdTUzRUZcdTRFRTVcdTdBQ0JcdTUzNzNcdTU5MERcdTRFNjBcdTc2ODRcdTUxNjVcdTk1RThcdTUzNjFcdTcyNDdcdTMwMDJcdThCRjdcdTRGRERcdTc1NTlcdTRFMEJcdTRFMDBcdTg4NENcdTUzNjFcdTdFQzRcdTY4MDdcdTdCN0VcdUZGMENcdTcxMzZcdTU0MEVcdTYyNTNcdTVGMDBcdTU0N0RcdTRFRTRcdTk3NjJcdTY3N0ZcdUZGMENcdTY0MUNcdTdEMjIgKipTcGFjZWQgUmVwZXRpdGlvbioqIFx1NUU3Nlx1NjI2N1x1ODg0Q1x1MjAxQyoqXHU1OTBEXHU0RTYwXHU2QjY0XHU3QjE0XHU4QkIwXHU0RTJEXHU3Njg0XHU1MzYxXHU3MjQ3KipcdTIwMURcdTMwMDJcblxuI2ZsYXNoY2FyZHMvYmlubmFnZW50eC92b2NhYnVsYXJ5XG5cbiMjIFx1NTM1NVx1NTQxMVx1NTM2MVxuXG5yZXNpbGllbnQgXHU3Njg0XHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XHU2NjJGXHU0RUMwXHU0RTQ4XHVGRjFGOjpcdTY3MDlcdTk3RTdcdTYwMjdcdTc2ODRcdUZGMUJcdTgwRkRcdTU3MjhcdTU2RjBcdTk2QkVcdTYyMTZcdTUzRDhcdTUzMTZcdTU0MEVcdThGQzVcdTkwMUZcdTYwNjJcdTU5MERcdTc2ODRcdTMwMDJcblxuIyMgXHU1M0NDXHU1NDExXHU1MzYxXG5cblx1NjcwOVx1OTdFN1x1NjAyN1x1NzY4NFx1RkYxQlx1ODBGRFx1OEZDNVx1OTAxRlx1NjA2Mlx1NTkwRFx1NzY4NDo6OnJlc2lsaWVudFxuXG4jIyBcdTU5MUFcdTg4NENcdTUzNjFcblxucmVzaWxpZW50IFx1NTQ4QyBwZXJzaXN0ZW50IFx1NzY4NFx1NEZBN1x1OTFDRFx1NzBCOVx1NjcwOVx1NEVDMFx1NEU0OFx1NEUwRFx1NTQwQ1x1RkYxRlxuP1xuKipyZXNpbGllbnQqKiBcdTVGM0FcdThDMDNcdTUzRDdcdTYzMkJcdTU0MEVcdTc2ODRcdTYwNjJcdTU5MERcdTgwRkRcdTUyOUJcdUZGMUIqKnBlcnNpc3RlbnQqKiBcdTVGM0FcdThDMDNcdTRFMERcdTY1M0VcdTVGMDNcdTMwMDFcdTYzMDFcdTdFRURcdTU3NUFcdTYzMDFcdTMwMDJcblxuLS0tXG5cblx1NTkwRFx1NEU2MFx1NUI4Q1x1NjIxMFx1NTQwRVx1RkYwQ1NwYWNlZCBSZXBldGl0aW9uIFx1NEYxQVx1ODFFQVx1NTJBOFx1NTcyOFx1NTM2MVx1NzI0N1x1OTY0NFx1OEZEMVx1NTJBMFx1NTE2NVx1OEMwM1x1NUVBNlx1NkNFOFx1OTFDQVx1MzAwMlx1NjNBNVx1NEUwQlx1Njc2NVx1NTNFRlx1NEVFNVx1NTNDMlx1ODAwMyBbWy4uL1NwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N3xcdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTddXVx1RkYwQ1x1NjI4QVx1ODFFQVx1NURGMVx1NzY4NFx1NUI2Nlx1NEU2MFx1NTE4NVx1NUJCOVx1NjUzOVx1NTE5OVx1NjIxMFx1NTM2MVx1NzI0N1x1MzAwMlxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDItR3JhbW1hci8wMC1EYXNoYm9hcmQubWRgXTogYCMgXHU4QkVEXHU2Q0Q1IERhc2hib2FyZFxuXG5cdThGRDlcdTY2MkZcdThCRURcdTZDRDVcdTVFOTNcdTc2ODRcdTUxODVcdTVCQjlcdTU3MzBcdTU2RkVcdTMwMDJcdTY1QjBcdTVFRkFcdTdCMTRcdThCQjBcdTY1RjZcdTRGN0ZcdTc1MjggW1suLi8wNS1UZW1wbGF0ZXMvXHU4QkVEXHU2Q0Q1fFx1OEJFRFx1NkNENVx1NkEyMVx1Njc3Rl1dXHUzMDAyXG5cbiMjIFx1NTE2OFx1OTBFOFx1OEJFRFx1NkNENVx1NzBCOVx1RkYwOERhdGF2aWV3XHVGRjA5XG5cblxcYFxcYFxcYGRhdGF2aWV3XG5UQUJMRSBXSVRIT1VUIElEIGZpbGUubGluayBBUyBcIlx1OEJFRFx1NkNENVx1NzBCOVwiLCBzdGF0dXMgQVMgXCJcdTcyQjZcdTYwMDFcIiwgZmlsZS5tdGltZSBBUyBcIlx1NjZGNFx1NjVCMFwiXG5GUk9NIFwiQmlubkFnZW50WC8wMi1HcmFtbWFyXCJcbldIRVJFIGZpbGUubmFtZSAhPSBcIjAwLURhc2hib2FyZFwiIEFORCBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIlxuU09SVCBmaWxlLm10aW1lIERFU0NcblxcYFxcYFxcYFxuXG4jIyBcdTVFRkFcdThCQUVcdTc2ODQgTU9DXG5cbi0gXHU2NUY2XHU2MDAxXHU0RTBFXHU4QkVEXHU2MDAxXG4tIFx1NEVDRVx1NTNFNVxuLSBcdTk3NUVcdThDMTNcdThCRURcdTUyQThcdThCQ0Rcbi0gXHU4RkRFXHU2M0E1XHU0RTBFXHU4ODU0XHU2M0E1XG4tIFx1NzkzQVx1NEY4Qlx1RkYxQVtbYWx0aG91Z2ggXHU0RTBFIGRlc3BpdGVdXVxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDItR3JhbW1hci9hbHRob3VnaCBcdTRFMEUgZGVzcGl0ZS5tZGBdOiBgLS0tXG5iaW5uYWdlbnRfc3luYzogZmFsc2VcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXG5iaW5uYWdlbnRfa2luZDogXCJncmFtbWFyXCJcbnN0YXR1czogbGVhcm5pbmdcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gZ3JhbW1hclxuICAtIGNvbmNlc3Npb25cbi0tLVxuXG4jIGFsdGhvdWdoIFx1NEUwRSBkZXNwaXRlXG5cbiMjIFx1NEUwMFx1NTNFNVx1OEJERFx1ODlDNFx1NTIxOVxuXG4qKmFsdGhvdWdoKiogXHU1NDBFXHU2M0E1XHU1QjhDXHU2NTc0XHU0RUNFXHU1M0U1XHVGRjFCKipkZXNwaXRlKiogXHU1NDBFXHU2M0E1XHU1NDBEXHU4QkNEXHUzMDAxXHU0RUUzXHU4QkNEXHU2MjE2XHU1MkE4XHU1NDBEXHU4QkNEXHUzMDAyXG5cbiMjIFx1N0VEM1x1Njc4NFx1NTE2Q1x1NUYwRlxuXG4tIEFsdGhvdWdoICsgXHU0RTNCXHU4QkVEICsgXHU4QzEzXHU4QkVELCBcdTRFM0JcdTUzRTVcdTMwMDJcbi0gRGVzcGl0ZSArIFx1NTQwRFx1OEJDRCAvIGRvaW5nLCBcdTRFM0JcdTUzRTVcdTMwMDJcblxuIyMgXHU1MzlGXHU1M0U1XHU2MkM2XHU4OUUzXG5cbkFsdGhvdWdoIGl0IHdhcyByYWluaW5nLCB3ZSBrZXB0IHdhbGtpbmcuXG5cbkRlc3BpdGUgdGhlIHJhaW4sIHdlIGtlcHQgd2Fsa2luZy5cblxuIyMgXHU1RTM4XHU4OUMxXHU4QkVGXHU1MzNBXG5cblx1NEUwRFx1ODk4MVx1NTE5OVx1NjIxMCBcdTIwMUNkZXNwaXRlIGl0IHdhcyByYWluaW5nXHUyMDFEXHUzMDAyXHU1M0VGXHU2NTM5XHU0RTNBIFx1MjAxQ2Rlc3BpdGUgdGhlIHJhaW5cdTIwMUQgXHU2MjE2IFx1MjAxQ2Rlc3BpdGUgdGhlIGZhY3QgdGhhdCBpdCB3YXMgcmFpbmluZ1x1MjAxRFx1MzAwMlxuXG4jIyBcdTY1QjBcdThCRURcdTU4ODNcdTlBOENcdThCQzFcblxuQWx0aG91Z2ggdGhlIHRhc2sgd2FzIGRpZmZpY3VsdCwgc2hlIGZpbmlzaGVkIGl0IG9uIHRpbWUuXG5cbiMjIFx1NTE3M1x1ODA1NFxuXG4tIFtbMDAtRGFzaGJvYXJkXV1cbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAzLVJlYWRpbmcvXHU5NjA1XHU4QkZCXHU3QjE0XHU4QkIwXHU3OTNBXHU0RjhCLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcInJlYWRpbmdfc2tpbGxcIlxuc3RhdHVzOiBleGFtcGxlXG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIHJlYWRpbmdcbi0tLVxuXG4jIFx1OTYwNVx1OEJGQlx1N0IxNFx1OEJCMFx1NzkzQVx1NEY4QlxuXG4jIyBcdTY3NjVcdTZFOTBcblxuXHU1NzI4XHU4RkQ5XHU5MUNDXHU4QkIwXHU1RjU1XHU2NTg3XHU3QUUwXHU2ODA3XHU5ODk4XHUzMDAxXHU0RjVDXHU4MDA1XHU1NDhDXHU5NEZFXHU2M0E1XHUzMDAyXG5cbiMjIFx1NEUwMFx1NTNFNVx1OEJERFx1NjQ1OFx1ODk4MVxuXG5cdTUxNDhcdTc1MjhcdTgxRUFcdTVERjFcdTc2ODRcdThCRERcdTUxOTlcdTRFMDBcdTUzRTVcdUZGMENcdTUxOERcdTg4NjVcdTdFQzZcdTgyODJcdTMwMDJcblxuIyMgXHU1MTczXHU5NTJFXHU2QkI1XHU4NDNEXHU0RTBFXHU4QkMxXHU2MzZFXG5cblx1NjQ1OFx1NUY1NVx1NUMxMVx1OTFDRlx1NTE3M1x1OTUyRVx1NTNFNVx1RkYwQ1x1NUU3Nlx1OEJGNFx1NjYwRVx1NUI4M1x1NEUzQVx1NEVDMFx1NEU0OFx1OTFDRFx1ODk4MVx1MzAwMlxuXG4jIyBcdTY1QjBcdThCQ0RcdTRFMEVcdThCRURcdTZDRDVcblxuLSBcdThCQ0RcdTZDNDdcdTUzRUZcdTY1NzRcdTc0MDZcdTUyMzAgW1suLi8wMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZHxcdThCQ0RcdTZDNDcgRGFzaGJvYXJkXV1cdTMwMDJcbi0gXHU4QkVEXHU2Q0Q1XHU1M0VGXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDItR3JhbW1hci8wMC1EYXNoYm9hcmR8XHU4QkVEXHU2Q0Q1IERhc2hib2FyZF1dXHUzMDAyXG5cbiMjIFx1NjIxMVx1NzY4NFx1ODlDMlx1NzBCOVxuXG5cdTUxOTlcdTRFMEJcdThENUVcdTU0MENcdTMwMDFcdThEMjhcdTc1OTFcdTYyMTZcdTUzRUZcdTRFRTVcdThGQzFcdTc5RkJcdTUyMzBcdTUxNzZcdTRFRDZcdTY1ODdcdTdBRTBcdTc2ODRcdTYwRjNcdTZDRDVcdTMwMDJcbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzA0LVdyaXRpbmcvXHU1MTk5XHU0RjVDXHU3RUMzXHU0RTYwXHU3OTNBXHU0RjhCLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcIndyaXRpbmdfc2tpbGxcIlxuc3RhdHVzOiBkcmFmdFxudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSB3cml0aW5nXG4tLS1cblxuIyBcdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTc5M0FcdTRGOEJcblxuIyMgXHU5ODk4XHU3NkVFXG5cbkRlc2NyaWJlIGEgaGFiaXQgdGhhdCBoYXMgaW1wcm92ZWQgeW91ciBsZWFybmluZy5cblxuIyMgVjEgXHU4MzQ5XHU3QTNGXG5cblx1NTE0OFx1NTE5OVx1NUI4Q1x1RkYwQ1x1NEUwRFx1NTcyOFx1N0IyQ1x1NEUwMFx1OTA0RFx1OEZGRFx1NkM0Mlx1NUI4Q1x1N0Y4RVx1MzAwMlxuXG4jIyBcdTRGRUVcdTY1MzlcdThCQjBcdTVGNTVcblxuLSBcdTUxODVcdTVCQjlcdUZGMUFcdTg5QzJcdTcwQjlcdTY2MkZcdTU0MjZcdTZFMDVcdTY5NUFcdUZGMUZcbi0gXHU3RUQzXHU2Nzg0XHVGRjFBXHU2QkI1XHU4NDNEXHU2NjJGXHU1NDI2XHU2NzA5XHU0RTNCXHU5ODk4XHU1M0U1XHU1NDhDXHU4QkMxXHU2MzZFXHVGRjFGXG4tIFx1OEJFRFx1OEEwMFx1RkYxQVx1NjYyRlx1NTQyNlx1ODBGRFx1NzUyOFx1NjZGNFx1NTFDNlx1Nzg2RVx1NzY4NFx1OEJDRFx1NkM0N1x1NjIxNlx1NTNFNVx1NUYwRlx1RkYxRlxuXG4jIyBWMiBcdTVCOUFcdTdBM0ZcblxuXHU2ODM5XHU2MzZFXHU0RkVFXHU2NTM5XHU4QkIwXHU1RjU1XHU5MUNEXHU1MTk5XHVGRjBDXHU1RTc2XHU0RkREXHU3NTU5IFYxIFx1NjVCOVx1NEZCRlx1NkJENFx1OEY4M1x1MzAwMlxuYCxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJpbm5BZ2VudFhMZWFybmluZ1N5bmNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU3luY1NldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IEJpbm5BZ2VudFhTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcInByZXZpZXctbGVhcm5pbmctY29udGV4dFwiLFxuICAgICAgbmFtZTogXCJQcmV2aWV3IGxlYXJuaW5nIGNvbnRleHRcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLnByZXZpZXcoKSxcbiAgICB9KTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwic3luYy1sZWFybmluZy1jb250ZXh0XCIsXG4gICAgICBuYW1lOiBcIlN5bmMgYXBwcm92ZWQgbGVhcm5pbmcgY29udGV4dFwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuc3luYygpLFxuICAgIH0pO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJpbnN0YWxsLWxlYXJuaW5nLXRlbXBsYXRlc1wiLFxuICAgICAgbmFtZTogXCJJbml0aWFsaXplIEJpbm5BZ2VudFggbGVhcm5pbmcgbGlicmFyeVwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuaW5pdGlhbGl6ZUxlYXJuaW5nTGlicmFyeSgpLFxuICAgIH0pO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5oYW5kbGVMYXlvdXRSZWFkeSgpO1xuICAgIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJJbnRlcnZhbChcbiAgICAgIHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9TeW5jKSB2b2lkIHRoaXMuc3luYyhmYWxzZSk7XG4gICAgICB9LCA2MF8wMDApLFxuICAgICk7XG4gIH1cblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IHsgLi4uREVGQVVMVF9TRVRUSU5HUywgLi4uKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgfTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVMYXlvdXRSZWFkeSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5saWJyYXJ5VmVyc2lvbiA8IENVUlJFTlRfTElCUkFSWV9WRVJTSU9OKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLmluaXRpYWxpemVMZWFybmluZ0xpYnJhcnkoZmFsc2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUZcIjtcbiAgICAgICAgbmV3IE5vdGljZShgQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTVFOTNcdTUyMURcdTU5Q0JcdTUzMTZcdTU5MzFcdThEMjVcdUZGMUEke21lc3NhZ2V9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9TeW5jKSBhd2FpdCB0aGlzLnN5bmMoZmFsc2UpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjb2xsZWN0RW50cmllc0FzeW5jKFxuICAgIGZ1bGxDb250ZW50U291cmNlS2V5czogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCksXG4gICk6IFByb21pc2U8TGVhcm5pbmdDb250ZXh0RW50cnlbXT4ge1xuICAgIGNvbnN0IGZvbGRlcnMgPSBzcGxpdFNjb3BlKHRoaXMuc2V0dGluZ3MuYWxsb3dlZEZvbGRlcnMpO1xuICAgIGNvbnN0IHRhZ3MgPSBzcGxpdFNjb3BlKHRoaXMuc2V0dGluZ3MuYWxsb3dlZFRhZ3MpLm1hcCgodGFnKSA9PiB0YWcucmVwbGFjZSgvXiMvLCBcIlwiKSk7XG4gICAgaWYgKCFmb2xkZXJzLmxlbmd0aCAmJiAhdGFncy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihcIlx1OEJGN1x1OTAwOVx1NjJFOVx1ODFGM1x1NUMxMVx1NEUwMFx1NEUyQVx1NTE0MVx1OEJCOFx1NTQwQ1x1NkI2NVx1NzY4NFx1NjU4N1x1NEVGNlx1NTkzOVx1NjIxNlx1NjgwN1x1N0I3RVwiKTtcbiAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0XG4gICAgICAuZ2V0TWFya2Rvd25GaWxlcygpXG4gICAgICAuZmlsdGVyKChmaWxlKSA9PiBpc0FsbG93ZWQoZmlsZSwgZm9sZGVycywgdGFncywgdGhpcy5hcHApKTtcbiAgICBpZiAoZmlsZXMubGVuZ3RoID4gdGhpcy5zZXR0aW5ncy5tYXhOb3RlcylcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFx1NTMzOVx1OTE0RFx1NTIzMCAke2ZpbGVzLmxlbmd0aH0gXHU3QkM3XHU3QjE0XHU4QkIwXHVGRjBDXHU4QkY3XHU3RjI5XHU1QzBGXHU4MzAzXHU1NkY0XHVGRjA4XHU0RTBBXHU5NjUwICR7dGhpcy5zZXR0aW5ncy5tYXhOb3Rlc31cdUZGMDlgLFxuICAgICAgKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICBmaWxlcy5tYXAoYXN5bmMgKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgICAgICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXIgPz8ge307XG4gICAgICAgIGNvbnN0IHRhZ3MgPSB1bmlxdWVTdHJpbmdzKFtcbiAgICAgICAgICAuLi5hcnJheVN0cmluZ3MoZnJvbnRtYXR0ZXIudGFncyksXG4gICAgICAgICAgLi4uKGNhY2hlPy50YWdzID8/IFtdKS5tYXAoKHRhZykgPT4gdGFnLnRhZy5yZXBsYWNlKC9eIy8sIFwiXCIpKSxcbiAgICAgICAgXSk7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgICBjb25zdCBzY29wZVByZWZpeCA9XG4gICAgICAgICAgZm9sZGVycy5maW5kKChmb2xkZXIpID0+IGZpbGUucGF0aC5zdGFydHNXaXRoKGZvbGRlcikpID8/XG4gICAgICAgICAgYCR7ZmlsZS5wYXRoLnNsaWNlKDAsIGZpbGUucGF0aC5sYXN0SW5kZXhPZihcIi9cIikgKyAxKX1gO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNvdXJjZV9rZXk6IGZpbGUucGF0aCxcbiAgICAgICAgICBhc3NldF9pZDpcbiAgICAgICAgICAgIHR5cGVvZiBmcm9udG1hdHRlci5iaW5uYWdlbnRfYXNzZXRfaWQgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgPyBmcm9udG1hdHRlci5iaW5uYWdlbnRfYXNzZXRfaWRcbiAgICAgICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgICAgdGl0bGU6IFN0cmluZyhmcm9udG1hdHRlci50aXRsZSA/PyBmaWxlLmJhc2VuYW1lKSxcbiAgICAgICAgICBraW5kOiBpbmZlcktpbmQoZnJvbnRtYXR0ZXIuYmlubmFnZW50X2tpbmQsIHRhZ3MpLFxuICAgICAgICAgIHRhZ3MsXG4gICAgICAgICAgZXhjZXJwdDogc3VtbWFyaXplKGNvbnRlbnQsIHRoaXMuc2V0dGluZ3MubWF4RXhjZXJwdENoYXJhY3RlcnMpLFxuICAgICAgICAgIG1vZGlmaWVkX2F0OiBuZXcgRGF0ZShmaWxlLnN0YXQubXRpbWUpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgLi4uKGZ1bGxDb250ZW50U291cmNlS2V5cy5oYXMoZmlsZS5wYXRoKVxuICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgYXV0aG9yaXplZF9jb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICBzY29wZV9wcmVmaXg6IHNjb3BlUHJlZml4LFxuICAgICAgICAgICAgICAgICAgY29udGVudCxcbiAgICAgICAgICAgICAgICAgIGNvbnRlbnRfaGFzaDogYXdhaXQgc2hhMjU2KGNvbnRlbnQpLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDoge30pLFxuICAgICAgICB9O1xuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHJldmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZW50cmllcyA9IGF3YWl0IHRoaXMuY29sbGVjdEVudHJpZXNBc3luYygpO1xuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgYFx1NUMwNlx1NTQwQ1x1NkI2NSAke2VudHJpZXMubGVuZ3RofSBcdTY3NjFcdTVCNjZcdTRFNjBcdTRFMEFcdTRFMEJcdTY1ODdcdUZGMUEke1xuICAgICAgICAgIGVudHJpZXNcbiAgICAgICAgICAgIC5zbGljZSgwLCA0KVxuICAgICAgICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRpdGxlKVxuICAgICAgICAgICAgLmpvaW4oXCJcdTMwMDFcIikgfHwgXCJcdTY1RTBcIlxuICAgICAgICB9YCxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIG5ldyBOb3RpY2UoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlx1NjVFMFx1NkNENVx1OTg4NFx1ODlDOFx1NTQwQ1x1NkI2NVx1ODMwM1x1NTZGNFwiKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbml0aWFsaXplTGVhcm5pbmdMaWJyYXJ5KHNob3dOb3RpY2UgPSB0cnVlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IGluc3RhbGxlZCA9IDA7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoTElCUkFSWV9ST09UKSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKExJQlJBUllfUk9PVCk7XG4gICAgICBpbnN0YWxsZWQgKz0gMTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIExJQlJBUllfRk9MREVSUykge1xuICAgICAgY29uc3QgZm9sZGVyID0gYCR7TElCUkFSWV9ST09UfS8ke25hbWV9YDtcbiAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlcikpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlcik7XG4gICAgICAgIGluc3RhbGxlZCArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBpbnN0YWxsZWQgKz0gYXdhaXQgdGhpcy5taWdyYXRlTWFuYWdlZERhc2hib2FyZHMoKTtcbiAgICBhd2FpdCB0aGlzLnJld3JpdGVNYW5hZ2VkRGFzaGJvYXJkTGlua3MoKTtcbiAgICBpbnN0YWxsZWQgKz0gYXdhaXQgdGhpcy5taWdyYXRlTWFuYWdlZFZvY2FidWxhcnlUZW1wbGF0ZSgpO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGNvbnRlbnRdIG9mIE9iamVjdC5lbnRyaWVzKExFQVJOSU5HX1RFTVBMQVRFUykpIHtcbiAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGAke1RFTVBMQVRFX0ZPTERFUn0vJHtuYW1lfWApKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtURU1QTEFURV9GT0xERVJ9LyR7bmFtZX1gLCBjb250ZW50KTtcbiAgICAgICAgaW5zdGFsbGVkICs9IDE7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BhdGgsIGNvbnRlbnRdIG9mIE9iamVjdC5lbnRyaWVzKExJQlJBUllfTk9URVMpKSB7XG4gICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgY29udGVudCk7XG4gICAgICAgIGluc3RhbGxlZCArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBhd2FpdCB0aGlzLmNvbmZpZ3VyZU9ic2lkaWFuRm9sZGVycygpO1xuICAgIGluc3RhbGxlZCArPSBhd2FpdCB0aGlzLmluc3RhbGxSZXZpZXdTdHlsZVNuaXBwZXQoKTtcbiAgICB0aGlzLnNldHRpbmdzLmxpYnJhcnlWZXJzaW9uID0gQ1VSUkVOVF9MSUJSQVJZX1ZFUlNJT047XG4gICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICBpZiAoc2hvd05vdGljZSkge1xuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgaW5zdGFsbGVkXG4gICAgICAgICAgPyBgQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTVFOTNcdTVERjJcdTUyMURcdTU5Q0JcdTUzMTZcdUZGMDhcdTg4NjVcdTlGNTBcdTYyMTZcdTY2RjRcdTY1QjAgJHtpbnN0YWxsZWR9IFx1OTg3OVx1RkYwOWBcbiAgICAgICAgICA6IFwiQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTVFOTNcdTVERjJcdTVDMzFcdTdFRUFcdUZGMENcdTY3MkFcdTg5ODZcdTc2RDZcdTRGNjBcdTc2ODRcdTRGRUVcdTY1MzlcIixcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtaWdyYXRlTWFuYWdlZERhc2hib2FyZHMoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBsZXQgbWlncmF0ZWQgPSAwO1xuICAgIGZvciAoY29uc3QgW2xlZ2FjeVBhdGgsIHRhcmdldFBhdGhdIG9mIERBU0hCT0FSRF9NSUdSQVRJT05TKSB7XG4gICAgICBjb25zdCBsZWdhY3kgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgobGVnYWN5UGF0aCk7XG4gICAgICBpZiAoIShsZWdhY3kgaW5zdGFuY2VvZiBURmlsZSkgfHwgdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhcmdldFBhdGgpKSBjb250aW51ZTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlbmFtZShsZWdhY3ksIHRhcmdldFBhdGgpO1xuICAgICAgbWlncmF0ZWQgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIG1pZ3JhdGVkO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtaWdyYXRlTWFuYWdlZFZvY2FidWxhcnlUZW1wbGF0ZSgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHBhdGggPSBgJHtURU1QTEFURV9GT0xERVJ9L1x1OEJDRFx1NkM0Ny5tZGA7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSByZXR1cm4gMDtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICBpZiAoXG4gICAgICBjb250ZW50ICE9PSBMRUdBQ1lfVk9DQUJVTEFSWV9URU1QTEFURSAmJlxuICAgICAgY29udGVudCAhPT0gQklESVJFQ1RJT05BTF9WT0NBQlVMQVJZX1RFTVBMQVRFICYmXG4gICAgICBjb250ZW50ICE9PSBTSU1QTEVfVk9DQUJVTEFSWV9URU1QTEFURVxuICAgIClcbiAgICAgIHJldHVybiAwO1xuICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCBWT0NBQlVMQVJZX1RFTVBMQVRFKTtcbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmV3cml0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0XG4gICAgICAuZ2V0TWFya2Rvd25GaWxlcygpXG4gICAgICAuZmlsdGVyKFxuICAgICAgICAoZmlsZSkgPT4gZmlsZS5wYXRoID09PSBgJHtMSUJSQVJZX1JPT1R9Lm1kYCB8fCBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtMSUJSQVJZX1JPT1R9L2ApLFxuICAgICAgKTtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgY29uc3QgdXBkYXRlZCA9IHVwZGF0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcyhjb250ZW50LCBmaWxlLnBhdGgpO1xuICAgICAgaWYgKHVwZGF0ZWQgIT09IGNvbnRlbnQpIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCB1cGRhdGVkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbmZpZ3VyZU9ic2lkaWFuRm9sZGVycygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjb25maWd1cmFibGVWYXVsdCA9IHRoaXMuYXBwLnZhdWx0IGFzIHR5cGVvZiB0aGlzLmFwcC52YXVsdCAmIHtcbiAgICAgIHNldENvbmZpZz86IChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHZvaWQ7XG4gICAgfTtcbiAgICBpZiAodHlwZW9mIGNvbmZpZ3VyYWJsZVZhdWx0LnNldENvbmZpZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjb25maWd1cmFibGVWYXVsdC5zZXRDb25maWcoXCJhdHRhY2htZW50Rm9sZGVyUGF0aFwiLCBBVFRBQ0hNRU5UX0ZPTERFUik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMubWVyZ2VDb25maWdGaWxlKGAke3RoaXMuYXBwLnZhdWx0LmNvbmZpZ0Rpcn0vYXBwLmpzb25gLCB7XG4gICAgICAgIGF0dGFjaG1lbnRGb2xkZXJQYXRoOiBBVFRBQ0hNRU5UX0ZPTERFUixcbiAgICAgIH0pO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLm1lcmdlQ29uZmlnRmlsZShgJHt0aGlzLmFwcC52YXVsdC5jb25maWdEaXJ9L3RlbXBsYXRlcy5qc29uYCwge1xuICAgICAgZm9sZGVyOiBURU1QTEFURV9GT0xERVIsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGluc3RhbGxSZXZpZXdTdHlsZVNuaXBwZXQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBhZGFwdGVyID0gdGhpcy5hcHAudmF1bHQuYWRhcHRlcjtcbiAgICBjb25zdCBzbmlwcGV0Rm9sZGVyID0gYCR7dGhpcy5hcHAudmF1bHQuY29uZmlnRGlyfS9zbmlwcGV0c2A7XG4gICAgY29uc3Qgc25pcHBldFBhdGggPSBgJHtzbmlwcGV0Rm9sZGVyfS8ke1JFVklFV19TVFlMRV9TTklQUEVUX05BTUV9LmNzc2A7XG4gICAgbGV0IGNoYW5nZWQgPSAwO1xuICAgIGlmICghKGF3YWl0IGFkYXB0ZXIuZXhpc3RzKHNuaXBwZXRGb2xkZXIpKSkge1xuICAgICAgYXdhaXQgYWRhcHRlci5ta2RpcihzbmlwcGV0Rm9sZGVyKTtcbiAgICB9XG4gICAgaWYgKCEoYXdhaXQgYWRhcHRlci5leGlzdHMoc25pcHBldFBhdGgpKSkge1xuICAgICAgYXdhaXQgYWRhcHRlci53cml0ZShzbmlwcGV0UGF0aCwgUkVWSUVXX1NUWUxFX1NOSVBQRVQpO1xuICAgICAgY2hhbmdlZCArPSAxO1xuICAgIH1cblxuICAgIGNvbnN0IGFwcGVhcmFuY2VQYXRoID0gYCR7dGhpcy5hcHAudmF1bHQuY29uZmlnRGlyfS9hcHBlYXJhbmNlLmpzb25gO1xuICAgIGxldCBhcHBlYXJhbmNlOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGlmIChhd2FpdCBhZGFwdGVyLmV4aXN0cyhhcHBlYXJhbmNlUGF0aCkpIHtcbiAgICAgIGNvbnN0IHJhdyA9IGF3YWl0IGFkYXB0ZXIucmVhZChhcHBlYXJhbmNlUGF0aCk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJzZWQ6IHVua25vd24gPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICAgIGlmIChwYXJzZWQgJiYgdHlwZW9mIHBhcnNlZCA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgYXBwZWFyYW5jZSA9IHBhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXHU2NUUwXHU2Q0Q1XHU1NDJGXHU3NTI4IEJpbm5BZ2VudFggXHU5NUVBXHU1MzYxXHU2ODM3XHU1RjBGXHVGRjFBJHthcHBlYXJhbmNlUGF0aH0gXHU0RTBEXHU2NjJGXHU2NzA5XHU2NTQ4XHU3Njg0IEpTT05gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZW5hYmxlZCA9IGFycmF5U3RyaW5ncyhhcHBlYXJhbmNlLmVuYWJsZWRDc3NTbmlwcGV0cyk7XG4gICAgaWYgKCFlbmFibGVkLmluY2x1ZGVzKFJFVklFV19TVFlMRV9TTklQUEVUX05BTUUpKSB7XG4gICAgICBhd2FpdCBhZGFwdGVyLndyaXRlKFxuICAgICAgICBhcHBlYXJhbmNlUGF0aCxcbiAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAge1xuICAgICAgICAgICAgLi4uYXBwZWFyYW5jZSxcbiAgICAgICAgICAgIGVuYWJsZWRDc3NTbmlwcGV0czogWy4uLmVuYWJsZWQsIFJFVklFV19TVFlMRV9TTklQUEVUX05BTUVdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgbnVsbCxcbiAgICAgICAgICAyLFxuICAgICAgICApfVxcbmAsXG4gICAgICApO1xuICAgICAgY2hhbmdlZCArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gY2hhbmdlZDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbWVyZ2VDb25maWdGaWxlKHBhdGg6IHN0cmluZywgcGF0Y2g6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgbGV0IGN1cnJlbnQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgaWYgKGF3YWl0IGFkYXB0ZXIuZXhpc3RzKHBhdGgpKSB7XG4gICAgICBjb25zdCByYXcgPSBhd2FpdCBhZGFwdGVyLnJlYWQocGF0aCk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJzZWQ6IHVua25vd24gPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICAgIGlmIChwYXJzZWQgJiYgdHlwZW9mIHBhcnNlZCA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgY3VycmVudCA9IHBhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXHU2NUUwXHU2Q0Q1XHU2NkY0XHU2NUIwIE9ic2lkaWFuIFx1OTE0RFx1N0Y2RVx1RkYxQSR7cGF0aH0gXHU0RTBEXHU2NjJGXHU2NzA5XHU2NTQ4XHU3Njg0IEpTT05gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdXBkYXRlZCA9IHsgLi4uY3VycmVudCwgLi4ucGF0Y2ggfTtcbiAgICBpZiAoSlNPTi5zdHJpbmdpZnkodXBkYXRlZCkgIT09IEpTT04uc3RyaW5naWZ5KGN1cnJlbnQpKSB7XG4gICAgICBhd2FpdCBhZGFwdGVyLndyaXRlKHBhdGgsIGAke0pTT04uc3RyaW5naWZ5KHVwZGF0ZWQsIG51bGwsIDIpfVxcbmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc3luYyhzaG93Tm90aWNlID0gdHJ1ZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQgfHwgIXRoaXMuc2V0dGluZ3Muc3luY1NlY3JldCkge1xuICAgICAgaWYgKHNob3dOb3RpY2UpIG5ldyBOb3RpY2UoXCJcdThCRjdcdTUxNDhcdTU3MjhcdTYzRDJcdTRFRjZcdThCQkVcdTdGNkVcdTRFMkRcdTU4NkJcdTUxOTkgQmlubkFnZW50WCBcdThGREVcdTYzQTVcdTUxRURcdTYzNkVcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBleHBvcnRlZCA9IGF3YWl0IHRoaXMucHVsbFBlbmRpbmdBc3NldHMoKTtcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCB0aGlzLmNvbGxlY3RFbnRyaWVzQXN5bmMoKTtcbiAgICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGlzLmltcG9ydEVudHJpZXMoZW50cmllcyk7XG4gICAgICBjb25zdCByZXF1ZXN0ZWQgPSBuZXcgU2V0KHJlc3VsdC5vcmdhbml6YXRpb24/Lm5lZWRzX2Z1bGxfY29udGVudF9zb3VyY2Vfa2V5cyA/PyBbXSk7XG4gICAgICBpZiAocmVxdWVzdGVkLnNpemUpIHtcbiAgICAgICAgY29uc3QgYXV0aG9yaXplZEVudHJpZXMgPSBhd2FpdCB0aGlzLmNvbGxlY3RFbnRyaWVzQXN5bmMocmVxdWVzdGVkKTtcbiAgICAgICAgY29uc3QgbWlzc2luZyA9IFsuLi5yZXF1ZXN0ZWRdLmZpbHRlcihcbiAgICAgICAgICAoc291cmNlS2V5KSA9PlxuICAgICAgICAgICAgIWF1dGhvcml6ZWRFbnRyaWVzLnNvbWUoXG4gICAgICAgICAgICAgIChlbnRyeSkgPT4gZW50cnkuc291cmNlX2tleSA9PT0gc291cmNlS2V5ICYmIGVudHJ5LmF1dGhvcml6ZWRfY29udGVudCxcbiAgICAgICAgICAgICksXG4gICAgICAgICk7XG4gICAgICAgIGlmIChtaXNzaW5nLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKGBcdTY1RTBcdTZDRDVcdThCRkJcdTUzRDZcdTY3MERcdTUyQTFcdTU2NjhcdThCRjdcdTZDNDJcdTc2ODRcdTYzODhcdTY3NDNcdTUzOUZcdTY1ODdcdUZGMUEke21pc3Npbmcuam9pbihcIlx1MzAwMVwiKX1gKTtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5pbXBvcnRFbnRyaWVzKGF1dGhvcml6ZWRFbnRyaWVzKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG9yZ2FuaXplZCA9IGF3YWl0IHRoaXMuYXBwbHlPcmdhbml6YXRpb25QbGFuKHJlc3VsdC5vcmdhbml6YXRpb24pO1xuICAgICAgY29uc3Qgb3JnYW5pemF0aW9uU3VtbWFyeSA9IHN1bW1hcml6ZU9yZ2FuaXphdGlvbihyZXN1bHQub3JnYW5pemF0aW9uLCBvcmdhbml6ZWQpO1xuICAgICAgY29uc3Qgc3luY1N1bW1hcnkgPVxuICAgICAgICBgXHU2M0E1XHU2NTM2ICR7ZXhwb3J0ZWR9IFx1Njc2MVx1OEQ0NFx1NEVBN1x1RkYwQ1x1NEUwQVx1NEYyMCAke2VudHJpZXMubGVuZ3RofSBcdTY3NjFcdTVCNjZcdTRFNjBcdTRFMEFcdTRFMEJcdTY1ODdcdUZGMUJgICsgb3JnYW5pemF0aW9uU3VtbWFyeTtcbiAgICAgIHRoaXMuc2V0dGluZ3MubGFzdFN5bmNlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0U3luY0Vycm9yID0gXCJcIjtcbiAgICAgIHRoaXMuc2V0dGluZ3MubGFzdFN5bmNTdW1tYXJ5ID0gc3luY1N1bW1hcnk7XG4gICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgaWYgKHNob3dOb3RpY2UpIG5ldyBOb3RpY2UoYFx1NTNDQ1x1NTQxMVx1NTQwQ1x1NkI2NVx1NUI4Q1x1NjIxMFx1RkYxQSR7c3luY1N1bW1hcnl9YCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU1NDBDXHU2QjY1XHU1OTMxXHU4RDI1XCI7XG4gICAgICB0aGlzLnNldHRpbmdzLmxhc3RTeW5jRXJyb3IgPSBtZXNzYWdlO1xuICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIGlmIChzaG93Tm90aWNlKSBuZXcgTm90aWNlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaW1wb3J0RW50cmllcyhlbnRyaWVzOiBMZWFybmluZ0NvbnRleHRFbnRyeVtdKTogUHJvbWlzZTxJbXBvcnRSZXNwb25zZT4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke3RoaXMuc2V0dGluZ3MuYXBpQmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9pbXBvcnRgLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuc2V0dGluZ3Muc3luY1NlY3JldH1gLFxuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHNjaGVtYV92ZXJzaW9uOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIixcbiAgICAgICAgdmF1bHRfbmFtZTogdGhpcy5hcHAudmF1bHQuZ2V0TmFtZSgpLFxuICAgICAgICBlbnRyaWVzLFxuICAgICAgfSksXG4gICAgICB0aHJvdzogZmFsc2UsXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBCaW5uQWdlbnRYIFx1NjJEMlx1N0VERFx1NTQwQ1x1NkI2NVx1RkYwOCR7cmVzcG9uc2Uuc3RhdHVzfVx1RkYwOWApO1xuICAgIHJldHVybiByZXNwb25zZS5qc29uIGFzIEltcG9ydFJlc3BvbnNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhcHBseU9yZ2FuaXphdGlvblBsYW4ocGxhbjogT3JnYW5pemF0aW9uUGxhbiB8IG51bGwpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGlmIChwbGFuPy5zdGF0dXMgIT09IFwicGxhbm5lZFwiIHx8ICFwbGFuLmFjdGlvbnMubGVuZ3RoKSByZXR1cm4gMDtcbiAgICBjb25zdCBhbGxvd2VkVGFyZ2V0cyA9IG5ldyBTZXQoW1xuICAgICAgYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5YCxcbiAgICAgIGAke0xJQlJBUllfUk9PVH0vMDItR3JhbW1hcmAsXG4gICAgICBgJHtMSUJSQVJZX1JPT1R9LzAzLVJlYWRpbmdgLFxuICAgICAgYCR7TElCUkFSWV9ST09UfS8wNC1Xcml0aW5nYCxcbiAgICBdKTtcbiAgICBjb25zdCBjb21wbGV0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgY29tcGxldGVkU291cmNlS2V5czogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3QgYWN0aW9uIG9mIHBsYW4uYWN0aW9ucykge1xuICAgICAgaWYgKCFhY3Rpb24uc291cmNlX2tleS5zdGFydHNXaXRoKGAke0lOQk9YX0ZPTERFUn0vYCkpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFhbGxvd2VkVGFyZ2V0cy5oYXMoYWN0aW9uLnRhcmdldF9mb2xkZXIpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gYWN0aW9uLnNvdXJjZV9rZXkuc2xpY2UoYWN0aW9uLnNvdXJjZV9rZXkubGFzdEluZGV4T2YoXCIvXCIpICsgMSk7XG4gICAgICBjb25zdCBleHRlbnNpb25JbmRleCA9IGZpbGVOYW1lLmxhc3RJbmRleE9mKFwiLlwiKTtcbiAgICAgIGNvbnN0IGJhc2VOYW1lID0gZXh0ZW5zaW9uSW5kZXggPiAwID8gZmlsZU5hbWUuc2xpY2UoMCwgZXh0ZW5zaW9uSW5kZXgpIDogZmlsZU5hbWU7XG4gICAgICBjb25zdCBleHRlbnNpb24gPSBleHRlbnNpb25JbmRleCA+IDAgPyBmaWxlTmFtZS5zbGljZShleHRlbnNpb25JbmRleCArIDEpIDogXCJtZFwiO1xuICAgICAgY29uc3QgYmFzZVBhdGggPSBgJHthY3Rpb24udGFyZ2V0X2ZvbGRlcn0vJHtmaWxlTmFtZX1gO1xuICAgICAgY29uc3QgcmV0cnlQYXRoID0gYCR7YWN0aW9uLnRhcmdldF9mb2xkZXJ9LyR7YmFzZU5hbWV9LSR7YWN0aW9uLmFjdGlvbl9pZC5zbGljZSgwLCA2KX0uJHtleHRlbnNpb259YDtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChhY3Rpb24uc291cmNlX2tleSk7XG4gICAgICBpZiAoIShzb3VyY2UgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChiYXNlUGF0aCkgaW5zdGFuY2VvZiBURmlsZSB8fFxuICAgICAgICAgIHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChyZXRyeVBhdGgpIGluc3RhbmNlb2YgVEZpbGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgY29tcGxldGVkLnB1c2goYWN0aW9uLmFjdGlvbl9pZCk7XG4gICAgICAgICAgY29tcGxldGVkU291cmNlS2V5c1thY3Rpb24uYWN0aW9uX2lkXSA9IChcbiAgICAgICAgICAgIHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChiYXNlUGF0aCkgaW5zdGFuY2VvZiBURmlsZVxuICAgICAgICAgICAgICA/IGJhc2VQYXRoXG4gICAgICAgICAgICAgIDogcmV0cnlQYXRoXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRhcmdldFBhdGggPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYmFzZVBhdGgpID8gcmV0cnlQYXRoIDogYmFzZVBhdGg7XG4gICAgICBpZiAodGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhcmdldFBhdGgpKSBjb250aW51ZTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlbmFtZShzb3VyY2UsIHRhcmdldFBhdGgpO1xuICAgICAgY29tcGxldGVkLnB1c2goYWN0aW9uLmFjdGlvbl9pZCk7XG4gICAgICBjb21wbGV0ZWRTb3VyY2VLZXlzW2FjdGlvbi5hY3Rpb25faWRdID0gdGFyZ2V0UGF0aDtcbiAgICB9XG4gICAgaWYgKGNvbXBsZXRlZC5sZW5ndGggIT09IHBsYW4uYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkluYm94IFx1NjU3NFx1NzQwNlx1NjcyQVx1NTE2OFx1OTBFOFx1NUI4Q1x1NjIxMFx1RkYxQlx1NjcyQVx1NzlGQlx1NTJBOFx1NzY4NFx1N0IxNFx1OEJCMFx1NEYxQVx1NEZERFx1NzU1OVx1NTcyOFx1NTM5Rlx1NTkwNFx1RkYwQ1x1NEUwQlx1NkIyMVx1NTQwQ1x1NkI2NVx1OTFDRFx1OEJENVwiKTtcbiAgICB9XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7dGhpcy5zZXR0aW5ncy5hcGlCYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vdjEvb2JzaWRpYW4tc3luYy8ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLnNldHRpbmdzLmNvbm5lY3Rpb25JZCl9L29yZ2FuaXplci1ydW5zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHBsYW4ucnVuX2lkKX0vYWNrYCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLnNldHRpbmdzLnN5bmNTZWNyZXR9YCxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBjb21wbGV0ZWRfYWN0aW9uX2lkczogY29tcGxldGVkLFxuICAgICAgICBjb21wbGV0ZWRfc291cmNlX2tleXM6IGNvbXBsZXRlZFNvdXJjZUtleXMsXG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZSxcbiAgICB9KTtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluYm94IFx1NjU3NFx1NzQwNlx1NTZERVx1NjI2N1x1NTkzMVx1OEQyNVx1RkYwOCR7cmVzcG9uc2Uuc3RhdHVzfVx1RkYwOWApO1xuICAgIHJldHVybiBjb21wbGV0ZWQubGVuZ3RoO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwdWxsUGVuZGluZ0Fzc2V0cygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGJhc2UgPSB0aGlzLnNldHRpbmdzLmFwaUJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IGhlYWRlcnMgPSB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLnNldHRpbmdzLnN5bmNTZWNyZXR9YCB9O1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke2Jhc2V9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9leHBvcnRzYCxcbiAgICAgIG1ldGhvZDogXCJHRVRcIixcbiAgICAgIGhlYWRlcnMsXG4gICAgICB0aHJvdzogZmFsc2UsXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBcdTY1RTBcdTZDRDVcdThCRkJcdTUzRDZcdTVGODVcdTU0MENcdTZCNjVcdThENDRcdTRFQTdcdUZGMDgke3Jlc3BvbnNlLnN0YXR1c31cdUZGMDlgKTtcbiAgICBjb25zdCBleHBvcnRzID0gcmVzcG9uc2UuanNvbiBhcyBQZW5kaW5nQXNzZXRFeHBvcnRbXTtcbiAgICBsZXQgY29tcGxldGVkID0gMDtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgZXhwb3J0cykge1xuICAgICAgY29uc3QgZmlsZSA9XG4gICAgICAgIGl0ZW0ub3BlcmF0aW9uID09PSBcIkFQUEVORF9QQVRDSFwiXG4gICAgICAgICAgPyBhd2FpdCB0aGlzLmFwcGx5QXNzZXRQYXRjaChpdGVtKVxuICAgICAgICAgIDogYXdhaXQgdGhpcy5jcmVhdGVBc3NldE5vdGUoaXRlbSk7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICAgIGNvbnN0IGRpZ2VzdCA9IGF3YWl0IHNoYTI1Nihjb250ZW50KTtcbiAgICAgIGNvbnN0IGFjayA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke2Jhc2V9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9leHBvcnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGl0ZW0uYXNzZXRfaWQpfS9hY2tgLFxuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLmhlYWRlcnMsIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzb3VyY2Vfa2V5OiBmaWxlLnBhdGgsXG4gICAgICAgICAgY29udGVudF9oYXNoOiBkaWdlc3QsXG4gICAgICAgICAgbW9kaWZpZWRfYXQ6IG5ldyBEYXRlKGZpbGUuc3RhdC5tdGltZSkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICB2YXVsdF9uYW1lOiB0aGlzLmFwcC52YXVsdC5nZXROYW1lKCksXG4gICAgICAgICAgZXhwb3J0X2lkOiBpdGVtLmV4cG9ydF9pZCxcbiAgICAgICAgfSksXG4gICAgICAgIHRocm93OiBmYWxzZSxcbiAgICAgIH0pO1xuICAgICAgaWYgKGFjay5zdGF0dXMgPCAyMDAgfHwgYWNrLnN0YXR1cyA+PSAzMDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXHU4RDQ0XHU0RUE3XHU1NDBDXHU2QjY1XHU1NkRFXHU2MjY3XHU1OTMxXHU4RDI1XHVGRjA4JHthY2suc3RhdHVzfVx1RkYwOWApO1xuICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgfVxuICAgIHJldHVybiBjb21wbGV0ZWQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGFwcGx5QXNzZXRQYXRjaChpdGVtOiBQZW5kaW5nQXNzZXRFeHBvcnQpOiBQcm9taXNlPFRGaWxlPiB7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuZmluZEFzc2V0RmlsZShpdGVtKTtcbiAgICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFx1NjVFMFx1NkNENVx1NUI5QVx1NEY0RFx1NUY4NVx1NjZGNFx1NjVCMFx1OEQ0NFx1NEVBN1x1RkYxQSR7aXRlbS5hc3NldF9pZH1gKTtcbiAgICB9XG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgY29uc3QgY3VycmVudEhhc2ggPSBhd2FpdCBzaGEyNTYoY29udGVudCk7XG4gICAgY29uc3QgbWFya2VyID0gaXRlbS5rbm93bGVkZ2VfcHJvcG9zYWxfaWRcbiAgICAgID8gYDwhLS0ga25vd2xlZGdlX3Byb3Bvc2FsOiR7aXRlbS5rbm93bGVkZ2VfcHJvcG9zYWxfaWR9IC0tPmBcbiAgICAgIDogXCJcIjtcbiAgICBpZiAobWFya2VyICYmIGNvbnRlbnQuaW5jbHVkZXMobWFya2VyKSkgcmV0dXJuIGZpbGU7XG4gICAgaWYgKGl0ZW0uZXhwZWN0ZWRfY29udGVudF9oYXNoICYmIGN1cnJlbnRIYXNoICE9PSBpdGVtLmV4cGVjdGVkX2NvbnRlbnRfaGFzaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBcdThENDRcdTRFQTdcdTVERjJcdTU3MjggT2JzaWRpYW4gXHU0RTJEXHU0RkVFXHU2NTM5XHVGRjBDXHU2MkQyXHU3RUREXHU4OTg2XHU3NkQ2XHVGRjFBJHtmaWxlLnBhdGh9YCk7XG4gICAgfVxuICAgIGlmICghaXRlbS5wYXRjaF9jb250ZW50KSB0aHJvdyBuZXcgRXJyb3IoYFx1OEQ0NFx1NEVBN1x1ODg2NVx1NEUwMVx1NEUzQVx1N0E3QVx1RkYxQSR7aXRlbS5leHBvcnRfaWR9YCk7XG4gICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIGAke2NvbnRlbnQudHJpbUVuZCgpfSR7aXRlbS5wYXRjaF9jb250ZW50fWApO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kQXNzZXRGaWxlKGl0ZW06IFBlbmRpbmdBc3NldEV4cG9ydCk6IFRGaWxlIHwgbnVsbCB7XG4gICAgaWYgKGl0ZW0uc291cmNlX2tleSkge1xuICAgICAgY29uc3QgZXhhY3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoaXRlbS5zb3VyY2Vfa2V5KTtcbiAgICAgIGlmIChleGFjdCBpbnN0YW5jZW9mIFRGaWxlKSByZXR1cm4gZXhhY3Q7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZmlsZSBvZiB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkpIHtcbiAgICAgIGNvbnN0IGZyb250bWF0dGVyID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgaWYgKGZyb250bWF0dGVyPy5iaW5uYWdlbnRfYXNzZXRfaWQgPT09IGl0ZW0uYXNzZXRfaWQpIHJldHVybiBmaWxlO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQXNzZXROb3RlKGl0ZW06IFBlbmRpbmdBc3NldEV4cG9ydCk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChMSUJSQVJZX1JPT1QpKSB7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoTElCUkFSWV9ST09UKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoSU5CT1hfRk9MREVSKSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKElOQk9YX0ZPTERFUik7XG4gICAgfVxuICAgIGNvbnN0IGZvbGRlciA9IElOQk9YX0ZPTERFUjtcbiAgICBjb25zdCBmaWxlbmFtZSA9IGAke3NhZmVGaWxlbmFtZShpdGVtLnRpdGxlKX0tJHtpdGVtLmFzc2V0X2lkLnNsaWNlKC0xMCl9Lm1kYDtcbiAgICBjb25zdCBwYXRoID0gYCR7Zm9sZGVyfS8ke2ZpbGVuYW1lfWA7XG4gICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgaWYgKGV4aXN0aW5nIGluc3RhbmNlb2YgVEZpbGUpIHJldHVybiBleGlzdGluZztcbiAgICBjb25zdCB0YWdzID0gdW5pcXVlU3RyaW5ncyhbXCJiaW5uYWdlbnRcIiwgaXRlbS5raW5kLCAuLi5pdGVtLnRhZ3NdKTtcbiAgICBjb25zdCBmcm9udG1hdHRlciA9IFtcbiAgICAgIFwiLS0tXCIsXG4gICAgICAnYmlubmFnZW50X3NjaGVtYTogXCJhc3NldC92MVwiJyxcbiAgICAgIGBiaW5uYWdlbnRfYXNzZXRfaWQ6IFwiJHt5YW1sU3RyaW5nKGl0ZW0uYXNzZXRfaWQpfVwiYCxcbiAgICAgIGBiaW5uYWdlbnRfa2luZDogXCIke3lhbWxTdHJpbmcoaXRlbS5raW5kKX1cImAsXG4gICAgICBgYmlubmFnZW50X3NvdXJjZV90eXBlOiBcIiR7eWFtbFN0cmluZyhpdGVtLnNvdXJjZV90eXBlKX1cImAsXG4gICAgICBcImluYm94X3N0YXR1czogdW5wcm9jZXNzZWRcIixcbiAgICAgIGB0aXRsZTogXCIke3lhbWxTdHJpbmcoaXRlbS50aXRsZSl9XCJgLFxuICAgICAgLi4uKGl0ZW0uc291cmNlX3Rhc2tfaWRcbiAgICAgICAgPyBbYGJpbm5hZ2VudF9zb3VyY2VfdGFza19pZDogXCIke3lhbWxTdHJpbmcoaXRlbS5zb3VyY2VfdGFza19pZCl9XCJgXVxuICAgICAgICA6IFtdKSxcbiAgICAgIFwidGFnczpcIixcbiAgICAgIC4uLnRhZ3MubWFwKCh0YWcpID0+IGAgIC0gJHt0YWd9YCksXG4gICAgICBcIi0tLVwiLFxuICAgICAgXCJcIixcbiAgICAgIGAjICR7aXRlbS50aXRsZX1gLFxuICAgICAgXCJcIixcbiAgICBdO1xuICAgIGNvbnN0IGJvZHkgPSBpdGVtLmluaXRpYWxfY29udGVudD8udHJpbSgpXG4gICAgICA/IFtcIiMjIFx1NUI2Nlx1NEU2MFx1NzNCMFx1NTczQVwiLCBcIlwiLCBpdGVtLmluaXRpYWxfY29udGVudC50cmltKCksIFwiXCIsIFwiIyMgXHU2MjExXHU3Njg0XHU3NDA2XHU4OUUzXCIsIFwiXCJdXG4gICAgICA6IFtcIiMjIFx1NjcwMFx1NTIxRFx1OEJFRFx1NTg4M1wiLCBcIlwiLCBcIiMjIFx1NjIxMVx1NzY4NFx1NzQwNlx1ODlFM1wiLCBcIlwiLCBcIiMjIFx1NTNFRlx1OEZDMVx1NzlGQlx1ODlDNFx1NTIxOVwiLCBcIlwiLCBcIiMjIFx1NjVCMFx1OEJFRFx1NTg4M1x1OUE4Q1x1OEJDMVwiLCBcIlwiXTtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIFsuLi5mcm9udG1hdHRlciwgLi4uYm9keV0uam9pbihcIlxcblwiKSk7XG4gIH1cbn1cblxuY2xhc3MgQmlubkFnZW50WFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IEJpbm5BZ2VudFhMZWFybmluZ1N5bmNQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1OEQ0NFx1NEVBN1x1NTQwQ1x1NkI2NVwiIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlx1NEVDNVx1NTQwQ1x1NkI2NVx1NEY2MFx1NjYwRVx1Nzg2RVx1NTE0MVx1OEJCOFx1NzY4NFx1ODMwM1x1NTZGNFx1MzAwMlx1NzY3Qlx1NUY1NVx1ODlFNlx1NTNEMVx1NzY4NFx1NjU3NFx1NzQwNlx1NTNFQVx1NEYxQVx1NjI4QSAwMC1JbmJveCBcdTdCMTRcdThCQjBcdTc5RkJcdTUyQThcdTUyMzAgQmlubkFnZW50WCBcdTc2ODRcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTMwMDFcdTk2MDVcdThCRkJcdTYyMTZcdTUxOTlcdTRGNUNcdTc2RUVcdTVGNTVcdUZGMUJcdTRFMERcdTRGMUFcdTUyMjBcdTk2NjRcdTMwMDFcdTY1MzlcdTUxOTlcdTYyMTZcdTc5RkJcdTUxRkFcdTYyNThcdTdCQTFcdTc2RUVcdTVGNTVcdTMwMDJcIixcbiAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1MjFEXHU1OUNCXHU1MzE2XHU1QjY2XHU0RTYwXHU1RTkzXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJcdTUyMUJcdTVFRkEgMDBcdTIwMTMwNiBcdTc2RUVcdTVGNTVcdTMwMDFNT0MgLyBEYXRhdmlldyBEYXNoYm9hcmRcdTMwMDFcdTY1MkZcdTYzMDFcdTk1RUFcdTUzNjFcdTc2ODRcdThCQ0RcdTZDNDdcdTZBMjFcdTY3N0ZcdTMwMDFTcGFjZWQgUmVwZXRpdGlvbiBcdTYzMDdcdTUzNTdcdTRFMEVcdTUxNjVcdTk1RThcdTc5M0FcdTRGOEJcdUZGMUJcdTRFMERcdTRGMUFcdTg5ODZcdTc2RDZcdTRGNjBcdTc2ODRcdTRGRUVcdTY1MzlcdTMwMDJcIixcbiAgICAgIClcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT5cbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJcdTY4QzBcdTY3RTVcdTVFNzZcdTg4NjVcdTlGNTBcIikub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uaW5pdGlhbGl6ZUxlYXJuaW5nTGlicmFyeSgpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1ODFFQVx1NTJBOFx1NTNDQ1x1NTQxMVx1NTQwQ1x1NkI2NVwiKVxuICAgICAgLnNldERlc2MoXCJPYnNpZGlhbiBcdTU0MkZcdTUyQThcdTU0MEVcdTUzQ0FcdTZCQ0YgNjAgXHU3OUQyXHU1NDBDXHU2QjY1XHU0RTAwXHU2QjIxXHU1REYyXHU2Mzg4XHU2NzQzXHU4MzAzXHU1NkY0XHVGRjFCXHU1M0VGXHU5NjhGXHU2NUY2XHU1MTczXHU5NUVEXHU1RTc2XHU2NTM5XHU3NTI4XHU2MjRCXHU1MkE4XHU1NDdEXHU0RUU0XHUzMDAyXCIpXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+XG4gICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvU3luYykub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYXV0b1N5bmMgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTY3MDBcdThGRDFcdTU0MENcdTZCNjVcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sYXN0U3luY0Vycm9yXG4gICAgICAgICAgPyBgXHU1OTMxXHU4RDI1XHVGRjFBJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5sYXN0U3luY0Vycm9yfWBcbiAgICAgICAgICA6IHRoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jZWRBdFxuICAgICAgICAgICAgPyBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5sYXN0U3luY2VkQXR9XHVGRjFCJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5sYXN0U3luY1N1bW1hcnkgfHwgXCJcdTU0MENcdTZCNjVcdTVCOENcdTYyMTBcIn1gXG4gICAgICAgICAgICA6IFwiXHU1QzFBXHU2NzJBXHU1QjhDXHU2MjEwXHU1NDBDXHU2QjY1XCIsXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTUxNDFcdThCQjhcdTc2ODRcdTY1ODdcdTRFRjZcdTU5MzlcIilcbiAgICAgIC5zZXREZXNjKFwiXHU5MDE3XHU1M0Y3XHU1MjA2XHU5Njk0XHVGRjBDXHU0RjhCXHU1OTgyIEJpbm5BZ2VudFgsIFx1ODJGMVx1OEJFRC9cdThCRURcdTZDRDVcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRGb2xkZXJzKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbGxvd2VkRm9sZGVycyA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTE0MVx1OEJCOFx1NzY4NFx1NjgwN1x1N0I3RVwiKVxuICAgICAgLnNldERlc2MoXCJcdTUzRUZcdTkwMDlcdUZGMENcdTkwMTdcdTUzRjdcdTUyMDZcdTk2OTRcdUZGMENcdTRGOEJcdTU5ODIgYmlubmFnZW50LXZvY2FidWxhcnksIGdyYW1tYXJcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRUYWdzKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbGxvd2VkVGFncyA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkJpbm5BZ2VudFggXHU1NzMwXHU1NzQwXCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NjcyQ1x1NjczQVx1OUVEOFx1OEJBNFx1RkYxQWh0dHA6Ly8xMjcuMC4wLjE6ODAwMC9sZWFybmVyXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcGlCYXNlVXJsKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcGlCYXNlVXJsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcIlx1OEZERVx1NjNBNSBJRFwiKS5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25uZWN0aW9uSWQpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25uZWN0aW9uSWQgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9KSxcbiAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTU0MENcdTZCNjVcdTVCQzZcdTk0QTVcIilcbiAgICAgIC5zZXREZXNjKFwiXHU3NTMxIEJpbm5BZ2VudFggXHU3Njg0XHU4RkRFXHU2M0E1XHU1NDExXHU1QkZDXHU3NTFGXHU2MjEwXHVGRjFCXHU0RUM1XHU0RkREXHU1QjU4XHU1NzI4XHU2NzJDXHU2NzNBIE9ic2lkaWFuIFx1NjNEMlx1NEVGNlx1OEJCRVx1N0Y2RVx1NEUyRFx1MzAwMlwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3luY1NlY3JldCkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3luY1NlY3JldCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3VtbWFyaXplT3JnYW5pemF0aW9uKHBsYW46IE9yZ2FuaXphdGlvblBsYW4gfCBudWxsLCBvcmdhbml6ZWQ6IG51bWJlcik6IHN0cmluZyB7XG4gIGlmICghcGxhbikgcmV0dXJuIFwiXHU2NzJDXHU4RjZFXHU2Q0ExXHU2NzA5XHU2MzkyXHU5NjFGXHU3Njg0IEluYm94IFx1NjU3NFx1NzQwNlx1NEVGQlx1NTJBMVx1MzAwMlwiO1xuICBpZiAocGxhbi5zdGF0dXMgPT09IFwibm9vcFwiKSByZXR1cm4gXCJJbmJveCBcdTRFMkRcdTZDQTFcdTY3MDlcdTVGODVcdTY1NzRcdTc0MDZcdTdCMTRcdThCQjBcdTMwMDJcIjtcbiAgaWYgKHBsYW4uc3RhdHVzID09PSBcInF1ZXVlZFwiKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIGBJbmJveCBcdTY3MDkgJHtwbGFuLmluYm94X2NvdW50fSBcdTY3NjFcdTVGODVcdTY1NzRcdTc0MDZcdTdCMTRcdThCQjBcdUZGMENcdTUzRUZcdTk3NjBcdTUyMDZcdTdDN0IgJHtwbGFuLmNsYXNzaWZpZWRfY291bnR9IFx1Njc2MVx1RkYxQmAgK1xuICAgICAgXCJcdTY3MkNcdThGNkVcdTY3MkFcdTc5RkJcdTUyQThcdUZGMENcdTRFRkJcdTUyQTFcdTRGMUFcdTU3MjhcdTRFMEJcdTZCMjFcdTU0MENcdTZCNjVcdTkxQ0RcdThCRDVcdTMwMDJcIlxuICAgICk7XG4gIH1cbiAgY29uc3QgZm9sZGVyTGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgIFtgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnlgXTogXCJcdThCQ0RcdTZDNDdcIixcbiAgICBbYCR7TElCUkFSWV9ST09UfS8wMi1HcmFtbWFyYF06IFwiXHU4QkVEXHU2Q0Q1XCIsXG4gICAgW2Ake0xJQlJBUllfUk9PVH0vMDMtUmVhZGluZ2BdOiBcIlx1OTYwNVx1OEJGQlwiLFxuICAgIFtgJHtMSUJSQVJZX1JPT1R9LzA0LVdyaXRpbmdgXTogXCJcdTUxOTlcdTRGNUNcIixcbiAgfTtcbiAgY29uc3QgY291bnRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgZm9yIChjb25zdCBhY3Rpb24gb2YgcGxhbi5hY3Rpb25zKSB7XG4gICAgY29uc3QgbGFiZWwgPSBmb2xkZXJMYWJlbHNbYWN0aW9uLnRhcmdldF9mb2xkZXJdID8/IGFjdGlvbi50YXJnZXRfZm9sZGVyO1xuICAgIGNvdW50cy5zZXQobGFiZWwsIChjb3VudHMuZ2V0KGxhYmVsKSA/PyAwKSArIDEpO1xuICB9XG4gIGNvbnN0IGRlc3RpbmF0aW9ucyA9IFsuLi5jb3VudHMuZW50cmllcygpXVxuICAgIC5tYXAoKFtsYWJlbCwgY291bnRdKSA9PiBgJHtsYWJlbH0gJHtjb3VudH0gXHU2NzYxYClcbiAgICAuam9pbihcIlx1MzAwMVwiKTtcbiAgcmV0dXJuIGBcdTY1NzRcdTc0MDZcdTVCOENcdTYyMTBcdUZGMUFcdTc5RkJcdTUyQTggJHtvcmdhbml6ZWR9IFx1Njc2MSBJbmJveCBcdTdCMTRcdThCQjBcdUZGMDgke2Rlc3RpbmF0aW9uc31cdUZGMDlcdTMwMDJgO1xufVxuXG5mdW5jdGlvbiBzcGxpdFNjb3BlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5zcGxpdChcIixcIilcbiAgICAubWFwKChwYXJ0KSA9PiBwYXJ0LnRyaW0oKS5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCBcIlwiKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xufVxuZnVuY3Rpb24gYXJyYXlTdHJpbmdzKHZhbHVlOiB1bmtub3duKTogc3RyaW5nW10ge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSlcbiAgICA/IHZhbHVlLmZpbHRlcigoaXRlbSk6IGl0ZW0gaXMgc3RyaW5nID0+IHR5cGVvZiBpdGVtID09PSBcInN0cmluZ1wiKVxuICAgIDogdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiXG4gICAgICA/IFt2YWx1ZV1cbiAgICAgIDogW107XG59XG5mdW5jdGlvbiB1bmlxdWVTdHJpbmdzKHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBbLi4ubmV3IFNldCh2YWx1ZXMubWFwKCh2YWx1ZSkgPT4gdmFsdWUucmVwbGFjZSgvXiMvLCBcIlwiKS50cmltKCkpLmZpbHRlcihCb29sZWFuKSldO1xufVxuZnVuY3Rpb24gaXNBbGxvd2VkKGZpbGU6IFRGaWxlLCBmb2xkZXJzOiBzdHJpbmdbXSwgdGFnczogc3RyaW5nW10sIGFwcDogQXBwKTogYm9vbGVhbiB7XG4gIGNvbnN0IGNhY2hlID0gYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xuICBpZiAoXG4gICAgZmlsZS5wYXRoLnN0YXJ0c1dpdGgoYCR7VEVNUExBVEVfRk9MREVSfS9gKSB8fFxuICAgIGZpbGUucGF0aC5zdGFydHNXaXRoKFwiQmlubkFnZW50WC9UZW1wbGF0ZXMvXCIpIHx8XG4gICAgZmlsZS5iYXNlbmFtZSA9PT0gXCJEYXNoYm9hcmRcIiB8fFxuICAgIGZpbGUuYmFzZW5hbWUgPT09IFwiMDAtRGFzaGJvYXJkXCIgfHxcbiAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoTElCUkFSWV9OT1RFUywgZmlsZS5wYXRoKSB8fFxuICAgIGNhY2hlPy5mcm9udG1hdHRlcj8uYmlubmFnZW50X3N5bmMgPT09IGZhbHNlXG4gIClcbiAgICByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IHBhdGhBbGxvd2VkID0gZm9sZGVycy5zb21lKFxuICAgIChmb2xkZXIpID0+IGZpbGUucGF0aCA9PT0gZm9sZGVyIHx8IGZpbGUucGF0aC5zdGFydHNXaXRoKGAke2ZvbGRlcn0vYCksXG4gICk7XG4gIGNvbnN0IGZpbGVUYWdzID0gdW5pcXVlU3RyaW5ncyhbXG4gICAgLi4uKGNhY2hlPy50YWdzID8/IFtdKS5tYXAoKHRhZykgPT4gdGFnLnRhZyksXG4gICAgLi4uYXJyYXlTdHJpbmdzKGNhY2hlPy5mcm9udG1hdHRlcj8udGFncyksXG4gIF0pO1xuICByZXR1cm4gcGF0aEFsbG93ZWQgfHwgdGFncy5zb21lKCh0YWcpID0+IGZpbGVUYWdzLmluY2x1ZGVzKHRhZykpO1xufVxuZnVuY3Rpb24gaW5mZXJLaW5kKHZhbHVlOiB1bmtub3duLCB0YWdzOiBzdHJpbmdbXSk6IExlYXJuaW5nS2luZCB7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9XG4gICAgdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiXG4gICAgICA/IHZhbHVlXG4gICAgICA6IHRhZ3MuZmluZCgodGFnKSA9PlxuICAgICAgICAgIFtcbiAgICAgICAgICAgIFwidm9jYWJ1bGFyeVwiLFxuICAgICAgICAgICAgXCJncmFtbWFyXCIsXG4gICAgICAgICAgICBcIndyaXRpbmdfZXhwcmVzc2lvblwiLFxuICAgICAgICAgICAgXCJyZWFkaW5nX3NraWxsXCIsXG4gICAgICAgICAgICBcImV4YW1fc2tpbGxcIixcbiAgICAgICAgICAgIFwid3JpdGluZ19za2lsbFwiLFxuICAgICAgICAgIF0uaW5jbHVkZXModGFnKSxcbiAgICAgICAgKTtcbiAgcmV0dXJuIChcbiAgICBbXG4gICAgICBcInZvY2FidWxhcnlcIixcbiAgICAgIFwiZ3JhbW1hclwiLFxuICAgICAgXCJ3cml0aW5nX2V4cHJlc3Npb25cIixcbiAgICAgIFwicmVhZGluZ19za2lsbFwiLFxuICAgICAgXCJleGFtX3NraWxsXCIsXG4gICAgICBcIndyaXRpbmdfc2tpbGxcIixcbiAgICBdIGFzIHN0cmluZ1tdXG4gICkuaW5jbHVkZXMoY2FuZGlkYXRlID8/IFwiXCIpXG4gICAgPyAoY2FuZGlkYXRlIGFzIExlYXJuaW5nS2luZClcbiAgICA6IFwicmVhZGluZ19za2lsbFwiO1xufVxuZnVuY3Rpb24gdXBkYXRlTWFuYWdlZERhc2hib2FyZExpbmtzKG1hcmtkb3duOiBzdHJpbmcsIHNvdXJjZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCB1cGRhdGVkID0gbWFya2Rvd25cbiAgICAucmVwbGFjZUFsbChcIkJpbm5BZ2VudFgvMDEtVm9jYWJ1bGFyeS9EYXNoYm9hcmRcIiwgXCJCaW5uQWdlbnRYLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJCaW5uQWdlbnRYLzAyLUdyYW1tYXIvRGFzaGJvYXJkXCIsIFwiQmlubkFnZW50WC8wMi1HcmFtbWFyLzAwLURhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFwiLi4vMDEtVm9jYWJ1bGFyeS9EYXNoYm9hcmRcIiwgXCIuLi8wMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFwiLi4vMDItR3JhbW1hci9EYXNoYm9hcmRcIiwgXCIuLi8wMi1HcmFtbWFyLzAwLURhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFwiW1swMS1Wb2NhYnVsYXJ5L0Rhc2hib2FyZFwiLCBcIltbMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIltbMDItR3JhbW1hci9EYXNoYm9hcmRcIiwgXCJbWzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJbW0Rhc2hib2FyZHxcdTYwM0IgRGFzaGJvYXJkXCIsIFwiW1swMC1EYXNoYm9hcmR8XHU2MDNCIERhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFxuICAgICAgJ1dIRVJFIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiIEFORCAhY29udGFpbnMoZmlsZS5wYXRoLCBcIi8wNS1UZW1wbGF0ZXMvXCIpJyxcbiAgICAgICdXSEVSRSBmaWxlLm5hbWUgIT0gXCIwMC1EYXNoYm9hcmRcIiBBTkQgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCIgQU5EICFjb250YWlucyhmaWxlLnBhdGgsIFwiLzA1LVRlbXBsYXRlcy9cIiknLFxuICAgICk7XG4gIGlmIChcbiAgICBzb3VyY2VQYXRoLnN0YXJ0c1dpdGgoYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5L2ApIHx8XG4gICAgc291cmNlUGF0aC5zdGFydHNXaXRoKGAke0xJQlJBUllfUk9PVH0vMDItR3JhbW1hci9gKVxuICApIHtcbiAgICB1cGRhdGVkID0gdXBkYXRlZC5yZXBsYWNlQWxsKFwiW1tEYXNoYm9hcmRdXVwiLCBcIltbMDAtRGFzaGJvYXJkXV1cIik7XG4gIH1cbiAgaWYgKHNvdXJjZVBhdGguZW5kc1dpdGgoXCIvRGFzaGJvYXJkLm1kXCIpIHx8IHNvdXJjZVBhdGguZW5kc1dpdGgoXCIvMDAtRGFzaGJvYXJkLm1kXCIpKSB7XG4gICAgdXBkYXRlZCA9IHVwZGF0ZWQucmVwbGFjZUFsbChcbiAgICAgICdXSEVSRSBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIicsXG4gICAgICAnV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiJyxcbiAgICApO1xuICB9XG4gIHJldHVybiB1cGRhdGVkO1xufVxuZnVuY3Rpb24gc3VtbWFyaXplKG1hcmtkb3duOiBzdHJpbmcsIGxpbWl0OiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gbWFya2Rvd25cbiAgICAucmVwbGFjZSgvXi0tLVtcXHNcXFNdKj8tLS1cXHMqL3UsIFwiXCIpXG4gICAgLnJlcGxhY2UoL2BgYFtcXHNcXFNdKj9gYGAvZ3UsIFwiXCIpXG4gICAgLnJlcGxhY2UoLyE/KFxcWyhbXlxcXV0qKVxcXVxcKFteKV0qXFwpKS9ndSwgXCIkMlwiKVxuICAgIC5yZXBsYWNlKC9bIz4qX2BdL2d1LCBcIiBcIilcbiAgICAucmVwbGFjZSgvXFxzKy9ndSwgXCIgXCIpXG4gICAgLnRyaW0oKVxuICAgIC5zbGljZSgwLCBsaW1pdCk7XG59XG5mdW5jdGlvbiBzYWZlRmlsZW5hbWUodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiAoXG4gICAgdmFsdWVcbiAgICAgIC5yZXBsYWNlKC9bXFxcXC86Kj9cIjw+fF0vZywgXCItXCIpXG4gICAgICAudHJpbSgpXG4gICAgICAuc2xpY2UoMCwgODApIHx8IFwiYXNzZXRcIlxuICApO1xufVxuZnVuY3Rpb24geWFtbFN0cmluZyh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcXFwvZywgXCJcXFxcXFxcXFwiKS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyk7XG59XG5hc3luYyBmdW5jdGlvbiBzaGEyNTYodmFsdWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGRpZ2VzdCA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZGlnZXN0KFwiU0hBLTI1NlwiLCBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUodmFsdWUpKTtcbiAgcmV0dXJuIEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoZGlnZXN0KSwgKGJ5dGUpID0+IGJ5dGUudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsIFwiMFwiKSkuam9pbihcIlwiKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICJ5YUFBQSxJQUFBQSxFQUFBLEdBQUFDLEVBQUFELEVBQUEsYUFBQUUsSUFBQSxlQUFBQyxFQUFBSCxHQUFBLElBQUFJLEVBQWtGLG9CQStFNUVDLEVBQWUsYUFDZkMsRUFBa0IsQ0FDdEIsV0FDQSxnQkFDQSxhQUNBLGFBQ0EsYUFDQSxlQUNBLGdCQUNGLEVBQ01DLEVBQWUsR0FBR0YsQ0FBWSxZQUM5QkcsRUFBa0IsR0FBR0gsQ0FBWSxnQkFDakNJLEVBQW9CLEdBQUdKLENBQVksa0JBQ25DSyxFQUEwQixFQUMxQkMsRUFBdUIsQ0FDM0IsQ0FBQyxHQUFHTixDQUFZLGdCQUFpQixHQUFHQSxDQUFZLGtCQUFrQixFQUNsRSxDQUFDLEdBQUdBLENBQVksOEJBQStCLEdBQUdBLENBQVksZ0NBQWdDLEVBQzlGLENBQUMsR0FBR0EsQ0FBWSwyQkFBNEIsR0FBR0EsQ0FBWSw2QkFBNkIsQ0FDMUYsRUFFTU8sRUFBaUMsQ0FDckMsV0FBWSxnQ0FDWixhQUFjLEdBQ2QsV0FBWSxHQUNaLGVBQWdCLGFBQ2hCLFlBQWEsR0FDYixTQUFVLEdBQ1YscUJBQXNCLElBQ3RCLFNBQVUsR0FDVixlQUFnQixFQUNoQixhQUFjLEdBQ2QsY0FBZSxHQUNmLGdCQUFpQixFQUNuQixFQUVNQyxFQUNKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBRUlDLEVBQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUVJQyxFQUNKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUVJQyxFQUNKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUVJQyxFQUE0QiwrQkFDNUJDLEVBQXVCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQThJdkJDLEVBQTZDLENBQ2pELGtCQUFTSCxFQUNULGtCQUNFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUNGLDhCQUNFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUNGLDhCQUNFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxDQUNKLEVBRU1JLEVBQXdDLENBQzVDLENBQUMsR0FBR2YsQ0FBWSxrQkFBa0IsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQXlCckMsQ0FBQyxHQUFHQSxDQUFZLDhCQUFVLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFvRDdCLENBQUMsR0FBR0EsQ0FBWSxnREFBNEIsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBdUUvQyxDQUFDLEdBQUdFLENBQVksZ0RBQWEsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBb0JoQyxDQUFDLEdBQUdGLENBQVksZ0NBQWdDLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFtQm5ELENBQUMsR0FBR0EsQ0FBWSw2QkFBNkIsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBNENoRCxDQUFDLEdBQUdBLENBQVksOERBQTBDLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQW1DN0QsQ0FBQyxHQUFHQSxDQUFZLDZCQUE2QixFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQXFCaEQsQ0FBQyxHQUFHQSxDQUFZLHdDQUFtQyxFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBd0N0RCxDQUFDLEdBQUdBLENBQVkscURBQXVCLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFB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SyxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUcsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQ2pHIiwKICAibmFtZXMiOiBbIm1haW5fZXhwb3J0cyIsICJfX2V4cG9ydCIsICJCaW5uQWdlbnRYTGVhcm5pbmdTeW5jUGx1Z2luIiwgIl9fdG9Db21tb25KUyIsICJpbXBvcnRfb2JzaWRpYW4iLCAiTElCUkFSWV9ST09UIiwgIkxJQlJBUllfRk9MREVSUyIsICJJTkJPWF9GT0xERVIiLCAiVEVNUExBVEVfRk9MREVSIiwgIkFUVEFDSE1FTlRfRk9MREVSIiwgIkNVUlJFTlRfTElCUkFSWV9WRVJTSU9OIiwgIkRBU0hCT0FSRF9NSUdSQVRJT05TIiwgIkRFRkFVTFRfU0VUVElOR1MiLCAiTEVHQUNZX1ZPQ0FCVUxBUllfVEVNUExBVEUiLCAiQklESVJFQ1RJT05BTF9WT0NBQlVMQVJZX1RFTVBMQVRFIiwgIlNJTVBMRV9WT0NBQlVMQVJZX1RFTVBMQVRFIiwgIlZPQ0FCVUxBUllfVEVNUExBVEUiLCAiUkVWSUVXX1NUWUxFX1NOSVBQRVRfTkFNRSIsICJSRVZJRVdfU1RZTEVfU05JUFBFVCIsICJMRUFSTklOR19URU1QTEFURVMiLCAiTElCUkFSWV9OT1RFUyIsICJCaW5uQWdlbnRYU2V0dGluZ1RhYiIsICJlcnJvciIsICJtZXNzYWdlIiwgImZ1bGxDb250ZW50U291cmNlS2V5cyIsICJmb2xkZXJzIiwgInNwbGl0U2NvcGUiLCAidGFncyIsICJ0YWciLCAiZmlsZXMiLCAiZmlsZSIsICJpc0FsbG93ZWQiLCAiY2FjaGUiLCAiZnJvbnRtYXR0ZXIiLCAidW5pcXVlU3RyaW5ncyIsICJhcnJheVN0cmluZ3MiLCAiY29udGVudCIsICJzY29wZVByZWZpeCIsICJmb2xkZXIiLCAiaW5mZXJLaW5kIiwgInN1bW1hcml6ZSIsICJzaGEyNTYiLCAiZW50cmllcyIsICJlbnRyeSIsICJzaG93Tm90aWNlIiwgImluc3RhbGxlZCIsICJuYW1lIiwgInBhdGgiLCAibWlncmF0ZWQiLCAibGVnYWN5UGF0aCIsICJ0YXJnZXRQYXRoIiwgImxlZ2FjeSIsICJ1cGRhdGVkIiwgInVwZGF0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcyIsICJjb25maWd1cmFibGVWYXVsdCIsICJhZGFwdGVyIiwgInNuaXBwZXRGb2xkZXIiLCAic25pcHBldFBhdGgiLCAiY2hhbmdlZCIsICJhcHBlYXJhbmNlUGF0aCIsICJhcHBlYXJhbmNlIiwgInJhdyIsICJwYXJzZWQiLCAiZW5hYmxlZCIsICJwYXRjaCIsICJjdXJyZW50IiwgImV4cG9ydGVkIiwgInJlc3VsdCIsICJyZXF1ZXN0ZWQiLCAiYXV0aG9yaXplZEVudHJpZXMiLCAibWlzc2luZyIsICJzb3VyY2VLZXkiLCAib3JnYW5pemVkIiwgIm9yZ2FuaXphdGlvblN1bW1hcnkiLCAic3VtbWFyaXplT3JnYW5pemF0aW9uIiwgInN5bmNTdW1tYXJ5IiwgInJlc3BvbnNlIiwgInBsYW4iLCAiYWxsb3dlZFRhcmdldHMiLCAiY29tcGxldGVkIiwgImNvbXBsZXRlZFNvdXJjZUtleXMiLCAiYWN0aW9uIiwgImZpbGVOYW1lIiwgImV4dGVuc2lvbkluZGV4IiwgImJhc2VOYW1lIiwgImV4dGVuc2lvbiIsICJiYXNlUGF0aCIsICJyZXRyeVBhdGgiLCAic291cmNlIiwgImJhc2UiLCAiaGVhZGVycyIsICJleHBvcnRzIiwgIml0ZW0iLCAiZGlnZXN0IiwgImFjayIsICJjdXJyZW50SGFzaCIsICJtYXJrZXIiLCAiZXhhY3QiLCAiZmlsZW5hbWUiLCAic2FmZUZpbGVuYW1lIiwgImV4aXN0aW5nIiwgInlhbWxTdHJpbmciLCAiYm9keSIsICJhcHAiLCAicGx1Z2luIiwgImNvbnRhaW5lckVsIiwgImJ1dHRvbiIsICJ0b2dnbGUiLCAidmFsdWUiLCAidGV4dCIsICJmb2xkZXJMYWJlbHMiLCAiY291bnRzIiwgImxhYmVsIiwgImRlc3RpbmF0aW9ucyIsICJjb3VudCIsICJwYXJ0IiwgInZhbHVlcyIsICJwYXRoQWxsb3dlZCIsICJmaWxlVGFncyIsICJjYW5kaWRhdGUiLCAibWFya2Rvd24iLCAic291cmNlUGF0aCIsICJsaW1pdCIsICJieXRlIl0KfQo=
