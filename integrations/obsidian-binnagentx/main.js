"use strict";
var y = Object.defineProperty;
var E = Object.getOwnPropertyDescriptor;
var O = Object.getOwnPropertyNames;
var B = Object.prototype.hasOwnProperty;
var T = (i, t) => {
    for (var n in t) y(i, n, { get: t[n], enumerable: !0 });
  },
  P = (i, t, n, a) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let e of O(t))
        !B.call(i, e) &&
          e !== n &&
          y(i, e, { get: () => t[e], enumerable: !(a = E(t, e)) || a.enumerable });
    return i;
  };
var I = (i) => P(y({}, "__esModule", { value: !0 }), i);
var U = {};
T(U, { default: () => b });
module.exports = I(U);
var o = require("obsidian"),
  s = "BinnAgentX",
  C = [
    "00-Inbox",
    "01-Vocabulary",
    "02-Grammar",
    "03-Reading",
    "04-Writing",
    "05-Templates",
    "06-Attachments",
  ],
  m = `${s}/00-Inbox`,
  u = `${s}/05-Templates`,
  D = `${s}/06-Attachments`,
  v = 3,
  F = [
    [`${s}/Dashboard.md`, `${s}/00-Dashboard.md`],
    [`${s}/01-Vocabulary/Dashboard.md`, `${s}/01-Vocabulary/00-Dashboard.md`],
    [`${s}/02-Grammar/Dashboard.md`, `${s}/02-Grammar/00-Dashboard.md`],
  ],
  $ = {
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
  V = {
    "\u8BCD\u6C47.md": `---
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
  k = {
    [`${s}/00-Dashboard.md`]: `# BinnAgentX \u5B66\u4E60\u5730\u56FE

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
    [`${s}/\u4F7F\u7528\u6307\u5357.md`]: `---
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
    [`${s}/Spaced Repetition \u4F7F\u7528\u6307\u5357.md`]: `---
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
3. \u641C\u7D22\u5E76\u6267\u884C \`Review flashcards in this note\`\u3002
4. \u5148\u5728\u5FC3\u91CC\u56DE\u7B54\uFF0C\u518D\u663E\u793A\u7B54\u6848\uFF0C\u5E76\u6309\u771F\u5B9E\u56DE\u5FC6\u60C5\u51B5\u9009\u62E9\u8BC4\u5206\u3002\u63D2\u4EF6\u4F1A\u636E\u6B64\u5B89\u6392\u4E0B\u6B21\u590D\u4E60\u3002

\u5982\u679C\u53EA\u60F3\u7ACB\u523B\u91CD\u505A\u5168\u90E8\u6837\u4F8B\u3001\u4E0D\u8003\u8651\u590D\u4E60\u65E5\u671F\uFF0C\u8BF7\u6267\u884C \`Cram flashcards in this note\`\u3002

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

\u6253\u5F00\u547D\u4EE4\u9762\u677F\u5E76\u6267\u884C \`Review Flashcards from all notes\`\uFF0C\u9009\u62E9\u5361\u7EC4\u540E\u5F00\u59CB\u590D\u4E60\u3002\u5EFA\u8BAE\u5148\u56DE\u5FC6\u518D\u770B\u7B54\u6848\uFF1B\u8BC4\u5206\u53CD\u6620\u201C\u8FD9\u6B21\u60F3\u8D77\u6765\u6709\u591A\u96BE\u201D\uFF0C\u4E0D\u5FC5\u8FFD\u6C42\u5168\u90E8\u9009 Easy\u3002

\u590D\u4E60\u540E\uFF0CSpaced Repetition \u4F1A\u5728\u5361\u7247\u9644\u8FD1\u5199\u5165\u7C7B\u4F3C \`<!--SR:...-->\` \u7684\u8C03\u5EA6\u6CE8\u91CA\u3002\u8FD9\u662F\u590D\u4E60\u8BB0\u5F55\uFF0C\u4E0D\u662F\u9519\u8BEF\uFF1B\u4E0D\u8981\u624B\u52A8\u4FEE\u6539\u6216\u5220\u9664\u3002

## \u5E38\u89C1\u95EE\u9898

- **\u627E\u4E0D\u5230\u5361\u7EC4**\uFF1A\u786E\u8BA4 Spaced Repetition \u5DF2\u542F\u7528\uFF0C\u5E76\u4E14\u7B14\u8BB0\u6B63\u6587\u542B\u6709 \`#flashcards\` \u6216\u5176\u5C42\u7EA7\u6807\u7B7E\u3002
- **\u5361\u7247\u6CA1\u6709\u88AB\u8BC6\u522B**\uFF1A\u5148\u4F7F\u7528\u9ED8\u8BA4\u5206\u9694\u7B26\uFF0C\u5E76\u786E\u8BA4 \`::\`\u3001\`:::\` \u6216 \`?\` \u4E0D\u5728\u4EE3\u7801\u5757\u4E2D\u3002
- **\u4ECA\u5929\u6CA1\u6709\u5230\u671F\u5361\u7247**\uFF1A\u6267\u884C \`Cram flashcards in this note\` \u53EF\u968F\u65F6\u7EC3\u4E60\uFF0C\u4E0D\u4F1A\u53D7\u5230\u671F\u65E5\u9650\u5236\u3002
- **\u60F3\u590D\u4E60\u6574\u7BC7\u7B14\u8BB0**\uFF1A\u8FD9\u662F\u53E6\u4E00\u79CD\u5DE5\u4F5C\u6D41\uFF0C\u53EF\u7ED9\u7B14\u8BB0\u52A0 \`#review\`\uFF1B\u5165\u95E8\u9636\u6BB5\u53EA\u4F7F\u7528\u95EA\u5361\u5373\u53EF\u3002
`,
    [`${m}/\u6536\u96C6\u7BB1\u4F7F\u7528\u8BF4\u660E.md`]: `---
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
    [`${s}/01-Vocabulary/00-Dashboard.md`]: `# \u8BCD\u6C47 Dashboard

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
    [`${s}/01-Vocabulary/resilient.md`]: `---
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
    [`${s}/01-Vocabulary/Spaced Repetition \u95EA\u5361\u793A\u4F8B.md`]: `---
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

\u8FD9\u662F\u4E00\u7EC4\u53EF\u4EE5\u7ACB\u5373\u590D\u4E60\u7684\u5165\u95E8\u5361\u7247\u3002\u8BF7\u4FDD\u7559\u4E0B\u4E00\u884C\u5361\u7EC4\u6807\u7B7E\uFF0C\u7136\u540E\u6253\u5F00\u547D\u4EE4\u9762\u677F\uFF0C\u6267\u884C \`Review flashcards in this note\`\u3002

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
    [`${s}/02-Grammar/00-Dashboard.md`]: `# \u8BED\u6CD5 Dashboard

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
    [`${s}/02-Grammar/although \u4E0E despite.md`]: `---
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
    [`${s}/03-Reading/\u9605\u8BFB\u7B14\u8BB0\u793A\u4F8B.md`]: `---
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
    [`${s}/04-Writing/\u5199\u4F5C\u7EC3\u4E60\u793A\u4F8B.md`]: `---
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
    settings = $;
    async onload() {
      (await this.loadSettings(),
        this.addSettingTab(new f(this.app, this)),
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
      this.settings = { ...$, ...(await this.loadData()) };
    }
    async saveSettings() {
      await this.saveData(this.settings);
    }
    async handleLayoutReady() {
      if (this.settings.libraryVersion < v)
        try {
          await this.initializeLearningLibrary(!1);
        } catch (t) {
          let n = t instanceof Error ? t.message : "\u672A\u77E5\u9519\u8BEF";
          new o.Notice(`BinnAgentX \u5B66\u4E60\u5E93\u521D\u59CB\u5316\u5931\u8D25\uFF1A${n}`);
        }
      this.settings.autoSync && (await this.sync(!1));
    }
    async collectEntriesAsync() {
      let t = x(this.settings.allowedFolders),
        n = x(this.settings.allowedTags).map((e) => e.replace(/^#/, ""));
      if (!t.length && !n.length)
        throw new Error(
          "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u5141\u8BB8\u540C\u6B65\u7684\u6587\u4EF6\u5939\u6216\u6807\u7B7E",
        );
      let a = this.app.vault.getMarkdownFiles().filter((e) => N(e, t, n, this.app));
      if (a.length > this.settings.maxNotes)
        throw new Error(
          `\u5339\u914D\u5230 ${a.length} \u7BC7\u7B14\u8BB0\uFF0C\u8BF7\u7F29\u5C0F\u8303\u56F4\uFF08\u4E0A\u9650 ${this.settings.maxNotes}\uFF09`,
        );
      return Promise.all(
        a.map(async (e) => {
          let r = this.app.metadataCache.getFileCache(e),
            l = r?.frontmatter ?? {},
            c = w([...R(l.tags), ...(r?.tags ?? []).map((g) => g.tag.replace(/^#/, ""))]);
          return {
            source_key: e.path,
            asset_id: typeof l.binnagent_asset_id == "string" ? l.binnagent_asset_id : void 0,
            title: String(l.title ?? e.basename),
            kind: X(l.binnagent_kind, c),
            tags: c,
            excerpt: z(await this.app.vault.read(e), this.settings.maxExcerptCharacters),
            modified_at: new Date(e.stat.mtime).toISOString(),
          };
        }),
      );
    }
    async preview() {
      try {
        let t = await this.collectEntriesAsync();
        new o.Notice(
          `\u5C06\u540C\u6B65 ${t.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF1A${
            t
              .slice(0, 4)
              .map((n) => n.title)
              .join("\u3001") || "\u65E0"
          }`,
        );
      } catch (t) {
        new o.Notice(
          t instanceof Error ? t.message : "\u65E0\u6CD5\u9884\u89C8\u540C\u6B65\u8303\u56F4",
        );
      }
    }
    async initializeLearningLibrary(t = !0) {
      let n = 0;
      this.app.vault.getAbstractFileByPath(s) || (await this.app.vault.createFolder(s), (n += 1));
      for (let a of C) {
        let e = `${s}/${a}`;
        this.app.vault.getAbstractFileByPath(e) || (await this.app.vault.createFolder(e), (n += 1));
      }
      ((n += await this.migrateManagedDashboards()), await this.rewriteManagedDashboardLinks());
      for (let [a, e] of Object.entries(V))
        this.app.vault.getAbstractFileByPath(`${u}/${a}`) ||
          (await this.app.vault.create(`${u}/${a}`, e), (n += 1));
      for (let [a, e] of Object.entries(k))
        this.app.vault.getAbstractFileByPath(a) || (await this.app.vault.create(a, e), (n += 1));
      (await this.configureObsidianFolders(),
        (this.settings.libraryVersion = v),
        await this.saveSettings(),
        t &&
          new o.Notice(
            n
              ? `BinnAgentX \u5B66\u4E60\u5E93\u5DF2\u521D\u59CB\u5316\uFF08\u65B0\u589E ${n} \u9879\uFF09`
              : "BinnAgentX \u5B66\u4E60\u5E93\u5DF2\u5C31\u7EEA\uFF0C\u672A\u8986\u76D6\u4F60\u7684\u4FEE\u6539",
          ));
    }
    async migrateManagedDashboards() {
      let t = 0;
      for (let [n, a] of F) {
        let e = this.app.vault.getAbstractFileByPath(n);
        !(e instanceof o.TFile) ||
          this.app.vault.getAbstractFileByPath(a) ||
          (await this.app.vault.rename(e, a), (t += 1));
      }
      return t;
    }
    async rewriteManagedDashboardLinks() {
      let t = this.app.vault
        .getMarkdownFiles()
        .filter((n) => n.path === `${s}.md` || n.path.startsWith(`${s}/`));
      for (let n of t) {
        let a = await this.app.vault.read(n),
          e = W(a, n.path);
        e !== a && (await this.app.vault.modify(n, e));
      }
    }
    async configureObsidianFolders() {
      let t = this.app.vault;
      (typeof t.setConfig == "function"
        ? t.setConfig("attachmentFolderPath", D)
        : await this.mergeConfigFile(`${this.app.vault.configDir}/app.json`, {
            attachmentFolderPath: D,
          }),
        await this.mergeConfigFile(`${this.app.vault.configDir}/templates.json`, { folder: u }));
    }
    async mergeConfigFile(t, n) {
      let a = this.app.vault.adapter,
        e = {};
      if (await a.exists(t)) {
        let l = await a.read(t);
        try {
          let c = JSON.parse(l);
          c && typeof c == "object" && !Array.isArray(c) && (e = c);
        } catch {
          throw new Error(
            `\u65E0\u6CD5\u66F4\u65B0 Obsidian \u914D\u7F6E\uFF1A${t} \u4E0D\u662F\u6709\u6548\u7684 JSON`,
          );
        }
      }
      let r = { ...e, ...n };
      JSON.stringify(r) !== JSON.stringify(e) &&
        (await a.write(
          t,
          `${JSON.stringify(r, null, 2)}
`,
        ));
    }
    async sync(t = !0) {
      if (!this.settings.connectionId || !this.settings.syncSecret) {
        t &&
          new o.Notice(
            "\u8BF7\u5148\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u586B\u5199 BinnAgentX \u8FDE\u63A5\u51ED\u636E",
          );
        return;
      }
      try {
        let n = await this.pullPendingAssets(),
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
        let r = e.json,
          l = await this.applyOrganizationPlan(r.organization),
          c = L(r.organization, l),
          g =
            `\u63A5\u6536 ${n} \u6761\u8D44\u4EA7\uFF0C\u4E0A\u4F20 ${a.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF1B` +
            c;
        ((this.settings.lastSyncedAt = new Date().toISOString()),
          (this.settings.lastSyncError = ""),
          (this.settings.lastSyncSummary = g),
          await this.saveSettings(),
          t && new o.Notice(`\u53CC\u5411\u540C\u6B65\u5B8C\u6210\uFF1A${g}`));
      } catch (n) {
        let a = n instanceof Error ? n.message : "\u540C\u6B65\u5931\u8D25";
        ((this.settings.lastSyncError = a), await this.saveSettings(), t && new o.Notice(a));
      }
    }
    async applyOrganizationPlan(t) {
      if (t?.status !== "planned" || !t.actions.length) return 0;
      let n = new Set([
          `${s}/01-Vocabulary`,
          `${s}/02-Grammar`,
          `${s}/03-Reading`,
          `${s}/04-Writing`,
        ]),
        a = [];
      for (let r of t.actions) {
        if (!r.source_key.startsWith(`${m}/`) || !n.has(r.target_folder)) continue;
        let l = r.source_key.slice(r.source_key.lastIndexOf("/") + 1),
          c = l.lastIndexOf("."),
          g = c > 0 ? l.slice(0, c) : l,
          h = c > 0 ? l.slice(c + 1) : "md",
          d = `${r.target_folder}/${l}`,
          S = `${r.target_folder}/${g}-${r.action_id.slice(0, 6)}.${h}`,
          A = this.app.vault.getAbstractFileByPath(r.source_key);
        if (!(A instanceof o.TFile)) {
          (this.app.vault.getAbstractFileByPath(d) instanceof o.TFile ||
            this.app.vault.getAbstractFileByPath(S) instanceof o.TFile) &&
            a.push(r.action_id);
          continue;
        }
        let _ = this.app.vault.getAbstractFileByPath(d) ? S : d;
        this.app.vault.getAbstractFileByPath(_) ||
          (await this.app.vault.rename(A, _), a.push(r.action_id));
      }
      if (a.length !== t.actions.length)
        throw new Error(
          "Inbox \u6574\u7406\u672A\u5168\u90E8\u5B8C\u6210\uFF1B\u672A\u79FB\u52A8\u7684\u7B14\u8BB0\u4F1A\u4FDD\u7559\u5728\u539F\u5904\uFF0C\u4E0B\u6B21\u540C\u6B65\u91CD\u8BD5",
        );
      let e = await (0, o.requestUrl)({
        url: `${this.settings.apiBaseUrl.replace(/\/$/, "")}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/organizer-runs/${encodeURIComponent(t.run_id)}/ack`,
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
      let t = this.settings.apiBaseUrl.replace(/\/$/, ""),
        n = { Authorization: `Bearer ${this.settings.syncSecret}` },
        a = await (0, o.requestUrl)({
          url: `${t}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports`,
          method: "GET",
          headers: n,
          throw: !1,
        });
      if (a.status < 200 || a.status >= 300)
        throw new Error(
          `\u65E0\u6CD5\u8BFB\u53D6\u5F85\u540C\u6B65\u8D44\u4EA7\uFF08${a.status}\uFF09`,
        );
      let e = a.json,
        r = 0;
      for (let l of e) {
        let c = await this.createAssetNote(l),
          g = await this.app.vault.read(c),
          h = await M(g),
          d = await (0, o.requestUrl)({
            url: `${t}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports/${encodeURIComponent(l.asset_id)}/ack`,
            method: "POST",
            headers: { ...n, "Content-Type": "application/json" },
            body: JSON.stringify({
              source_key: c.path,
              content_hash: h,
              modified_at: new Date(c.stat.mtime).toISOString(),
              vault_name: this.app.vault.getName(),
            }),
            throw: !1,
          });
        if (d.status < 200 || d.status >= 300)
          throw new Error(
            `\u8D44\u4EA7\u540C\u6B65\u56DE\u6267\u5931\u8D25\uFF08${d.status}\uFF09`,
          );
        r += 1;
      }
      return r;
    }
    async createAssetNote(t) {
      (this.app.vault.getAbstractFileByPath(s) || (await this.app.vault.createFolder(s)),
        this.app.vault.getAbstractFileByPath(m) || (await this.app.vault.createFolder(m)));
      let n = m,
        a = `${G(t.title)}-${t.asset_id.slice(-10)}.md`,
        e = `${n}/${a}`,
        r = this.app.vault.getAbstractFileByPath(e);
      if (r instanceof o.TFile) return r;
      let l = w(["binnagent", t.kind, ...t.tags]),
        c = [
          "---",
          'binnagent_schema: "asset/v1"',
          `binnagent_asset_id: "${p(t.asset_id)}"`,
          `binnagent_kind: "${p(t.kind)}"`,
          `binnagent_source_type: "${p(t.source_type)}"`,
          "inbox_status: unprocessed",
          `title: "${p(t.title)}"`,
          ...(t.source_task_id ? [`binnagent_source_task_id: "${p(t.source_task_id)}"`] : []),
          "tags:",
          ...l.map((h) => `  - ${h}`),
          "---",
          "",
          `# ${t.title}`,
          "",
        ],
        g = t.initial_content?.trim()
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
        e,
        [...c, ...g].join(`
`),
      );
    }
  },
  f = class extends o.PluginSettingTab {
    constructor(n, a) {
      super(n, a);
      this.plugin = a;
    }
    display() {
      let { containerEl: n } = this;
      (n.empty(),
        n.createEl("h2", { text: "BinnAgentX \u5B66\u4E60\u8D44\u4EA7\u540C\u6B65" }),
        n.createEl("p", {
          text: "\u4EC5\u540C\u6B65\u4F60\u660E\u786E\u5141\u8BB8\u7684\u8303\u56F4\u3002\u767B\u5F55\u89E6\u53D1\u7684\u6574\u7406\u53EA\u4F1A\u628A 00-Inbox \u7B14\u8BB0\u79FB\u52A8\u5230 BinnAgentX \u7684\u8BCD\u6C47\u3001\u8BED\u6CD5\u3001\u9605\u8BFB\u6216\u5199\u4F5C\u76EE\u5F55\uFF1B\u4E0D\u4F1A\u5220\u9664\u3001\u6539\u5199\u6216\u79FB\u51FA\u6258\u7BA1\u76EE\u5F55\u3002",
        }),
        new o.Setting(n)
          .setName("\u521D\u59CB\u5316\u5B66\u4E60\u5E93")
          .setDesc(
            "\u521B\u5EFA 00\u201306 \u76EE\u5F55\u3001MOC / Dataview Dashboard\u3001\u6A21\u677F\u3001Spaced Repetition \u6307\u5357\u4E0E\u5165\u95E8\u793A\u4F8B\uFF1B\u4E0D\u4F1A\u8986\u76D6\u5DF2\u6709\u6587\u4EF6\u3002",
          )
          .addButton((a) =>
            a.setButtonText("\u68C0\u67E5\u5E76\u8865\u9F50").onClick(async () => {
              await this.plugin.initializeLearningLibrary();
            }),
          ),
        new o.Setting(n)
          .setName("\u81EA\u52A8\u53CC\u5411\u540C\u6B65")
          .setDesc(
            "Obsidian \u542F\u52A8\u540E\u53CA\u6BCF 60 \u79D2\u540C\u6B65\u4E00\u6B21\u5DF2\u6388\u6743\u8303\u56F4\uFF1B\u53EF\u968F\u65F6\u5173\u95ED\u5E76\u6539\u7528\u624B\u52A8\u547D\u4EE4\u3002",
          )
          .addToggle((a) =>
            a.setValue(this.plugin.settings.autoSync).onChange(async (e) => {
              ((this.plugin.settings.autoSync = e), await this.plugin.saveSettings());
            }),
          ),
        new o.Setting(n)
          .setName("\u6700\u8FD1\u540C\u6B65")
          .setDesc(
            this.plugin.settings.lastSyncError
              ? `\u5931\u8D25\uFF1A${this.plugin.settings.lastSyncError}`
              : this.plugin.settings.lastSyncedAt
                ? `${this.plugin.settings.lastSyncedAt}\uFF1B${this.plugin.settings.lastSyncSummary || "\u540C\u6B65\u5B8C\u6210"}`
                : "\u5C1A\u672A\u5B8C\u6210\u540C\u6B65",
          ),
        new o.Setting(n)
          .setName("\u5141\u8BB8\u7684\u6587\u4EF6\u5939")
          .setDesc(
            "\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 BinnAgentX, \u82F1\u8BED/\u8BED\u6CD5",
          )
          .addText((a) =>
            a.setValue(this.plugin.settings.allowedFolders).onChange(async (e) => {
              ((this.plugin.settings.allowedFolders = e), await this.plugin.saveSettings());
            }),
          ),
        new o.Setting(n)
          .setName("\u5141\u8BB8\u7684\u6807\u7B7E")
          .setDesc(
            "\u53EF\u9009\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 binnagent-vocabulary, grammar",
          )
          .addText((a) =>
            a.setValue(this.plugin.settings.allowedTags).onChange(async (e) => {
              ((this.plugin.settings.allowedTags = e), await this.plugin.saveSettings());
            }),
          ),
        new o.Setting(n)
          .setName("BinnAgentX \u5730\u5740")
          .setDesc("\u672C\u673A\u9ED8\u8BA4\uFF1Ahttp://127.0.0.1:8000/learner")
          .addText((a) =>
            a.setValue(this.plugin.settings.apiBaseUrl).onChange(async (e) => {
              ((this.plugin.settings.apiBaseUrl = e), await this.plugin.saveSettings());
            }),
          ),
        new o.Setting(n).setName("\u8FDE\u63A5 ID").addText((a) =>
          a.setValue(this.plugin.settings.connectionId).onChange(async (e) => {
            ((this.plugin.settings.connectionId = e), await this.plugin.saveSettings());
          }),
        ),
        new o.Setting(n)
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
function L(i, t) {
  if (!i) return "\u672C\u8F6E\u6CA1\u6709\u6392\u961F\u7684 Inbox \u6574\u7406\u4EFB\u52A1\u3002";
  if (i.status === "noop") return "Inbox \u4E2D\u6CA1\u6709\u5F85\u6574\u7406\u7B14\u8BB0\u3002";
  if (i.status === "queued")
    return `Inbox \u6709 ${i.inbox_count} \u6761\u5F85\u6574\u7406\u7B14\u8BB0\uFF0C\u53EF\u9760\u5206\u7C7B ${i.classified_count} \u6761\uFF1B\u672C\u8F6E\u672A\u79FB\u52A8\uFF0C\u4EFB\u52A1\u4F1A\u5728\u4E0B\u6B21\u540C\u6B65\u91CD\u8BD5\u3002`;
  let n = {
      [`${s}/01-Vocabulary`]: "\u8BCD\u6C47",
      [`${s}/02-Grammar`]: "\u8BED\u6CD5",
      [`${s}/03-Reading`]: "\u9605\u8BFB",
      [`${s}/04-Writing`]: "\u5199\u4F5C",
    },
    a = new Map();
  for (let r of i.actions) {
    let l = n[r.target_folder] ?? r.target_folder;
    a.set(l, (a.get(l) ?? 0) + 1);
  }
  let e = [...a.entries()].map(([r, l]) => `${r} ${l} \u6761`).join("\u3001");
  return `\u6574\u7406\u5B8C\u6210\uFF1A\u79FB\u52A8 ${t} \u6761 Inbox \u7B14\u8BB0\uFF08${e}\uFF09\u3002`;
}
function x(i) {
  return i
    .split(",")
    .map((t) => t.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
}
function R(i) {
  return Array.isArray(i) ? i.filter((t) => typeof t == "string") : typeof i == "string" ? [i] : [];
}
function w(i) {
  return [...new Set(i.map((t) => t.replace(/^#/, "").trim()).filter(Boolean))];
}
function N(i, t, n, a) {
  let e = a.metadataCache.getFileCache(i);
  if (
    i.path.startsWith(`${u}/`) ||
    i.path.startsWith("BinnAgentX/Templates/") ||
    i.basename === "Dashboard" ||
    i.basename === "00-Dashboard" ||
    Object.prototype.hasOwnProperty.call(k, i.path) ||
    e?.frontmatter?.binnagent_sync === !1
  )
    return !1;
  let r = t.some((c) => i.path === c || i.path.startsWith(`${c}/`)),
    l = w([...(e?.tags ?? []).map((c) => c.tag), ...R(e?.frontmatter?.tags)]);
  return r || n.some((c) => l.includes(c));
}
function X(i, t) {
  let n =
    typeof i == "string"
      ? i
      : t.find((a) =>
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
  ].includes(n ?? "")
    ? n
    : "reading_skill";
}
function W(i, t) {
  let n = i
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
    (t.startsWith(`${s}/01-Vocabulary/`) || t.startsWith(`${s}/02-Grammar/`)) &&
      (n = n.replaceAll("[[Dashboard]]", "[[00-Dashboard]]")),
    (t.endsWith("/Dashboard.md") || t.endsWith("/00-Dashboard.md")) &&
      (n = n.replaceAll(
        'WHERE file.name != "Dashboard"',
        'WHERE file.name != "00-Dashboard" AND file.name != "Dashboard"',
      )),
    n
  );
}
function z(i, t) {
  return i
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/```[\s\S]*?```/gu, "")
    .replace(/!?(\[([^\]]*)\]\([^)]*\))/gu, "$2")
    .replace(/[#>*_`]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, t);
}
function G(i) {
  return (
    i
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim()
      .slice(0, 80) || "asset"
  );
}
function p(i) {
  return i.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
async function M(i) {
  let t = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(i));
  return Array.from(new Uint8Array(t), (n) => n.toString(16).padStart(2, "0")).join("");
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEFwcCwgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIFRGaWxlLCByZXF1ZXN0VXJsIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbnR5cGUgTGVhcm5pbmdLaW5kID1cbiAgfCBcInZvY2FidWxhcnlcIlxuICB8IFwiZ3JhbW1hclwiXG4gIHwgXCJ3cml0aW5nX2V4cHJlc3Npb25cIlxuICB8IFwicmVhZGluZ19za2lsbFwiXG4gIHwgXCJleGFtX3NraWxsXCJcbiAgfCBcIndyaXRpbmdfc2tpbGxcIjtcblxuaW50ZXJmYWNlIFN5bmNTZXR0aW5ncyB7XG4gIGFwaUJhc2VVcmw6IHN0cmluZztcbiAgY29ubmVjdGlvbklkOiBzdHJpbmc7XG4gIHN5bmNTZWNyZXQ6IHN0cmluZztcbiAgYWxsb3dlZEZvbGRlcnM6IHN0cmluZztcbiAgYWxsb3dlZFRhZ3M6IHN0cmluZztcbiAgbWF4Tm90ZXM6IG51bWJlcjtcbiAgbWF4RXhjZXJwdENoYXJhY3RlcnM6IG51bWJlcjtcbiAgYXV0b1N5bmM6IGJvb2xlYW47XG4gIGxpYnJhcnlWZXJzaW9uOiBudW1iZXI7XG4gIGxhc3RTeW5jZWRBdDogc3RyaW5nO1xuICBsYXN0U3luY0Vycm9yOiBzdHJpbmc7XG4gIGxhc3RTeW5jU3VtbWFyeTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTGVhcm5pbmdDb250ZXh0RW50cnkge1xuICBzb3VyY2Vfa2V5OiBzdHJpbmc7XG4gIGFzc2V0X2lkPzogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHRhZ3M6IHN0cmluZ1tdO1xuICBleGNlcnB0OiBzdHJpbmc7XG4gIG1vZGlmaWVkX2F0OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQZW5kaW5nQXNzZXRFeHBvcnQge1xuICBhc3NldF9pZDogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHRhZ3M6IHN0cmluZ1tdO1xuICBzb3VyY2VfdHlwZTogc3RyaW5nO1xuICBzb3VyY2VfdGFza19pZDogc3RyaW5nIHwgbnVsbDtcbiAgaW5pdGlhbF9jb250ZW50OiBzdHJpbmcgfCBudWxsO1xufVxuXG5pbnRlcmZhY2UgT3JnYW5pemF0aW9uQWN0aW9uIHtcbiAgYWN0aW9uX2lkOiBzdHJpbmc7XG4gIHNvdXJjZV9rZXk6IHN0cmluZztcbiAgdGFyZ2V0X2ZvbGRlcjogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHJlYXNvbjogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgT3JnYW5pemF0aW9uUGxhbiB7XG4gIHJ1bl9pZDogc3RyaW5nO1xuICBzdGF0dXM6IFwicXVldWVkXCIgfCBcInBsYW5uZWRcIiB8IFwibm9vcFwiO1xuICBpbmJveF9jb3VudDogbnVtYmVyO1xuICBjbGFzc2lmaWVkX2NvdW50OiBudW1iZXI7XG4gIGFjdGlvbnM6IE9yZ2FuaXphdGlvbkFjdGlvbltdO1xufVxuXG5pbnRlcmZhY2UgSW1wb3J0UmVzcG9uc2Uge1xuICBpbXBvcnRlZDogbnVtYmVyO1xuICBvcmdhbml6YXRpb246IE9yZ2FuaXphdGlvblBsYW4gfCBudWxsO1xufVxuXG5jb25zdCBMSUJSQVJZX1JPT1QgPSBcIkJpbm5BZ2VudFhcIjtcbmNvbnN0IExJQlJBUllfRk9MREVSUyA9IFtcbiAgXCIwMC1JbmJveFwiLFxuICBcIjAxLVZvY2FidWxhcnlcIixcbiAgXCIwMi1HcmFtbWFyXCIsXG4gIFwiMDMtUmVhZGluZ1wiLFxuICBcIjA0LVdyaXRpbmdcIixcbiAgXCIwNS1UZW1wbGF0ZXNcIixcbiAgXCIwNi1BdHRhY2htZW50c1wiLFxuXSBhcyBjb25zdDtcbmNvbnN0IElOQk9YX0ZPTERFUiA9IGAke0xJQlJBUllfUk9PVH0vMDAtSW5ib3hgO1xuY29uc3QgVEVNUExBVEVfRk9MREVSID0gYCR7TElCUkFSWV9ST09UfS8wNS1UZW1wbGF0ZXNgO1xuY29uc3QgQVRUQUNITUVOVF9GT0xERVIgPSBgJHtMSUJSQVJZX1JPT1R9LzA2LUF0dGFjaG1lbnRzYDtcbmNvbnN0IENVUlJFTlRfTElCUkFSWV9WRVJTSU9OID0gMztcbmNvbnN0IERBU0hCT0FSRF9NSUdSQVRJT05TID0gW1xuICBbYCR7TElCUkFSWV9ST09UfS9EYXNoYm9hcmQubWRgLCBgJHtMSUJSQVJZX1JPT1R9LzAwLURhc2hib2FyZC5tZGBdLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5L0Rhc2hib2FyZC5tZGAsIGAke0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmQubWRgXSxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDItR3JhbW1hci9EYXNoYm9hcmQubWRgLCBgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkLm1kYF0sXG5dIGFzIGNvbnN0O1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTeW5jU2V0dGluZ3MgPSB7XG4gIGFwaUJhc2VVcmw6IFwiaHR0cDovLzEyNy4wLjAuMTo4MDAwL2xlYXJuZXJcIixcbiAgY29ubmVjdGlvbklkOiBcIlwiLFxuICBzeW5jU2VjcmV0OiBcIlwiLFxuICBhbGxvd2VkRm9sZGVyczogXCJCaW5uQWdlbnRYXCIsXG4gIGFsbG93ZWRUYWdzOiBcIlwiLFxuICBtYXhOb3RlczogODAsXG4gIG1heEV4Y2VycHRDaGFyYWN0ZXJzOiA5MDAsXG4gIGF1dG9TeW5jOiB0cnVlLFxuICBsaWJyYXJ5VmVyc2lvbjogMCxcbiAgbGFzdFN5bmNlZEF0OiBcIlwiLFxuICBsYXN0U3luY0Vycm9yOiBcIlwiLFxuICBsYXN0U3luY1N1bW1hcnk6IFwiXCIsXG59O1xuXG5jb25zdCBMRUFSTklOR19URU1QTEFURVM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFwiXHU4QkNEXHU2QzQ3Lm1kXCI6XG4gICAgJy0tLVxcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXFxuYmlubmFnZW50X2tpbmQ6IFwidm9jYWJ1bGFyeVwiXFxubWVhbmluZzogXCJcIlxcbnN0YXR1czogbGVhcm5pbmdcXG5jcmVhdGVkOiB7e2RhdGV9fVxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSB2b2NhYnVsYXJ5XFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDlcXG5cXG4jIyBcdTUzRDFcdTk3RjNcXG5cXG4jIyBcdTVFMzhcdTc1MjhcdTY0MkRcdTkxNERcXG5cXG4jIyBcdTUzOUZcdTUzRTVcdTRFMEVcdThCRURcdTU4ODNcXG5cXG4jIyBcdTYyMTFcdTc2ODRcdTRGOEJcdTUzRTVcXG5cXG4jIyBcdTY2MTNcdTZERjdcdTZEQzZcdTcwQjlcXG5cXG4jIyBcdTUxNzNcdTgwNTRcXG4tIFtbQmlubkFnZW50WC8wMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZHxcdThCQ0RcdTZDNDcgRGFzaGJvYXJkXV1cXG4nLFxuICBcIlx1OEJFRFx1NkNENS5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcImdyYW1tYXJcIlxcbnN0YXR1czogbGVhcm5pbmdcXG5jcmVhdGVkOiB7e2RhdGV9fVxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSBncmFtbWFyXFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTRFMDBcdTUzRTVcdThCRERcdTg5QzRcdTUyMTlcXG5cXG4jIyBcdTdFRDNcdTY3ODRcdTUxNkNcdTVGMEZcXG5cXG4jIyBcdTUyMjRcdTY1QURcdTdFQkZcdTdEMjJcXG5cXG4jIyBcdTUzOUZcdTUzRTVcdTYyQzZcdTg5RTNcXG5cXG4jIyBcdTVFMzhcdTg5QzFcdThCRUZcdTUzM0FcXG5cXG4jIyBcdTY1QjBcdThCRURcdTU4ODNcdTlBOENcdThCQzFcXG5cXG4jIyBcdTUxNzNcdTgwNTRcXG4tIFtbQmlubkFnZW50WC8wMi1HcmFtbWFyLzAwLURhc2hib2FyZHxcdThCRURcdTZDRDUgRGFzaGJvYXJkXV1cXG4nLFxuICBcIlx1NTE5OVx1NEY1Q1x1ODg2OFx1OEZCRS5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcIndyaXRpbmdfZXhwcmVzc2lvblwiXFxuY3JlYXRlZDoge3tkYXRlfX1cXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gd3JpdGluZy1leHByZXNzaW9uXFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTg4NjhcdThGQkVcdTUyOUZcdTgwRkRcXG5cXG4jIyBcdTUzRTVcdTVGMEZcdTlBQThcdTY3QjZcXG5cXG4jIyBcdTUzOUZcdTU5Q0JcdTgzMDNcdTRGOEJcXG5cXG4jIyBcdTYyMTFcdTc2ODRcdTY1MzlcdTUxOTlcXG5cXG4jIyBcdTUzRUZcdTY2RkZcdTYzNjJcdThCQ0RcdTY5RkRcXG4nLFxuICBcIlx1OTYwNVx1OEJGQlx1N0I1Nlx1NzU2NS5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcInJlYWRpbmdfc2tpbGxcIlxcbmNyZWF0ZWQ6IHt7ZGF0ZX19XFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHJlYWRpbmctc2tpbGxcXG4tLS1cXG5cXG4jIHt7dGl0bGV9fVxcblxcbiMjIFx1OTAwMlx1NzUyOFx1NTczQVx1NjY2RlxcblxcbiMjIFx1NjRDRFx1NEY1Q1x1NkI2NVx1OUFBNFxcblxcbiMjIFx1OEJDMVx1NjM2RVx1NUI5QVx1NEY0RFxcblxcbiMjIFx1NTkzMVx1OEQyNVx1NEZFMVx1NTNGN1xcblxcbiMjIFx1NjVCMFx1NjU4N1x1N0FFMFx1OUE4Q1x1OEJDMVxcbicsXG59O1xuXG5jb25zdCBMSUJSQVJZX05PVEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBbYCR7TElCUkFSWV9ST09UfS8wMC1EYXNoYm9hcmQubWRgXTogYCMgQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTU3MzBcdTU2RkVcblxuXHU3QjJDXHU0RTAwXHU2QjIxXHU0RjdGXHU3NTI4XHU4QkY3XHU1MTQ4XHU4QkZCIFtbXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XV0gXHU1NDhDIFtbU3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XV1cdTMwMDJcdTRFNEJcdTU0MEVcdTRFQ0UgW1swMC1JbmJveC9cdTY1MzZcdTk2QzZcdTdCQjFcdTRGN0ZcdTc1MjhcdThCRjRcdTY2MEV8XHU2NTM2XHU5NkM2XHU3QkIxXV0gXHU1RjAwXHU1OUNCXHVGRjBDXHU2MjhBXHU3ODhFXHU3MjQ3XHU1QjlBXHU2NzFGXHU2NTc0XHU3NDA2XHU1MjMwXHU0RTBCXHU5NzYyXHU3Njg0XHU5ODg2XHU1N0RGXHU3NkVFXHU1RjU1XHUzMDAyXG5cbiMjIFx1NTE4NVx1NUJCOVx1NTczMFx1NTZGRVx1RkYwOE1PQ1x1RkYwOVxuXG4tIFtbMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dXG4tIFtbMDItR3JhbW1hci8wMC1EYXNoYm9hcmR8XHU4QkVEXHU2Q0Q1IERhc2hib2FyZF1dXG4tIFtbMDMtUmVhZGluZy9cdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTc5M0FcdTRGOEJ8XHU5NjA1XHU4QkZCXV1cbi0gW1swNC1Xcml0aW5nL1x1NTE5OVx1NEY1Q1x1N0VDM1x1NEU2MFx1NzkzQVx1NEY4QnxcdTUxOTlcdTRGNUNdXVxuLSBbWzA1LVRlbXBsYXRlcy9cdThCQ0RcdTZDNDd8XHU3QjE0XHU4QkIwXHU2QTIxXHU2NzdGXV1cbi0gW1swMS1Wb2NhYnVsYXJ5L1NwYWNlZCBSZXBldGl0aW9uIFx1OTVFQVx1NTM2MVx1NzkzQVx1NEY4QnxcdTUzRUZcdTU5MERcdTRFNjBcdTc2ODRcdTk1RUFcdTUzNjFcdTc5M0FcdTRGOEJdXVxuXG4jIyBcdTY3MDBcdThGRDFcdTY2RjRcdTY1QjBcdUZGMDhEYXRhdmlld1x1RkYwOVxuXG5cXGBcXGBcXGBkYXRhdmlld1xuVEFCTEUgV0lUSE9VVCBJRCBmaWxlLmxpbmsgQVMgXCJcdTdCMTRcdThCQjBcIiwgYmlubmFnZW50X2tpbmQgQVMgXCJcdTdDN0JcdTU3OEJcIiwgZmlsZS5tdGltZSBBUyBcIlx1NjZGNFx1NjVCMFx1NjVGNlx1OTVGNFwiXG5GUk9NIFwiQmlubkFnZW50WFwiXG5XSEVSRSBmaWxlLm5hbWUgIT0gXCIwMC1EYXNoYm9hcmRcIiBBTkQgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCIgQU5EICFjb250YWlucyhmaWxlLnBhdGgsIFwiLzA1LVRlbXBsYXRlcy9cIilcblNPUlQgZmlsZS5tdGltZSBERVNDXG5MSU1JVCAxMlxuXFxgXFxgXFxgXG5cbj4gXHU2NzJBXHU1Qjg5XHU4OEM1IERhdGF2aWV3IFx1NjVGNlx1RkYwQ1x1NEUwQVx1OTc2Mlx1NzY4NFx1NjdFNVx1OEJFMlx1NEYxQVx1NjYzRVx1NzkzQVx1NEUzQVx1NEVFM1x1NzgwMVx1NTc1N1x1RkYxQk1PQyBcdTk0RkVcdTYzQTVcdTRFQ0RcdTUzRUZcdTZCNjNcdTVFMzhcdTRGN0ZcdTc1MjhcdTMwMDJcbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9L1x1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1Ny5tZGBdOiBgLS0tXG5iaW5uYWdlbnRfc3luYzogZmFsc2VcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gZ3VpZGVcbi0tLVxuXG4jIEJpbm5BZ2VudFggXHU1QjY2XHU0RTYwXHU1RTkzXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XG5cblx1OEZEOVx1NTk1N1x1NzZFRVx1NUY1NVx1NjI4QVx1MjAxQ1x1NUZFQlx1OTAxRlx1OEJCMFx1NUY1NVx1MjAxRFx1NTQ4Q1x1MjAxQ1x1OTU3Rlx1NjcxRlx1NjU3NFx1NzQwNlx1MjAxRFx1NTIwNlx1NUYwMFx1MzAwMlx1NjcwMFx1N0I4MFx1NTM1NVx1NzY4NFx1NzUyOFx1NkNENVx1NTNFQVx1NjcwOVx1NEUwOVx1NkI2NVx1RkYxQSoqXHU1MTQ4XHU2NTM2XHU5NkM2XHUzMDAxXHU1MThEXHU2NTc0XHU3NDA2XHUzMDAxXHU1RTM4XHU1NkRFXHU5ODdFKipcdTMwMDJcblxuIyMgXHU3NkVFXHU1RjU1XHU4QkY0XHU2NjBFXG5cbnwgXHU2NTg3XHU0RUY2XHU1OTM5IHwgXHU3NTI4XHU5MDE0IHwgXHU0RUMwXHU0RTQ4XHU2NUY2XHU1MDE5XHU2NTNFXHU4RkRCXHU1M0JCIHxcbnwgLS0tIHwgLS0tIHwgLS0tIHxcbnwgXFxgMDAtSW5ib3gvXFxgIHwgXHU2NTM2XHU5NkM2XHU3QkIxIHwgQmlubkFnZW50WCBcdTU0MENcdTZCNjVcdTY3NjVcdTc2ODRcdTY4MDdcdTZDRThcdTMwMDFcdTk2OEZcdTYyNEJcdThCQjBcdTRFMEJcdTc2ODRcdTUzRTVcdTVCNTBcdTMwMDFcdThGRDhcdTRFMERcdTc3RTVcdTkwNTNcdTU5ODJcdTRGNTVcdTUyMDZcdTdDN0JcdTc2ODRcdTc4OEVcdTcyNDcgfFxufCBcXGAwMS1Wb2NhYnVsYXJ5L1xcYCB8IFx1OEJDRFx1NkM0NyB8IFx1NURGMlx1N0VDRlx1ODg2NVx1NTE0NVx1NEU4Nlx1NTQyQlx1NEU0OVx1MzAwMVx1NjQyRFx1OTE0RFx1MzAwMVx1OEJFRFx1NTg4M1x1NjIxNlx1NEY4Qlx1NTNFNVx1NzY4NFx1NTM1NVx1OEJDRFx1NTQ4Q1x1NzdFRFx1OEJFRCB8XG58IFxcYDAyLUdyYW1tYXIvXFxgIHwgXHU4QkVEXHU2Q0Q1IHwgXHU4MEZEXHU4QkY0XHU2RTA1XHU4OUM0XHU1MjE5XHUzMDAxXHU3RUQzXHU2Nzg0XHUzMDAxXHU4QkVGXHU1MzNBXHU1NDhDXHU5QThDXHU4QkMxXHU0RjhCXHU1M0U1XHU3Njg0XHU4QkVEXHU2Q0Q1XHU3MEI5IHxcbnwgXFxgMDMtUmVhZGluZy9cXGAgfCBcdTk2MDVcdThCRkIgfCBcdTY1ODdcdTdBRTBcdTUzOUZcdTY1ODdcdTMwMDFcdTRFNjZcdTdDNERcdTY0NThcdThCQjBcdTMwMDFcdTY0NThcdTg5ODFcdTMwMDFcdThCQzFcdTYzNkVcdTU0OENcdTk2MDVcdThCRkJcdTdCNTZcdTc1NjUgfFxufCBcXGAwNC1Xcml0aW5nL1xcYCB8IFx1NTE5OVx1NEY1QyB8IFx1ODJGMVx1NjU4N1x1NTE5OVx1NEY1Q1x1N0VDM1x1NEU2MFx1MzAwMVYxL1YyIFx1NEZFRVx1NjUzOVx1OEZDN1x1N0EwQlx1NTQ4Q1x1NTNFRlx1OEZDMVx1NzlGQlx1ODg2OFx1OEZCRSB8XG58IFxcYDA1LVRlbXBsYXRlcy9cXGAgfCBcdTZBMjFcdTY3N0YgfCBPYnNpZGlhbiBUZW1wbGF0ZXMgXHU2ODM4XHU1RkMzXHU2M0QyXHU0RUY2XHU0RjdGXHU3NTI4XHU3Njg0XHU3QjE0XHU4QkIwXHU2QTIxXHU2NzdGIHxcbnwgXFxgMDYtQXR0YWNobWVudHMvXFxgIHwgXHU5NjQ0XHU0RUY2IHwgXHU1NkZFXHU3MjQ3XHUzMDAxUERGXHUzMDAxXHU5N0YzXHU5ODkxXHU3QjQ5XHU5NzVFIE1hcmtkb3duIFx1NjU4N1x1NEVGNiB8XG5cbiMjIFx1NjNBOFx1ODM1MFx1NURFNVx1NEY1Q1x1NkQ0MVxuXG4xLiAqKlx1OTY4Rlx1NjVGNlx1NjUzNlx1OTZDNioqXHVGRjFBXHU1MTQ4XHU2MjhBXHU1MTg1XHU1QkI5XHU2NTNFXHU4RkRCIFxcYDAwLUluYm94L1xcYFx1RkYwQ1x1NEUwRFx1ODk4MVx1NTZFMFx1NEUzQVx1NTIwNlx1N0M3Qlx1ODAwQ1x1NjI1M1x1NjVBRFx1NUI2Nlx1NEU2MFx1MzAwMlxuMi4gKipcdTZCQ0ZcdTU0NjhcdTY1NzRcdTc0MDYqKlx1RkYxQVx1NEUzQVx1NjcwOVx1NEVGN1x1NTAzQ1x1NzY4NFx1Nzg4RVx1NzI0N1x1ODg2NVx1NEUwQVx1ODFFQVx1NURGMVx1NzY4NFx1ODlFM1x1OTFDQVx1NTQ4Q1x1NEY4Qlx1NTNFNVx1RkYwQ1x1NTE4RFx1NzlGQlx1NTJBOFx1NTIzMFx1OEJDRFx1NkM0N1x1MzAwMVx1OEJFRFx1NkNENVx1MzAwMVx1OTYwNVx1OEJGQlx1NjIxNlx1NTE5OVx1NEY1Q1x1NzZFRVx1NUY1NVx1MzAwMlxuMy4gKipcdTVFRkFcdTdBQ0JcdThGREVcdTYzQTUqKlx1RkYxQVx1NzUyOCBcXGBbW1x1N0IxNFx1OEJCMFx1NTQwRF1dXFxgIFx1NjI4QVx1NzZGOFx1NTE3M1x1OEJDRFx1NkM0N1x1MzAwMVx1OEJFRFx1NkNENVx1NTQ4Q1x1OTYwNVx1OEJGQlx1N0IxNFx1OEJCMFx1NEU5Mlx1NzZGOFx1OTRGRVx1NjNBNVx1MzAwMlxuNC4gKipcdTU2REVcdTUyMzBcdTU3MzBcdTU2RkUqKlx1RkYxQVx1NEVDRSBbWzAwLURhc2hib2FyZHxcdTYwM0IgRGFzaGJvYXJkXV1cdTMwMDFbWzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRdXSBcdTYyMTYgW1swMi1HcmFtbWFyLzAwLURhc2hib2FyZHxcdThCRURcdTZDRDUgRGFzaGJvYXJkXV0gXHU2RDRGXHU4OUM4XHU1NDhDXHU1OTBEXHU0RTYwXHUzMDAyXG5cbiMjIFx1NkEyMVx1Njc3Rlx1NjAwRVx1NEU0OFx1NzUyOFxuXG5cdTYzRDJcdTRFRjZcdTRGMUFcdTYyOEEgT2JzaWRpYW4gXHU3Njg0XHU2QTIxXHU2NzdGXHU2NTg3XHU0RUY2XHU1OTM5XHU4QkJFXHU0RTNBIFxcYEJpbm5BZ2VudFgvMDUtVGVtcGxhdGVzXFxgXHUzMDAyXHU1NDJGXHU3NTI4IE9ic2lkaWFuIFx1NzY4NCAqKlRlbXBsYXRlc1x1RkYwOFx1NkEyMVx1Njc3Rlx1RkYwOVx1NjgzOFx1NUZDM1x1NjNEMlx1NEVGNioqIFx1NTQwRVx1RkYwQ1x1NjVCMFx1NUVGQVx1N0IxNFx1OEJCMFx1NUU3Nlx1NjI2N1x1ODg0Q1x1MjAxQ1x1NjNEMlx1NTE2NVx1NkEyMVx1Njc3Rlx1MjAxRFx1RkYwQ1x1NTE4RFx1OTAwOVx1NjJFOVx1OEJDRFx1NkM0N1x1MzAwMVx1OEJFRFx1NkNENVx1MzAwMVx1OTYwNVx1OEJGQlx1N0I1Nlx1NzU2NVx1NjIxNlx1NTE5OVx1NEY1Q1x1ODg2OFx1OEZCRVx1NkEyMVx1Njc3Rlx1MzAwMlxuXG4jIyBcdTk1RjRcdTk2OTRcdTkxQ0RcdTU5MERcdTYwMEVcdTRFNDhcdTc1MjhcblxuQmlubkFnZW50WCBMZWFybmluZyBTeW5jIFx1NEY3Rlx1NzUyOFx1NzkzRVx1NTMzQVx1NjNEMlx1NEVGNiAqKlNwYWNlZCBSZXBldGl0aW9uKiogXHU2M0QwXHU0RjlCXHU5NUVBXHU1MzYxXHU1OTBEXHU0RTYwXHUzMDAyXHU3QjJDXHU0RTAwXHU2QjIxXHU0RjdGXHU3NTI4XHU4QkY3XHU2MzA5IFtbU3BhY2VkIFJlcGV0aXRpb24gXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XV0gXHU1QjhDXHU2MjEwXHU1Qjg5XHU4OEM1XHVGRjBDXHU1MThEXHU2MjUzXHU1RjAwIFtbMDEtVm9jYWJ1bGFyeS9TcGFjZWQgUmVwZXRpdGlvbiBcdTk1RUFcdTUzNjFcdTc5M0FcdTRGOEJdXSBcdTUwNUFcdTRFMDBcdTZCMjFcdTdFQzNcdTRFNjBcdTMwMDJcblxuIyMgRGFzaGJvYXJkIFx1NTQ4QyBEYXRhdmlld1xuXG5EYXNoYm9hcmQgXHU2NzJDXHU4RUFCXHU2NjJGXHU1MTg1XHU1QkI5XHU1NzMwXHU1NkZFXHVGRjA4TU9DXHVGRjA5XHVGRjBDXHU5MUNDXHU5NzYyXHU3Njg0XHU2NjZFXHU5MDFBXHU5NEZFXHU2M0E1XHU0RTBEXHU0RjlEXHU4RDU2XHU0RUZCXHU0RjU1XHU2M0QyXHU0RUY2XHUzMDAyXHU1Qjg5XHU4OEM1XHU1RTc2XHU1NDJGXHU3NTI4XHU3OTNFXHU1MzNBXHU2M0QyXHU0RUY2ICoqRGF0YXZpZXcqKiBcdTU0MEVcdUZGMENcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTU0OENcdTY3MDBcdThGRDFcdTY2RjRcdTY1QjBcdTUyMTdcdTg4NjhcdTRGMUFcdTgxRUFcdTUyQThcdTc1MUZcdTYyMTBcdUZGMUJcdTY3MkFcdTVCODlcdTg4QzVcdTY1RjZcdTUzRUFcdTRGMUFcdTc3MEJcdTUyMzBcdTY3RTVcdThCRTJcdTRFRTNcdTc4MDFcdTU3NTdcdUZGMENcdTRFMERcdTVGNzFcdTU0Q0RcdTUxNzZcdTRFRDZcdTdCMTRcdThCQjBcdTMwMDJcblxuIyMgXHU5NjQ0XHU0RUY2XG5cblx1NjNEMlx1NEVGNlx1NEYxQVx1NjI4QSBPYnNpZGlhbiBcdTc2ODRcdTlFRDhcdThCQTRcdTk2NDRcdTRFRjZcdTRGNERcdTdGNkVcdThCQkVcdTRFM0EgXFxgQmlubkFnZW50WC8wNi1BdHRhY2htZW50c1xcYFx1MzAwMlx1NEU0Qlx1NTQwRVx1N0M5OFx1OEQzNFx1NTZGRVx1NzI0N1x1NjIxNlx1NTJBMFx1NTE2NSBQREYgXHU2NUY2XHVGRjBDXHU5NjQ0XHU0RUY2XHU0RjFBXHU5NkM2XHU0RTJEXHU1QjU4XHU2NTNFXHVGRjBDXHU2QjYzXHU2NTg3XHU0RUNEXHU1M0VGXHU3NTI4IE9ic2lkaWFuIFx1OTRGRVx1NjNBNVx1NUYxNVx1NzUyOFx1MzAwMlxuXG4jIyBcdTRFMERcdTRGMUFcdTUzRDFcdTc1MUZcdTRFQzBcdTRFNDhcblxuLSBcdTUyMURcdTU5Q0JcdTUzMTZcdTUzRUZcdTRFRTVcdTkxQ0RcdTU5MERcdTYyNjdcdTg4NENcdUZGMENcdTRGNDZcdTRFMERcdTRGMUFcdTg5ODZcdTc2RDZcdTU0MENcdTU0MERcdTY1ODdcdTRFRjZcdTYyMTZcdTRGNjBcdTVERjJcdTdFQ0ZcdTRGRUVcdTY1MzlcdTc2ODRcdTZBMjFcdTY3N0ZcdTMwMDJcbi0gXHU2M0QyXHU0RUY2XHU0RTBEXHU0RjFBXHU4MUVBXHU1MkE4XHU2NkZGXHU0RjYwXHU3OUZCXHU1MkE4XHUzMDAxXHU1MjIwXHU5NjY0XHU2MjE2XHUyMDFDXHU2NTc0XHU3NDA2XHU1QjhDXHU2MjEwXHUyMDFEXHU2NTM2XHU5NkM2XHU3QkIxXHU5MUNDXHU3Njg0XHU1MTg1XHU1QkI5XHUzMDAyXG4tIFx1NjMwN1x1NTM1N1x1MzAwMURhc2hib2FyZCBcdTU0OENcdTUyMURcdTU5Q0JcdTUzMTZcdTc5M0FcdTRGOEJcdTVFMjZcdTY3MDkgXFxgYmlubmFnZW50X3N5bmM6IGZhbHNlXFxgXHVGRjBDXHU0RTBEXHU0RjFBXHU0RjVDXHU0RTNBXHU0RjYwXHU3Njg0XHU0RTJBXHU0RUJBXHU1QjY2XHU0RTYwXHU0RTBBXHU0RTBCXHU2NTg3XHU0RTBBXHU0RjIwXHUzMDAyXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS9TcGFjZWQgUmVwZXRpdGlvbiBcdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTcubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIGd1aWRlXG4gIC0gc3BhY2VkLXJlcGV0aXRpb25cbi0tLVxuXG4jIFNwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N1xuXG5CaW5uQWdlbnRYIExlYXJuaW5nIFN5bmMgXHU4RDFGXHU4RDIzXHU2MjhBXHU1QjY2XHU0RTYwXHU2NzUwXHU2NTk5XHU2NTc0XHU3NDA2XHU1MjMwXHU4RkQ5XHU0RTJBIFZhdWx0XHVGRjFCXHU3OTNFXHU1MzNBXHU2M0QyXHU0RUY2ICoqU3BhY2VkIFJlcGV0aXRpb24qKiBcdThEMUZcdThEMjNcdTUyMjRcdTY1QURcdTU0RUFcdTRFOUJcdTk1RUFcdTUzNjFcdTRFQ0FcdTU5MjlcdTk3MDBcdTg5ODFcdTU5MERcdTRFNjBcdTMwMDJCaW5uQWdlbnRYIFx1NEUwRFx1NEYxQVx1NjZGRlx1NEY2MFx1NUI4OVx1ODhDNVx1NzkzRVx1NTMzQVx1NjNEMlx1NEVGNlx1RkYwQ1x1NEUwQlx1OTc2Mlx1NzY4NFx1OEJCRVx1N0Y2RVx1NTNFQVx1OTcwMFx1NUI4Q1x1NjIxMFx1NEUwMFx1NkIyMVx1MzAwMlxuXG4jIyAxLiBcdTVCODlcdTg4QzVcdTVFNzZcdTU0MkZcdTc1MjhcdTYzRDJcdTRFRjZcblxuMS4gXHU2MjUzXHU1RjAwIE9ic2lkaWFuIFx1NzY4NCAqKlx1OEJCRVx1N0Y2RSBcdTIxOTIgXHU3QjJDXHU0RTA5XHU2NUI5XHU2M0QyXHU0RUY2XHVGRjA4Q29tbXVuaXR5IHBsdWdpbnNcdUZGMDkqKlx1MzAwMlxuMi4gXHU1OTgyXHU2NzlDXHU0RUNEXHU1OTA0XHU0RThFXHU1M0Q3XHU5NjUwXHU2QTIxXHU1RjBGXHVGRjBDXHU2MzA5IE9ic2lkaWFuIFx1NjNEMFx1NzkzQVx1NTE3M1x1OTVFRFx1NTNEN1x1OTY1MFx1NkEyMVx1NUYwRlx1MzAwMlxuMy4gXHU3MEI5XHU1MUZCXHUyMDFDXHU2RDRGXHU4OUM4XHUyMDFEXHVGRjBDXHU2NDFDXHU3RDIyICoqU3BhY2VkIFJlcGV0aXRpb24qKlx1RkYwQ1x1NUI4OVx1ODhDNVx1NUU3Nlx1NTQyRlx1NzUyOFx1NUI4M1x1MzAwMlxuNC4gXHU1MjFEXHU2QjIxXHU0RjdGXHU3NTI4XHU0RTBEXHU5NzAwXHU4OTgxXHU0RkVFXHU2NTM5XHU3Qjk3XHU2Q0Q1XHU2MjE2XHU1MjA2XHU5Njk0XHU3QjI2XHU4QkJFXHU3RjZFXHVGRjBDXHU0RkREXHU3NTU5XHU5RUQ4XHU4QkE0XHU1MDNDXHU1MzczXHU1M0VGXHUzMDAyXG5cbiMjIDIuIFx1NzUyOFx1NjgzN1x1NEY4Qlx1NUI4Q1x1NjIxMFx1N0IyQ1x1NEUwMFx1NkIyMVx1NTkwRFx1NEU2MFxuXG4xLiBcdTYyNTNcdTVGMDAgW1swMS1Wb2NhYnVsYXJ5L1NwYWNlZCBSZXBldGl0aW9uIFx1OTVFQVx1NTM2MVx1NzkzQVx1NEY4Ql1dXHUzMDAyXG4yLiBcdTYyNTNcdTVGMDBcdTU0N0RcdTRFRTRcdTk3NjJcdTY3N0ZcdUZGMUFtYWNPUyBcdTYzMDkgXFxgXHUyMzE4IFBcXGBcdUZGMENXaW5kb3dzIC8gTGludXggXHU2MzA5IFxcYEN0cmwgUFxcYFx1MzAwMlxuMy4gXHU2NDFDXHU3RDIyXHU1RTc2XHU2MjY3XHU4ODRDIFxcYFJldmlldyBmbGFzaGNhcmRzIGluIHRoaXMgbm90ZVxcYFx1MzAwMlxuNC4gXHU1MTQ4XHU1NzI4XHU1RkMzXHU5MUNDXHU1NkRFXHU3QjU0XHVGRjBDXHU1MThEXHU2NjNFXHU3OTNBXHU3QjU0XHU2ODQ4XHVGRjBDXHU1RTc2XHU2MzA5XHU3NzFGXHU1QjlFXHU1NkRFXHU1RkM2XHU2MEM1XHU1MUI1XHU5MDA5XHU2MkU5XHU4QkM0XHU1MjA2XHUzMDAyXHU2M0QyXHU0RUY2XHU0RjFBXHU2MzZFXHU2QjY0XHU1Qjg5XHU2MzkyXHU0RTBCXHU2QjIxXHU1OTBEXHU0RTYwXHUzMDAyXG5cblx1NTk4Mlx1Njc5Q1x1NTNFQVx1NjBGM1x1N0FDQlx1NTIzQlx1OTFDRFx1NTA1QVx1NTE2OFx1OTBFOFx1NjgzN1x1NEY4Qlx1MzAwMVx1NEUwRFx1ODAwM1x1ODY1MVx1NTkwRFx1NEU2MFx1NjVFNVx1NjcxRlx1RkYwQ1x1OEJGN1x1NjI2N1x1ODg0QyBcXGBDcmFtIGZsYXNoY2FyZHMgaW4gdGhpcyBub3RlXFxgXHUzMDAyXG5cbiMjIDMuIFx1NTIxQlx1NUVGQVx1ODFFQVx1NURGMVx1NzY4NFx1OTVFQVx1NTM2MVxuXG5cdTUxNDhcdTU3MjhcdTUzMDVcdTU0MkJcdTUzNjFcdTcyNDdcdTc2ODRcdTdCMTRcdThCQjBcdTRFMkRcdTUyQTBcdTUxNjVcdTUzNjFcdTdFQzRcdTY4MDdcdTdCN0VcdTMwMDJcdTlFRDhcdThCQTRcdTUzNjFcdTdFQzRcdTY4MDdcdTdCN0VcdTY2MkZcdUZGMUFcblxuXFxgXFxgXFxgbWFya2Rvd25cbiNmbGFzaGNhcmRzXG5cXGBcXGBcXGBcblxuXHU0RTVGXHU1M0VGXHU0RUU1XHU3NTI4XHU1QzQyXHU3RUE3XHU2ODA3XHU3QjdFXHU1MjA2XHU3RUM0XHVGRjBDXHU0RjhCXHU1OTgyXHVGRjFBXG5cblxcYFxcYFxcYG1hcmtkb3duXG4jZmxhc2hjYXJkcy9iaW5uYWdlbnR4L3ZvY2FidWxhcnlcblxcYFxcYFxcYFxuXG5cdTcxMzZcdTU0MEVcdTkwMDlcdTYyRTlcdTRFMDBcdTc5Q0RcdTUzNjFcdTcyNDdcdTY4M0NcdTVGMEZcdUZGMUFcblxuXFxgXFxgXFxgbWFya2Rvd25cbnJlc2lsaWVudCBcdTY2MkZcdTRFQzBcdTRFNDhcdTYxMEZcdTYwMURcdUZGMUY6Olx1NjcwOVx1OTdFN1x1NjAyN1x1NzY4NFx1RkYxQlx1ODBGRFx1NEVDRVx1NTZGMFx1OTZCRVx1NEUyRFx1OEZDNVx1OTAxRlx1NjA2Mlx1NTkwRFx1NzY4NFx1MzAwMlxuXG5cdTY3MDlcdTk3RTdcdTYwMjdcdTc2ODRcdUZGMUJcdTgwRkRcdThGQzVcdTkwMUZcdTYwNjJcdTU5MERcdTc2ODQ6OjpyZXNpbGllbnRcblxuYWx0aG91Z2ggXHU1NDhDIGRlc3BpdGUgXHU1NDBFXHU5NzYyXHU1MjA2XHU1MjJCXHU2M0E1XHU0RUMwXHU0RTQ4XHVGRjFGXG4/XG5hbHRob3VnaCBcdTU0MEVcdTYzQTVcdTVCOENcdTY1NzRcdTRFQ0VcdTUzRTVcdUZGMUJkZXNwaXRlIFx1NTQwRVx1NjNBNVx1NTQwRFx1OEJDRFx1MzAwMVx1NEVFM1x1OEJDRFx1NjIxNlx1NTJBOFx1NTQwRFx1OEJDRFx1MzAwMlxuXFxgXFxgXFxgXG5cbi0gXFxgOjpcXGAgXHU1MjFCXHU1RUZBXHU1MzU1XHU1NDExXHU1MzYxXHVGRjFBXHU1REU2XHU4RkI5XHU2NjJGXHU5NUVFXHU5ODk4XHVGRjBDXHU1M0YzXHU4RkI5XHU2NjJGXHU3QjU0XHU2ODQ4XHUzMDAyXG4tIFxcYDo6OlxcYCBcdTUyMUJcdTVFRkFcdTUzQ0NcdTU0MTFcdTUzNjFcdUZGMUFcdTRFMjRcdTRFMkFcdTY1QjlcdTU0MTFcdTkwRkRcdTRGMUFcdTg4QUJcdTYzRDBcdTk1RUVcdTMwMDJcbi0gXHU1MzU1XHU3MkVDXHU0RTAwXHU4ODRDXHU3Njg0IFxcYD9cXGAgXHU5MDAyXHU1NDA4XHU4RjgzXHU5NTdGXHU3Njg0XHU1OTFBXHU4ODRDXHU3QjU0XHU2ODQ4XHUzMDAyXG5cbiMjIDQuIFx1NkJDRlx1NTkyOVx1NjAwRVx1NEU0OFx1NTkwRFx1NEU2MFxuXG5cdTYyNTNcdTVGMDBcdTU0N0RcdTRFRTRcdTk3NjJcdTY3N0ZcdTVFNzZcdTYyNjdcdTg4NEMgXFxgUmV2aWV3IEZsYXNoY2FyZHMgZnJvbSBhbGwgbm90ZXNcXGBcdUZGMENcdTkwMDlcdTYyRTlcdTUzNjFcdTdFQzRcdTU0MEVcdTVGMDBcdTU5Q0JcdTU5MERcdTRFNjBcdTMwMDJcdTVFRkFcdThCQUVcdTUxNDhcdTU2REVcdTVGQzZcdTUxOERcdTc3MEJcdTdCNTRcdTY4NDhcdUZGMUJcdThCQzRcdTUyMDZcdTUzQ0RcdTY2MjBcdTIwMUNcdThGRDlcdTZCMjFcdTYwRjNcdThENzdcdTY3NjVcdTY3MDlcdTU5MUFcdTk2QkVcdTIwMURcdUZGMENcdTRFMERcdTVGQzVcdThGRkRcdTZDNDJcdTUxNjhcdTkwRThcdTkwMDkgRWFzeVx1MzAwMlxuXG5cdTU5MERcdTRFNjBcdTU0MEVcdUZGMENTcGFjZWQgUmVwZXRpdGlvbiBcdTRGMUFcdTU3MjhcdTUzNjFcdTcyNDdcdTk2NDRcdThGRDFcdTUxOTlcdTUxNjVcdTdDN0JcdTRGM0MgXFxgPCEtLVNSOi4uLi0tPlxcYCBcdTc2ODRcdThDMDNcdTVFQTZcdTZDRThcdTkxQ0FcdTMwMDJcdThGRDlcdTY2MkZcdTU5MERcdTRFNjBcdThCQjBcdTVGNTVcdUZGMENcdTRFMERcdTY2MkZcdTk1MTlcdThCRUZcdUZGMUJcdTRFMERcdTg5ODFcdTYyNEJcdTUyQThcdTRGRUVcdTY1MzlcdTYyMTZcdTUyMjBcdTk2NjRcdTMwMDJcblxuIyMgXHU1RTM4XHU4OUMxXHU5NUVFXHU5ODk4XG5cbi0gKipcdTYyN0VcdTRFMERcdTUyMzBcdTUzNjFcdTdFQzQqKlx1RkYxQVx1Nzg2RVx1OEJBNCBTcGFjZWQgUmVwZXRpdGlvbiBcdTVERjJcdTU0MkZcdTc1MjhcdUZGMENcdTVFNzZcdTRFMTRcdTdCMTRcdThCQjBcdTZCNjNcdTY1ODdcdTU0MkJcdTY3MDkgXFxgI2ZsYXNoY2FyZHNcXGAgXHU2MjE2XHU1MTc2XHU1QzQyXHU3RUE3XHU2ODA3XHU3QjdFXHUzMDAyXG4tICoqXHU1MzYxXHU3MjQ3XHU2Q0ExXHU2NzA5XHU4OEFCXHU4QkM2XHU1MjJCKipcdUZGMUFcdTUxNDhcdTRGN0ZcdTc1MjhcdTlFRDhcdThCQTRcdTUyMDZcdTk2OTRcdTdCMjZcdUZGMENcdTVFNzZcdTc4NkVcdThCQTQgXFxgOjpcXGBcdTMwMDFcXGA6OjpcXGAgXHU2MjE2IFxcYD9cXGAgXHU0RTBEXHU1NzI4XHU0RUUzXHU3ODAxXHU1NzU3XHU0RTJEXHUzMDAyXG4tICoqXHU0RUNBXHU1OTI5XHU2Q0ExXHU2NzA5XHU1MjMwXHU2NzFGXHU1MzYxXHU3MjQ3KipcdUZGMUFcdTYyNjdcdTg4NEMgXFxgQ3JhbSBmbGFzaGNhcmRzIGluIHRoaXMgbm90ZVxcYCBcdTUzRUZcdTk2OEZcdTY1RjZcdTdFQzNcdTRFNjBcdUZGMENcdTRFMERcdTRGMUFcdTUzRDdcdTUyMzBcdTY3MUZcdTY1RTVcdTk2NTBcdTUyMzZcdTMwMDJcbi0gKipcdTYwRjNcdTU5MERcdTRFNjBcdTY1NzRcdTdCQzdcdTdCMTRcdThCQjAqKlx1RkYxQVx1OEZEOVx1NjYyRlx1NTNFNlx1NEUwMFx1NzlDRFx1NURFNVx1NEY1Q1x1NkQ0MVx1RkYwQ1x1NTNFRlx1N0VEOVx1N0IxNFx1OEJCMFx1NTJBMCBcXGAjcmV2aWV3XFxgXHVGRjFCXHU1MTY1XHU5NUU4XHU5NjM2XHU2QkI1XHU1M0VBXHU0RjdGXHU3NTI4XHU5NUVBXHU1MzYxXHU1MzczXHU1M0VGXHUzMDAyXG5gLFxuICBbYCR7SU5CT1hfRk9MREVSfS9cdTY1MzZcdTk2QzZcdTdCQjFcdTRGN0ZcdTc1MjhcdThCRjRcdTY2MEUubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG5pbmJveF9zdGF0dXM6IHJlZmVyZW5jZVxudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSBpbmJveFxuLS0tXG5cbiMgXHU2NTM2XHU5NkM2XHU3QkIxXHU0RjdGXHU3NTI4XHU4QkY0XHU2NjBFXG5cblx1NjgwN1x1NkNFOFx1MzAwMVx1NzA3NVx1NjExRlx1MzAwMVx1NEUwRFx1NEYxQVx1NUY1Mlx1N0M3Qlx1NzY4NFx1ODg2OFx1OEZCRVx1NTE0OFx1NjUzRVx1NTcyOFx1OEZEOVx1OTFDQ1x1RkYwQ1x1NEUwRFx1OTcwMFx1ODk4MVx1NEUwMFx1NUYwMFx1NTlDQlx1NUMzMVx1NTE5OVx1NUY5N1x1NUI4Q1x1NjU3NFx1MzAwMlxuXG4jIyBcdTZCQ0ZcdTU0NjhcdTY1NzRcdTc0MDZcblxuMS4gXHU4MEZEXHU1OTBEXHU3NTI4XHU3Njg0XHU1MzU1XHU4QkNEXHU2MjE2XHU3N0VEXHU4QkVEXHVGRjBDXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3XV1cdTMwMDJcbjIuIFx1NTNFNVx1NUI1MFx1ODBDQ1x1NTQwRVx1NzY4NFx1ODlDNFx1NTIxOVx1RkYwQ1x1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkfFx1OEJFRFx1NkNENV1dXHUzMDAyXG4zLiBcdTUzOUZcdTY1ODdcdTRFMEVcdTk2MDVcdThCRkJcdThCQjBcdTVGNTVcdUZGMENcdTY1NzRcdTc0MDZcdTUyMzAgW1suLi8wMy1SZWFkaW5nL1x1OTYwNVx1OEJGQlx1N0IxNFx1OEJCMFx1NzkzQVx1NEY4QnxcdTk2MDVcdThCRkJdXVx1MzAwMlxuNC4gXHU4MUVBXHU1REYxXHU1MTk5XHU3Njg0XHU2QkI1XHU4NDNEXHVGRjBDXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDQtV3JpdGluZy9cdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTc5M0FcdTRGOEJ8XHU1MTk5XHU0RjVDXV1cdTMwMDJcbjUuIFx1NURGMlx1NTkwNFx1NzQwNlx1NzY4NFx1Nzg4RVx1NzI0N1x1NTNFRlx1NUY1Mlx1Njg2M1x1MzAwMVx1NzlGQlx1NTJBOFx1NjIxNlx1NTIyMFx1OTY2NFx1RkYxQlx1NjNEMlx1NEVGNlx1NEUwRFx1NEYxQVx1NjZGRlx1NEY2MFx1ODk4Nlx1NzZENlx1OEZEOVx1NEU5Qlx1NTE4NVx1NUJCOVx1MzAwMlxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmQubWRgXTogYCMgXHU4QkNEXHU2QzQ3IERhc2hib2FyZFxuXG5cdThGRDlcdTY2MkZcdThCQ0RcdTZDNDdcdTVFOTNcdTc2ODRcdTUxODVcdTVCQjlcdTU3MzBcdTU2RkVcdTMwMDJcdTY1QjBcdTVFRkFcdTdCMTRcdThCQjBcdTY1RjZcdTRGN0ZcdTc1MjggW1suLi8wNS1UZW1wbGF0ZXMvXHU4QkNEXHU2QzQ3fFx1OEJDRFx1NkM0N1x1NkEyMVx1Njc3Rl1dXHUzMDAyXG5cbiMjIFx1NTE2OFx1OTBFOFx1OEJDRFx1NkM0N1x1RkYwOERhdGF2aWV3XHVGRjA5XG5cblxcYFxcYFxcYGRhdGF2aWV3XG5UQUJMRSBXSVRIT1VUIElEIGZpbGUubGluayBBUyBcIlx1OEJDRFx1NkM0N1wiLCBtZWFuaW5nIEFTIFwiXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XCIsIHN0YXR1cyBBUyBcIlx1NzJCNlx1NjAwMVwiLCBmaWxlLm10aW1lIEFTIFwiXHU2NkY0XHU2NUIwXCJcbkZST00gXCJCaW5uQWdlbnRYLzAxLVZvY2FidWxhcnlcIlxuV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiXG5TT1JUIGZpbGUubXRpbWUgREVTQ1xuXFxgXFxgXFxgXG5cbiMjIFx1NUVGQVx1OEJBRVx1NzY4NCBNT0NcblxuLSBcdTYzMDlcdTRFM0JcdTk4OThcdUZGMUFcdTVCNjZcdTRFNjBcdTMwMDFcdTVERTVcdTRGNUNcdTMwMDFcdTY1QzVcdTg4NENcdTMwMDFcdTYwQzVcdTdFRUFcbi0gXHU2MzA5XHU1MTczXHU3Q0ZCXHVGRjFBXHU1NDBDXHU0RTQ5XHU4QkNEXHUzMDAxXHU1M0NEXHU0RTQ5XHU4QkNEXHUzMDAxXHU2NjEzXHU2REY3XHU4QkNEXHUzMDAxXHU1NkZBXHU1QjlBXHU2NDJEXHU5MTREXG4tIFx1NzkzQVx1NEY4Qlx1RkYxQVtbcmVzaWxpZW50XV1cbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvcmVzaWxpZW50Lm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxubWVhbmluZzogXCJcdTY3MDlcdTk3RTdcdTYwMjdcdTc2ODRcdUZGMUJcdTgwRkRcdThGQzVcdTkwMUZcdTYwNjJcdTU5MERcdTc2ODRcIlxuc3RhdHVzOiBsZWFybmluZ1xudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSB2b2NhYnVsYXJ5XG4gIC0gY2hhcmFjdGVyXG4tLS1cblxuIyByZXNpbGllbnRcblxuIyMgXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XG5cbkFibGUgdG8gcmVjb3ZlciBxdWlja2x5IGFmdGVyIGRpZmZpY3VsdHkgb3IgY2hhbmdlLlxuXG4jIyBcdTUzRDFcdTk3RjNcblxuL3JcdTAyNkFcdTAyQzh6XHUwMjZBbGlcdTAyNTludC9cblxuIyMgXHU1RTM4XHU3NTI4XHU2NDJEXHU5MTREXG5cbi0gcmVzaWxpZW50IHBlb3BsZVxuLSBhIHJlc2lsaWVudCBlY29ub215XG4tIHJlbWFpbiByZXNpbGllbnRcblxuIyMgXHU1MzlGXHU1M0U1XHU0RTBFXHU4QkVEXHU1ODgzXG5cblRoZSB0ZWFtIHJlbWFpbmVkIHJlc2lsaWVudCBhZnRlciBhbiBlYXJseSBzZXRiYWNrLlxuXG4jIyBcdTYyMTFcdTc2ODRcdTRGOEJcdTUzRTVcblxuSSB3YW50IHRvIGJlY29tZSBtb3JlIHJlc2lsaWVudCB3aGVuIGEgcGxhbiBjaGFuZ2VzIHVuZXhwZWN0ZWRseS5cblxuIyMgXHU2NjEzXHU2REY3XHU2REM2XHU3MEI5XG5cbioqcmVzaWxpZW50KiogXHU1RjNBXHU4QzAzXHU1M0Q3XHU2MzJCXHU1NDBFXHU3Njg0XHU2MDYyXHU1OTBEXHU4MEZEXHU1MjlCXHVGRjFCKipwZXJzaXN0ZW50KiogXHU1RjNBXHU4QzAzXHU2MzAxXHU3RUVEXHU1NzVBXHU2MzAxXHUzMDAyXG5cbiMjIFx1NTE3M1x1ODA1NFxuXG4tIFtbMDAtRGFzaGJvYXJkXV1cbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvU3BhY2VkIFJlcGV0aXRpb24gXHU5NUVBXHU1MzYxXHU3OTNBXHU0RjhCLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxuc3RhdHVzOiBleGFtcGxlXG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIHZvY2FidWxhcnlcbiAgLSBzcGFjZWQtcmVwZXRpdGlvblxuLS0tXG5cbiMgU3BhY2VkIFJlcGV0aXRpb24gXHU5NUVBXHU1MzYxXHU3OTNBXHU0RjhCXG5cblx1OEZEOVx1NjYyRlx1NEUwMFx1N0VDNFx1NTNFRlx1NEVFNVx1N0FDQlx1NTM3M1x1NTkwRFx1NEU2MFx1NzY4NFx1NTE2NVx1OTVFOFx1NTM2MVx1NzI0N1x1MzAwMlx1OEJGN1x1NEZERFx1NzU1OVx1NEUwQlx1NEUwMFx1ODg0Q1x1NTM2MVx1N0VDNFx1NjgwN1x1N0I3RVx1RkYwQ1x1NzEzNlx1NTQwRVx1NjI1M1x1NUYwMFx1NTQ3RFx1NEVFNFx1OTc2Mlx1Njc3Rlx1RkYwQ1x1NjI2N1x1ODg0QyBcXGBSZXZpZXcgZmxhc2hjYXJkcyBpbiB0aGlzIG5vdGVcXGBcdTMwMDJcblxuI2ZsYXNoY2FyZHMvYmlubmFnZW50eC92b2NhYnVsYXJ5XG5cbiMjIFx1NTM1NVx1NTQxMVx1NTM2MVxuXG5yZXNpbGllbnQgXHU3Njg0XHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XHU2NjJGXHU0RUMwXHU0RTQ4XHVGRjFGOjpcdTY3MDlcdTk3RTdcdTYwMjdcdTc2ODRcdUZGMUJcdTgwRkRcdTU3MjhcdTU2RjBcdTk2QkVcdTYyMTZcdTUzRDhcdTUzMTZcdTU0MEVcdThGQzVcdTkwMUZcdTYwNjJcdTU5MERcdTc2ODRcdTMwMDJcblxuIyMgXHU1M0NDXHU1NDExXHU1MzYxXG5cblx1NjcwOVx1OTdFN1x1NjAyN1x1NzY4NFx1RkYxQlx1ODBGRFx1OEZDNVx1OTAxRlx1NjA2Mlx1NTkwRFx1NzY4NDo6OnJlc2lsaWVudFxuXG4jIyBcdTU5MUFcdTg4NENcdTUzNjFcblxucmVzaWxpZW50IFx1NTQ4QyBwZXJzaXN0ZW50IFx1NzY4NFx1NEZBN1x1OTFDRFx1NzBCOVx1NjcwOVx1NEVDMFx1NEU0OFx1NEUwRFx1NTQwQ1x1RkYxRlxuP1xuKipyZXNpbGllbnQqKiBcdTVGM0FcdThDMDNcdTUzRDdcdTYzMkJcdTU0MEVcdTc2ODRcdTYwNjJcdTU5MERcdTgwRkRcdTUyOUJcdUZGMUIqKnBlcnNpc3RlbnQqKiBcdTVGM0FcdThDMDNcdTRFMERcdTY1M0VcdTVGMDNcdTMwMDFcdTYzMDFcdTdFRURcdTU3NUFcdTYzMDFcdTMwMDJcblxuLS0tXG5cblx1NTkwRFx1NEU2MFx1NUI4Q1x1NjIxMFx1NTQwRVx1RkYwQ1NwYWNlZCBSZXBldGl0aW9uIFx1NEYxQVx1ODFFQVx1NTJBOFx1NTcyOFx1NTM2MVx1NzI0N1x1OTY0NFx1OEZEMVx1NTJBMFx1NTE2NVx1OEMwM1x1NUVBNlx1NkNFOFx1OTFDQVx1MzAwMlx1NjNBNVx1NEUwQlx1Njc2NVx1NTNFRlx1NEVFNVx1NTNDMlx1ODAwMyBbWy4uL1NwYWNlZCBSZXBldGl0aW9uIFx1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N3xcdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTddXVx1RkYwQ1x1NjI4QVx1ODFFQVx1NURGMVx1NzY4NFx1NUI2Nlx1NEU2MFx1NTE4NVx1NUJCOVx1NjUzOVx1NTE5OVx1NjIxMFx1NTM2MVx1NzI0N1x1MzAwMlxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDItR3JhbW1hci8wMC1EYXNoYm9hcmQubWRgXTogYCMgXHU4QkVEXHU2Q0Q1IERhc2hib2FyZFxuXG5cdThGRDlcdTY2MkZcdThCRURcdTZDRDVcdTVFOTNcdTc2ODRcdTUxODVcdTVCQjlcdTU3MzBcdTU2RkVcdTMwMDJcdTY1QjBcdTVFRkFcdTdCMTRcdThCQjBcdTY1RjZcdTRGN0ZcdTc1MjggW1suLi8wNS1UZW1wbGF0ZXMvXHU4QkVEXHU2Q0Q1fFx1OEJFRFx1NkNENVx1NkEyMVx1Njc3Rl1dXHUzMDAyXG5cbiMjIFx1NTE2OFx1OTBFOFx1OEJFRFx1NkNENVx1NzBCOVx1RkYwOERhdGF2aWV3XHVGRjA5XG5cblxcYFxcYFxcYGRhdGF2aWV3XG5UQUJMRSBXSVRIT1VUIElEIGZpbGUubGluayBBUyBcIlx1OEJFRFx1NkNENVx1NzBCOVwiLCBzdGF0dXMgQVMgXCJcdTcyQjZcdTYwMDFcIiwgZmlsZS5tdGltZSBBUyBcIlx1NjZGNFx1NjVCMFwiXG5GUk9NIFwiQmlubkFnZW50WC8wMi1HcmFtbWFyXCJcbldIRVJFIGZpbGUubmFtZSAhPSBcIjAwLURhc2hib2FyZFwiIEFORCBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIlxuU09SVCBmaWxlLm10aW1lIERFU0NcblxcYFxcYFxcYFxuXG4jIyBcdTVFRkFcdThCQUVcdTc2ODQgTU9DXG5cbi0gXHU2NUY2XHU2MDAxXHU0RTBFXHU4QkVEXHU2MDAxXG4tIFx1NEVDRVx1NTNFNVxuLSBcdTk3NUVcdThDMTNcdThCRURcdTUyQThcdThCQ0Rcbi0gXHU4RkRFXHU2M0E1XHU0RTBFXHU4ODU0XHU2M0E1XG4tIFx1NzkzQVx1NEY4Qlx1RkYxQVtbYWx0aG91Z2ggXHU0RTBFIGRlc3BpdGVdXVxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDItR3JhbW1hci9hbHRob3VnaCBcdTRFMEUgZGVzcGl0ZS5tZGBdOiBgLS0tXG5iaW5uYWdlbnRfc3luYzogZmFsc2VcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXG5iaW5uYWdlbnRfa2luZDogXCJncmFtbWFyXCJcbnN0YXR1czogbGVhcm5pbmdcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gZ3JhbW1hclxuICAtIGNvbmNlc3Npb25cbi0tLVxuXG4jIGFsdGhvdWdoIFx1NEUwRSBkZXNwaXRlXG5cbiMjIFx1NEUwMFx1NTNFNVx1OEJERFx1ODlDNFx1NTIxOVxuXG4qKmFsdGhvdWdoKiogXHU1NDBFXHU2M0E1XHU1QjhDXHU2NTc0XHU0RUNFXHU1M0U1XHVGRjFCKipkZXNwaXRlKiogXHU1NDBFXHU2M0E1XHU1NDBEXHU4QkNEXHUzMDAxXHU0RUUzXHU4QkNEXHU2MjE2XHU1MkE4XHU1NDBEXHU4QkNEXHUzMDAyXG5cbiMjIFx1N0VEM1x1Njc4NFx1NTE2Q1x1NUYwRlxuXG4tIEFsdGhvdWdoICsgXHU0RTNCXHU4QkVEICsgXHU4QzEzXHU4QkVELCBcdTRFM0JcdTUzRTVcdTMwMDJcbi0gRGVzcGl0ZSArIFx1NTQwRFx1OEJDRCAvIGRvaW5nLCBcdTRFM0JcdTUzRTVcdTMwMDJcblxuIyMgXHU1MzlGXHU1M0U1XHU2MkM2XHU4OUUzXG5cbkFsdGhvdWdoIGl0IHdhcyByYWluaW5nLCB3ZSBrZXB0IHdhbGtpbmcuXG5cbkRlc3BpdGUgdGhlIHJhaW4sIHdlIGtlcHQgd2Fsa2luZy5cblxuIyMgXHU1RTM4XHU4OUMxXHU4QkVGXHU1MzNBXG5cblx1NEUwRFx1ODk4MVx1NTE5OVx1NjIxMCBcdTIwMUNkZXNwaXRlIGl0IHdhcyByYWluaW5nXHUyMDFEXHUzMDAyXHU1M0VGXHU2NTM5XHU0RTNBIFx1MjAxQ2Rlc3BpdGUgdGhlIHJhaW5cdTIwMUQgXHU2MjE2IFx1MjAxQ2Rlc3BpdGUgdGhlIGZhY3QgdGhhdCBpdCB3YXMgcmFpbmluZ1x1MjAxRFx1MzAwMlxuXG4jIyBcdTY1QjBcdThCRURcdTU4ODNcdTlBOENcdThCQzFcblxuQWx0aG91Z2ggdGhlIHRhc2sgd2FzIGRpZmZpY3VsdCwgc2hlIGZpbmlzaGVkIGl0IG9uIHRpbWUuXG5cbiMjIFx1NTE3M1x1ODA1NFxuXG4tIFtbMDAtRGFzaGJvYXJkXV1cbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAzLVJlYWRpbmcvXHU5NjA1XHU4QkZCXHU3QjE0XHU4QkIwXHU3OTNBXHU0RjhCLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcInJlYWRpbmdfc2tpbGxcIlxuc3RhdHVzOiBleGFtcGxlXG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIHJlYWRpbmdcbi0tLVxuXG4jIFx1OTYwNVx1OEJGQlx1N0IxNFx1OEJCMFx1NzkzQVx1NEY4QlxuXG4jIyBcdTY3NjVcdTZFOTBcblxuXHU1NzI4XHU4RkQ5XHU5MUNDXHU4QkIwXHU1RjU1XHU2NTg3XHU3QUUwXHU2ODA3XHU5ODk4XHUzMDAxXHU0RjVDXHU4MDA1XHU1NDhDXHU5NEZFXHU2M0E1XHUzMDAyXG5cbiMjIFx1NEUwMFx1NTNFNVx1OEJERFx1NjQ1OFx1ODk4MVxuXG5cdTUxNDhcdTc1MjhcdTgxRUFcdTVERjFcdTc2ODRcdThCRERcdTUxOTlcdTRFMDBcdTUzRTVcdUZGMENcdTUxOERcdTg4NjVcdTdFQzZcdTgyODJcdTMwMDJcblxuIyMgXHU1MTczXHU5NTJFXHU2QkI1XHU4NDNEXHU0RTBFXHU4QkMxXHU2MzZFXG5cblx1NjQ1OFx1NUY1NVx1NUMxMVx1OTFDRlx1NTE3M1x1OTUyRVx1NTNFNVx1RkYwQ1x1NUU3Nlx1OEJGNFx1NjYwRVx1NUI4M1x1NEUzQVx1NEVDMFx1NEU0OFx1OTFDRFx1ODk4MVx1MzAwMlxuXG4jIyBcdTY1QjBcdThCQ0RcdTRFMEVcdThCRURcdTZDRDVcblxuLSBcdThCQ0RcdTZDNDdcdTUzRUZcdTY1NzRcdTc0MDZcdTUyMzAgW1suLi8wMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZHxcdThCQ0RcdTZDNDcgRGFzaGJvYXJkXV1cdTMwMDJcbi0gXHU4QkVEXHU2Q0Q1XHU1M0VGXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDItR3JhbW1hci8wMC1EYXNoYm9hcmR8XHU4QkVEXHU2Q0Q1IERhc2hib2FyZF1dXHUzMDAyXG5cbiMjIFx1NjIxMVx1NzY4NFx1ODlDMlx1NzBCOVxuXG5cdTUxOTlcdTRFMEJcdThENUVcdTU0MENcdTMwMDFcdThEMjhcdTc1OTFcdTYyMTZcdTUzRUZcdTRFRTVcdThGQzFcdTc5RkJcdTUyMzBcdTUxNzZcdTRFRDZcdTY1ODdcdTdBRTBcdTc2ODRcdTYwRjNcdTZDRDVcdTMwMDJcbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzA0LVdyaXRpbmcvXHU1MTk5XHU0RjVDXHU3RUMzXHU0RTYwXHU3OTNBXHU0RjhCLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcIndyaXRpbmdfc2tpbGxcIlxuc3RhdHVzOiBkcmFmdFxudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSB3cml0aW5nXG4tLS1cblxuIyBcdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTc5M0FcdTRGOEJcblxuIyMgXHU5ODk4XHU3NkVFXG5cbkRlc2NyaWJlIGEgaGFiaXQgdGhhdCBoYXMgaW1wcm92ZWQgeW91ciBsZWFybmluZy5cblxuIyMgVjEgXHU4MzQ5XHU3QTNGXG5cblx1NTE0OFx1NTE5OVx1NUI4Q1x1RkYwQ1x1NEUwRFx1NTcyOFx1N0IyQ1x1NEUwMFx1OTA0RFx1OEZGRFx1NkM0Mlx1NUI4Q1x1N0Y4RVx1MzAwMlxuXG4jIyBcdTRGRUVcdTY1MzlcdThCQjBcdTVGNTVcblxuLSBcdTUxODVcdTVCQjlcdUZGMUFcdTg5QzJcdTcwQjlcdTY2MkZcdTU0MjZcdTZFMDVcdTY5NUFcdUZGMUZcbi0gXHU3RUQzXHU2Nzg0XHVGRjFBXHU2QkI1XHU4NDNEXHU2NjJGXHU1NDI2XHU2NzA5XHU0RTNCXHU5ODk4XHU1M0U1XHU1NDhDXHU4QkMxXHU2MzZFXHVGRjFGXG4tIFx1OEJFRFx1OEEwMFx1RkYxQVx1NjYyRlx1NTQyNlx1ODBGRFx1NzUyOFx1NjZGNFx1NTFDNlx1Nzg2RVx1NzY4NFx1OEJDRFx1NkM0N1x1NjIxNlx1NTNFNVx1NUYwRlx1RkYxRlxuXG4jIyBWMiBcdTVCOUFcdTdBM0ZcblxuXHU2ODM5XHU2MzZFXHU0RkVFXHU2NTM5XHU4QkIwXHU1RjU1XHU5MUNEXHU1MTk5XHVGRjBDXHU1RTc2XHU0RkREXHU3NTU5IFYxIFx1NjVCOVx1NEZCRlx1NkJENFx1OEY4M1x1MzAwMlxuYCxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJpbm5BZ2VudFhMZWFybmluZ1N5bmNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU3luY1NldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IEJpbm5BZ2VudFhTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcInByZXZpZXctbGVhcm5pbmctY29udGV4dFwiLFxuICAgICAgbmFtZTogXCJQcmV2aWV3IGxlYXJuaW5nIGNvbnRleHRcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLnByZXZpZXcoKSxcbiAgICB9KTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwic3luYy1sZWFybmluZy1jb250ZXh0XCIsXG4gICAgICBuYW1lOiBcIlN5bmMgYXBwcm92ZWQgbGVhcm5pbmcgY29udGV4dFwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuc3luYygpLFxuICAgIH0pO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJpbnN0YWxsLWxlYXJuaW5nLXRlbXBsYXRlc1wiLFxuICAgICAgbmFtZTogXCJJbml0aWFsaXplIEJpbm5BZ2VudFggbGVhcm5pbmcgbGlicmFyeVwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuaW5pdGlhbGl6ZUxlYXJuaW5nTGlicmFyeSgpLFxuICAgIH0pO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5oYW5kbGVMYXlvdXRSZWFkeSgpO1xuICAgIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJJbnRlcnZhbChcbiAgICAgIHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9TeW5jKSB2b2lkIHRoaXMuc3luYyhmYWxzZSk7XG4gICAgICB9LCA2MF8wMDApLFxuICAgICk7XG4gIH1cblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IHsgLi4uREVGQVVMVF9TRVRUSU5HUywgLi4uKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgfTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVMYXlvdXRSZWFkeSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5saWJyYXJ5VmVyc2lvbiA8IENVUlJFTlRfTElCUkFSWV9WRVJTSU9OKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLmluaXRpYWxpemVMZWFybmluZ0xpYnJhcnkoZmFsc2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJcdTY3MkFcdTc3RTVcdTk1MTlcdThCRUZcIjtcbiAgICAgICAgbmV3IE5vdGljZShgQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTVFOTNcdTUyMURcdTU5Q0JcdTUzMTZcdTU5MzFcdThEMjVcdUZGMUEke21lc3NhZ2V9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLnNldHRpbmdzLmF1dG9TeW5jKSBhd2FpdCB0aGlzLnN5bmMoZmFsc2UpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjb2xsZWN0RW50cmllc0FzeW5jKCk6IFByb21pc2U8TGVhcm5pbmdDb250ZXh0RW50cnlbXT4ge1xuICAgIGNvbnN0IGZvbGRlcnMgPSBzcGxpdFNjb3BlKHRoaXMuc2V0dGluZ3MuYWxsb3dlZEZvbGRlcnMpO1xuICAgIGNvbnN0IHRhZ3MgPSBzcGxpdFNjb3BlKHRoaXMuc2V0dGluZ3MuYWxsb3dlZFRhZ3MpLm1hcCgodGFnKSA9PiB0YWcucmVwbGFjZSgvXiMvLCBcIlwiKSk7XG4gICAgaWYgKCFmb2xkZXJzLmxlbmd0aCAmJiAhdGFncy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihcIlx1OEJGN1x1OTAwOVx1NjJFOVx1ODFGM1x1NUMxMVx1NEUwMFx1NEUyQVx1NTE0MVx1OEJCOFx1NTQwQ1x1NkI2NVx1NzY4NFx1NjU4N1x1NEVGNlx1NTkzOVx1NjIxNlx1NjgwN1x1N0I3RVwiKTtcbiAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0XG4gICAgICAuZ2V0TWFya2Rvd25GaWxlcygpXG4gICAgICAuZmlsdGVyKChmaWxlKSA9PiBpc0FsbG93ZWQoZmlsZSwgZm9sZGVycywgdGFncywgdGhpcy5hcHApKTtcbiAgICBpZiAoZmlsZXMubGVuZ3RoID4gdGhpcy5zZXR0aW5ncy5tYXhOb3RlcylcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFx1NTMzOVx1OTE0RFx1NTIzMCAke2ZpbGVzLmxlbmd0aH0gXHU3QkM3XHU3QjE0XHU4QkIwXHVGRjBDXHU4QkY3XHU3RjI5XHU1QzBGXHU4MzAzXHU1NkY0XHVGRjA4XHU0RTBBXHU5NjUwICR7dGhpcy5zZXR0aW5ncy5tYXhOb3Rlc31cdUZGMDlgLFxuICAgICAgKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICBmaWxlcy5tYXAoYXN5bmMgKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgICAgICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXIgPz8ge307XG4gICAgICAgIGNvbnN0IHRhZ3MgPSB1bmlxdWVTdHJpbmdzKFtcbiAgICAgICAgICAuLi5hcnJheVN0cmluZ3MoZnJvbnRtYXR0ZXIudGFncyksXG4gICAgICAgICAgLi4uKGNhY2hlPy50YWdzID8/IFtdKS5tYXAoKHRhZykgPT4gdGFnLnRhZy5yZXBsYWNlKC9eIy8sIFwiXCIpKSxcbiAgICAgICAgXSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlX2tleTogZmlsZS5wYXRoLFxuICAgICAgICAgIGFzc2V0X2lkOlxuICAgICAgICAgICAgdHlwZW9mIGZyb250bWF0dGVyLmJpbm5hZ2VudF9hc3NldF9pZCA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgICAgICA/IGZyb250bWF0dGVyLmJpbm5hZ2VudF9hc3NldF9pZFxuICAgICAgICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0aXRsZTogU3RyaW5nKGZyb250bWF0dGVyLnRpdGxlID8/IGZpbGUuYmFzZW5hbWUpLFxuICAgICAgICAgIGtpbmQ6IGluZmVyS2luZChmcm9udG1hdHRlci5iaW5uYWdlbnRfa2luZCwgdGFncyksXG4gICAgICAgICAgdGFncyxcbiAgICAgICAgICBleGNlcnB0OiBzdW1tYXJpemUoYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKSwgdGhpcy5zZXR0aW5ncy5tYXhFeGNlcnB0Q2hhcmFjdGVycyksXG4gICAgICAgICAgbW9kaWZpZWRfYXQ6IG5ldyBEYXRlKGZpbGUuc3RhdC5tdGltZSkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgfTtcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHByZXZpZXcoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCB0aGlzLmNvbGxlY3RFbnRyaWVzQXN5bmMoKTtcbiAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgIGBcdTVDMDZcdTU0MENcdTZCNjUgJHtlbnRyaWVzLmxlbmd0aH0gXHU2NzYxXHU1QjY2XHU0RTYwXHU0RTBBXHU0RTBCXHU2NTg3XHVGRjFBJHtcbiAgICAgICAgICBlbnRyaWVzXG4gICAgICAgICAgICAuc2xpY2UoMCwgNClcbiAgICAgICAgICAgIC5tYXAoKGVudHJ5KSA9PiBlbnRyeS50aXRsZSlcbiAgICAgICAgICAgIC5qb2luKFwiXHUzMDAxXCIpIHx8IFwiXHU2NUUwXCJcbiAgICAgICAgfWAsXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBuZXcgTm90aWNlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJcdTY1RTBcdTZDRDVcdTk4ODRcdTg5QzhcdTU0MENcdTZCNjVcdTgzMDNcdTU2RjRcIik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaW5pdGlhbGl6ZUxlYXJuaW5nTGlicmFyeShzaG93Tm90aWNlID0gdHJ1ZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGxldCBpbnN0YWxsZWQgPSAwO1xuICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKExJQlJBUllfUk9PVCkpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihMSUJSQVJZX1JPT1QpO1xuICAgICAgaW5zdGFsbGVkICs9IDE7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBMSUJSQVJZX0ZPTERFUlMpIHtcbiAgICAgIGNvbnN0IGZvbGRlciA9IGAke0xJQlJBUllfUk9PVH0vJHtuYW1lfWA7XG4gICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmb2xkZXIpKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXIpO1xuICAgICAgICBpbnN0YWxsZWQgKz0gMTtcbiAgICAgIH1cbiAgICB9XG4gICAgaW5zdGFsbGVkICs9IGF3YWl0IHRoaXMubWlncmF0ZU1hbmFnZWREYXNoYm9hcmRzKCk7XG4gICAgYXdhaXQgdGhpcy5yZXdyaXRlTWFuYWdlZERhc2hib2FyZExpbmtzKCk7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgY29udGVudF0gb2YgT2JqZWN0LmVudHJpZXMoTEVBUk5JTkdfVEVNUExBVEVTKSkge1xuICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYCR7VEVNUExBVEVfRk9MREVSfS8ke25hbWV9YCkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGAke1RFTVBMQVRFX0ZPTERFUn0vJHtuYW1lfWAsIGNvbnRlbnQpO1xuICAgICAgICBpbnN0YWxsZWQgKz0gMTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbcGF0aCwgY29udGVudF0gb2YgT2JqZWN0LmVudHJpZXMoTElCUkFSWV9OT1RFUykpIHtcbiAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCBjb250ZW50KTtcbiAgICAgICAgaW5zdGFsbGVkICs9IDE7XG4gICAgICB9XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuY29uZmlndXJlT2JzaWRpYW5Gb2xkZXJzKCk7XG4gICAgdGhpcy5zZXR0aW5ncy5saWJyYXJ5VmVyc2lvbiA9IENVUlJFTlRfTElCUkFSWV9WRVJTSU9OO1xuICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gICAgaWYgKHNob3dOb3RpY2UpIHtcbiAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgIGluc3RhbGxlZFxuICAgICAgICAgID8gYEJpbm5BZ2VudFggXHU1QjY2XHU0RTYwXHU1RTkzXHU1REYyXHU1MjFEXHU1OUNCXHU1MzE2XHVGRjA4XHU2NUIwXHU1ODlFICR7aW5zdGFsbGVkfSBcdTk4NzlcdUZGMDlgXG4gICAgICAgICAgOiBcIkJpbm5BZ2VudFggXHU1QjY2XHU0RTYwXHU1RTkzXHU1REYyXHU1QzMxXHU3RUVBXHVGRjBDXHU2NzJBXHU4OTg2XHU3NkQ2XHU0RjYwXHU3Njg0XHU0RkVFXHU2NTM5XCIsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbWlncmF0ZU1hbmFnZWREYXNoYm9hcmRzKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgbGV0IG1pZ3JhdGVkID0gMDtcbiAgICBmb3IgKGNvbnN0IFtsZWdhY3lQYXRoLCB0YXJnZXRQYXRoXSBvZiBEQVNIQk9BUkRfTUlHUkFUSU9OUykge1xuICAgICAgY29uc3QgbGVnYWN5ID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGxlZ2FjeVBhdGgpO1xuICAgICAgaWYgKCEobGVnYWN5IGluc3RhbmNlb2YgVEZpbGUpIHx8IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0YXJnZXRQYXRoKSkgY29udGludWU7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZW5hbWUobGVnYWN5LCB0YXJnZXRQYXRoKTtcbiAgICAgIG1pZ3JhdGVkICs9IDE7XG4gICAgfVxuICAgIHJldHVybiBtaWdyYXRlZDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmV3cml0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0XG4gICAgICAuZ2V0TWFya2Rvd25GaWxlcygpXG4gICAgICAuZmlsdGVyKFxuICAgICAgICAoZmlsZSkgPT4gZmlsZS5wYXRoID09PSBgJHtMSUJSQVJZX1JPT1R9Lm1kYCB8fCBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtMSUJSQVJZX1JPT1R9L2ApLFxuICAgICAgKTtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgY29uc3QgdXBkYXRlZCA9IHVwZGF0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcyhjb250ZW50LCBmaWxlLnBhdGgpO1xuICAgICAgaWYgKHVwZGF0ZWQgIT09IGNvbnRlbnQpIGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCB1cGRhdGVkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbmZpZ3VyZU9ic2lkaWFuRm9sZGVycygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjb25maWd1cmFibGVWYXVsdCA9IHRoaXMuYXBwLnZhdWx0IGFzIHR5cGVvZiB0aGlzLmFwcC52YXVsdCAmIHtcbiAgICAgIHNldENvbmZpZz86IChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHZvaWQ7XG4gICAgfTtcbiAgICBpZiAodHlwZW9mIGNvbmZpZ3VyYWJsZVZhdWx0LnNldENvbmZpZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjb25maWd1cmFibGVWYXVsdC5zZXRDb25maWcoXCJhdHRhY2htZW50Rm9sZGVyUGF0aFwiLCBBVFRBQ0hNRU5UX0ZPTERFUik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMubWVyZ2VDb25maWdGaWxlKGAke3RoaXMuYXBwLnZhdWx0LmNvbmZpZ0Rpcn0vYXBwLmpzb25gLCB7XG4gICAgICAgIGF0dGFjaG1lbnRGb2xkZXJQYXRoOiBBVFRBQ0hNRU5UX0ZPTERFUixcbiAgICAgIH0pO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLm1lcmdlQ29uZmlnRmlsZShgJHt0aGlzLmFwcC52YXVsdC5jb25maWdEaXJ9L3RlbXBsYXRlcy5qc29uYCwge1xuICAgICAgZm9sZGVyOiBURU1QTEFURV9GT0xERVIsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1lcmdlQ29uZmlnRmlsZShwYXRoOiBzdHJpbmcsIHBhdGNoOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFkYXB0ZXIgPSB0aGlzLmFwcC52YXVsdC5hZGFwdGVyO1xuICAgIGxldCBjdXJyZW50OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGlmIChhd2FpdCBhZGFwdGVyLmV4aXN0cyhwYXRoKSkge1xuICAgICAgY29uc3QgcmF3ID0gYXdhaXQgYWRhcHRlci5yZWFkKHBhdGgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFyc2VkOiB1bmtub3duID0gSlNPTi5wYXJzZShyYXcpO1xuICAgICAgICBpZiAocGFyc2VkICYmIHR5cGVvZiBwYXJzZWQgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkocGFyc2VkKSkge1xuICAgICAgICAgIGN1cnJlbnQgPSBwYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFx1NjVFMFx1NkNENVx1NjZGNFx1NjVCMCBPYnNpZGlhbiBcdTkxNERcdTdGNkVcdUZGMUEke3BhdGh9IFx1NEUwRFx1NjYyRlx1NjcwOVx1NjU0OFx1NzY4NCBKU09OYCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHVwZGF0ZWQgPSB7IC4uLmN1cnJlbnQsIC4uLnBhdGNoIH07XG4gICAgaWYgKEpTT04uc3RyaW5naWZ5KHVwZGF0ZWQpICE9PSBKU09OLnN0cmluZ2lmeShjdXJyZW50KSkge1xuICAgICAgYXdhaXQgYWRhcHRlci53cml0ZShwYXRoLCBgJHtKU09OLnN0cmluZ2lmeSh1cGRhdGVkLCBudWxsLCAyKX1cXG5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHN5bmMoc2hvd05vdGljZSA9IHRydWUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY29ubmVjdGlvbklkIHx8ICF0aGlzLnNldHRpbmdzLnN5bmNTZWNyZXQpIHtcbiAgICAgIGlmIChzaG93Tm90aWNlKSBuZXcgTm90aWNlKFwiXHU4QkY3XHU1MTQ4XHU1NzI4XHU2M0QyXHU0RUY2XHU4QkJFXHU3RjZFXHU0RTJEXHU1ODZCXHU1MTk5IEJpbm5BZ2VudFggXHU4RkRFXHU2M0E1XHU1MUVEXHU2MzZFXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZXhwb3J0ZWQgPSBhd2FpdCB0aGlzLnB1bGxQZW5kaW5nQXNzZXRzKCk7XG4gICAgICBjb25zdCBlbnRyaWVzID0gYXdhaXQgdGhpcy5jb2xsZWN0RW50cmllc0FzeW5jKCk7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke3RoaXMuc2V0dGluZ3MuYXBpQmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9pbXBvcnRgLFxuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuc2V0dGluZ3Muc3luY1NlY3JldH1gLFxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc2NoZW1hX3ZlcnNpb246IFwibGVhcm5pbmctY29udGV4dC92MVwiLFxuICAgICAgICAgIHZhdWx0X25hbWU6IHRoaXMuYXBwLnZhdWx0LmdldE5hbWUoKSxcbiAgICAgICAgICBlbnRyaWVzLFxuICAgICAgICB9KSxcbiAgICAgICAgdGhyb3c6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQmlubkFnZW50WCBcdTYyRDJcdTdFRERcdTU0MENcdTZCNjVcdUZGMDgke3Jlc3BvbnNlLnN0YXR1c31cdUZGMDlgKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJlc3BvbnNlLmpzb24gYXMgSW1wb3J0UmVzcG9uc2U7XG4gICAgICBjb25zdCBvcmdhbml6ZWQgPSBhd2FpdCB0aGlzLmFwcGx5T3JnYW5pemF0aW9uUGxhbihyZXN1bHQub3JnYW5pemF0aW9uKTtcbiAgICAgIGNvbnN0IG9yZ2FuaXphdGlvblN1bW1hcnkgPSBzdW1tYXJpemVPcmdhbml6YXRpb24ocmVzdWx0Lm9yZ2FuaXphdGlvbiwgb3JnYW5pemVkKTtcbiAgICAgIGNvbnN0IHN5bmNTdW1tYXJ5ID1cbiAgICAgICAgYFx1NjNBNVx1NjUzNiAke2V4cG9ydGVkfSBcdTY3NjFcdThENDRcdTRFQTdcdUZGMENcdTRFMEFcdTRGMjAgJHtlbnRyaWVzLmxlbmd0aH0gXHU2NzYxXHU1QjY2XHU0RTYwXHU0RTBBXHU0RTBCXHU2NTg3XHVGRjFCYCArIG9yZ2FuaXphdGlvblN1bW1hcnk7XG4gICAgICB0aGlzLnNldHRpbmdzLmxhc3RTeW5jZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgIHRoaXMuc2V0dGluZ3MubGFzdFN5bmNFcnJvciA9IFwiXCI7XG4gICAgICB0aGlzLnNldHRpbmdzLmxhc3RTeW5jU3VtbWFyeSA9IHN5bmNTdW1tYXJ5O1xuICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIGlmIChzaG93Tm90aWNlKSBuZXcgTm90aWNlKGBcdTUzQ0NcdTU0MTFcdTU0MENcdTZCNjVcdTVCOENcdTYyMTBcdUZGMUEke3N5bmNTdW1tYXJ5fWApO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlx1NTQwQ1x1NkI2NVx1NTkzMVx1OEQyNVwiO1xuICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0U3luY0Vycm9yID0gbWVzc2FnZTtcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gICAgICBpZiAoc2hvd05vdGljZSkgbmV3IE5vdGljZShtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGFwcGx5T3JnYW5pemF0aW9uUGxhbihwbGFuOiBPcmdhbml6YXRpb25QbGFuIHwgbnVsbCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgaWYgKHBsYW4/LnN0YXR1cyAhPT0gXCJwbGFubmVkXCIgfHwgIXBsYW4uYWN0aW9ucy5sZW5ndGgpIHJldHVybiAwO1xuICAgIGNvbnN0IGFsbG93ZWRUYXJnZXRzID0gbmV3IFNldChbXG4gICAgICBgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnlgLFxuICAgICAgYCR7TElCUkFSWV9ST09UfS8wMi1HcmFtbWFyYCxcbiAgICAgIGAke0xJQlJBUllfUk9PVH0vMDMtUmVhZGluZ2AsXG4gICAgICBgJHtMSUJSQVJZX1JPT1R9LzA0LVdyaXRpbmdgLFxuICAgIF0pO1xuICAgIGNvbnN0IGNvbXBsZXRlZDogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGFjdGlvbiBvZiBwbGFuLmFjdGlvbnMpIHtcbiAgICAgIGlmICghYWN0aW9uLnNvdXJjZV9rZXkuc3RhcnRzV2l0aChgJHtJTkJPWF9GT0xERVJ9L2ApKSBjb250aW51ZTtcbiAgICAgIGlmICghYWxsb3dlZFRhcmdldHMuaGFzKGFjdGlvbi50YXJnZXRfZm9sZGVyKSkgY29udGludWU7XG4gICAgICBjb25zdCBmaWxlTmFtZSA9IGFjdGlvbi5zb3VyY2Vfa2V5LnNsaWNlKGFjdGlvbi5zb3VyY2Vfa2V5Lmxhc3RJbmRleE9mKFwiL1wiKSArIDEpO1xuICAgICAgY29uc3QgZXh0ZW5zaW9uSW5kZXggPSBmaWxlTmFtZS5sYXN0SW5kZXhPZihcIi5cIik7XG4gICAgICBjb25zdCBiYXNlTmFtZSA9IGV4dGVuc2lvbkluZGV4ID4gMCA/IGZpbGVOYW1lLnNsaWNlKDAsIGV4dGVuc2lvbkluZGV4KSA6IGZpbGVOYW1lO1xuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gZXh0ZW5zaW9uSW5kZXggPiAwID8gZmlsZU5hbWUuc2xpY2UoZXh0ZW5zaW9uSW5kZXggKyAxKSA6IFwibWRcIjtcbiAgICAgIGNvbnN0IGJhc2VQYXRoID0gYCR7YWN0aW9uLnRhcmdldF9mb2xkZXJ9LyR7ZmlsZU5hbWV9YDtcbiAgICAgIGNvbnN0IHJldHJ5UGF0aCA9IGAke2FjdGlvbi50YXJnZXRfZm9sZGVyfS8ke2Jhc2VOYW1lfS0ke2FjdGlvbi5hY3Rpb25faWQuc2xpY2UoMCwgNil9LiR7ZXh0ZW5zaW9ufWA7XG4gICAgICBjb25zdCBzb3VyY2UgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYWN0aW9uLnNvdXJjZV9rZXkpO1xuICAgICAgaWYgKCEoc291cmNlIGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYmFzZVBhdGgpIGluc3RhbmNlb2YgVEZpbGUgfHxcbiAgICAgICAgICB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocmV0cnlQYXRoKSBpbnN0YW5jZW9mIFRGaWxlXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbXBsZXRlZC5wdXNoKGFjdGlvbi5hY3Rpb25faWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChiYXNlUGF0aCkgPyByZXRyeVBhdGggOiBiYXNlUGF0aDtcbiAgICAgIGlmICh0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGFyZ2V0UGF0aCkpIGNvbnRpbnVlO1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQucmVuYW1lKHNvdXJjZSwgdGFyZ2V0UGF0aCk7XG4gICAgICBjb21wbGV0ZWQucHVzaChhY3Rpb24uYWN0aW9uX2lkKTtcbiAgICB9XG4gICAgaWYgKGNvbXBsZXRlZC5sZW5ndGggIT09IHBsYW4uYWN0aW9ucy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkluYm94IFx1NjU3NFx1NzQwNlx1NjcyQVx1NTE2OFx1OTBFOFx1NUI4Q1x1NjIxMFx1RkYxQlx1NjcyQVx1NzlGQlx1NTJBOFx1NzY4NFx1N0IxNFx1OEJCMFx1NEYxQVx1NEZERFx1NzU1OVx1NTcyOFx1NTM5Rlx1NTkwNFx1RkYwQ1x1NEUwQlx1NkIyMVx1NTQwQ1x1NkI2NVx1OTFDRFx1OEJENVwiKTtcbiAgICB9XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7dGhpcy5zZXR0aW5ncy5hcGlCYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vdjEvb2JzaWRpYW4tc3luYy8ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLnNldHRpbmdzLmNvbm5lY3Rpb25JZCl9L29yZ2FuaXplci1ydW5zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHBsYW4ucnVuX2lkKX0vYWNrYCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLnNldHRpbmdzLnN5bmNTZWNyZXR9YCxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBjb21wbGV0ZWRfYWN0aW9uX2lkczogY29tcGxldGVkIH0pLFxuICAgICAgdGhyb3c6IGZhbHNlLFxuICAgIH0pO1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMClcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW5ib3ggXHU2NTc0XHU3NDA2XHU1NkRFXHU2MjY3XHU1OTMxXHU4RDI1XHVGRjA4JHtyZXNwb25zZS5zdGF0dXN9XHVGRjA5YCk7XG4gICAgcmV0dXJuIGNvbXBsZXRlZC5sZW5ndGg7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHB1bGxQZW5kaW5nQXNzZXRzKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgYmFzZSA9IHRoaXMuc2V0dGluZ3MuYXBpQmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gICAgY29uc3QgaGVhZGVycyA9IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuc2V0dGluZ3Muc3luY1NlY3JldH1gIH07XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7YmFzZX0vdjEvb2JzaWRpYW4tc3luYy8ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLnNldHRpbmdzLmNvbm5lY3Rpb25JZCl9L2V4cG9ydHNgLFxuICAgICAgbWV0aG9kOiBcIkdFVFwiLFxuICAgICAgaGVhZGVycyxcbiAgICAgIHRocm93OiBmYWxzZSxcbiAgICB9KTtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFx1NjVFMFx1NkNENVx1OEJGQlx1NTNENlx1NUY4NVx1NTQwQ1x1NkI2NVx1OEQ0NFx1NEVBN1x1RkYwOCR7cmVzcG9uc2Uuc3RhdHVzfVx1RkYwOWApO1xuICAgIGNvbnN0IGV4cG9ydHMgPSByZXNwb25zZS5qc29uIGFzIFBlbmRpbmdBc3NldEV4cG9ydFtdO1xuICAgIGxldCBjb21wbGV0ZWQgPSAwO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBleHBvcnRzKSB7XG4gICAgICBjb25zdCBmaWxlID0gYXdhaXQgdGhpcy5jcmVhdGVBc3NldE5vdGUoaXRlbSk7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICAgIGNvbnN0IGRpZ2VzdCA9IGF3YWl0IHNoYTI1Nihjb250ZW50KTtcbiAgICAgIGNvbnN0IGFjayA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke2Jhc2V9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9leHBvcnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGl0ZW0uYXNzZXRfaWQpfS9hY2tgLFxuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLmhlYWRlcnMsIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzb3VyY2Vfa2V5OiBmaWxlLnBhdGgsXG4gICAgICAgICAgY29udGVudF9oYXNoOiBkaWdlc3QsXG4gICAgICAgICAgbW9kaWZpZWRfYXQ6IG5ldyBEYXRlKGZpbGUuc3RhdC5tdGltZSkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICB2YXVsdF9uYW1lOiB0aGlzLmFwcC52YXVsdC5nZXROYW1lKCksXG4gICAgICAgIH0pLFxuICAgICAgICB0aHJvdzogZmFsc2UsXG4gICAgICB9KTtcbiAgICAgIGlmIChhY2suc3RhdHVzIDwgMjAwIHx8IGFjay5zdGF0dXMgPj0gMzAwKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFx1OEQ0NFx1NEVBN1x1NTQwQ1x1NkI2NVx1NTZERVx1NjI2N1x1NTkzMVx1OEQyNVx1RkYwOCR7YWNrLnN0YXR1c31cdUZGMDlgKTtcbiAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGxldGVkO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVBc3NldE5vdGUoaXRlbTogUGVuZGluZ0Fzc2V0RXhwb3J0KTogUHJvbWlzZTxURmlsZT4ge1xuICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKExJQlJBUllfUk9PVCkpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihMSUJSQVJZX1JPT1QpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChJTkJPWF9GT0xERVIpKSB7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoSU5CT1hfRk9MREVSKTtcbiAgICB9XG4gICAgY29uc3QgZm9sZGVyID0gSU5CT1hfRk9MREVSO1xuICAgIGNvbnN0IGZpbGVuYW1lID0gYCR7c2FmZUZpbGVuYW1lKGl0ZW0udGl0bGUpfS0ke2l0ZW0uYXNzZXRfaWQuc2xpY2UoLTEwKX0ubWRgO1xuICAgIGNvbnN0IHBhdGggPSBgJHtmb2xkZXJ9LyR7ZmlsZW5hbWV9YDtcbiAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICBpZiAoZXhpc3RpbmcgaW5zdGFuY2VvZiBURmlsZSkgcmV0dXJuIGV4aXN0aW5nO1xuICAgIGNvbnN0IHRhZ3MgPSB1bmlxdWVTdHJpbmdzKFtcImJpbm5hZ2VudFwiLCBpdGVtLmtpbmQsIC4uLml0ZW0udGFnc10pO1xuICAgIGNvbnN0IGZyb250bWF0dGVyID0gW1xuICAgICAgXCItLS1cIixcbiAgICAgICdiaW5uYWdlbnRfc2NoZW1hOiBcImFzc2V0L3YxXCInLFxuICAgICAgYGJpbm5hZ2VudF9hc3NldF9pZDogXCIke3lhbWxTdHJpbmcoaXRlbS5hc3NldF9pZCl9XCJgLFxuICAgICAgYGJpbm5hZ2VudF9raW5kOiBcIiR7eWFtbFN0cmluZyhpdGVtLmtpbmQpfVwiYCxcbiAgICAgIGBiaW5uYWdlbnRfc291cmNlX3R5cGU6IFwiJHt5YW1sU3RyaW5nKGl0ZW0uc291cmNlX3R5cGUpfVwiYCxcbiAgICAgIFwiaW5ib3hfc3RhdHVzOiB1bnByb2Nlc3NlZFwiLFxuICAgICAgYHRpdGxlOiBcIiR7eWFtbFN0cmluZyhpdGVtLnRpdGxlKX1cImAsXG4gICAgICAuLi4oaXRlbS5zb3VyY2VfdGFza19pZFxuICAgICAgICA/IFtgYmlubmFnZW50X3NvdXJjZV90YXNrX2lkOiBcIiR7eWFtbFN0cmluZyhpdGVtLnNvdXJjZV90YXNrX2lkKX1cImBdXG4gICAgICAgIDogW10pLFxuICAgICAgXCJ0YWdzOlwiLFxuICAgICAgLi4udGFncy5tYXAoKHRhZykgPT4gYCAgLSAke3RhZ31gKSxcbiAgICAgIFwiLS0tXCIsXG4gICAgICBcIlwiLFxuICAgICAgYCMgJHtpdGVtLnRpdGxlfWAsXG4gICAgICBcIlwiLFxuICAgIF07XG4gICAgY29uc3QgYm9keSA9IGl0ZW0uaW5pdGlhbF9jb250ZW50Py50cmltKClcbiAgICAgID8gW1wiIyMgXHU1QjY2XHU0RTYwXHU3M0IwXHU1NzNBXCIsIFwiXCIsIGl0ZW0uaW5pdGlhbF9jb250ZW50LnRyaW0oKSwgXCJcIiwgXCIjIyBcdTYyMTFcdTc2ODRcdTc0MDZcdTg5RTNcIiwgXCJcIl1cbiAgICAgIDogW1wiIyMgXHU2NzAwXHU1MjFEXHU4QkVEXHU1ODgzXCIsIFwiXCIsIFwiIyMgXHU2MjExXHU3Njg0XHU3NDA2XHU4OUUzXCIsIFwiXCIsIFwiIyMgXHU1M0VGXHU4RkMxXHU3OUZCXHU4OUM0XHU1MjE5XCIsIFwiXCIsIFwiIyMgXHU2NUIwXHU4QkVEXHU1ODgzXHU5QThDXHU4QkMxXCIsIFwiXCJdO1xuICAgIHJldHVybiBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgWy4uLmZyb250bWF0dGVyLCAuLi5ib2R5XS5qb2luKFwiXFxuXCIpKTtcbiAgfVxufVxuXG5jbGFzcyBCaW5uQWdlbnRYU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogQmlubkFnZW50WExlYXJuaW5nU3luY1BsdWdpbixcbiAgKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICB9XG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkJpbm5BZ2VudFggXHU1QjY2XHU0RTYwXHU4RDQ0XHU0RUE3XHU1NDBDXHU2QjY1XCIgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiXHU0RUM1XHU1NDBDXHU2QjY1XHU0RjYwXHU2NjBFXHU3ODZFXHU1MTQxXHU4QkI4XHU3Njg0XHU4MzAzXHU1NkY0XHUzMDAyXHU3NjdCXHU1RjU1XHU4OUU2XHU1M0QxXHU3Njg0XHU2NTc0XHU3NDA2XHU1M0VBXHU0RjFBXHU2MjhBIDAwLUluYm94IFx1N0IxNFx1OEJCMFx1NzlGQlx1NTJBOFx1NTIzMCBCaW5uQWdlbnRYIFx1NzY4NFx1OEJDRFx1NkM0N1x1MzAwMVx1OEJFRFx1NkNENVx1MzAwMVx1OTYwNVx1OEJGQlx1NjIxNlx1NTE5OVx1NEY1Q1x1NzZFRVx1NUY1NVx1RkYxQlx1NEUwRFx1NEYxQVx1NTIyMFx1OTY2NFx1MzAwMVx1NjUzOVx1NTE5OVx1NjIxNlx1NzlGQlx1NTFGQVx1NjI1OFx1N0JBMVx1NzZFRVx1NUY1NVx1MzAwMlwiLFxuICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTUyMURcdTU5Q0JcdTUzMTZcdTVCNjZcdTRFNjBcdTVFOTNcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlx1NTIxQlx1NUVGQSAwMFx1MjAxMzA2IFx1NzZFRVx1NUY1NVx1MzAwMU1PQyAvIERhdGF2aWV3IERhc2hib2FyZFx1MzAwMVx1NkEyMVx1Njc3Rlx1MzAwMVNwYWNlZCBSZXBldGl0aW9uIFx1NjMwN1x1NTM1N1x1NEUwRVx1NTE2NVx1OTVFOFx1NzkzQVx1NEY4Qlx1RkYxQlx1NEUwRFx1NEYxQVx1ODk4Nlx1NzZENlx1NURGMlx1NjcwOVx1NjU4N1x1NEVGNlx1MzAwMlwiLFxuICAgICAgKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PlxuICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlx1NjhDMFx1NjdFNVx1NUU3Nlx1ODg2NVx1OUY1MFwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5pbml0aWFsaXplTGVhcm5pbmdMaWJyYXJ5KCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU4MUVBXHU1MkE4XHU1M0NDXHU1NDExXHU1NDBDXHU2QjY1XCIpXG4gICAgICAuc2V0RGVzYyhcIk9ic2lkaWFuIFx1NTQyRlx1NTJBOFx1NTQwRVx1NTNDQVx1NkJDRiA2MCBcdTc5RDJcdTU0MENcdTZCNjVcdTRFMDBcdTZCMjFcdTVERjJcdTYzODhcdTY3NDNcdTgzMDNcdTU2RjRcdUZGMUJcdTUzRUZcdTk2OEZcdTY1RjZcdTUxNzNcdTk1RURcdTVFNzZcdTY1MzlcdTc1MjhcdTYyNEJcdTUyQThcdTU0N0RcdTRFRTRcdTMwMDJcIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9TeW5jKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvU3luYyA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NjcwMFx1OEZEMVx1NTQwQ1x1NkI2NVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jRXJyb3JcbiAgICAgICAgICA/IGBcdTU5MzFcdThEMjVcdUZGMUEke3RoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jRXJyb3J9YFxuICAgICAgICAgIDogdGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdFN5bmNlZEF0XG4gICAgICAgICAgICA/IGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jZWRBdH1cdUZGMUIke3RoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jU3VtbWFyeSB8fCBcIlx1NTQwQ1x1NkI2NVx1NUI4Q1x1NjIxMFwifWBcbiAgICAgICAgICAgIDogXCJcdTVDMUFcdTY3MkFcdTVCOENcdTYyMTBcdTU0MENcdTZCNjVcIixcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTE0MVx1OEJCOFx1NzY4NFx1NjU4N1x1NEVGNlx1NTkzOVwiKVxuICAgICAgLnNldERlc2MoXCJcdTkwMTdcdTUzRjdcdTUyMDZcdTk2OTRcdUZGMENcdTRGOEJcdTU5ODIgQmlubkFnZW50WCwgXHU4MkYxXHU4QkVEL1x1OEJFRFx1NkNENVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxsb3dlZEZvbGRlcnMpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRGb2xkZXJzID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1MTQxXHU4QkI4XHU3Njg0XHU2ODA3XHU3QjdFXCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NTNFRlx1OTAwOVx1RkYwQ1x1OTAxN1x1NTNGN1x1NTIwNlx1OTY5NFx1RkYwQ1x1NEY4Qlx1NTk4MiBiaW5uYWdlbnQtdm9jYWJ1bGFyeSwgZ3JhbW1hclwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxsb3dlZFRhZ3MpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRUYWdzID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmlubkFnZW50WCBcdTU3MzBcdTU3NDBcIilcbiAgICAgIC5zZXREZXNjKFwiXHU2NzJDXHU2NzNBXHU5RUQ4XHU4QkE0XHVGRjFBaHR0cDovLzEyNy4wLjAuMTo4MDAwL2xlYXJuZXJcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiXHU4RkRFXHU2M0E1IElEXCIpLmFkZFRleHQoKHRleHQpID0+XG4gICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbm5lY3Rpb25JZCkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbm5lY3Rpb25JZCA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0pLFxuICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTQwQ1x1NkI2NVx1NUJDNlx1OTRBNVwiKVxuICAgICAgLnNldERlc2MoXCJcdTc1MzEgQmlubkFnZW50WCBcdTc2ODRcdThGREVcdTYzQTVcdTU0MTFcdTVCRkNcdTc1MUZcdTYyMTBcdUZGMUJcdTRFQzVcdTRGRERcdTVCNThcdTU3MjhcdTY3MkNcdTY3M0EgT2JzaWRpYW4gXHU2M0QyXHU0RUY2XHU4QkJFXHU3RjZFXHU0RTJEXHUzMDAyXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jU2VjcmV0KS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jU2VjcmV0ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdW1tYXJpemVPcmdhbml6YXRpb24ocGxhbjogT3JnYW5pemF0aW9uUGxhbiB8IG51bGwsIG9yZ2FuaXplZDogbnVtYmVyKTogc3RyaW5nIHtcbiAgaWYgKCFwbGFuKSByZXR1cm4gXCJcdTY3MkNcdThGNkVcdTZDQTFcdTY3MDlcdTYzOTJcdTk2MUZcdTc2ODQgSW5ib3ggXHU2NTc0XHU3NDA2XHU0RUZCXHU1MkExXHUzMDAyXCI7XG4gIGlmIChwbGFuLnN0YXR1cyA9PT0gXCJub29wXCIpIHJldHVybiBcIkluYm94IFx1NEUyRFx1NkNBMVx1NjcwOVx1NUY4NVx1NjU3NFx1NzQwNlx1N0IxNFx1OEJCMFx1MzAwMlwiO1xuICBpZiAocGxhbi5zdGF0dXMgPT09IFwicXVldWVkXCIpIHtcbiAgICByZXR1cm4gKFxuICAgICAgYEluYm94IFx1NjcwOSAke3BsYW4uaW5ib3hfY291bnR9IFx1Njc2MVx1NUY4NVx1NjU3NFx1NzQwNlx1N0IxNFx1OEJCMFx1RkYwQ1x1NTNFRlx1OTc2MFx1NTIwNlx1N0M3QiAke3BsYW4uY2xhc3NpZmllZF9jb3VudH0gXHU2NzYxXHVGRjFCYCArXG4gICAgICBcIlx1NjcyQ1x1OEY2RVx1NjcyQVx1NzlGQlx1NTJBOFx1RkYwQ1x1NEVGQlx1NTJBMVx1NEYxQVx1NTcyOFx1NEUwQlx1NkIyMVx1NTQwQ1x1NkI2NVx1OTFDRFx1OEJENVx1MzAwMlwiXG4gICAgKTtcbiAgfVxuICBjb25zdCBmb2xkZXJMYWJlbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgW2Ake0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeWBdOiBcIlx1OEJDRFx1NkM0N1wiLFxuICAgIFtgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXJgXTogXCJcdThCRURcdTZDRDVcIixcbiAgICBbYCR7TElCUkFSWV9ST09UfS8wMy1SZWFkaW5nYF06IFwiXHU5NjA1XHU4QkZCXCIsXG4gICAgW2Ake0xJQlJBUllfUk9PVH0vMDQtV3JpdGluZ2BdOiBcIlx1NTE5OVx1NEY1Q1wiLFxuICB9O1xuICBjb25zdCBjb3VudHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICBmb3IgKGNvbnN0IGFjdGlvbiBvZiBwbGFuLmFjdGlvbnMpIHtcbiAgICBjb25zdCBsYWJlbCA9IGZvbGRlckxhYmVsc1thY3Rpb24udGFyZ2V0X2ZvbGRlcl0gPz8gYWN0aW9uLnRhcmdldF9mb2xkZXI7XG4gICAgY291bnRzLnNldChsYWJlbCwgKGNvdW50cy5nZXQobGFiZWwpID8/IDApICsgMSk7XG4gIH1cbiAgY29uc3QgZGVzdGluYXRpb25zID0gWy4uLmNvdW50cy5lbnRyaWVzKCldXG4gICAgLm1hcCgoW2xhYmVsLCBjb3VudF0pID0+IGAke2xhYmVsfSAke2NvdW50fSBcdTY3NjFgKVxuICAgIC5qb2luKFwiXHUzMDAxXCIpO1xuICByZXR1cm4gYFx1NjU3NFx1NzQwNlx1NUI4Q1x1NjIxMFx1RkYxQVx1NzlGQlx1NTJBOCAke29yZ2FuaXplZH0gXHU2NzYxIEluYm94IFx1N0IxNFx1OEJCMFx1RkYwOCR7ZGVzdGluYXRpb25zfVx1RkYwOVx1MzAwMmA7XG59XG5cbmZ1bmN0aW9uIHNwbGl0U2NvcGUodmFsdWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIHZhbHVlXG4gICAgLnNwbGl0KFwiLFwiKVxuICAgIC5tYXAoKHBhcnQpID0+IHBhcnQudHJpbSgpLnJlcGxhY2UoL15cXC8rfFxcLyskL2csIFwiXCIpKVxuICAgIC5maWx0ZXIoQm9vbGVhbik7XG59XG5mdW5jdGlvbiBhcnJheVN0cmluZ3ModmFsdWU6IHVua25vd24pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKVxuICAgID8gdmFsdWUuZmlsdGVyKChpdGVtKTogaXRlbSBpcyBzdHJpbmcgPT4gdHlwZW9mIGl0ZW0gPT09IFwic3RyaW5nXCIpXG4gICAgOiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCJcbiAgICAgID8gW3ZhbHVlXVxuICAgICAgOiBbXTtcbn1cbmZ1bmN0aW9uIHVuaXF1ZVN0cmluZ3ModmFsdWVzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KHZhbHVlcy5tYXAoKHZhbHVlKSA9PiB2YWx1ZS5yZXBsYWNlKC9eIy8sIFwiXCIpLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pKV07XG59XG5mdW5jdGlvbiBpc0FsbG93ZWQoZmlsZTogVEZpbGUsIGZvbGRlcnM6IHN0cmluZ1tdLCB0YWdzOiBzdHJpbmdbXSwgYXBwOiBBcHApOiBib29sZWFuIHtcbiAgY29uc3QgY2FjaGUgPSBhcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gIGlmIChcbiAgICBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtURU1QTEFURV9GT0xERVJ9L2ApIHx8XG4gICAgZmlsZS5wYXRoLnN0YXJ0c1dpdGgoXCJCaW5uQWdlbnRYL1RlbXBsYXRlcy9cIikgfHxcbiAgICBmaWxlLmJhc2VuYW1lID09PSBcIkRhc2hib2FyZFwiIHx8XG4gICAgZmlsZS5iYXNlbmFtZSA9PT0gXCIwMC1EYXNoYm9hcmRcIiB8fFxuICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChMSUJSQVJZX05PVEVTLCBmaWxlLnBhdGgpIHx8XG4gICAgY2FjaGU/LmZyb250bWF0dGVyPy5iaW5uYWdlbnRfc3luYyA9PT0gZmFsc2VcbiAgKVxuICAgIHJldHVybiBmYWxzZTtcbiAgY29uc3QgcGF0aEFsbG93ZWQgPSBmb2xkZXJzLnNvbWUoXG4gICAgKGZvbGRlcikgPT4gZmlsZS5wYXRoID09PSBmb2xkZXIgfHwgZmlsZS5wYXRoLnN0YXJ0c1dpdGgoYCR7Zm9sZGVyfS9gKSxcbiAgKTtcbiAgY29uc3QgZmlsZVRhZ3MgPSB1bmlxdWVTdHJpbmdzKFtcbiAgICAuLi4oY2FjaGU/LnRhZ3MgPz8gW10pLm1hcCgodGFnKSA9PiB0YWcudGFnKSxcbiAgICAuLi5hcnJheVN0cmluZ3MoY2FjaGU/LmZyb250bWF0dGVyPy50YWdzKSxcbiAgXSk7XG4gIHJldHVybiBwYXRoQWxsb3dlZCB8fCB0YWdzLnNvbWUoKHRhZykgPT4gZmlsZVRhZ3MuaW5jbHVkZXModGFnKSk7XG59XG5mdW5jdGlvbiBpbmZlcktpbmQodmFsdWU6IHVua25vd24sIHRhZ3M6IHN0cmluZ1tdKTogTGVhcm5pbmdLaW5kIHtcbiAgY29uc3QgY2FuZGlkYXRlID1cbiAgICB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCJcbiAgICAgID8gdmFsdWVcbiAgICAgIDogdGFncy5maW5kKCh0YWcpID0+XG4gICAgICAgICAgW1xuICAgICAgICAgICAgXCJ2b2NhYnVsYXJ5XCIsXG4gICAgICAgICAgICBcImdyYW1tYXJcIixcbiAgICAgICAgICAgIFwid3JpdGluZ19leHByZXNzaW9uXCIsXG4gICAgICAgICAgICBcInJlYWRpbmdfc2tpbGxcIixcbiAgICAgICAgICAgIFwiZXhhbV9za2lsbFwiLFxuICAgICAgICAgICAgXCJ3cml0aW5nX3NraWxsXCIsXG4gICAgICAgICAgXS5pbmNsdWRlcyh0YWcpLFxuICAgICAgICApO1xuICByZXR1cm4gKFxuICAgIFtcbiAgICAgIFwidm9jYWJ1bGFyeVwiLFxuICAgICAgXCJncmFtbWFyXCIsXG4gICAgICBcIndyaXRpbmdfZXhwcmVzc2lvblwiLFxuICAgICAgXCJyZWFkaW5nX3NraWxsXCIsXG4gICAgICBcImV4YW1fc2tpbGxcIixcbiAgICAgIFwid3JpdGluZ19za2lsbFwiLFxuICAgIF0gYXMgc3RyaW5nW11cbiAgKS5pbmNsdWRlcyhjYW5kaWRhdGUgPz8gXCJcIilcbiAgICA/IChjYW5kaWRhdGUgYXMgTGVhcm5pbmdLaW5kKVxuICAgIDogXCJyZWFkaW5nX3NraWxsXCI7XG59XG5mdW5jdGlvbiB1cGRhdGVNYW5hZ2VkRGFzaGJvYXJkTGlua3MobWFya2Rvd246IHN0cmluZywgc291cmNlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IHVwZGF0ZWQgPSBtYXJrZG93blxuICAgIC5yZXBsYWNlQWxsKFwiQmlubkFnZW50WC8wMS1Wb2NhYnVsYXJ5L0Rhc2hib2FyZFwiLCBcIkJpbm5BZ2VudFgvMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIkJpbm5BZ2VudFgvMDItR3JhbW1hci9EYXNoYm9hcmRcIiwgXCJCaW5uQWdlbnRYLzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCIuLi8wMS1Wb2NhYnVsYXJ5L0Rhc2hib2FyZFwiLCBcIi4uLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCIuLi8wMi1HcmFtbWFyL0Rhc2hib2FyZFwiLCBcIi4uLzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJbWzAxLVZvY2FidWxhcnkvRGFzaGJvYXJkXCIsIFwiW1swMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFwiW1swMi1HcmFtbWFyL0Rhc2hib2FyZFwiLCBcIltbMDItR3JhbW1hci8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIltbRGFzaGJvYXJkfFx1NjAzQiBEYXNoYm9hcmRcIiwgXCJbWzAwLURhc2hib2FyZHxcdTYwM0IgRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXG4gICAgICAnV0hFUkUgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCIgQU5EICFjb250YWlucyhmaWxlLnBhdGgsIFwiLzA1LVRlbXBsYXRlcy9cIiknLFxuICAgICAgJ1dIRVJFIGZpbGUubmFtZSAhPSBcIjAwLURhc2hib2FyZFwiIEFORCBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIiBBTkQgIWNvbnRhaW5zKGZpbGUucGF0aCwgXCIvMDUtVGVtcGxhdGVzL1wiKScsXG4gICAgKTtcbiAgaWYgKFxuICAgIHNvdXJjZVBhdGguc3RhcnRzV2l0aChgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvYCkgfHxcbiAgICBzb3VyY2VQYXRoLnN0YXJ0c1dpdGgoYCR7TElCUkFSWV9ST09UfS8wMi1HcmFtbWFyL2ApXG4gICkge1xuICAgIHVwZGF0ZWQgPSB1cGRhdGVkLnJlcGxhY2VBbGwoXCJbW0Rhc2hib2FyZF1dXCIsIFwiW1swMC1EYXNoYm9hcmRdXVwiKTtcbiAgfVxuICBpZiAoc291cmNlUGF0aC5lbmRzV2l0aChcIi9EYXNoYm9hcmQubWRcIikgfHwgc291cmNlUGF0aC5lbmRzV2l0aChcIi8wMC1EYXNoYm9hcmQubWRcIikpIHtcbiAgICB1cGRhdGVkID0gdXBkYXRlZC5yZXBsYWNlQWxsKFxuICAgICAgJ1dIRVJFIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiJyxcbiAgICAgICdXSEVSRSBmaWxlLm5hbWUgIT0gXCIwMC1EYXNoYm9hcmRcIiBBTkQgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCInLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHVwZGF0ZWQ7XG59XG5mdW5jdGlvbiBzdW1tYXJpemUobWFya2Rvd246IHN0cmluZywgbGltaXQ6IG51bWJlcik6IHN0cmluZyB7XG4gIHJldHVybiBtYXJrZG93blxuICAgIC5yZXBsYWNlKC9eLS0tW1xcc1xcU10qPy0tLVxccyovdSwgXCJcIilcbiAgICAucmVwbGFjZSgvYGBgW1xcc1xcU10qP2BgYC9ndSwgXCJcIilcbiAgICAucmVwbGFjZSgvIT8oXFxbKFteXFxdXSopXFxdXFwoW14pXSpcXCkpL2d1LCBcIiQyXCIpXG4gICAgLnJlcGxhY2UoL1sjPipfYF0vZ3UsIFwiIFwiKVxuICAgIC5yZXBsYWNlKC9cXHMrL2d1LCBcIiBcIilcbiAgICAudHJpbSgpXG4gICAgLnNsaWNlKDAsIGxpbWl0KTtcbn1cbmZ1bmN0aW9uIHNhZmVGaWxlbmFtZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIChcbiAgICB2YWx1ZVxuICAgICAgLnJlcGxhY2UoL1tcXFxcLzoqP1wiPD58XS9nLCBcIi1cIilcbiAgICAgIC50cmltKClcbiAgICAgIC5zbGljZSgwLCA4MCkgfHwgXCJhc3NldFwiXG4gICk7XG59XG5mdW5jdGlvbiB5YW1sU3RyaW5nKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvXFxcXC9nLCBcIlxcXFxcXFxcXCIpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHNoYTI1Nih2YWx1ZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZGlnZXN0ID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMjU2XCIsIG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZSh2YWx1ZSkpO1xuICByZXR1cm4gQXJyYXkuZnJvbShuZXcgVWludDhBcnJheShkaWdlc3QpLCAoYnl0ZSkgPT4gYnl0ZS50b1N0cmluZygxNikucGFkU3RhcnQoMiwgXCIwXCIpKS5qb2luKFwiXCIpO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogInlhQUFBLElBQUFBLEVBQUEsR0FBQUMsRUFBQUQsRUFBQSxhQUFBRSxJQUFBLGVBQUFDLEVBQUFILEdBQUEsSUFBQUksRUFBa0Ysb0JBa0U1RUMsRUFBZSxhQUNmQyxFQUFrQixDQUN0QixXQUNBLGdCQUNBLGFBQ0EsYUFDQSxhQUNBLGVBQ0EsZ0JBQ0YsRUFDTUMsRUFBZSxHQUFHRixDQUFZLFlBQzlCRyxFQUFrQixHQUFHSCxDQUFZLGdCQUNqQ0ksRUFBb0IsR0FBR0osQ0FBWSxrQkFDbkNLLEVBQTBCLEVBQzFCQyxFQUF1QixDQUMzQixDQUFDLEdBQUdOLENBQVksZ0JBQWlCLEdBQUdBLENBQVksa0JBQWtCLEVBQ2xFLENBQUMsR0FBR0EsQ0FBWSw4QkFBK0IsR0FBR0EsQ0FBWSxnQ0FBZ0MsRUFDOUYsQ0FBQyxHQUFHQSxDQUFZLDJCQUE0QixHQUFHQSxDQUFZLDZCQUE2QixDQUMxRixFQUVNTyxFQUFpQyxDQUNyQyxXQUFZLGdDQUNaLGFBQWMsR0FDZCxXQUFZLEdBQ1osZUFBZ0IsYUFDaEIsWUFBYSxHQUNiLFNBQVUsR0FDVixxQkFBc0IsSUFDdEIsU0FBVSxHQUNWLGVBQWdCLEVBQ2hCLGFBQWMsR0FDZCxjQUFlLEdBQ2YsZ0JBQWlCLEVBQ25CLEVBRU1DLEVBQTZDLENBQ2pELGtCQUNFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBQ0Ysa0JBQ0U7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBQ0YsOEJBQ0U7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBQ0YsOEJBQ0U7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLENBQ0osRUFFTUMsRUFBd0MsQ0FDNUMsQ0FBQyxHQUFHVCxDQUFZLGtCQUFrQixFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBeUJyQyxDQUFDLEdBQUdBLENBQVksOEJBQVUsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQW9EN0IsQ0FBQyxHQUFHQSxDQUFZLGdEQUE0QixFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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LEVBQWdDLENBQ3BELElBQU1iLEVBQVMsTUFBTSxPQUFPLE9BQU8sT0FBTyxVQUFXLElBQUksWUFBWSxFQUFFLE9BQU9hLENBQUssQ0FBQyxFQUNwRixPQUFPLE1BQU0sS0FBSyxJQUFJLFdBQVdiLENBQU0sRUFBSTRCLEdBQVNBLEVBQUssU0FBUyxFQUFFLEVBQUUsU0FBUyxFQUFHLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUNqRyIsCiAgIm5hbWVzIjogWyJtYWluX2V4cG9ydHMiLCAiX19leHBvcnQiLCAiQmlubkFnZW50WExlYXJuaW5nU3luY1BsdWdpbiIsICJfX3RvQ29tbW9uSlMiLCAiaW1wb3J0X29ic2lkaWFuIiwgIkxJQlJBUllfUk9PVCIsICJMSUJSQVJZX0ZPTERFUlMiLCAiSU5CT1hfRk9MREVSIiwgIlRFTVBMQVRFX0ZPTERFUiIsICJBVFRBQ0hNRU5UX0ZPTERFUiIsICJDVVJSRU5UX0xJQlJBUllfVkVSU0lPTiIsICJEQVNIQk9BUkRfTUlHUkFUSU9OUyIsICJERUZBVUxUX1NFVFRJTkdTIiwgIkxFQVJOSU5HX1RFTVBMQVRFUyIsICJMSUJSQVJZX05PVEVTIiwgIkJpbm5BZ2VudFhTZXR0aW5nVGFiIiwgImVycm9yIiwgIm1lc3NhZ2UiLCAiZm9sZGVycyIsICJzcGxpdFNjb3BlIiwgInRhZ3MiLCAidGFnIiwgImZpbGVzIiwgImZpbGUiLCAiaXNBbGxvd2VkIiwgImNhY2hlIiwgImZyb250bWF0dGVyIiwgInVuaXF1ZVN0cmluZ3MiLCAiYXJyYXlTdHJpbmdzIiwgImluZmVyS2luZCIsICJzdW1tYXJpemUiLCAiZW50cmllcyIsICJlbnRyeSIsICJzaG93Tm90aWNlIiwgImluc3RhbGxlZCIsICJuYW1lIiwgImZvbGRlciIsICJjb250ZW50IiwgInBhdGgiLCAibWlncmF0ZWQiLCAibGVnYWN5UGF0aCIsICJ0YXJnZXRQYXRoIiwgImxlZ2FjeSIsICJ1cGRhdGVkIiwgInVwZGF0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcyIsICJjb25maWd1cmFibGVWYXVsdCIsICJwYXRjaCIsICJhZGFwdGVyIiwgImN1cnJlbnQiLCAicmF3IiwgInBhcnNlZCIsICJleHBvcnRlZCIsICJyZXNwb25zZSIsICJyZXN1bHQiLCAib3JnYW5pemVkIiwgIm9yZ2FuaXphdGlvblN1bW1hcnkiLCAic3VtbWFyaXplT3JnYW5pemF0aW9uIiwgInN5bmNTdW1tYXJ5IiwgInBsYW4iLCAiYWxsb3dlZFRhcmdldHMiLCAiY29tcGxldGVkIiwgImFjdGlvbiIsICJmaWxlTmFtZSIsICJleHRlbnNpb25JbmRleCIsICJiYXNlTmFtZSIsICJleHRlbnNpb24iLCAiYmFzZVBhdGgiLCAicmV0cnlQYXRoIiwgInNvdXJjZSIsICJiYXNlIiwgImhlYWRlcnMiLCAiZXhwb3J0cyIsICJpdGVtIiwgImRpZ2VzdCIsICJzaGEyNTYiLCAiYWNrIiwgImZpbGVuYW1lIiwgInNhZmVGaWxlbmFtZSIsICJleGlzdGluZyIsICJ5YW1sU3RyaW5nIiwgImJvZHkiLCAiYXBwIiwgInBsdWdpbiIsICJjb250YWluZXJFbCIsICJidXR0b24iLCAidG9nZ2xlIiwgInZhbHVlIiwgInRleHQiLCAiZm9sZGVyTGFiZWxzIiwgImNvdW50cyIsICJsYWJlbCIsICJkZXN0aW5hdGlvbnMiLCAiY291bnQiLCAicGFydCIsICJ2YWx1ZXMiLCAicGF0aEFsbG93ZWQiLCAiZmlsZVRhZ3MiLCAiY2FuZGlkYXRlIiwgIm1hcmtkb3duIiwgInNvdXJjZVBhdGgiLCAibGltaXQiLCAiYnl0ZSJdCn0K
