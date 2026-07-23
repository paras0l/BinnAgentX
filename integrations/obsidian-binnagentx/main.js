"use strict";
var y = Object.defineProperty;
var T = Object.getOwnPropertyDescriptor;
var O = Object.getOwnPropertyNames;
var B = Object.prototype.hasOwnProperty;
var I = (i, t) => {
    for (var n in t) y(i, n, { get: t[n], enumerable: !0 });
  },
  P = (i, t, n, a) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let e of O(t))
        !B.call(i, e) &&
          e !== n &&
          y(i, e, { get: () => t[e], enumerable: !(a = T(t, e)) || a.enumerable });
    return i;
  };
var R = (i) => P(y({}, "__esModule", { value: !0 }), i);
var U = {};
I(U, { default: () => b });
module.exports = R(U);
var o = require("obsidian"),
  s = "BinnAgentX",
  F = [
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
  v = `${s}/06-Attachments`,
  S = 2,
  C = [
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
  N = {
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

\u7B2C\u4E00\u6B21\u4F7F\u7528\u8BF7\u5148\u8BFB [[\u4F7F\u7528\u6307\u5357]]\u3002\u4E4B\u540E\u4ECE [[00-Inbox/\u6536\u96C6\u7BB1\u4F7F\u7528\u8BF4\u660E|\u6536\u96C6\u7BB1]] \u5F00\u59CB\uFF0C\u628A\u788E\u7247\u5B9A\u671F\u6574\u7406\u5230\u4E0B\u9762\u7684\u9886\u57DF\u76EE\u5F55\u3002

## \u5185\u5BB9\u5730\u56FE\uFF08MOC\uFF09

- [[01-Vocabulary/00-Dashboard|\u8BCD\u6C47 Dashboard]]
- [[02-Grammar/00-Dashboard|\u8BED\u6CD5 Dashboard]]
- [[03-Reading/\u9605\u8BFB\u7B14\u8BB0\u793A\u4F8B|\u9605\u8BFB]]
- [[04-Writing/\u5199\u4F5C\u7EC3\u4E60\u793A\u4F8B|\u5199\u4F5C]]
- [[05-Templates/\u8BCD\u6C47|\u7B14\u8BB0\u6A21\u677F]]

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

## Dashboard \u548C Dataview

Dashboard \u672C\u8EAB\u662F\u5185\u5BB9\u5730\u56FE\uFF08MOC\uFF09\uFF0C\u91CC\u9762\u7684\u666E\u901A\u94FE\u63A5\u4E0D\u4F9D\u8D56\u4EFB\u4F55\u63D2\u4EF6\u3002\u5B89\u88C5\u5E76\u542F\u7528\u793E\u533A\u63D2\u4EF6 **Dataview** \u540E\uFF0C\u8BCD\u6C47\u3001\u8BED\u6CD5\u548C\u6700\u8FD1\u66F4\u65B0\u5217\u8868\u4F1A\u81EA\u52A8\u751F\u6210\uFF1B\u672A\u5B89\u88C5\u65F6\u53EA\u4F1A\u770B\u5230\u67E5\u8BE2\u4EE3\u7801\u5757\uFF0C\u4E0D\u5F71\u54CD\u5176\u4ED6\u7B14\u8BB0\u3002

## \u9644\u4EF6

\u63D2\u4EF6\u4F1A\u628A Obsidian \u7684\u9ED8\u8BA4\u9644\u4EF6\u4F4D\u7F6E\u8BBE\u4E3A \`BinnAgentX/06-Attachments\`\u3002\u4E4B\u540E\u7C98\u8D34\u56FE\u7247\u6216\u52A0\u5165 PDF \u65F6\uFF0C\u9644\u4EF6\u4F1A\u96C6\u4E2D\u5B58\u653E\uFF0C\u6B63\u6587\u4ECD\u53EF\u7528 Obsidian \u94FE\u63A5\u5F15\u7528\u3002

## \u4E0D\u4F1A\u53D1\u751F\u4EC0\u4E48

- \u521D\u59CB\u5316\u53EF\u4EE5\u91CD\u590D\u6267\u884C\uFF0C\u4F46\u4E0D\u4F1A\u8986\u76D6\u540C\u540D\u6587\u4EF6\u6216\u4F60\u5DF2\u7ECF\u4FEE\u6539\u7684\u6A21\u677F\u3002
- \u63D2\u4EF6\u4E0D\u4F1A\u81EA\u52A8\u66FF\u4F60\u79FB\u52A8\u3001\u5220\u9664\u6216\u201C\u6574\u7406\u5B8C\u6210\u201D\u6536\u96C6\u7BB1\u91CC\u7684\u5185\u5BB9\u3002
- \u6307\u5357\u3001Dashboard \u548C\u521D\u59CB\u5316\u793A\u4F8B\u5E26\u6709 \`binnagent_sync: false\`\uFF0C\u4E0D\u4F1A\u4F5C\u4E3A\u4F60\u7684\u4E2A\u4EBA\u5B66\u4E60\u4E0A\u4E0B\u6587\u4E0A\u4F20\u3002
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
      if (this.settings.libraryVersion < S)
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
      let a = this.app.vault.getMarkdownFiles().filter((e) => V(e, t, n, this.app));
      if (a.length > this.settings.maxNotes)
        throw new Error(
          `\u5339\u914D\u5230 ${a.length} \u7BC7\u7B14\u8BB0\uFF0C\u8BF7\u7F29\u5C0F\u8303\u56F4\uFF08\u4E0A\u9650 ${this.settings.maxNotes}\uFF09`,
        );
      return Promise.all(
        a.map(async (e) => {
          let r = this.app.metadataCache.getFileCache(e),
            l = r?.frontmatter ?? {},
            c = w([...E(l.tags), ...(r?.tags ?? []).map((g) => g.tag.replace(/^#/, ""))]);
          return {
            source_key: e.path,
            asset_id: typeof l.binnagent_asset_id == "string" ? l.binnagent_asset_id : void 0,
            title: String(l.title ?? e.basename),
            kind: X(l.binnagent_kind, c),
            tags: c,
            excerpt: W(await this.app.vault.read(e), this.settings.maxExcerptCharacters),
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
      for (let a of F) {
        let e = `${s}/${a}`;
        this.app.vault.getAbstractFileByPath(e) || (await this.app.vault.createFolder(e), (n += 1));
      }
      ((n += await this.migrateManagedDashboards()), await this.rewriteManagedDashboardLinks());
      for (let [a, e] of Object.entries(N))
        this.app.vault.getAbstractFileByPath(`${u}/${a}`) ||
          (await this.app.vault.create(`${u}/${a}`, e), (n += 1));
      for (let [a, e] of Object.entries(k))
        this.app.vault.getAbstractFileByPath(a) || (await this.app.vault.create(a, e), (n += 1));
      (await this.configureObsidianFolders(),
        (this.settings.libraryVersion = S),
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
      for (let [n, a] of C) {
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
          e = z(a, n.path);
        e !== a && (await this.app.vault.modify(n, e));
      }
    }
    async configureObsidianFolders() {
      let t = this.app.vault;
      (typeof t.setConfig == "function"
        ? t.setConfig("attachmentFolderPath", v)
        : await this.mergeConfigFile(`${this.app.vault.configDir}/app.json`, {
            attachmentFolderPath: v,
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
          A = `${r.target_folder}/${g}-${r.action_id.slice(0, 6)}.${h}`,
          D = this.app.vault.getAbstractFileByPath(r.source_key);
        if (!(D instanceof o.TFile)) {
          (this.app.vault.getAbstractFileByPath(d) instanceof o.TFile ||
            this.app.vault.getAbstractFileByPath(A) instanceof o.TFile) &&
            a.push(r.action_id);
          continue;
        }
        let _ = this.app.vault.getAbstractFileByPath(d) ? A : d;
        this.app.vault.getAbstractFileByPath(_) ||
          (await this.app.vault.rename(D, _), a.push(r.action_id));
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
            "\u521B\u5EFA 00\u201306 \u76EE\u5F55\u3001MOC / Dataview Dashboard\u3001\u6A21\u677F\u4E0E\u5165\u95E8\u793A\u4F8B\uFF1B\u4E0D\u4F1A\u8986\u76D6\u5DF2\u6709\u6587\u4EF6\u3002",
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
function E(i) {
  return Array.isArray(i) ? i.filter((t) => typeof t == "string") : typeof i == "string" ? [i] : [];
}
function w(i) {
  return [...new Set(i.map((t) => t.replace(/^#/, "").trim()).filter(Boolean))];
}
function V(i, t, n, a) {
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
    l = w([...(e?.tags ?? []).map((c) => c.tag), ...E(e?.frontmatter?.tags)]);
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
function z(i, t) {
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
function W(i, t) {
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEFwcCwgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIFRGaWxlLCByZXF1ZXN0VXJsIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbnR5cGUgTGVhcm5pbmdLaW5kID1cbiAgfCBcInZvY2FidWxhcnlcIlxuICB8IFwiZ3JhbW1hclwiXG4gIHwgXCJ3cml0aW5nX2V4cHJlc3Npb25cIlxuICB8IFwicmVhZGluZ19za2lsbFwiXG4gIHwgXCJleGFtX3NraWxsXCJcbiAgfCBcIndyaXRpbmdfc2tpbGxcIjtcblxuaW50ZXJmYWNlIFN5bmNTZXR0aW5ncyB7XG4gIGFwaUJhc2VVcmw6IHN0cmluZztcbiAgY29ubmVjdGlvbklkOiBzdHJpbmc7XG4gIHN5bmNTZWNyZXQ6IHN0cmluZztcbiAgYWxsb3dlZEZvbGRlcnM6IHN0cmluZztcbiAgYWxsb3dlZFRhZ3M6IHN0cmluZztcbiAgbWF4Tm90ZXM6IG51bWJlcjtcbiAgbWF4RXhjZXJwdENoYXJhY3RlcnM6IG51bWJlcjtcbiAgYXV0b1N5bmM6IGJvb2xlYW47XG4gIGxpYnJhcnlWZXJzaW9uOiBudW1iZXI7XG4gIGxhc3RTeW5jZWRBdDogc3RyaW5nO1xuICBsYXN0U3luY0Vycm9yOiBzdHJpbmc7XG4gIGxhc3RTeW5jU3VtbWFyeTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTGVhcm5pbmdDb250ZXh0RW50cnkge1xuICBzb3VyY2Vfa2V5OiBzdHJpbmc7XG4gIGFzc2V0X2lkPzogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHRhZ3M6IHN0cmluZ1tdO1xuICBleGNlcnB0OiBzdHJpbmc7XG4gIG1vZGlmaWVkX2F0OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQZW5kaW5nQXNzZXRFeHBvcnQge1xuICBhc3NldF9pZDogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHRhZ3M6IHN0cmluZ1tdO1xuICBzb3VyY2VfdHlwZTogc3RyaW5nO1xuICBzb3VyY2VfdGFza19pZDogc3RyaW5nIHwgbnVsbDtcbiAgaW5pdGlhbF9jb250ZW50OiBzdHJpbmcgfCBudWxsO1xufVxuXG5pbnRlcmZhY2UgT3JnYW5pemF0aW9uQWN0aW9uIHtcbiAgYWN0aW9uX2lkOiBzdHJpbmc7XG4gIHNvdXJjZV9rZXk6IHN0cmluZztcbiAgdGFyZ2V0X2ZvbGRlcjogc3RyaW5nO1xuICBraW5kOiBMZWFybmluZ0tpbmQ7XG4gIHJlYXNvbjogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgT3JnYW5pemF0aW9uUGxhbiB7XG4gIHJ1bl9pZDogc3RyaW5nO1xuICBzdGF0dXM6IFwicXVldWVkXCIgfCBcInBsYW5uZWRcIiB8IFwibm9vcFwiO1xuICBpbmJveF9jb3VudDogbnVtYmVyO1xuICBjbGFzc2lmaWVkX2NvdW50OiBudW1iZXI7XG4gIGFjdGlvbnM6IE9yZ2FuaXphdGlvbkFjdGlvbltdO1xufVxuXG5pbnRlcmZhY2UgSW1wb3J0UmVzcG9uc2Uge1xuICBpbXBvcnRlZDogbnVtYmVyO1xuICBvcmdhbml6YXRpb246IE9yZ2FuaXphdGlvblBsYW4gfCBudWxsO1xufVxuXG5jb25zdCBMSUJSQVJZX1JPT1QgPSBcIkJpbm5BZ2VudFhcIjtcbmNvbnN0IExJQlJBUllfRk9MREVSUyA9IFtcbiAgXCIwMC1JbmJveFwiLFxuICBcIjAxLVZvY2FidWxhcnlcIixcbiAgXCIwMi1HcmFtbWFyXCIsXG4gIFwiMDMtUmVhZGluZ1wiLFxuICBcIjA0LVdyaXRpbmdcIixcbiAgXCIwNS1UZW1wbGF0ZXNcIixcbiAgXCIwNi1BdHRhY2htZW50c1wiLFxuXSBhcyBjb25zdDtcbmNvbnN0IElOQk9YX0ZPTERFUiA9IGAke0xJQlJBUllfUk9PVH0vMDAtSW5ib3hgO1xuY29uc3QgVEVNUExBVEVfRk9MREVSID0gYCR7TElCUkFSWV9ST09UfS8wNS1UZW1wbGF0ZXNgO1xuY29uc3QgQVRUQUNITUVOVF9GT0xERVIgPSBgJHtMSUJSQVJZX1JPT1R9LzA2LUF0dGFjaG1lbnRzYDtcbmNvbnN0IENVUlJFTlRfTElCUkFSWV9WRVJTSU9OID0gMjtcbmNvbnN0IERBU0hCT0FSRF9NSUdSQVRJT05TID0gW1xuICBbYCR7TElCUkFSWV9ST09UfS9EYXNoYm9hcmQubWRgLCBgJHtMSUJSQVJZX1JPT1R9LzAwLURhc2hib2FyZC5tZGBdLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5L0Rhc2hib2FyZC5tZGAsIGAke0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmQubWRgXSxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDItR3JhbW1hci9EYXNoYm9hcmQubWRgLCBgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkLm1kYF0sXG5dIGFzIGNvbnN0O1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTeW5jU2V0dGluZ3MgPSB7XG4gIGFwaUJhc2VVcmw6IFwiaHR0cDovLzEyNy4wLjAuMTo4MDAwL2xlYXJuZXJcIixcbiAgY29ubmVjdGlvbklkOiBcIlwiLFxuICBzeW5jU2VjcmV0OiBcIlwiLFxuICBhbGxvd2VkRm9sZGVyczogXCJCaW5uQWdlbnRYXCIsXG4gIGFsbG93ZWRUYWdzOiBcIlwiLFxuICBtYXhOb3RlczogODAsXG4gIG1heEV4Y2VycHRDaGFyYWN0ZXJzOiA5MDAsXG4gIGF1dG9TeW5jOiB0cnVlLFxuICBsaWJyYXJ5VmVyc2lvbjogMCxcbiAgbGFzdFN5bmNlZEF0OiBcIlwiLFxuICBsYXN0U3luY0Vycm9yOiBcIlwiLFxuICBsYXN0U3luY1N1bW1hcnk6IFwiXCIsXG59O1xuXG5jb25zdCBMRUFSTklOR19URU1QTEFURVM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFwiXHU4QkNEXHU2QzQ3Lm1kXCI6XG4gICAgJy0tLVxcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXFxuYmlubmFnZW50X2tpbmQ6IFwidm9jYWJ1bGFyeVwiXFxubWVhbmluZzogXCJcIlxcbnN0YXR1czogbGVhcm5pbmdcXG5jcmVhdGVkOiB7e2RhdGV9fVxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSB2b2NhYnVsYXJ5XFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTY4MzhcdTVGQzNcdTU0MkJcdTRFNDlcXG5cXG4jIyBcdTUzRDFcdTk3RjNcXG5cXG4jIyBcdTVFMzhcdTc1MjhcdTY0MkRcdTkxNERcXG5cXG4jIyBcdTUzOUZcdTUzRTVcdTRFMEVcdThCRURcdTU4ODNcXG5cXG4jIyBcdTYyMTFcdTc2ODRcdTRGOEJcdTUzRTVcXG5cXG4jIyBcdTY2MTNcdTZERjdcdTZEQzZcdTcwQjlcXG5cXG4jIyBcdTUxNzNcdTgwNTRcXG4tIFtbQmlubkFnZW50WC8wMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZHxcdThCQ0RcdTZDNDcgRGFzaGJvYXJkXV1cXG4nLFxuICBcIlx1OEJFRFx1NkNENS5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcImdyYW1tYXJcIlxcbnN0YXR1czogbGVhcm5pbmdcXG5jcmVhdGVkOiB7e2RhdGV9fVxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSBncmFtbWFyXFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTRFMDBcdTUzRTVcdThCRERcdTg5QzRcdTUyMTlcXG5cXG4jIyBcdTdFRDNcdTY3ODRcdTUxNkNcdTVGMEZcXG5cXG4jIyBcdTUyMjRcdTY1QURcdTdFQkZcdTdEMjJcXG5cXG4jIyBcdTUzOUZcdTUzRTVcdTYyQzZcdTg5RTNcXG5cXG4jIyBcdTVFMzhcdTg5QzFcdThCRUZcdTUzM0FcXG5cXG4jIyBcdTY1QjBcdThCRURcdTU4ODNcdTlBOENcdThCQzFcXG5cXG4jIyBcdTUxNzNcdTgwNTRcXG4tIFtbQmlubkFnZW50WC8wMi1HcmFtbWFyLzAwLURhc2hib2FyZHxcdThCRURcdTZDRDUgRGFzaGJvYXJkXV1cXG4nLFxuICBcIlx1NTE5OVx1NEY1Q1x1ODg2OFx1OEZCRS5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcIndyaXRpbmdfZXhwcmVzc2lvblwiXFxuY3JlYXRlZDoge3tkYXRlfX1cXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gd3JpdGluZy1leHByZXNzaW9uXFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTg4NjhcdThGQkVcdTUyOUZcdTgwRkRcXG5cXG4jIyBcdTUzRTVcdTVGMEZcdTlBQThcdTY3QjZcXG5cXG4jIyBcdTUzOUZcdTU5Q0JcdTgzMDNcdTRGOEJcXG5cXG4jIyBcdTYyMTFcdTc2ODRcdTY1MzlcdTUxOTlcXG5cXG4jIyBcdTUzRUZcdTY2RkZcdTYzNjJcdThCQ0RcdTY5RkRcXG4nLFxuICBcIlx1OTYwNVx1OEJGQlx1N0I1Nlx1NzU2NS5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcInJlYWRpbmdfc2tpbGxcIlxcbmNyZWF0ZWQ6IHt7ZGF0ZX19XFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHJlYWRpbmctc2tpbGxcXG4tLS1cXG5cXG4jIHt7dGl0bGV9fVxcblxcbiMjIFx1OTAwMlx1NzUyOFx1NTczQVx1NjY2RlxcblxcbiMjIFx1NjRDRFx1NEY1Q1x1NkI2NVx1OUFBNFxcblxcbiMjIFx1OEJDMVx1NjM2RVx1NUI5QVx1NEY0RFxcblxcbiMjIFx1NTkzMVx1OEQyNVx1NEZFMVx1NTNGN1xcblxcbiMjIFx1NjVCMFx1NjU4N1x1N0FFMFx1OUE4Q1x1OEJDMVxcbicsXG59O1xuXG5jb25zdCBMSUJSQVJZX05PVEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBbYCR7TElCUkFSWV9ST09UfS8wMC1EYXNoYm9hcmQubWRgXTogYCMgQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTU3MzBcdTU2RkVcblxuXHU3QjJDXHU0RTAwXHU2QjIxXHU0RjdGXHU3NTI4XHU4QkY3XHU1MTQ4XHU4QkZCIFtbXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3XV1cdTMwMDJcdTRFNEJcdTU0MEVcdTRFQ0UgW1swMC1JbmJveC9cdTY1MzZcdTk2QzZcdTdCQjFcdTRGN0ZcdTc1MjhcdThCRjRcdTY2MEV8XHU2NTM2XHU5NkM2XHU3QkIxXV0gXHU1RjAwXHU1OUNCXHVGRjBDXHU2MjhBXHU3ODhFXHU3MjQ3XHU1QjlBXHU2NzFGXHU2NTc0XHU3NDA2XHU1MjMwXHU0RTBCXHU5NzYyXHU3Njg0XHU5ODg2XHU1N0RGXHU3NkVFXHU1RjU1XHUzMDAyXG5cbiMjIFx1NTE4NVx1NUJCOVx1NTczMFx1NTZGRVx1RkYwOE1PQ1x1RkYwOVxuXG4tIFtbMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dXG4tIFtbMDItR3JhbW1hci8wMC1EYXNoYm9hcmR8XHU4QkVEXHU2Q0Q1IERhc2hib2FyZF1dXG4tIFtbMDMtUmVhZGluZy9cdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTc5M0FcdTRGOEJ8XHU5NjA1XHU4QkZCXV1cbi0gW1swNC1Xcml0aW5nL1x1NTE5OVx1NEY1Q1x1N0VDM1x1NEU2MFx1NzkzQVx1NEY4QnxcdTUxOTlcdTRGNUNdXVxuLSBbWzA1LVRlbXBsYXRlcy9cdThCQ0RcdTZDNDd8XHU3QjE0XHU4QkIwXHU2QTIxXHU2NzdGXV1cblxuIyMgXHU2NzAwXHU4RkQxXHU2NkY0XHU2NUIwXHVGRjA4RGF0YXZpZXdcdUZGMDlcblxuXFxgXFxgXFxgZGF0YXZpZXdcblRBQkxFIFdJVEhPVVQgSUQgZmlsZS5saW5rIEFTIFwiXHU3QjE0XHU4QkIwXCIsIGJpbm5hZ2VudF9raW5kIEFTIFwiXHU3QzdCXHU1NzhCXCIsIGZpbGUubXRpbWUgQVMgXCJcdTY2RjRcdTY1QjBcdTY1RjZcdTk1RjRcIlxuRlJPTSBcIkJpbm5BZ2VudFhcIlxuV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiIEFORCAhY29udGFpbnMoZmlsZS5wYXRoLCBcIi8wNS1UZW1wbGF0ZXMvXCIpXG5TT1JUIGZpbGUubXRpbWUgREVTQ1xuTElNSVQgMTJcblxcYFxcYFxcYFxuXG4+IFx1NjcyQVx1NUI4OVx1ODhDNSBEYXRhdmlldyBcdTY1RjZcdUZGMENcdTRFMEFcdTk3NjJcdTc2ODRcdTY3RTVcdThCRTJcdTRGMUFcdTY2M0VcdTc5M0FcdTRFM0FcdTRFRTNcdTc4MDFcdTU3NTdcdUZGMUJNT0MgXHU5NEZFXHU2M0E1XHU0RUNEXHU1M0VGXHU2QjYzXHU1RTM4XHU0RjdGXHU3NTI4XHUzMDAyXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS9cdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTcubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIGd1aWRlXG4tLS1cblxuIyBCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1NUU5M1x1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N1xuXG5cdThGRDlcdTU5NTdcdTc2RUVcdTVGNTVcdTYyOEFcdTIwMUNcdTVGRUJcdTkwMUZcdThCQjBcdTVGNTVcdTIwMURcdTU0OENcdTIwMUNcdTk1N0ZcdTY3MUZcdTY1NzRcdTc0MDZcdTIwMURcdTUyMDZcdTVGMDBcdTMwMDJcdTY3MDBcdTdCODBcdTUzNTVcdTc2ODRcdTc1MjhcdTZDRDVcdTUzRUFcdTY3MDlcdTRFMDlcdTZCNjVcdUZGMUEqKlx1NTE0OFx1NjUzNlx1OTZDNlx1MzAwMVx1NTE4RFx1NjU3NFx1NzQwNlx1MzAwMVx1NUUzOFx1NTZERVx1OTg3RSoqXHUzMDAyXG5cbiMjIFx1NzZFRVx1NUY1NVx1OEJGNFx1NjYwRVxuXG58IFx1NjU4N1x1NEVGNlx1NTkzOSB8IFx1NzUyOFx1OTAxNCB8IFx1NEVDMFx1NEU0OFx1NjVGNlx1NTAxOVx1NjUzRVx1OEZEQlx1NTNCQiB8XG58IC0tLSB8IC0tLSB8IC0tLSB8XG58IFxcYDAwLUluYm94L1xcYCB8IFx1NjUzNlx1OTZDNlx1N0JCMSB8IEJpbm5BZ2VudFggXHU1NDBDXHU2QjY1XHU2NzY1XHU3Njg0XHU2ODA3XHU2Q0U4XHUzMDAxXHU5NjhGXHU2MjRCXHU4QkIwXHU0RTBCXHU3Njg0XHU1M0U1XHU1QjUwXHUzMDAxXHU4RkQ4XHU0RTBEXHU3N0U1XHU5MDUzXHU1OTgyXHU0RjU1XHU1MjA2XHU3QzdCXHU3Njg0XHU3ODhFXHU3MjQ3IHxcbnwgXFxgMDEtVm9jYWJ1bGFyeS9cXGAgfCBcdThCQ0RcdTZDNDcgfCBcdTVERjJcdTdFQ0ZcdTg4NjVcdTUxNDVcdTRFODZcdTU0MkJcdTRFNDlcdTMwMDFcdTY0MkRcdTkxNERcdTMwMDFcdThCRURcdTU4ODNcdTYyMTZcdTRGOEJcdTUzRTVcdTc2ODRcdTUzNTVcdThCQ0RcdTU0OENcdTc3RURcdThCRUQgfFxufCBcXGAwMi1HcmFtbWFyL1xcYCB8IFx1OEJFRFx1NkNENSB8IFx1ODBGRFx1OEJGNFx1NkUwNVx1ODlDNFx1NTIxOVx1MzAwMVx1N0VEM1x1Njc4NFx1MzAwMVx1OEJFRlx1NTMzQVx1NTQ4Q1x1OUE4Q1x1OEJDMVx1NEY4Qlx1NTNFNVx1NzY4NFx1OEJFRFx1NkNENVx1NzBCOSB8XG58IFxcYDAzLVJlYWRpbmcvXFxgIHwgXHU5NjA1XHU4QkZCIHwgXHU2NTg3XHU3QUUwXHU1MzlGXHU2NTg3XHUzMDAxXHU0RTY2XHU3QzREXHU2NDU4XHU4QkIwXHUzMDAxXHU2NDU4XHU4OTgxXHUzMDAxXHU4QkMxXHU2MzZFXHU1NDhDXHU5NjA1XHU4QkZCXHU3QjU2XHU3NTY1IHxcbnwgXFxgMDQtV3JpdGluZy9cXGAgfCBcdTUxOTlcdTRGNUMgfCBcdTgyRjFcdTY1ODdcdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTMwMDFWMS9WMiBcdTRGRUVcdTY1MzlcdThGQzdcdTdBMEJcdTU0OENcdTUzRUZcdThGQzFcdTc5RkJcdTg4NjhcdThGQkUgfFxufCBcXGAwNS1UZW1wbGF0ZXMvXFxgIHwgXHU2QTIxXHU2NzdGIHwgT2JzaWRpYW4gVGVtcGxhdGVzIFx1NjgzOFx1NUZDM1x1NjNEMlx1NEVGNlx1NEY3Rlx1NzUyOFx1NzY4NFx1N0IxNFx1OEJCMFx1NkEyMVx1Njc3RiB8XG58IFxcYDA2LUF0dGFjaG1lbnRzL1xcYCB8IFx1OTY0NFx1NEVGNiB8IFx1NTZGRVx1NzI0N1x1MzAwMVBERlx1MzAwMVx1OTdGM1x1OTg5MVx1N0I0OVx1OTc1RSBNYXJrZG93biBcdTY1ODdcdTRFRjYgfFxuXG4jIyBcdTYzQThcdTgzNTBcdTVERTVcdTRGNUNcdTZENDFcblxuMS4gKipcdTk2OEZcdTY1RjZcdTY1MzZcdTk2QzYqKlx1RkYxQVx1NTE0OFx1NjI4QVx1NTE4NVx1NUJCOVx1NjUzRVx1OEZEQiBcXGAwMC1JbmJveC9cXGBcdUZGMENcdTRFMERcdTg5ODFcdTU2RTBcdTRFM0FcdTUyMDZcdTdDN0JcdTgwMENcdTYyNTNcdTY1QURcdTVCNjZcdTRFNjBcdTMwMDJcbjIuICoqXHU2QkNGXHU1NDY4XHU2NTc0XHU3NDA2KipcdUZGMUFcdTRFM0FcdTY3MDlcdTRFRjdcdTUwM0NcdTc2ODRcdTc4OEVcdTcyNDdcdTg4NjVcdTRFMEFcdTgxRUFcdTVERjFcdTc2ODRcdTg5RTNcdTkxQ0FcdTU0OENcdTRGOEJcdTUzRTVcdUZGMENcdTUxOERcdTc5RkJcdTUyQThcdTUyMzBcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTMwMDFcdTk2MDVcdThCRkJcdTYyMTZcdTUxOTlcdTRGNUNcdTc2RUVcdTVGNTVcdTMwMDJcbjMuICoqXHU1RUZBXHU3QUNCXHU4RkRFXHU2M0E1KipcdUZGMUFcdTc1MjggXFxgW1tcdTdCMTRcdThCQjBcdTU0MERdXVxcYCBcdTYyOEFcdTc2RjhcdTUxNzNcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTU0OENcdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTRFOTJcdTc2RjhcdTk0RkVcdTYzQTVcdTMwMDJcbjQuICoqXHU1NkRFXHU1MjMwXHU1NzMwXHU1NkZFKipcdUZGMUFcdTRFQ0UgW1swMC1EYXNoYm9hcmR8XHU2MDNCIERhc2hib2FyZF1dXHUzMDAxW1swMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZHxcdThCQ0RcdTZDNDcgRGFzaGJvYXJkXV0gXHU2MjE2IFtbMDItR3JhbW1hci8wMC1EYXNoYm9hcmR8XHU4QkVEXHU2Q0Q1IERhc2hib2FyZF1dIFx1NkQ0Rlx1ODlDOFx1NTQ4Q1x1NTkwRFx1NEU2MFx1MzAwMlxuXG4jIyBcdTZBMjFcdTY3N0ZcdTYwMEVcdTRFNDhcdTc1MjhcblxuXHU2M0QyXHU0RUY2XHU0RjFBXHU2MjhBIE9ic2lkaWFuIFx1NzY4NFx1NkEyMVx1Njc3Rlx1NjU4N1x1NEVGNlx1NTkzOVx1OEJCRVx1NEUzQSBcXGBCaW5uQWdlbnRYLzA1LVRlbXBsYXRlc1xcYFx1MzAwMlx1NTQyRlx1NzUyOCBPYnNpZGlhbiBcdTc2ODQgKipUZW1wbGF0ZXNcdUZGMDhcdTZBMjFcdTY3N0ZcdUZGMDlcdTY4MzhcdTVGQzNcdTYzRDJcdTRFRjYqKiBcdTU0MEVcdUZGMENcdTY1QjBcdTVFRkFcdTdCMTRcdThCQjBcdTVFNzZcdTYyNjdcdTg4NENcdTIwMUNcdTYzRDJcdTUxNjVcdTZBMjFcdTY3N0ZcdTIwMURcdUZGMENcdTUxOERcdTkwMDlcdTYyRTlcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTMwMDFcdTk2MDVcdThCRkJcdTdCNTZcdTc1NjVcdTYyMTZcdTUxOTlcdTRGNUNcdTg4NjhcdThGQkVcdTZBMjFcdTY3N0ZcdTMwMDJcblxuIyMgRGFzaGJvYXJkIFx1NTQ4QyBEYXRhdmlld1xuXG5EYXNoYm9hcmQgXHU2NzJDXHU4RUFCXHU2NjJGXHU1MTg1XHU1QkI5XHU1NzMwXHU1NkZFXHVGRjA4TU9DXHVGRjA5XHVGRjBDXHU5MUNDXHU5NzYyXHU3Njg0XHU2NjZFXHU5MDFBXHU5NEZFXHU2M0E1XHU0RTBEXHU0RjlEXHU4RDU2XHU0RUZCXHU0RjU1XHU2M0QyXHU0RUY2XHUzMDAyXHU1Qjg5XHU4OEM1XHU1RTc2XHU1NDJGXHU3NTI4XHU3OTNFXHU1MzNBXHU2M0QyXHU0RUY2ICoqRGF0YXZpZXcqKiBcdTU0MEVcdUZGMENcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTU0OENcdTY3MDBcdThGRDFcdTY2RjRcdTY1QjBcdTUyMTdcdTg4NjhcdTRGMUFcdTgxRUFcdTUyQThcdTc1MUZcdTYyMTBcdUZGMUJcdTY3MkFcdTVCODlcdTg4QzVcdTY1RjZcdTUzRUFcdTRGMUFcdTc3MEJcdTUyMzBcdTY3RTVcdThCRTJcdTRFRTNcdTc4MDFcdTU3NTdcdUZGMENcdTRFMERcdTVGNzFcdTU0Q0RcdTUxNzZcdTRFRDZcdTdCMTRcdThCQjBcdTMwMDJcblxuIyMgXHU5NjQ0XHU0RUY2XG5cblx1NjNEMlx1NEVGNlx1NEYxQVx1NjI4QSBPYnNpZGlhbiBcdTc2ODRcdTlFRDhcdThCQTRcdTk2NDRcdTRFRjZcdTRGNERcdTdGNkVcdThCQkVcdTRFM0EgXFxgQmlubkFnZW50WC8wNi1BdHRhY2htZW50c1xcYFx1MzAwMlx1NEU0Qlx1NTQwRVx1N0M5OFx1OEQzNFx1NTZGRVx1NzI0N1x1NjIxNlx1NTJBMFx1NTE2NSBQREYgXHU2NUY2XHVGRjBDXHU5NjQ0XHU0RUY2XHU0RjFBXHU5NkM2XHU0RTJEXHU1QjU4XHU2NTNFXHVGRjBDXHU2QjYzXHU2NTg3XHU0RUNEXHU1M0VGXHU3NTI4IE9ic2lkaWFuIFx1OTRGRVx1NjNBNVx1NUYxNVx1NzUyOFx1MzAwMlxuXG4jIyBcdTRFMERcdTRGMUFcdTUzRDFcdTc1MUZcdTRFQzBcdTRFNDhcblxuLSBcdTUyMURcdTU5Q0JcdTUzMTZcdTUzRUZcdTRFRTVcdTkxQ0RcdTU5MERcdTYyNjdcdTg4NENcdUZGMENcdTRGNDZcdTRFMERcdTRGMUFcdTg5ODZcdTc2RDZcdTU0MENcdTU0MERcdTY1ODdcdTRFRjZcdTYyMTZcdTRGNjBcdTVERjJcdTdFQ0ZcdTRGRUVcdTY1MzlcdTc2ODRcdTZBMjFcdTY3N0ZcdTMwMDJcbi0gXHU2M0QyXHU0RUY2XHU0RTBEXHU0RjFBXHU4MUVBXHU1MkE4XHU2NkZGXHU0RjYwXHU3OUZCXHU1MkE4XHUzMDAxXHU1MjIwXHU5NjY0XHU2MjE2XHUyMDFDXHU2NTc0XHU3NDA2XHU1QjhDXHU2MjEwXHUyMDFEXHU2NTM2XHU5NkM2XHU3QkIxXHU5MUNDXHU3Njg0XHU1MTg1XHU1QkI5XHUzMDAyXG4tIFx1NjMwN1x1NTM1N1x1MzAwMURhc2hib2FyZCBcdTU0OENcdTUyMURcdTU5Q0JcdTUzMTZcdTc5M0FcdTRGOEJcdTVFMjZcdTY3MDkgXFxgYmlubmFnZW50X3N5bmM6IGZhbHNlXFxgXHVGRjBDXHU0RTBEXHU0RjFBXHU0RjVDXHU0RTNBXHU0RjYwXHU3Njg0XHU0RTJBXHU0RUJBXHU1QjY2XHU0RTYwXHU0RTBBXHU0RTBCXHU2NTg3XHU0RTBBXHU0RjIwXHUzMDAyXG5gLFxuICBbYCR7SU5CT1hfRk9MREVSfS9cdTY1MzZcdTk2QzZcdTdCQjFcdTRGN0ZcdTc1MjhcdThCRjRcdTY2MEUubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG5pbmJveF9zdGF0dXM6IHJlZmVyZW5jZVxudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSBpbmJveFxuLS0tXG5cbiMgXHU2NTM2XHU5NkM2XHU3QkIxXHU0RjdGXHU3NTI4XHU4QkY0XHU2NjBFXG5cblx1NjgwN1x1NkNFOFx1MzAwMVx1NzA3NVx1NjExRlx1MzAwMVx1NEUwRFx1NEYxQVx1NUY1Mlx1N0M3Qlx1NzY4NFx1ODg2OFx1OEZCRVx1NTE0OFx1NjUzRVx1NTcyOFx1OEZEOVx1OTFDQ1x1RkYwQ1x1NEUwRFx1OTcwMFx1ODk4MVx1NEUwMFx1NUYwMFx1NTlDQlx1NUMzMVx1NTE5OVx1NUY5N1x1NUI4Q1x1NjU3NFx1MzAwMlxuXG4jIyBcdTZCQ0ZcdTU0NjhcdTY1NzRcdTc0MDZcblxuMS4gXHU4MEZEXHU1OTBEXHU3NTI4XHU3Njg0XHU1MzU1XHU4QkNEXHU2MjE2XHU3N0VEXHU4QkVEXHVGRjBDXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3XV1cdTMwMDJcbjIuIFx1NTNFNVx1NUI1MFx1ODBDQ1x1NTQwRVx1NzY4NFx1ODlDNFx1NTIxOVx1RkYwQ1x1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkfFx1OEJFRFx1NkNENV1dXHUzMDAyXG4zLiBcdTUzOUZcdTY1ODdcdTRFMEVcdTk2MDVcdThCRkJcdThCQjBcdTVGNTVcdUZGMENcdTY1NzRcdTc0MDZcdTUyMzAgW1suLi8wMy1SZWFkaW5nL1x1OTYwNVx1OEJGQlx1N0IxNFx1OEJCMFx1NzkzQVx1NEY4QnxcdTk2MDVcdThCRkJdXVx1MzAwMlxuNC4gXHU4MUVBXHU1REYxXHU1MTk5XHU3Njg0XHU2QkI1XHU4NDNEXHVGRjBDXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDQtV3JpdGluZy9cdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTc5M0FcdTRGOEJ8XHU1MTk5XHU0RjVDXV1cdTMwMDJcbjUuIFx1NURGMlx1NTkwNFx1NzQwNlx1NzY4NFx1Nzg4RVx1NzI0N1x1NTNFRlx1NUY1Mlx1Njg2M1x1MzAwMVx1NzlGQlx1NTJBOFx1NjIxNlx1NTIyMFx1OTY2NFx1RkYxQlx1NjNEMlx1NEVGNlx1NEUwRFx1NEYxQVx1NjZGRlx1NEY2MFx1ODk4Nlx1NzZENlx1OEZEOVx1NEU5Qlx1NTE4NVx1NUJCOVx1MzAwMlxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmQubWRgXTogYCMgXHU4QkNEXHU2QzQ3IERhc2hib2FyZFxuXG5cdThGRDlcdTY2MkZcdThCQ0RcdTZDNDdcdTVFOTNcdTc2ODRcdTUxODVcdTVCQjlcdTU3MzBcdTU2RkVcdTMwMDJcdTY1QjBcdTVFRkFcdTdCMTRcdThCQjBcdTY1RjZcdTRGN0ZcdTc1MjggW1suLi8wNS1UZW1wbGF0ZXMvXHU4QkNEXHU2QzQ3fFx1OEJDRFx1NkM0N1x1NkEyMVx1Njc3Rl1dXHUzMDAyXG5cbiMjIFx1NTE2OFx1OTBFOFx1OEJDRFx1NkM0N1x1RkYwOERhdGF2aWV3XHVGRjA5XG5cblxcYFxcYFxcYGRhdGF2aWV3XG5UQUJMRSBXSVRIT1VUIElEIGZpbGUubGluayBBUyBcIlx1OEJDRFx1NkM0N1wiLCBtZWFuaW5nIEFTIFwiXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XCIsIHN0YXR1cyBBUyBcIlx1NzJCNlx1NjAwMVwiLCBmaWxlLm10aW1lIEFTIFwiXHU2NkY0XHU2NUIwXCJcbkZST00gXCJCaW5uQWdlbnRYLzAxLVZvY2FidWxhcnlcIlxuV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiXG5TT1JUIGZpbGUubXRpbWUgREVTQ1xuXFxgXFxgXFxgXG5cbiMjIFx1NUVGQVx1OEJBRVx1NzY4NCBNT0NcblxuLSBcdTYzMDlcdTRFM0JcdTk4OThcdUZGMUFcdTVCNjZcdTRFNjBcdTMwMDFcdTVERTVcdTRGNUNcdTMwMDFcdTY1QzVcdTg4NENcdTMwMDFcdTYwQzVcdTdFRUFcbi0gXHU2MzA5XHU1MTczXHU3Q0ZCXHVGRjFBXHU1NDBDXHU0RTQ5XHU4QkNEXHUzMDAxXHU1M0NEXHU0RTQ5XHU4QkNEXHUzMDAxXHU2NjEzXHU2REY3XHU4QkNEXHUzMDAxXHU1NkZBXHU1QjlBXHU2NDJEXHU5MTREXG4tIFx1NzkzQVx1NEY4Qlx1RkYxQVtbcmVzaWxpZW50XV1cbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvcmVzaWxpZW50Lm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxubWVhbmluZzogXCJcdTY3MDlcdTk3RTdcdTYwMjdcdTc2ODRcdUZGMUJcdTgwRkRcdThGQzVcdTkwMUZcdTYwNjJcdTU5MERcdTc2ODRcIlxuc3RhdHVzOiBsZWFybmluZ1xudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSB2b2NhYnVsYXJ5XG4gIC0gY2hhcmFjdGVyXG4tLS1cblxuIyByZXNpbGllbnRcblxuIyMgXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XG5cbkFibGUgdG8gcmVjb3ZlciBxdWlja2x5IGFmdGVyIGRpZmZpY3VsdHkgb3IgY2hhbmdlLlxuXG4jIyBcdTUzRDFcdTk3RjNcblxuL3JcdTAyNkFcdTAyQzh6XHUwMjZBbGlcdTAyNTludC9cblxuIyMgXHU1RTM4XHU3NTI4XHU2NDJEXHU5MTREXG5cbi0gcmVzaWxpZW50IHBlb3BsZVxuLSBhIHJlc2lsaWVudCBlY29ub215XG4tIHJlbWFpbiByZXNpbGllbnRcblxuIyMgXHU1MzlGXHU1M0U1XHU0RTBFXHU4QkVEXHU1ODgzXG5cblRoZSB0ZWFtIHJlbWFpbmVkIHJlc2lsaWVudCBhZnRlciBhbiBlYXJseSBzZXRiYWNrLlxuXG4jIyBcdTYyMTFcdTc2ODRcdTRGOEJcdTUzRTVcblxuSSB3YW50IHRvIGJlY29tZSBtb3JlIHJlc2lsaWVudCB3aGVuIGEgcGxhbiBjaGFuZ2VzIHVuZXhwZWN0ZWRseS5cblxuIyMgXHU2NjEzXHU2REY3XHU2REM2XHU3MEI5XG5cbioqcmVzaWxpZW50KiogXHU1RjNBXHU4QzAzXHU1M0Q3XHU2MzJCXHU1NDBFXHU3Njg0XHU2MDYyXHU1OTBEXHU4MEZEXHU1MjlCXHVGRjFCKipwZXJzaXN0ZW50KiogXHU1RjNBXHU4QzAzXHU2MzAxXHU3RUVEXHU1NzVBXHU2MzAxXHUzMDAyXG5cbiMjIFx1NTE3M1x1ODA1NFxuXG4tIFtbMDAtRGFzaGJvYXJkXV1cbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkLm1kYF06IGAjIFx1OEJFRFx1NkNENSBEYXNoYm9hcmRcblxuXHU4RkQ5XHU2NjJGXHU4QkVEXHU2Q0Q1XHU1RTkzXHU3Njg0XHU1MTg1XHU1QkI5XHU1NzMwXHU1NkZFXHUzMDAyXHU2NUIwXHU1RUZBXHU3QjE0XHU4QkIwXHU2NUY2XHU0RjdGXHU3NTI4IFtbLi4vMDUtVGVtcGxhdGVzL1x1OEJFRFx1NkNENXxcdThCRURcdTZDRDVcdTZBMjFcdTY3N0ZdXVx1MzAwMlxuXG4jIyBcdTUxNjhcdTkwRThcdThCRURcdTZDRDVcdTcwQjlcdUZGMDhEYXRhdmlld1x1RkYwOVxuXG5cXGBcXGBcXGBkYXRhdmlld1xuVEFCTEUgV0lUSE9VVCBJRCBmaWxlLmxpbmsgQVMgXCJcdThCRURcdTZDRDVcdTcwQjlcIiwgc3RhdHVzIEFTIFwiXHU3MkI2XHU2MDAxXCIsIGZpbGUubXRpbWUgQVMgXCJcdTY2RjRcdTY1QjBcIlxuRlJPTSBcIkJpbm5BZ2VudFgvMDItR3JhbW1hclwiXG5XSEVSRSBmaWxlLm5hbWUgIT0gXCIwMC1EYXNoYm9hcmRcIiBBTkQgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCJcblNPUlQgZmlsZS5tdGltZSBERVNDXG5cXGBcXGBcXGBcblxuIyMgXHU1RUZBXHU4QkFFXHU3Njg0IE1PQ1xuXG4tIFx1NjVGNlx1NjAwMVx1NEUwRVx1OEJFRFx1NjAwMVxuLSBcdTRFQ0VcdTUzRTVcbi0gXHU5NzVFXHU4QzEzXHU4QkVEXHU1MkE4XHU4QkNEXG4tIFx1OEZERVx1NjNBNVx1NEUwRVx1ODg1NFx1NjNBNVxuLSBcdTc5M0FcdTRGOEJcdUZGMUFbW2FsdGhvdWdoIFx1NEUwRSBkZXNwaXRlXV1cbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXIvYWx0aG91Z2ggXHU0RTBFIGRlc3BpdGUubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxuYmlubmFnZW50X2tpbmQ6IFwiZ3JhbW1hclwiXG5zdGF0dXM6IGxlYXJuaW5nXG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIGdyYW1tYXJcbiAgLSBjb25jZXNzaW9uXG4tLS1cblxuIyBhbHRob3VnaCBcdTRFMEUgZGVzcGl0ZVxuXG4jIyBcdTRFMDBcdTUzRTVcdThCRERcdTg5QzRcdTUyMTlcblxuKiphbHRob3VnaCoqIFx1NTQwRVx1NjNBNVx1NUI4Q1x1NjU3NFx1NEVDRVx1NTNFNVx1RkYxQioqZGVzcGl0ZSoqIFx1NTQwRVx1NjNBNVx1NTQwRFx1OEJDRFx1MzAwMVx1NEVFM1x1OEJDRFx1NjIxNlx1NTJBOFx1NTQwRFx1OEJDRFx1MzAwMlxuXG4jIyBcdTdFRDNcdTY3ODRcdTUxNkNcdTVGMEZcblxuLSBBbHRob3VnaCArIFx1NEUzQlx1OEJFRCArIFx1OEMxM1x1OEJFRCwgXHU0RTNCXHU1M0U1XHUzMDAyXG4tIERlc3BpdGUgKyBcdTU0MERcdThCQ0QgLyBkb2luZywgXHU0RTNCXHU1M0U1XHUzMDAyXG5cbiMjIFx1NTM5Rlx1NTNFNVx1NjJDNlx1ODlFM1xuXG5BbHRob3VnaCBpdCB3YXMgcmFpbmluZywgd2Uga2VwdCB3YWxraW5nLlxuXG5EZXNwaXRlIHRoZSByYWluLCB3ZSBrZXB0IHdhbGtpbmcuXG5cbiMjIFx1NUUzOFx1ODlDMVx1OEJFRlx1NTMzQVxuXG5cdTRFMERcdTg5ODFcdTUxOTlcdTYyMTAgXHUyMDFDZGVzcGl0ZSBpdCB3YXMgcmFpbmluZ1x1MjAxRFx1MzAwMlx1NTNFRlx1NjUzOVx1NEUzQSBcdTIwMUNkZXNwaXRlIHRoZSByYWluXHUyMDFEIFx1NjIxNiBcdTIwMUNkZXNwaXRlIHRoZSBmYWN0IHRoYXQgaXQgd2FzIHJhaW5pbmdcdTIwMURcdTMwMDJcblxuIyMgXHU2NUIwXHU4QkVEXHU1ODgzXHU5QThDXHU4QkMxXG5cbkFsdGhvdWdoIHRoZSB0YXNrIHdhcyBkaWZmaWN1bHQsIHNoZSBmaW5pc2hlZCBpdCBvbiB0aW1lLlxuXG4jIyBcdTUxNzNcdTgwNTRcblxuLSBbWzAwLURhc2hib2FyZF1dXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMy1SZWFkaW5nL1x1OTYwNVx1OEJGQlx1N0IxNFx1OEJCMFx1NzkzQVx1NEY4Qi5tZGBdOiBgLS0tXG5iaW5uYWdlbnRfc3luYzogZmFsc2VcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXG5iaW5uYWdlbnRfa2luZDogXCJyZWFkaW5nX3NraWxsXCJcbnN0YXR1czogZXhhbXBsZVxudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSByZWFkaW5nXG4tLS1cblxuIyBcdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTc5M0FcdTRGOEJcblxuIyMgXHU2NzY1XHU2RTkwXG5cblx1NTcyOFx1OEZEOVx1OTFDQ1x1OEJCMFx1NUY1NVx1NjU4N1x1N0FFMFx1NjgwN1x1OTg5OFx1MzAwMVx1NEY1Q1x1ODAwNVx1NTQ4Q1x1OTRGRVx1NjNBNVx1MzAwMlxuXG4jIyBcdTRFMDBcdTUzRTVcdThCRERcdTY0NThcdTg5ODFcblxuXHU1MTQ4XHU3NTI4XHU4MUVBXHU1REYxXHU3Njg0XHU4QkREXHU1MTk5XHU0RTAwXHU1M0U1XHVGRjBDXHU1MThEXHU4ODY1XHU3RUM2XHU4MjgyXHUzMDAyXG5cbiMjIFx1NTE3M1x1OTUyRVx1NkJCNVx1ODQzRFx1NEUwRVx1OEJDMVx1NjM2RVxuXG5cdTY0NThcdTVGNTVcdTVDMTFcdTkxQ0ZcdTUxNzNcdTk1MkVcdTUzRTVcdUZGMENcdTVFNzZcdThCRjRcdTY2MEVcdTVCODNcdTRFM0FcdTRFQzBcdTRFNDhcdTkxQ0RcdTg5ODFcdTMwMDJcblxuIyMgXHU2NUIwXHU4QkNEXHU0RTBFXHU4QkVEXHU2Q0Q1XG5cbi0gXHU4QkNEXHU2QzQ3XHU1M0VGXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dXHUzMDAyXG4tIFx1OEJFRFx1NkNENVx1NTNFRlx1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkfFx1OEJFRFx1NkNENSBEYXNoYm9hcmRdXVx1MzAwMlxuXG4jIyBcdTYyMTFcdTc2ODRcdTg5QzJcdTcwQjlcblxuXHU1MTk5XHU0RTBCXHU4RDVFXHU1NDBDXHUzMDAxXHU4RDI4XHU3NTkxXHU2MjE2XHU1M0VGXHU0RUU1XHU4RkMxXHU3OUZCXHU1MjMwXHU1MTc2XHU0RUQ2XHU2NTg3XHU3QUUwXHU3Njg0XHU2MEYzXHU2Q0Q1XHUzMDAyXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS8wNC1Xcml0aW5nL1x1NTE5OVx1NEY1Q1x1N0VDM1x1NEU2MFx1NzkzQVx1NEY4Qi5tZGBdOiBgLS0tXG5iaW5uYWdlbnRfc3luYzogZmFsc2VcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXG5iaW5uYWdlbnRfa2luZDogXCJ3cml0aW5nX3NraWxsXCJcbnN0YXR1czogZHJhZnRcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gd3JpdGluZ1xuLS0tXG5cbiMgXHU1MTk5XHU0RjVDXHU3RUMzXHU0RTYwXHU3OTNBXHU0RjhCXG5cbiMjIFx1OTg5OFx1NzZFRVxuXG5EZXNjcmliZSBhIGhhYml0IHRoYXQgaGFzIGltcHJvdmVkIHlvdXIgbGVhcm5pbmcuXG5cbiMjIFYxIFx1ODM0OVx1N0EzRlxuXG5cdTUxNDhcdTUxOTlcdTVCOENcdUZGMENcdTRFMERcdTU3MjhcdTdCMkNcdTRFMDBcdTkwNERcdThGRkRcdTZDNDJcdTVCOENcdTdGOEVcdTMwMDJcblxuIyMgXHU0RkVFXHU2NTM5XHU4QkIwXHU1RjU1XG5cbi0gXHU1MTg1XHU1QkI5XHVGRjFBXHU4OUMyXHU3MEI5XHU2NjJGXHU1NDI2XHU2RTA1XHU2OTVBXHVGRjFGXG4tIFx1N0VEM1x1Njc4NFx1RkYxQVx1NkJCNVx1ODQzRFx1NjYyRlx1NTQyNlx1NjcwOVx1NEUzQlx1OTg5OFx1NTNFNVx1NTQ4Q1x1OEJDMVx1NjM2RVx1RkYxRlxuLSBcdThCRURcdThBMDBcdUZGMUFcdTY2MkZcdTU0MjZcdTgwRkRcdTc1MjhcdTY2RjRcdTUxQzZcdTc4NkVcdTc2ODRcdThCQ0RcdTZDNDdcdTYyMTZcdTUzRTVcdTVGMEZcdUZGMUZcblxuIyMgVjIgXHU1QjlBXHU3QTNGXG5cblx1NjgzOVx1NjM2RVx1NEZFRVx1NjUzOVx1OEJCMFx1NUY1NVx1OTFDRFx1NTE5OVx1RkYwQ1x1NUU3Nlx1NEZERFx1NzU1OSBWMSBcdTY1QjlcdTRGQkZcdTZCRDRcdThGODNcdTMwMDJcbmAsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCaW5uQWdlbnRYTGVhcm5pbmdTeW5jUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN5bmNTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBCaW5uQWdlbnRYU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJwcmV2aWV3LWxlYXJuaW5nLWNvbnRleHRcIixcbiAgICAgIG5hbWU6IFwiUHJldmlldyBsZWFybmluZyBjb250ZXh0XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5wcmV2aWV3KCksXG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcInN5bmMtbGVhcm5pbmctY29udGV4dFwiLFxuICAgICAgbmFtZTogXCJTeW5jIGFwcHJvdmVkIGxlYXJuaW5nIGNvbnRleHRcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLnN5bmMoKSxcbiAgICB9KTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwiaW5zdGFsbC1sZWFybmluZy10ZW1wbGF0ZXNcIixcbiAgICAgIG5hbWU6IFwiSW5pdGlhbGl6ZSBCaW5uQWdlbnRYIGxlYXJuaW5nIGxpYnJhcnlcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmluaXRpYWxpemVMZWFybmluZ0xpYnJhcnkoKSxcbiAgICB9KTtcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub25MYXlvdXRSZWFkeSgoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMuaGFuZGxlTGF5b3V0UmVhZHkoKTtcbiAgICB9KTtcbiAgICB0aGlzLnJlZ2lzdGVySW50ZXJ2YWwoXG4gICAgICB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5hdXRvU3luYykgdm9pZCB0aGlzLnN5bmMoZmFsc2UpO1xuICAgICAgfSwgNjBfMDAwKSxcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSB7IC4uLkRFRkFVTFRfU0VUVElOR1MsIC4uLihhd2FpdCB0aGlzLmxvYWREYXRhKCkpIH07XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFuZGxlTGF5b3V0UmVhZHkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MubGlicmFyeVZlcnNpb24gPCBDVVJSRU5UX0xJQlJBUllfVkVSU0lPTikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5pbml0aWFsaXplTGVhcm5pbmdMaWJyYXJ5KGZhbHNlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU2NzJBXHU3N0U1XHU5NTE5XHU4QkVGXCI7XG4gICAgICAgIG5ldyBOb3RpY2UoYEJpbm5BZ2VudFggXHU1QjY2XHU0RTYwXHU1RTkzXHU1MjFEXHU1OUNCXHU1MzE2XHU1OTMxXHU4RDI1XHVGRjFBJHttZXNzYWdlfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5zZXR0aW5ncy5hdXRvU3luYykgYXdhaXQgdGhpcy5zeW5jKGZhbHNlKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY29sbGVjdEVudHJpZXNBc3luYygpOiBQcm9taXNlPExlYXJuaW5nQ29udGV4dEVudHJ5W10+IHtcbiAgICBjb25zdCBmb2xkZXJzID0gc3BsaXRTY29wZSh0aGlzLnNldHRpbmdzLmFsbG93ZWRGb2xkZXJzKTtcbiAgICBjb25zdCB0YWdzID0gc3BsaXRTY29wZSh0aGlzLnNldHRpbmdzLmFsbG93ZWRUYWdzKS5tYXAoKHRhZykgPT4gdGFnLnJlcGxhY2UoL14jLywgXCJcIikpO1xuICAgIGlmICghZm9sZGVycy5sZW5ndGggJiYgIXRhZ3MubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoXCJcdThCRjdcdTkwMDlcdTYyRTlcdTgxRjNcdTVDMTFcdTRFMDBcdTRFMkFcdTUxNDFcdThCQjhcdTU0MENcdTZCNjVcdTc2ODRcdTY1ODdcdTRFRjZcdTU5MzlcdTYyMTZcdTY4MDdcdTdCN0VcIik7XG4gICAgY29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdFxuICAgICAgLmdldE1hcmtkb3duRmlsZXMoKVxuICAgICAgLmZpbHRlcigoZmlsZSkgPT4gaXNBbGxvd2VkKGZpbGUsIGZvbGRlcnMsIHRhZ3MsIHRoaXMuYXBwKSk7XG4gICAgaWYgKGZpbGVzLmxlbmd0aCA+IHRoaXMuc2V0dGluZ3MubWF4Tm90ZXMpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBcdTUzMzlcdTkxNERcdTUyMzAgJHtmaWxlcy5sZW5ndGh9IFx1N0JDN1x1N0IxNFx1OEJCMFx1RkYwQ1x1OEJGN1x1N0YyOVx1NUMwRlx1ODMwM1x1NTZGNFx1RkYwOFx1NEUwQVx1OTY1MCAke3RoaXMuc2V0dGluZ3MubWF4Tm90ZXN9XHVGRjA5YCxcbiAgICAgICk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgZmlsZXMubWFwKGFzeW5jIChmaWxlKSA9PiB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgICAgIGNvbnN0IGZyb250bWF0dGVyID0gY2FjaGU/LmZyb250bWF0dGVyID8/IHt9O1xuICAgICAgICBjb25zdCB0YWdzID0gdW5pcXVlU3RyaW5ncyhbXG4gICAgICAgICAgLi4uYXJyYXlTdHJpbmdzKGZyb250bWF0dGVyLnRhZ3MpLFxuICAgICAgICAgIC4uLihjYWNoZT8udGFncyA/PyBbXSkubWFwKCh0YWcpID0+IHRhZy50YWcucmVwbGFjZSgvXiMvLCBcIlwiKSksXG4gICAgICAgIF0pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNvdXJjZV9rZXk6IGZpbGUucGF0aCxcbiAgICAgICAgICBhc3NldF9pZDpcbiAgICAgICAgICAgIHR5cGVvZiBmcm9udG1hdHRlci5iaW5uYWdlbnRfYXNzZXRfaWQgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgPyBmcm9udG1hdHRlci5iaW5uYWdlbnRfYXNzZXRfaWRcbiAgICAgICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgICAgdGl0bGU6IFN0cmluZyhmcm9udG1hdHRlci50aXRsZSA/PyBmaWxlLmJhc2VuYW1lKSxcbiAgICAgICAgICBraW5kOiBpbmZlcktpbmQoZnJvbnRtYXR0ZXIuYmlubmFnZW50X2tpbmQsIHRhZ3MpLFxuICAgICAgICAgIHRhZ3MsXG4gICAgICAgICAgZXhjZXJwdDogc3VtbWFyaXplKGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSksIHRoaXMuc2V0dGluZ3MubWF4RXhjZXJwdENoYXJhY3RlcnMpLFxuICAgICAgICAgIG1vZGlmaWVkX2F0OiBuZXcgRGF0ZShmaWxlLnN0YXQubXRpbWUpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIH07XG4gICAgICB9KSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwcmV2aWV3KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBlbnRyaWVzID0gYXdhaXQgdGhpcy5jb2xsZWN0RW50cmllc0FzeW5jKCk7XG4gICAgICBuZXcgTm90aWNlKFxuICAgICAgICBgXHU1QzA2XHU1NDBDXHU2QjY1ICR7ZW50cmllcy5sZW5ndGh9IFx1Njc2MVx1NUI2Nlx1NEU2MFx1NEUwQVx1NEUwQlx1NjU4N1x1RkYxQSR7XG4gICAgICAgICAgZW50cmllc1xuICAgICAgICAgICAgLnNsaWNlKDAsIDQpXG4gICAgICAgICAgICAubWFwKChlbnRyeSkgPT4gZW50cnkudGl0bGUpXG4gICAgICAgICAgICAuam9pbihcIlx1MzAwMVwiKSB8fCBcIlx1NjVFMFwiXG4gICAgICAgIH1gLFxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbmV3IE5vdGljZShlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU2NUUwXHU2Q0Q1XHU5ODg0XHU4OUM4XHU1NDBDXHU2QjY1XHU4MzAzXHU1NkY0XCIpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGluaXRpYWxpemVMZWFybmluZ0xpYnJhcnkoc2hvd05vdGljZSA9IHRydWUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsZXQgaW5zdGFsbGVkID0gMDtcbiAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChMSUJSQVJZX1JPT1QpKSB7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoTElCUkFSWV9ST09UKTtcbiAgICAgIGluc3RhbGxlZCArPSAxO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgTElCUkFSWV9GT0xERVJTKSB7XG4gICAgICBjb25zdCBmb2xkZXIgPSBgJHtMSUJSQVJZX1JPT1R9LyR7bmFtZX1gO1xuICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZm9sZGVyKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyKTtcbiAgICAgICAgaW5zdGFsbGVkICs9IDE7XG4gICAgICB9XG4gICAgfVxuICAgIGluc3RhbGxlZCArPSBhd2FpdCB0aGlzLm1pZ3JhdGVNYW5hZ2VkRGFzaGJvYXJkcygpO1xuICAgIGF3YWl0IHRoaXMucmV3cml0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcygpO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGNvbnRlbnRdIG9mIE9iamVjdC5lbnRyaWVzKExFQVJOSU5HX1RFTVBMQVRFUykpIHtcbiAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGAke1RFTVBMQVRFX0ZPTERFUn0vJHtuYW1lfWApKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtURU1QTEFURV9GT0xERVJ9LyR7bmFtZX1gLCBjb250ZW50KTtcbiAgICAgICAgaW5zdGFsbGVkICs9IDE7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BhdGgsIGNvbnRlbnRdIG9mIE9iamVjdC5lbnRyaWVzKExJQlJBUllfTk9URVMpKSB7XG4gICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgY29udGVudCk7XG4gICAgICAgIGluc3RhbGxlZCArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBhd2FpdCB0aGlzLmNvbmZpZ3VyZU9ic2lkaWFuRm9sZGVycygpO1xuICAgIHRoaXMuc2V0dGluZ3MubGlicmFyeVZlcnNpb24gPSBDVVJSRU5UX0xJQlJBUllfVkVSU0lPTjtcbiAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgIGlmIChzaG93Tm90aWNlKSB7XG4gICAgICBuZXcgTm90aWNlKFxuICAgICAgICBpbnN0YWxsZWRcbiAgICAgICAgICA/IGBCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1NUU5M1x1NURGMlx1NTIxRFx1NTlDQlx1NTMxNlx1RkYwOFx1NjVCMFx1NTg5RSAke2luc3RhbGxlZH0gXHU5ODc5XHVGRjA5YFxuICAgICAgICAgIDogXCJCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1NUU5M1x1NURGMlx1NUMzMVx1N0VFQVx1RkYwQ1x1NjcyQVx1ODk4Nlx1NzZENlx1NEY2MFx1NzY4NFx1NEZFRVx1NjUzOVwiLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG1pZ3JhdGVNYW5hZ2VkRGFzaGJvYXJkcygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGxldCBtaWdyYXRlZCA9IDA7XG4gICAgZm9yIChjb25zdCBbbGVnYWN5UGF0aCwgdGFyZ2V0UGF0aF0gb2YgREFTSEJPQVJEX01JR1JBVElPTlMpIHtcbiAgICAgIGNvbnN0IGxlZ2FjeSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChsZWdhY3lQYXRoKTtcbiAgICAgIGlmICghKGxlZ2FjeSBpbnN0YW5jZW9mIFRGaWxlKSB8fCB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGFyZ2V0UGF0aCkpIGNvbnRpbnVlO1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQucmVuYW1lKGxlZ2FjeSwgdGFyZ2V0UGF0aCk7XG4gICAgICBtaWdyYXRlZCArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gbWlncmF0ZWQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJld3JpdGVNYW5hZ2VkRGFzaGJvYXJkTGlua3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdFxuICAgICAgLmdldE1hcmtkb3duRmlsZXMoKVxuICAgICAgLmZpbHRlcihcbiAgICAgICAgKGZpbGUpID0+IGZpbGUucGF0aCA9PT0gYCR7TElCUkFSWV9ST09UfS5tZGAgfHwgZmlsZS5wYXRoLnN0YXJ0c1dpdGgoYCR7TElCUkFSWV9ST09UfS9gKSxcbiAgICAgICk7XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSB1cGRhdGVNYW5hZ2VkRGFzaGJvYXJkTGlua3MoY29udGVudCwgZmlsZS5wYXRoKTtcbiAgICAgIGlmICh1cGRhdGVkICE9PSBjb250ZW50KSBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgdXBkYXRlZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjb25maWd1cmVPYnNpZGlhbkZvbGRlcnMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgY29uZmlndXJhYmxlVmF1bHQgPSB0aGlzLmFwcC52YXVsdCBhcyB0eXBlb2YgdGhpcy5hcHAudmF1bHQgJiB7XG4gICAgICBzZXRDb25maWc/OiAoa2V5OiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSA9PiB2b2lkO1xuICAgIH07XG4gICAgaWYgKHR5cGVvZiBjb25maWd1cmFibGVWYXVsdC5zZXRDb25maWcgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgY29uZmlndXJhYmxlVmF1bHQuc2V0Q29uZmlnKFwiYXR0YWNobWVudEZvbGRlclBhdGhcIiwgQVRUQUNITUVOVF9GT0xERVIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLm1lcmdlQ29uZmlnRmlsZShgJHt0aGlzLmFwcC52YXVsdC5jb25maWdEaXJ9L2FwcC5qc29uYCwge1xuICAgICAgICBhdHRhY2htZW50Rm9sZGVyUGF0aDogQVRUQUNITUVOVF9GT0xERVIsXG4gICAgICB9KTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5tZXJnZUNvbmZpZ0ZpbGUoYCR7dGhpcy5hcHAudmF1bHQuY29uZmlnRGlyfS90ZW1wbGF0ZXMuanNvbmAsIHtcbiAgICAgIGZvbGRlcjogVEVNUExBVEVfRk9MREVSLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtZXJnZUNvbmZpZ0ZpbGUocGF0aDogc3RyaW5nLCBwYXRjaDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhZGFwdGVyID0gdGhpcy5hcHAudmF1bHQuYWRhcHRlcjtcbiAgICBsZXQgY3VycmVudDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBpZiAoYXdhaXQgYWRhcHRlci5leGlzdHMocGF0aCkpIHtcbiAgICAgIGNvbnN0IHJhdyA9IGF3YWl0IGFkYXB0ZXIucmVhZChwYXRoKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhcnNlZDogdW5rbm93biA9IEpTT04ucGFyc2UocmF3KTtcbiAgICAgICAgaWYgKHBhcnNlZCAmJiB0eXBlb2YgcGFyc2VkID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHBhcnNlZCkpIHtcbiAgICAgICAgICBjdXJyZW50ID0gcGFyc2VkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcdTY1RTBcdTZDRDVcdTY2RjRcdTY1QjAgT2JzaWRpYW4gXHU5MTREXHU3RjZFXHVGRjFBJHtwYXRofSBcdTRFMERcdTY2MkZcdTY3MDlcdTY1NDhcdTc2ODQgSlNPTmApO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB1cGRhdGVkID0geyAuLi5jdXJyZW50LCAuLi5wYXRjaCB9O1xuICAgIGlmIChKU09OLnN0cmluZ2lmeSh1cGRhdGVkKSAhPT0gSlNPTi5zdHJpbmdpZnkoY3VycmVudCkpIHtcbiAgICAgIGF3YWl0IGFkYXB0ZXIud3JpdGUocGF0aCwgYCR7SlNPTi5zdHJpbmdpZnkodXBkYXRlZCwgbnVsbCwgMil9XFxuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzeW5jKHNob3dOb3RpY2UgPSB0cnVlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnNldHRpbmdzLmNvbm5lY3Rpb25JZCB8fCAhdGhpcy5zZXR0aW5ncy5zeW5jU2VjcmV0KSB7XG4gICAgICBpZiAoc2hvd05vdGljZSkgbmV3IE5vdGljZShcIlx1OEJGN1x1NTE0OFx1NTcyOFx1NjNEMlx1NEVGNlx1OEJCRVx1N0Y2RVx1NEUyRFx1NTg2Qlx1NTE5OSBCaW5uQWdlbnRYIFx1OEZERVx1NjNBNVx1NTFFRFx1NjM2RVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGV4cG9ydGVkID0gYXdhaXQgdGhpcy5wdWxsUGVuZGluZ0Fzc2V0cygpO1xuICAgICAgY29uc3QgZW50cmllcyA9IGF3YWl0IHRoaXMuY29sbGVjdEVudHJpZXNBc3luYygpO1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHt0aGlzLnNldHRpbmdzLmFwaUJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS92MS9vYnNpZGlhbi1zeW5jLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuc2V0dGluZ3MuY29ubmVjdGlvbklkKX0vaW1wb3J0YCxcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLnNldHRpbmdzLnN5bmNTZWNyZXR9YCxcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHNjaGVtYV92ZXJzaW9uOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIixcbiAgICAgICAgICB2YXVsdF9uYW1lOiB0aGlzLmFwcC52YXVsdC5nZXROYW1lKCksXG4gICAgICAgICAgZW50cmllcyxcbiAgICAgICAgfSksXG4gICAgICAgIHRocm93OiBmYWxzZSxcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEJpbm5BZ2VudFggXHU2MkQyXHU3RUREXHU1NDBDXHU2QjY1XHVGRjA4JHtyZXNwb25zZS5zdGF0dXN9XHVGRjA5YCk7XG4gICAgICBjb25zdCByZXN1bHQgPSByZXNwb25zZS5qc29uIGFzIEltcG9ydFJlc3BvbnNlO1xuICAgICAgY29uc3Qgb3JnYW5pemVkID0gYXdhaXQgdGhpcy5hcHBseU9yZ2FuaXphdGlvblBsYW4ocmVzdWx0Lm9yZ2FuaXphdGlvbik7XG4gICAgICBjb25zdCBvcmdhbml6YXRpb25TdW1tYXJ5ID0gc3VtbWFyaXplT3JnYW5pemF0aW9uKHJlc3VsdC5vcmdhbml6YXRpb24sIG9yZ2FuaXplZCk7XG4gICAgICBjb25zdCBzeW5jU3VtbWFyeSA9XG4gICAgICAgIGBcdTYzQTVcdTY1MzYgJHtleHBvcnRlZH0gXHU2NzYxXHU4RDQ0XHU0RUE3XHVGRjBDXHU0RTBBXHU0RjIwICR7ZW50cmllcy5sZW5ndGh9IFx1Njc2MVx1NUI2Nlx1NEU2MFx1NEUwQVx1NEUwQlx1NjU4N1x1RkYxQmAgKyBvcmdhbml6YXRpb25TdW1tYXJ5O1xuICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0U3luY2VkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICB0aGlzLnNldHRpbmdzLmxhc3RTeW5jRXJyb3IgPSBcIlwiO1xuICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0U3luY1N1bW1hcnkgPSBzeW5jU3VtbWFyeTtcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gICAgICBpZiAoc2hvd05vdGljZSkgbmV3IE5vdGljZShgXHU1M0NDXHU1NDExXHU1NDBDXHU2QjY1XHU1QjhDXHU2MjEwXHVGRjFBJHtzeW5jU3VtbWFyeX1gKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJcdTU0MENcdTZCNjVcdTU5MzFcdThEMjVcIjtcbiAgICAgIHRoaXMuc2V0dGluZ3MubGFzdFN5bmNFcnJvciA9IG1lc3NhZ2U7XG4gICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgaWYgKHNob3dOb3RpY2UpIG5ldyBOb3RpY2UobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhcHBseU9yZ2FuaXphdGlvblBsYW4ocGxhbjogT3JnYW5pemF0aW9uUGxhbiB8IG51bGwpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGlmIChwbGFuPy5zdGF0dXMgIT09IFwicGxhbm5lZFwiIHx8ICFwbGFuLmFjdGlvbnMubGVuZ3RoKSByZXR1cm4gMDtcbiAgICBjb25zdCBhbGxvd2VkVGFyZ2V0cyA9IG5ldyBTZXQoW1xuICAgICAgYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5YCxcbiAgICAgIGAke0xJQlJBUllfUk9PVH0vMDItR3JhbW1hcmAsXG4gICAgICBgJHtMSUJSQVJZX1JPT1R9LzAzLVJlYWRpbmdgLFxuICAgICAgYCR7TElCUkFSWV9ST09UfS8wNC1Xcml0aW5nYCxcbiAgICBdKTtcbiAgICBjb25zdCBjb21wbGV0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBhY3Rpb24gb2YgcGxhbi5hY3Rpb25zKSB7XG4gICAgICBpZiAoIWFjdGlvbi5zb3VyY2Vfa2V5LnN0YXJ0c1dpdGgoYCR7SU5CT1hfRk9MREVSfS9gKSkgY29udGludWU7XG4gICAgICBpZiAoIWFsbG93ZWRUYXJnZXRzLmhhcyhhY3Rpb24udGFyZ2V0X2ZvbGRlcikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZmlsZU5hbWUgPSBhY3Rpb24uc291cmNlX2tleS5zbGljZShhY3Rpb24uc291cmNlX2tleS5sYXN0SW5kZXhPZihcIi9cIikgKyAxKTtcbiAgICAgIGNvbnN0IGV4dGVuc2lvbkluZGV4ID0gZmlsZU5hbWUubGFzdEluZGV4T2YoXCIuXCIpO1xuICAgICAgY29uc3QgYmFzZU5hbWUgPSBleHRlbnNpb25JbmRleCA+IDAgPyBmaWxlTmFtZS5zbGljZSgwLCBleHRlbnNpb25JbmRleCkgOiBmaWxlTmFtZTtcbiAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGV4dGVuc2lvbkluZGV4ID4gMCA/IGZpbGVOYW1lLnNsaWNlKGV4dGVuc2lvbkluZGV4ICsgMSkgOiBcIm1kXCI7XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IGAke2FjdGlvbi50YXJnZXRfZm9sZGVyfS8ke2ZpbGVOYW1lfWA7XG4gICAgICBjb25zdCByZXRyeVBhdGggPSBgJHthY3Rpb24udGFyZ2V0X2ZvbGRlcn0vJHtiYXNlTmFtZX0tJHthY3Rpb24uYWN0aW9uX2lkLnNsaWNlKDAsIDYpfS4ke2V4dGVuc2lvbn1gO1xuICAgICAgY29uc3Qgc291cmNlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGFjdGlvbi5zb3VyY2Vfa2V5KTtcbiAgICAgIGlmICghKHNvdXJjZSBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGJhc2VQYXRoKSBpbnN0YW5jZW9mIFRGaWxlIHx8XG4gICAgICAgICAgdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJldHJ5UGF0aCkgaW5zdGFuY2VvZiBURmlsZVxuICAgICAgICApIHtcbiAgICAgICAgICBjb21wbGV0ZWQucHVzaChhY3Rpb24uYWN0aW9uX2lkKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRhcmdldFBhdGggPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYmFzZVBhdGgpID8gcmV0cnlQYXRoIDogYmFzZVBhdGg7XG4gICAgICBpZiAodGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhcmdldFBhdGgpKSBjb250aW51ZTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlbmFtZShzb3VyY2UsIHRhcmdldFBhdGgpO1xuICAgICAgY29tcGxldGVkLnB1c2goYWN0aW9uLmFjdGlvbl9pZCk7XG4gICAgfVxuICAgIGlmIChjb21wbGV0ZWQubGVuZ3RoICE9PSBwbGFuLmFjdGlvbnMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmJveCBcdTY1NzRcdTc0MDZcdTY3MkFcdTUxNjhcdTkwRThcdTVCOENcdTYyMTBcdUZGMUJcdTY3MkFcdTc5RkJcdTUyQThcdTc2ODRcdTdCMTRcdThCQjBcdTRGMUFcdTRGRERcdTc1NTlcdTU3MjhcdTUzOUZcdTU5MDRcdUZGMENcdTRFMEJcdTZCMjFcdTU0MENcdTZCNjVcdTkxQ0RcdThCRDVcIik7XG4gICAgfVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke3RoaXMuc2V0dGluZ3MuYXBpQmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9vcmdhbml6ZXItcnVucy8ke2VuY29kZVVSSUNvbXBvbmVudChwbGFuLnJ1bl9pZCl9L2Fja2AsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5zZXR0aW5ncy5zeW5jU2VjcmV0fWAsXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgY29tcGxldGVkX2FjdGlvbl9pZHM6IGNvbXBsZXRlZCB9KSxcbiAgICAgIHRocm93OiBmYWxzZSxcbiAgICB9KTtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluYm94IFx1NjU3NFx1NzQwNlx1NTZERVx1NjI2N1x1NTkzMVx1OEQyNVx1RkYwOCR7cmVzcG9uc2Uuc3RhdHVzfVx1RkYwOWApO1xuICAgIHJldHVybiBjb21wbGV0ZWQubGVuZ3RoO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwdWxsUGVuZGluZ0Fzc2V0cygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGJhc2UgPSB0aGlzLnNldHRpbmdzLmFwaUJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IGhlYWRlcnMgPSB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLnNldHRpbmdzLnN5bmNTZWNyZXR9YCB9O1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke2Jhc2V9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9leHBvcnRzYCxcbiAgICAgIG1ldGhvZDogXCJHRVRcIixcbiAgICAgIGhlYWRlcnMsXG4gICAgICB0aHJvdzogZmFsc2UsXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBcdTY1RTBcdTZDRDVcdThCRkJcdTUzRDZcdTVGODVcdTU0MENcdTZCNjVcdThENDRcdTRFQTdcdUZGMDgke3Jlc3BvbnNlLnN0YXR1c31cdUZGMDlgKTtcbiAgICBjb25zdCBleHBvcnRzID0gcmVzcG9uc2UuanNvbiBhcyBQZW5kaW5nQXNzZXRFeHBvcnRbXTtcbiAgICBsZXQgY29tcGxldGVkID0gMDtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgZXhwb3J0cykge1xuICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuY3JlYXRlQXNzZXROb3RlKGl0ZW0pO1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgICBjb25zdCBkaWdlc3QgPSBhd2FpdCBzaGEyNTYoY29udGVudCk7XG4gICAgICBjb25zdCBhY2sgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHtiYXNlfS92MS9vYnNpZGlhbi1zeW5jLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuc2V0dGluZ3MuY29ubmVjdGlvbklkKX0vZXhwb3J0cy8ke2VuY29kZVVSSUNvbXBvbmVudChpdGVtLmFzc2V0X2lkKX0vYWNrYCxcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgaGVhZGVyczogeyAuLi5oZWFkZXJzLCBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc291cmNlX2tleTogZmlsZS5wYXRoLFxuICAgICAgICAgIGNvbnRlbnRfaGFzaDogZGlnZXN0LFxuICAgICAgICAgIG1vZGlmaWVkX2F0OiBuZXcgRGF0ZShmaWxlLnN0YXQubXRpbWUpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgdmF1bHRfbmFtZTogdGhpcy5hcHAudmF1bHQuZ2V0TmFtZSgpLFxuICAgICAgICB9KSxcbiAgICAgICAgdGhyb3c6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgICBpZiAoYWNrLnN0YXR1cyA8IDIwMCB8fCBhY2suc3RhdHVzID49IDMwMClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcdThENDRcdTRFQTdcdTU0MENcdTZCNjVcdTU2REVcdTYyNjdcdTU5MzFcdThEMjVcdUZGMDgke2Fjay5zdGF0dXN9XHVGRjA5YCk7XG4gICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBsZXRlZDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQXNzZXROb3RlKGl0ZW06IFBlbmRpbmdBc3NldEV4cG9ydCk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChMSUJSQVJZX1JPT1QpKSB7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoTElCUkFSWV9ST09UKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoSU5CT1hfRk9MREVSKSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKElOQk9YX0ZPTERFUik7XG4gICAgfVxuICAgIGNvbnN0IGZvbGRlciA9IElOQk9YX0ZPTERFUjtcbiAgICBjb25zdCBmaWxlbmFtZSA9IGAke3NhZmVGaWxlbmFtZShpdGVtLnRpdGxlKX0tJHtpdGVtLmFzc2V0X2lkLnNsaWNlKC0xMCl9Lm1kYDtcbiAgICBjb25zdCBwYXRoID0gYCR7Zm9sZGVyfS8ke2ZpbGVuYW1lfWA7XG4gICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgaWYgKGV4aXN0aW5nIGluc3RhbmNlb2YgVEZpbGUpIHJldHVybiBleGlzdGluZztcbiAgICBjb25zdCB0YWdzID0gdW5pcXVlU3RyaW5ncyhbXCJiaW5uYWdlbnRcIiwgaXRlbS5raW5kLCAuLi5pdGVtLnRhZ3NdKTtcbiAgICBjb25zdCBmcm9udG1hdHRlciA9IFtcbiAgICAgIFwiLS0tXCIsXG4gICAgICAnYmlubmFnZW50X3NjaGVtYTogXCJhc3NldC92MVwiJyxcbiAgICAgIGBiaW5uYWdlbnRfYXNzZXRfaWQ6IFwiJHt5YW1sU3RyaW5nKGl0ZW0uYXNzZXRfaWQpfVwiYCxcbiAgICAgIGBiaW5uYWdlbnRfa2luZDogXCIke3lhbWxTdHJpbmcoaXRlbS5raW5kKX1cImAsXG4gICAgICBgYmlubmFnZW50X3NvdXJjZV90eXBlOiBcIiR7eWFtbFN0cmluZyhpdGVtLnNvdXJjZV90eXBlKX1cImAsXG4gICAgICBcImluYm94X3N0YXR1czogdW5wcm9jZXNzZWRcIixcbiAgICAgIGB0aXRsZTogXCIke3lhbWxTdHJpbmcoaXRlbS50aXRsZSl9XCJgLFxuICAgICAgLi4uKGl0ZW0uc291cmNlX3Rhc2tfaWRcbiAgICAgICAgPyBbYGJpbm5hZ2VudF9zb3VyY2VfdGFza19pZDogXCIke3lhbWxTdHJpbmcoaXRlbS5zb3VyY2VfdGFza19pZCl9XCJgXVxuICAgICAgICA6IFtdKSxcbiAgICAgIFwidGFnczpcIixcbiAgICAgIC4uLnRhZ3MubWFwKCh0YWcpID0+IGAgIC0gJHt0YWd9YCksXG4gICAgICBcIi0tLVwiLFxuICAgICAgXCJcIixcbiAgICAgIGAjICR7aXRlbS50aXRsZX1gLFxuICAgICAgXCJcIixcbiAgICBdO1xuICAgIGNvbnN0IGJvZHkgPSBpdGVtLmluaXRpYWxfY29udGVudD8udHJpbSgpXG4gICAgICA/IFtcIiMjIFx1NUI2Nlx1NEU2MFx1NzNCMFx1NTczQVwiLCBcIlwiLCBpdGVtLmluaXRpYWxfY29udGVudC50cmltKCksIFwiXCIsIFwiIyMgXHU2MjExXHU3Njg0XHU3NDA2XHU4OUUzXCIsIFwiXCJdXG4gICAgICA6IFtcIiMjIFx1NjcwMFx1NTIxRFx1OEJFRFx1NTg4M1wiLCBcIlwiLCBcIiMjIFx1NjIxMVx1NzY4NFx1NzQwNlx1ODlFM1wiLCBcIlwiLCBcIiMjIFx1NTNFRlx1OEZDMVx1NzlGQlx1ODlDNFx1NTIxOVwiLCBcIlwiLCBcIiMjIFx1NjVCMFx1OEJFRFx1NTg4M1x1OUE4Q1x1OEJDMVwiLCBcIlwiXTtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIFsuLi5mcm9udG1hdHRlciwgLi4uYm9keV0uam9pbihcIlxcblwiKSk7XG4gIH1cbn1cblxuY2xhc3MgQmlubkFnZW50WFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IEJpbm5BZ2VudFhMZWFybmluZ1N5bmNQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1OEQ0NFx1NEVBN1x1NTQwQ1x1NkI2NVwiIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlx1NEVDNVx1NTQwQ1x1NkI2NVx1NEY2MFx1NjYwRVx1Nzg2RVx1NTE0MVx1OEJCOFx1NzY4NFx1ODMwM1x1NTZGNFx1MzAwMlx1NzY3Qlx1NUY1NVx1ODlFNlx1NTNEMVx1NzY4NFx1NjU3NFx1NzQwNlx1NTNFQVx1NEYxQVx1NjI4QSAwMC1JbmJveCBcdTdCMTRcdThCQjBcdTc5RkJcdTUyQThcdTUyMzAgQmlubkFnZW50WCBcdTc2ODRcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTMwMDFcdTk2MDVcdThCRkJcdTYyMTZcdTUxOTlcdTRGNUNcdTc2RUVcdTVGNTVcdUZGMUJcdTRFMERcdTRGMUFcdTUyMjBcdTk2NjRcdTMwMDFcdTY1MzlcdTUxOTlcdTYyMTZcdTc5RkJcdTUxRkFcdTYyNThcdTdCQTFcdTc2RUVcdTVGNTVcdTMwMDJcIixcbiAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1MjFEXHU1OUNCXHU1MzE2XHU1QjY2XHU0RTYwXHU1RTkzXCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NTIxQlx1NUVGQSAwMFx1MjAxMzA2IFx1NzZFRVx1NUY1NVx1MzAwMU1PQyAvIERhdGF2aWV3IERhc2hib2FyZFx1MzAwMVx1NkEyMVx1Njc3Rlx1NEUwRVx1NTE2NVx1OTVFOFx1NzkzQVx1NEY4Qlx1RkYxQlx1NEUwRFx1NEYxQVx1ODk4Nlx1NzZENlx1NURGMlx1NjcwOVx1NjU4N1x1NEVGNlx1MzAwMlwiKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PlxuICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlx1NjhDMFx1NjdFNVx1NUU3Nlx1ODg2NVx1OUY1MFwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5pbml0aWFsaXplTGVhcm5pbmdMaWJyYXJ5KCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU4MUVBXHU1MkE4XHU1M0NDXHU1NDExXHU1NDBDXHU2QjY1XCIpXG4gICAgICAuc2V0RGVzYyhcIk9ic2lkaWFuIFx1NTQyRlx1NTJBOFx1NTQwRVx1NTNDQVx1NkJDRiA2MCBcdTc5RDJcdTU0MENcdTZCNjVcdTRFMDBcdTZCMjFcdTVERjJcdTYzODhcdTY3NDNcdTgzMDNcdTU2RjRcdUZGMUJcdTUzRUZcdTk2OEZcdTY1RjZcdTUxNzNcdTk1RURcdTVFNzZcdTY1MzlcdTc1MjhcdTYyNEJcdTUyQThcdTU0N0RcdTRFRTRcdTMwMDJcIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9TeW5jKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvU3luYyA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NjcwMFx1OEZEMVx1NTQwQ1x1NkI2NVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jRXJyb3JcbiAgICAgICAgICA/IGBcdTU5MzFcdThEMjVcdUZGMUEke3RoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jRXJyb3J9YFxuICAgICAgICAgIDogdGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdFN5bmNlZEF0XG4gICAgICAgICAgICA/IGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jZWRBdH1cdUZGMUIke3RoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jU3VtbWFyeSB8fCBcIlx1NTQwQ1x1NkI2NVx1NUI4Q1x1NjIxMFwifWBcbiAgICAgICAgICAgIDogXCJcdTVDMUFcdTY3MkFcdTVCOENcdTYyMTBcdTU0MENcdTZCNjVcIixcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTE0MVx1OEJCOFx1NzY4NFx1NjU4N1x1NEVGNlx1NTkzOVwiKVxuICAgICAgLnNldERlc2MoXCJcdTkwMTdcdTUzRjdcdTUyMDZcdTk2OTRcdUZGMENcdTRGOEJcdTU5ODIgQmlubkFnZW50WCwgXHU4MkYxXHU4QkVEL1x1OEJFRFx1NkNENVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxsb3dlZEZvbGRlcnMpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRGb2xkZXJzID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1MTQxXHU4QkI4XHU3Njg0XHU2ODA3XHU3QjdFXCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NTNFRlx1OTAwOVx1RkYwQ1x1OTAxN1x1NTNGN1x1NTIwNlx1OTY5NFx1RkYwQ1x1NEY4Qlx1NTk4MiBiaW5uYWdlbnQtdm9jYWJ1bGFyeSwgZ3JhbW1hclwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWxsb3dlZFRhZ3MpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRUYWdzID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmlubkFnZW50WCBcdTU3MzBcdTU3NDBcIilcbiAgICAgIC5zZXREZXNjKFwiXHU2NzJDXHU2NzNBXHU5RUQ4XHU4QkE0XHVGRjFBaHR0cDovLzEyNy4wLjAuMTo4MDAwL2xlYXJuZXJcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiXHU4RkRFXHU2M0E1IElEXCIpLmFkZFRleHQoKHRleHQpID0+XG4gICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbm5lY3Rpb25JZCkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbm5lY3Rpb25JZCA9IHZhbHVlO1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIH0pLFxuICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTQwQ1x1NkI2NVx1NUJDNlx1OTRBNVwiKVxuICAgICAgLnNldERlc2MoXCJcdTc1MzEgQmlubkFnZW50WCBcdTc2ODRcdThGREVcdTYzQTVcdTU0MTFcdTVCRkNcdTc1MUZcdTYyMTBcdUZGMUJcdTRFQzVcdTRGRERcdTVCNThcdTU3MjhcdTY3MkNcdTY3M0EgT2JzaWRpYW4gXHU2M0QyXHU0RUY2XHU4QkJFXHU3RjZFXHU0RTJEXHUzMDAyXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jU2VjcmV0KS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jU2VjcmV0ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdW1tYXJpemVPcmdhbml6YXRpb24ocGxhbjogT3JnYW5pemF0aW9uUGxhbiB8IG51bGwsIG9yZ2FuaXplZDogbnVtYmVyKTogc3RyaW5nIHtcbiAgaWYgKCFwbGFuKSByZXR1cm4gXCJcdTY3MkNcdThGNkVcdTZDQTFcdTY3MDlcdTYzOTJcdTk2MUZcdTc2ODQgSW5ib3ggXHU2NTc0XHU3NDA2XHU0RUZCXHU1MkExXHUzMDAyXCI7XG4gIGlmIChwbGFuLnN0YXR1cyA9PT0gXCJub29wXCIpIHJldHVybiBcIkluYm94IFx1NEUyRFx1NkNBMVx1NjcwOVx1NUY4NVx1NjU3NFx1NzQwNlx1N0IxNFx1OEJCMFx1MzAwMlwiO1xuICBpZiAocGxhbi5zdGF0dXMgPT09IFwicXVldWVkXCIpIHtcbiAgICByZXR1cm4gKFxuICAgICAgYEluYm94IFx1NjcwOSAke3BsYW4uaW5ib3hfY291bnR9IFx1Njc2MVx1NUY4NVx1NjU3NFx1NzQwNlx1N0IxNFx1OEJCMFx1RkYwQ1x1NTNFRlx1OTc2MFx1NTIwNlx1N0M3QiAke3BsYW4uY2xhc3NpZmllZF9jb3VudH0gXHU2NzYxXHVGRjFCYCArXG4gICAgICBcIlx1NjcyQ1x1OEY2RVx1NjcyQVx1NzlGQlx1NTJBOFx1RkYwQ1x1NEVGQlx1NTJBMVx1NEYxQVx1NTcyOFx1NEUwQlx1NkIyMVx1NTQwQ1x1NkI2NVx1OTFDRFx1OEJENVx1MzAwMlwiXG4gICAgKTtcbiAgfVxuICBjb25zdCBmb2xkZXJMYWJlbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgW2Ake0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeWBdOiBcIlx1OEJDRFx1NkM0N1wiLFxuICAgIFtgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXJgXTogXCJcdThCRURcdTZDRDVcIixcbiAgICBbYCR7TElCUkFSWV9ST09UfS8wMy1SZWFkaW5nYF06IFwiXHU5NjA1XHU4QkZCXCIsXG4gICAgW2Ake0xJQlJBUllfUk9PVH0vMDQtV3JpdGluZ2BdOiBcIlx1NTE5OVx1NEY1Q1wiLFxuICB9O1xuICBjb25zdCBjb3VudHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICBmb3IgKGNvbnN0IGFjdGlvbiBvZiBwbGFuLmFjdGlvbnMpIHtcbiAgICBjb25zdCBsYWJlbCA9IGZvbGRlckxhYmVsc1thY3Rpb24udGFyZ2V0X2ZvbGRlcl0gPz8gYWN0aW9uLnRhcmdldF9mb2xkZXI7XG4gICAgY291bnRzLnNldChsYWJlbCwgKGNvdW50cy5nZXQobGFiZWwpID8/IDApICsgMSk7XG4gIH1cbiAgY29uc3QgZGVzdGluYXRpb25zID0gWy4uLmNvdW50cy5lbnRyaWVzKCldXG4gICAgLm1hcCgoW2xhYmVsLCBjb3VudF0pID0+IGAke2xhYmVsfSAke2NvdW50fSBcdTY3NjFgKVxuICAgIC5qb2luKFwiXHUzMDAxXCIpO1xuICByZXR1cm4gYFx1NjU3NFx1NzQwNlx1NUI4Q1x1NjIxMFx1RkYxQVx1NzlGQlx1NTJBOCAke29yZ2FuaXplZH0gXHU2NzYxIEluYm94IFx1N0IxNFx1OEJCMFx1RkYwOCR7ZGVzdGluYXRpb25zfVx1RkYwOVx1MzAwMmA7XG59XG5cbmZ1bmN0aW9uIHNwbGl0U2NvcGUodmFsdWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIHZhbHVlXG4gICAgLnNwbGl0KFwiLFwiKVxuICAgIC5tYXAoKHBhcnQpID0+IHBhcnQudHJpbSgpLnJlcGxhY2UoL15cXC8rfFxcLyskL2csIFwiXCIpKVxuICAgIC5maWx0ZXIoQm9vbGVhbik7XG59XG5mdW5jdGlvbiBhcnJheVN0cmluZ3ModmFsdWU6IHVua25vd24pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKVxuICAgID8gdmFsdWUuZmlsdGVyKChpdGVtKTogaXRlbSBpcyBzdHJpbmcgPT4gdHlwZW9mIGl0ZW0gPT09IFwic3RyaW5nXCIpXG4gICAgOiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCJcbiAgICAgID8gW3ZhbHVlXVxuICAgICAgOiBbXTtcbn1cbmZ1bmN0aW9uIHVuaXF1ZVN0cmluZ3ModmFsdWVzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIFsuLi5uZXcgU2V0KHZhbHVlcy5tYXAoKHZhbHVlKSA9PiB2YWx1ZS5yZXBsYWNlKC9eIy8sIFwiXCIpLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pKV07XG59XG5mdW5jdGlvbiBpc0FsbG93ZWQoZmlsZTogVEZpbGUsIGZvbGRlcnM6IHN0cmluZ1tdLCB0YWdzOiBzdHJpbmdbXSwgYXBwOiBBcHApOiBib29sZWFuIHtcbiAgY29uc3QgY2FjaGUgPSBhcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gIGlmIChcbiAgICBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtURU1QTEFURV9GT0xERVJ9L2ApIHx8XG4gICAgZmlsZS5wYXRoLnN0YXJ0c1dpdGgoXCJCaW5uQWdlbnRYL1RlbXBsYXRlcy9cIikgfHxcbiAgICBmaWxlLmJhc2VuYW1lID09PSBcIkRhc2hib2FyZFwiIHx8XG4gICAgZmlsZS5iYXNlbmFtZSA9PT0gXCIwMC1EYXNoYm9hcmRcIiB8fFxuICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChMSUJSQVJZX05PVEVTLCBmaWxlLnBhdGgpIHx8XG4gICAgY2FjaGU/LmZyb250bWF0dGVyPy5iaW5uYWdlbnRfc3luYyA9PT0gZmFsc2VcbiAgKVxuICAgIHJldHVybiBmYWxzZTtcbiAgY29uc3QgcGF0aEFsbG93ZWQgPSBmb2xkZXJzLnNvbWUoXG4gICAgKGZvbGRlcikgPT4gZmlsZS5wYXRoID09PSBmb2xkZXIgfHwgZmlsZS5wYXRoLnN0YXJ0c1dpdGgoYCR7Zm9sZGVyfS9gKSxcbiAgKTtcbiAgY29uc3QgZmlsZVRhZ3MgPSB1bmlxdWVTdHJpbmdzKFtcbiAgICAuLi4oY2FjaGU/LnRhZ3MgPz8gW10pLm1hcCgodGFnKSA9PiB0YWcudGFnKSxcbiAgICAuLi5hcnJheVN0cmluZ3MoY2FjaGU/LmZyb250bWF0dGVyPy50YWdzKSxcbiAgXSk7XG4gIHJldHVybiBwYXRoQWxsb3dlZCB8fCB0YWdzLnNvbWUoKHRhZykgPT4gZmlsZVRhZ3MuaW5jbHVkZXModGFnKSk7XG59XG5mdW5jdGlvbiBpbmZlcktpbmQodmFsdWU6IHVua25vd24sIHRhZ3M6IHN0cmluZ1tdKTogTGVhcm5pbmdLaW5kIHtcbiAgY29uc3QgY2FuZGlkYXRlID1cbiAgICB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCJcbiAgICAgID8gdmFsdWVcbiAgICAgIDogdGFncy5maW5kKCh0YWcpID0+XG4gICAgICAgICAgW1xuICAgICAgICAgICAgXCJ2b2NhYnVsYXJ5XCIsXG4gICAgICAgICAgICBcImdyYW1tYXJcIixcbiAgICAgICAgICAgIFwid3JpdGluZ19leHByZXNzaW9uXCIsXG4gICAgICAgICAgICBcInJlYWRpbmdfc2tpbGxcIixcbiAgICAgICAgICAgIFwiZXhhbV9za2lsbFwiLFxuICAgICAgICAgICAgXCJ3cml0aW5nX3NraWxsXCIsXG4gICAgICAgICAgXS5pbmNsdWRlcyh0YWcpLFxuICAgICAgICApO1xuICByZXR1cm4gKFxuICAgIFtcbiAgICAgIFwidm9jYWJ1bGFyeVwiLFxuICAgICAgXCJncmFtbWFyXCIsXG4gICAgICBcIndyaXRpbmdfZXhwcmVzc2lvblwiLFxuICAgICAgXCJyZWFkaW5nX3NraWxsXCIsXG4gICAgICBcImV4YW1fc2tpbGxcIixcbiAgICAgIFwid3JpdGluZ19za2lsbFwiLFxuICAgIF0gYXMgc3RyaW5nW11cbiAgKS5pbmNsdWRlcyhjYW5kaWRhdGUgPz8gXCJcIilcbiAgICA/IChjYW5kaWRhdGUgYXMgTGVhcm5pbmdLaW5kKVxuICAgIDogXCJyZWFkaW5nX3NraWxsXCI7XG59XG5mdW5jdGlvbiB1cGRhdGVNYW5hZ2VkRGFzaGJvYXJkTGlua3MobWFya2Rvd246IHN0cmluZywgc291cmNlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IHVwZGF0ZWQgPSBtYXJrZG93blxuICAgIC5yZXBsYWNlQWxsKFwiQmlubkFnZW50WC8wMS1Wb2NhYnVsYXJ5L0Rhc2hib2FyZFwiLCBcIkJpbm5BZ2VudFgvMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIkJpbm5BZ2VudFgvMDItR3JhbW1hci9EYXNoYm9hcmRcIiwgXCJCaW5uQWdlbnRYLzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCIuLi8wMS1Wb2NhYnVsYXJ5L0Rhc2hib2FyZFwiLCBcIi4uLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCIuLi8wMi1HcmFtbWFyL0Rhc2hib2FyZFwiLCBcIi4uLzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJbWzAxLVZvY2FidWxhcnkvRGFzaGJvYXJkXCIsIFwiW1swMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFwiW1swMi1HcmFtbWFyL0Rhc2hib2FyZFwiLCBcIltbMDItR3JhbW1hci8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIltbRGFzaGJvYXJkfFx1NjAzQiBEYXNoYm9hcmRcIiwgXCJbWzAwLURhc2hib2FyZHxcdTYwM0IgRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXG4gICAgICAnV0hFUkUgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCIgQU5EICFjb250YWlucyhmaWxlLnBhdGgsIFwiLzA1LVRlbXBsYXRlcy9cIiknLFxuICAgICAgJ1dIRVJFIGZpbGUubmFtZSAhPSBcIjAwLURhc2hib2FyZFwiIEFORCBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIiBBTkQgIWNvbnRhaW5zKGZpbGUucGF0aCwgXCIvMDUtVGVtcGxhdGVzL1wiKScsXG4gICAgKTtcbiAgaWYgKFxuICAgIHNvdXJjZVBhdGguc3RhcnRzV2l0aChgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvYCkgfHxcbiAgICBzb3VyY2VQYXRoLnN0YXJ0c1dpdGgoYCR7TElCUkFSWV9ST09UfS8wMi1HcmFtbWFyL2ApXG4gICkge1xuICAgIHVwZGF0ZWQgPSB1cGRhdGVkLnJlcGxhY2VBbGwoXCJbW0Rhc2hib2FyZF1dXCIsIFwiW1swMC1EYXNoYm9hcmRdXVwiKTtcbiAgfVxuICBpZiAoc291cmNlUGF0aC5lbmRzV2l0aChcIi9EYXNoYm9hcmQubWRcIikgfHwgc291cmNlUGF0aC5lbmRzV2l0aChcIi8wMC1EYXNoYm9hcmQubWRcIikpIHtcbiAgICB1cGRhdGVkID0gdXBkYXRlZC5yZXBsYWNlQWxsKFxuICAgICAgJ1dIRVJFIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiJyxcbiAgICAgICdXSEVSRSBmaWxlLm5hbWUgIT0gXCIwMC1EYXNoYm9hcmRcIiBBTkQgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCInLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHVwZGF0ZWQ7XG59XG5mdW5jdGlvbiBzdW1tYXJpemUobWFya2Rvd246IHN0cmluZywgbGltaXQ6IG51bWJlcik6IHN0cmluZyB7XG4gIHJldHVybiBtYXJrZG93blxuICAgIC5yZXBsYWNlKC9eLS0tW1xcc1xcU10qPy0tLVxccyovdSwgXCJcIilcbiAgICAucmVwbGFjZSgvYGBgW1xcc1xcU10qP2BgYC9ndSwgXCJcIilcbiAgICAucmVwbGFjZSgvIT8oXFxbKFteXFxdXSopXFxdXFwoW14pXSpcXCkpL2d1LCBcIiQyXCIpXG4gICAgLnJlcGxhY2UoL1sjPipfYF0vZ3UsIFwiIFwiKVxuICAgIC5yZXBsYWNlKC9cXHMrL2d1LCBcIiBcIilcbiAgICAudHJpbSgpXG4gICAgLnNsaWNlKDAsIGxpbWl0KTtcbn1cbmZ1bmN0aW9uIHNhZmVGaWxlbmFtZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIChcbiAgICB2YWx1ZVxuICAgICAgLnJlcGxhY2UoL1tcXFxcLzoqP1wiPD58XS9nLCBcIi1cIilcbiAgICAgIC50cmltKClcbiAgICAgIC5zbGljZSgwLCA4MCkgfHwgXCJhc3NldFwiXG4gICk7XG59XG5mdW5jdGlvbiB5YW1sU3RyaW5nKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvXFxcXC9nLCBcIlxcXFxcXFxcXCIpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHNoYTI1Nih2YWx1ZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZGlnZXN0ID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMjU2XCIsIG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZSh2YWx1ZSkpO1xuICByZXR1cm4gQXJyYXkuZnJvbShuZXcgVWludDhBcnJheShkaWdlc3QpLCAoYnl0ZSkgPT4gYnl0ZS50b1N0cmluZygxNikucGFkU3RhcnQoMiwgXCIwXCIpKS5qb2luKFwiXCIpO1xufVxuIl0sCiAg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O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBNENoRCxDQUFDLEdBQUdBLENBQVksNkJBQTZCLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBcUJoRCxDQUFDLEdBQUdBLENBQVksd0NBQW1DLEVBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF3Q3RELENBQUMsR0FBR0EsQ0FBWSxxREFBdUIsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFpQzFDLENBQUMsR0FBR0EsQ0FBWSxxREFBdUIsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsQ0E4QjVDLEVBRXFCSCxFQUFyQixjQUEwRCxRQUFPLENBQy9ELFNBQXlCVSxFQUV6QixNQUFNLFFBQXdCLENBQzVCLE1BQU0sS0FBSyxhQUFhLEVBQ3hCLEtBQUssY0FBYyxJQUFJRyxFQUFxQixLQUFLLElBQUssSUFBSSxDQUFDLEVBQzNELEtBQUssV0FBVyxDQUNkLEdBQUksMkJBQ0osS0FBTSwyQkFDTixTQUFVLElBQU0sS0FBSyxRQUFRLENBQy9CLENBQUMsRUFDRCxLQUFLLFdBQVcsQ0FDZCxHQUFJLHdCQUNKLEtBQU0saUNBQ04sU0FBVSxJQUFNLEtBQUssS0FBSyxDQUM1QixDQUFDLEVBQ0QsS0FBSyxXQUFXLENBQ2QsR0FBSSw2QkFDSixLQUFNLHlDQUNOLFNBQVUsSUFBTSxLQUFLLDBCQUEwQixDQUNqRCxDQUFDLEVBQ0QsS0FBSyxJQUFJLFVBQVUsY0FBYyxJQUFNLENBQ2hDLEtBQUssa0JBQWtCLENBQzlCLENBQUMsRUFDRCxLQUFLLGlCQUNILE9BQU8sWUFBWSxJQUFNLENBQ25CLEtBQUssU0FBUyxVQUFlLEtBQUssS0FBSyxFQUFLLENBQ2xELEVBQUcsR0FBTSxDQUNYLENBQ0YsQ0FFQSxNQUFNLGNBQThCLENBQ2xDLEtBQUssU0FBVyxDQUFFLEdBQUdILEVBQWtCLEdBQUksTUFBTSxLQUFLLFNBQVMsQ0FBRyxDQUNwRSxDQUVBLE1BQU0sY0FBOEIsQ0FDbEMsTUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRLENBQ25DLENBRUEsTUFBYyxtQkFBbUMsQ0FDL0MsR0FBSSxLQUFLLFNBQVMsZUFBaUJGLEVBQ2pDLEdBQUksQ0FDRixNQUFNLEtBQUssMEJBQTBCLEVBQUssQ0FDNUMsT0FBU00sRUFBTyxDQUNkLElBQU1DLEVBQVVELGFBQWlCLE1BQVFBLEVBQU0sUUFBVSwyQkFDekQsSUFBSSxTQUFPLG9FQUF1QkMsQ0FBTyxFQUFFLENBQzdDLENBRUUsS0FBSyxTQUFTLFVBQVUsTUFBTSxLQUFLLEtBQUssRUFBSyxDQUNuRCxDQUVBLE1BQWMscUJBQXVELENBQ25FLElBQU1DLEVBQVVDLEVBQVcsS0FBSyxTQUFTLGNBQWMsRUFDakRDLEVBQU9ELEVBQVcsS0FBSyxTQUFTLFdBQVcsRUFBRSxJQUFLRSxHQUFRQSxFQUFJLFFBQVEsS0FBTSxFQUFFLENBQUMsRUFDckYsR0FBSSxDQUFDSCxFQUFRLFFBQVUsQ0FBQ0UsRUFBSyxPQUFRLE1BQU0sSUFBSSxNQUFNLDhHQUFvQixFQUN6RSxJQUFNRSxFQUFRLEtBQUssSUFBSSxNQUNwQixpQkFBaUIsRUFDakIsT0FBUUMsR0FBU0MsRUFBVUQsRUFBTUwsRUFBU0UsRUFBTSxLQUFLLEdBQUcsQ0FBQyxFQUM1RCxHQUFJRSxFQUFNLE9BQVMsS0FBSyxTQUFTLFNBQy9CLE1BQU0sSUFBSSxNQUNSLHNCQUFPQSxFQUFNLE1BQU0sNkVBQWlCLEtBQUssU0FBUyxRQUFRLFFBQzVELEVBQ0YsT0FBTyxRQUFRLElBQ2JBLEVBQU0sSUFBSSxNQUFPQyxHQUFTLENBQ3hCLElBQU1FLEVBQVEsS0FBSyxJQUFJLGNBQWMsYUFBYUYsQ0FBSSxFQUNoREcsRUFBY0QsR0FBTyxhQUFlLENBQUMsRUFDckNMLEVBQU9PLEVBQWMsQ0FDekIsR0FBR0MsRUFBYUYsRUFBWSxJQUFJLEVBQ2hDLElBQUlELEdBQU8sTUFBUSxDQUFDLEdBQUcsSUFBS0osR0FBUUEsRUFBSSxJQUFJLFFBQVEsS0FBTSxFQUFFLENBQUMsQ0FDL0QsQ0FBQyxFQUNELE1BQU8sQ0FDTCxXQUFZRSxFQUFLLEtBQ2pCLFNBQ0UsT0FBT0csRUFBWSxvQkFBdUIsU0FDdENBLEVBQVksbUJBQ1osT0FDTixNQUFPLE9BQU9BLEVBQVksT0FBU0gsRUFBSyxRQUFRLEVBQ2hELEtBQU1NLEVBQVVILEVBQVksZUFBZ0JOLENBQUksRUFDaEQsS0FBQUEsRUFDQSxRQUFTVSxFQUFVLE1BQU0sS0FBSyxJQUFJLE1BQU0sS0FBS1AsQ0FBSSxFQUFHLEtBQUssU0FBUyxvQkFBb0IsRUFDdEYsWUFBYSxJQUFJLEtBQUtBLEVBQUssS0FBSyxLQUFLLEVBQUUsWUFBWSxDQUNyRCxDQUNGLENBQUMsQ0FDSCxDQUNGLENBRUEsTUFBYyxTQUF5QixDQUNyQyxHQUFJLENBQ0YsSUFBTVEsRUFBVSxNQUFNLEtBQUssb0JBQW9CLEVBQy9DLElBQUksU0FDRixzQkFBT0EsRUFBUSxNQUFNLDhDQUNuQkEsRUFDRyxNQUFNLEVBQUcsQ0FBQyxFQUNWLElBQUtDLEdBQVVBLEVBQU0sS0FBSyxFQUMxQixLQUFLLFFBQUcsR0FBSyxRQUNsQixFQUNGLENBQ0YsT0FBU2hCLEVBQU8sQ0FDZCxJQUFJLFNBQU9BLGFBQWlCLE1BQVFBLEVBQU0sUUFBVSxrREFBVSxDQUNoRSxDQUNGLENBRUEsTUFBTSwwQkFBMEJpQixFQUFhLEdBQXFCLENBQ2hFLElBQUlDLEVBQVksRUFDWCxLQUFLLElBQUksTUFBTSxzQkFBc0I3QixDQUFZLElBQ3BELE1BQU0sS0FBSyxJQUFJLE1BQU0sYUFBYUEsQ0FBWSxFQUM5QzZCLEdBQWEsR0FFZixRQUFXQyxLQUFRN0IsRUFBaUIsQ0FDbEMsSUFBTThCLEVBQVMsR0FBRy9CLENBQVksSUFBSThCLENBQUksR0FDakMsS0FBSyxJQUFJLE1BQU0sc0JBQXNCQyxDQUFNLElBQzlDLE1BQU0sS0FBSyxJQUFJLE1BQU0sYUFBYUEsQ0FBTSxFQUN4Q0YsR0FBYSxFQUVqQixDQUNBQSxHQUFhLE1BQU0sS0FBSyx5QkFBeUIsRUFDakQsTUFBTSxLQUFLLDZCQUE2QixFQUN4QyxPQUFXLENBQUNDLEVBQU1FLENBQU8sSUFBSyxPQUFPLFFBQVF4QixDQUFrQixFQUN4RCxLQUFLLElBQUksTUFBTSxzQkFBc0IsR0FBR0wsQ0FBZSxJQUFJMkIsQ0FBSSxFQUFFLElBQ3BFLE1BQU0sS0FBSyxJQUFJLE1BQU0sT0FBTyxHQUFHM0IsQ0FBZSxJQUFJMkIsQ0FBSSxHQUFJRSxDQUFPLEVBQ2pFSCxHQUFhLEdBR2pCLE9BQVcsQ0FBQ0ksRUFBTUQsQ0FBTyxJQUFLLE9BQU8sUUFBUXZCLENBQWEsRUFDbkQsS0FBSyxJQUFJLE1BQU0sc0JBQXNCd0IsQ0FBSSxJQUM1QyxNQUFNLEtBQUssSUFBSSxNQUFNLE9BQU9BLEVBQU1ELENBQU8sRUFDekNILEdBQWEsR0FHakIsTUFBTSxLQUFLLHlCQUF5QixFQUNwQyxLQUFLLFNBQVMsZUFBaUJ4QixFQUMvQixNQUFNLEtBQUssYUFBYSxFQUNwQnVCLEdBQ0YsSUFBSSxTQUNGQyxFQUNJLDJFQUF5QkEsQ0FBUyxnQkFDbEMsaUdBQ04sQ0FFSixDQUVBLE1BQWMsMEJBQTRDLENBQ3hELElBQUlLLEVBQVcsRUFDZixPQUFXLENBQUNDLEVBQVlDLENBQVUsSUFBSzlCLEVBQXNCLENBQzNELElBQU0rQixFQUFTLEtBQUssSUFBSSxNQUFNLHNCQUFzQkYsQ0FBVSxFQUMxRCxFQUFFRSxhQUFrQixVQUFVLEtBQUssSUFBSSxNQUFNLHNCQUFzQkQsQ0FBVSxJQUNqRixNQUFNLEtBQUssSUFBSSxNQUFNLE9BQU9DLEVBQVFELENBQVUsRUFDOUNGLEdBQVksRUFDZCxDQUNBLE9BQU9BLENBQ1QsQ0FFQSxNQUFjLDhCQUE4QyxDQUMxRCxJQUFNakIsRUFBUSxLQUFLLElBQUksTUFDcEIsaUJBQWlCLEVBQ2pCLE9BQ0VDLEdBQVNBLEVBQUssT0FBUyxHQUFHbEIsQ0FBWSxPQUFTa0IsRUFBSyxLQUFLLFdBQVcsR0FBR2xCLENBQVksR0FBRyxDQUN6RixFQUNGLFFBQVdrQixLQUFRRCxFQUFPLENBQ3hCLElBQU1lLEVBQVUsTUFBTSxLQUFLLElBQUksTUFBTSxLQUFLZCxDQUFJLEVBQ3hDb0IsRUFBVUMsRUFBNEJQLEVBQVNkLEVBQUssSUFBSSxFQUMxRG9CLElBQVlOLEdBQVMsTUFBTSxLQUFLLElBQUksTUFBTSxPQUFPZCxFQUFNb0IsQ0FBTyxDQUNwRSxDQUNGLENBRUEsTUFBYywwQkFBMEMsQ0FDdEQsSUFBTUUsRUFBb0IsS0FBSyxJQUFJLE1BRy9CLE9BQU9BLEVBQWtCLFdBQWMsV0FDekNBLEVBQWtCLFVBQVUsdUJBQXdCcEMsQ0FBaUIsRUFFckUsTUFBTSxLQUFLLGdCQUFnQixHQUFHLEtBQUssSUFBSSxNQUFNLFNBQVMsWUFBYSxDQUNqRSxxQkFBc0JBLENBQ3hCLENBQUMsRUFFSCxNQUFNLEtBQUssZ0JBQWdCLEdBQUcsS0FBSyxJQUFJLE1BQU0sU0FBUyxrQkFBbUIsQ0FDdkUsT0FBUUQsQ0FDVixDQUFDLENBQ0gsQ0FFQSxNQUFjLGdCQUFnQjhCLEVBQWNRLEVBQStDLENBQ3pGLElBQU1DLEVBQVUsS0FBSyxJQUFJLE1BQU0sUUFDM0JDLEVBQW1DLENBQUMsRUFDeEMsR0FBSSxNQUFNRCxFQUFRLE9BQU9ULENBQUksRUFBRyxDQUM5QixJQUFNVyxFQUFNLE1BQU1GLEVBQVEsS0FBS1QsQ0FBSSxFQUNuQyxHQUFJLENBQ0YsSUFBTVksRUFBa0IsS0FBSyxNQUFNRCxDQUFHLEVBQ2xDQyxHQUFVLE9BQU9BLEdBQVcsVUFBWSxDQUFDLE1BQU0sUUFBUUEsQ0FBTSxJQUMvREYsRUFBVUUsRUFFZCxNQUFRLENBQ04sTUFBTSxJQUFJLE1BQU0sdURBQW9CWixDQUFJLHNDQUFhLENBQ3ZELENBQ0YsQ0FDQSxJQUFNSyxFQUFVLENBQUUsR0FBR0ssRUFBUyxHQUFHRixDQUFNLEVBQ25DLEtBQUssVUFBVUgsQ0FBTyxJQUFNLEtBQUssVUFBVUssQ0FBTyxHQUNwRCxNQUFNRCxFQUFRLE1BQU1ULEVBQU0sR0FBRyxLQUFLLFVBQVVLLEVBQVMsS0FBTSxDQUFDLENBQUM7QUFBQSxDQUFJLENBRXJFLENBRUEsTUFBYyxLQUFLVixFQUFhLEdBQXFCLENBQ25ELEdBQUksQ0FBQyxLQUFLLFNBQVMsY0FBZ0IsQ0FBQyxLQUFLLFNBQVMsV0FBWSxDQUN4REEsR0FBWSxJQUFJLFNBQU8sa0dBQTRCLEVBQ3ZELE1BQ0YsQ0FDQSxHQUFJLENBQ0YsSUFBTWtCLEVBQVcsTUFBTSxLQUFLLGtCQUFrQixFQUN4Q3BCLEVBQVUsTUFBTSxLQUFLLG9CQUFvQixFQUN6Q3FCLEVBQVcsUUFBTSxjQUFXLENBQ2hDLElBQUssR0FBRyxLQUFLLFNBQVMsV0FBVyxRQUFRLE1BQU8sRUFBRSxDQUFDLHFCQUFxQixtQkFBbUIsS0FBSyxTQUFTLFlBQVksQ0FBQyxVQUN0SCxPQUFRLE9BQ1IsUUFBUyxDQUNQLGNBQWUsVUFBVSxLQUFLLFNBQVMsVUFBVSxHQUNqRCxlQUFnQixrQkFDbEIsRUFDQSxLQUFNLEtBQUssVUFBVSxDQUNuQixlQUFnQixzQkFDaEIsV0FBWSxLQUFLLElBQUksTUFBTSxRQUFRLEVBQ25DLFFBQUFyQixDQUNGLENBQUMsRUFDRCxNQUFPLEVBQ1QsQ0FBQyxFQUNELEdBQUlxQixFQUFTLE9BQVMsS0FBT0EsRUFBUyxRQUFVLElBQzlDLE1BQU0sSUFBSSxNQUFNLDRDQUFtQkEsRUFBUyxNQUFNLFFBQUcsRUFDdkQsSUFBTUMsRUFBU0QsRUFBUyxLQUNsQkUsRUFBWSxNQUFNLEtBQUssc0JBQXNCRCxFQUFPLFlBQVksRUFDaEVFLEVBQXNCQyxFQUFzQkgsRUFBTyxhQUFjQyxDQUFTLEVBQzFFRyxFQUNKLGdCQUFNTixDQUFRLHlDQUFXcEIsRUFBUSxNQUFNLDhDQUFhd0IsRUFDdEQsS0FBSyxTQUFTLGFBQWUsSUFBSSxLQUFLLEVBQUUsWUFBWSxFQUNwRCxLQUFLLFNBQVMsY0FBZ0IsR0FDOUIsS0FBSyxTQUFTLGdCQUFrQkUsRUFDaEMsTUFBTSxLQUFLLGFBQWEsRUFDcEJ4QixHQUFZLElBQUksU0FBTyw2Q0FBVXdCLENBQVcsRUFBRSxDQUNwRCxPQUFTekMsRUFBTyxDQUNkLElBQU1DLEVBQVVELGFBQWlCLE1BQVFBLEVBQU0sUUFBVSwyQkFDekQsS0FBSyxTQUFTLGNBQWdCQyxFQUM5QixNQUFNLEtBQUssYUFBYSxFQUNwQmdCLEdBQVksSUFBSSxTQUFPaEIsQ0FBTyxDQUNwQyxDQUNGLENBRUEsTUFBYyxzQkFBc0J5QyxFQUFnRCxDQUNsRixHQUFJQSxHQUFNLFNBQVcsV0FBYSxDQUFDQSxFQUFLLFFBQVEsT0FBUSxNQUFPLEdBQy9ELElBQU1DLEVBQWlCLElBQUksSUFBSSxDQUM3QixHQUFHdEQsQ0FBWSxpQkFDZixHQUFHQSxDQUFZLGNBQ2YsR0FBR0EsQ0FBWSxjQUNmLEdBQUdBLENBQVksYUFDakIsQ0FBQyxFQUNLdUQsRUFBc0IsQ0FBQyxFQUM3QixRQUFXQyxLQUFVSCxFQUFLLFFBQVMsQ0FFakMsR0FESSxDQUFDRyxFQUFPLFdBQVcsV0FBVyxHQUFHdEQsQ0FBWSxHQUFHLEdBQ2hELENBQUNvRCxFQUFlLElBQUlFLEVBQU8sYUFBYSxFQUFHLFNBQy9DLElBQU1DLEVBQVdELEVBQU8sV0FBVyxNQUFNQSxFQUFPLFdBQVcsWUFBWSxHQUFHLEVBQUksQ0FBQyxFQUN6RUUsRUFBaUJELEVBQVMsWUFBWSxHQUFHLEVBQ3pDRSxFQUFXRCxFQUFpQixFQUFJRCxFQUFTLE1BQU0sRUFBR0MsQ0FBYyxFQUFJRCxFQUNwRUcsRUFBWUYsRUFBaUIsRUFBSUQsRUFBUyxNQUFNQyxFQUFpQixDQUFDLEVBQUksS0FDdEVHLEVBQVcsR0FBR0wsRUFBTyxhQUFhLElBQUlDLENBQVEsR0FDOUNLLEVBQVksR0FBR04sRUFBTyxhQUFhLElBQUlHLENBQVEsSUFBSUgsRUFBTyxVQUFVLE1BQU0sRUFBRyxDQUFDLENBQUMsSUFBSUksQ0FBUyxHQUM1RkcsRUFBUyxLQUFLLElBQUksTUFBTSxzQkFBc0JQLEVBQU8sVUFBVSxFQUNyRSxHQUFJLEVBQUVPLGFBQWtCLFNBQVEsRUFFNUIsS0FBSyxJQUFJLE1BQU0sc0JBQXNCRixDQUFRLFlBQWEsU0FDMUQsS0FBSyxJQUFJLE1BQU0sc0JBQXNCQyxDQUFTLFlBQWEsVUFFM0RQLEVBQVUsS0FBS0MsRUFBTyxTQUFTLEVBRWpDLFFBQ0YsQ0FDQSxJQUFNcEIsRUFBYSxLQUFLLElBQUksTUFBTSxzQkFBc0J5QixDQUFRLEVBQUlDLEVBQVlELEVBQzVFLEtBQUssSUFBSSxNQUFNLHNCQUFzQnpCLENBQVUsSUFDbkQsTUFBTSxLQUFLLElBQUksTUFBTSxPQUFPMkIsRUFBUTNCLENBQVUsRUFDOUNtQixFQUFVLEtBQUtDLEVBQU8sU0FBUyxFQUNqQyxDQUNBLEdBQUlELEVBQVUsU0FBV0YsRUFBSyxRQUFRLE9BQ3BDLE1BQU0sSUFBSSxNQUFNLDBLQUFtQyxFQUVyRCxJQUFNTixFQUFXLFFBQU0sY0FBVyxDQUNoQyxJQUFLLEdBQUcsS0FBSyxTQUFTLFdBQVcsUUFBUSxNQUFPLEVBQUUsQ0FBQyxxQkFBcUIsbUJBQW1CLEtBQUssU0FBUyxZQUFZLENBQUMsbUJBQW1CLG1CQUFtQk0sRUFBSyxNQUFNLENBQUMsT0FDeEssT0FBUSxPQUNSLFFBQVMsQ0FDUCxjQUFlLFVBQVUsS0FBSyxTQUFTLFVBQVUsR0FDakQsZUFBZ0Isa0JBQ2xCLEVBQ0EsS0FBTSxLQUFLLFVBQVUsQ0FBRSxxQkFBc0JFLENBQVUsQ0FBQyxFQUN4RCxNQUFPLEVBQ1QsQ0FBQyxFQUNELEdBQUlSLEVBQVMsT0FBUyxLQUFPQSxFQUFTLFFBQVUsSUFDOUMsTUFBTSxJQUFJLE1BQU0sbURBQWdCQSxFQUFTLE1BQU0sUUFBRyxFQUNwRCxPQUFPUSxFQUFVLE1BQ25CLENBRUEsTUFBYyxtQkFBcUMsQ0FDakQsSUFBTVMsRUFBTyxLQUFLLFNBQVMsV0FBVyxRQUFRLE1BQU8sRUFBRSxFQUNqREMsRUFBVSxDQUFFLGNBQWUsVUFBVSxLQUFLLFNBQVMsVUFBVSxFQUFHLEVBQ2hFbEIsRUFBVyxRQUFNLGNBQVcsQ0FDaEMsSUFBSyxHQUFHaUIsQ0FBSSxxQkFBcUIsbUJBQW1CLEtBQUssU0FBUyxZQUFZLENBQUMsV0FDL0UsT0FBUSxNQUNSLFFBQUFDLEVBQ0EsTUFBTyxFQUNULENBQUMsRUFDRCxHQUFJbEIsRUFBUyxPQUFTLEtBQU9BLEVBQVMsUUFBVSxJQUM5QyxNQUFNLElBQUksTUFBTSwrREFBYUEsRUFBUyxNQUFNLFFBQUcsRUFDakQsSUFBTW1CLEVBQVVuQixFQUFTLEtBQ3JCUSxFQUFZLEVBQ2hCLFFBQVdZLEtBQVFELEVBQVMsQ0FDMUIsSUFBTWhELEVBQU8sTUFBTSxLQUFLLGdCQUFnQmlELENBQUksRUFDdENuQyxFQUFVLE1BQU0sS0FBSyxJQUFJLE1BQU0sS0FBS2QsQ0FBSSxFQUN4Q2tELEVBQVMsTUFBTUMsRUFBT3JDLENBQU8sRUFDN0JzQyxFQUFNLFFBQU0sY0FBVyxDQUMzQixJQUFLLEdBQUdOLENBQUkscUJBQXFCLG1CQUFtQixLQUFLLFNBQVMsWUFBWSxDQUFDLFlBQVksbUJBQW1CRyxFQUFLLFFBQVEsQ0FBQyxPQUM1SCxPQUFRLE9BQ1IsUUFBUyxDQUFFLEdBQUdGLEVBQVMsZUFBZ0Isa0JBQW1CLEVBQzFELEtBQU0sS0FBSyxVQUFVLENBQ25CLFdBQVkvQyxFQUFLLEtBQ2pCLGFBQWNrRCxFQUNkLFlBQWEsSUFBSSxLQUFLbEQsRUFBSyxLQUFLLEtBQUssRUFBRSxZQUFZLEVBQ25ELFdBQVksS0FBSyxJQUFJLE1BQU0sUUFBUSxDQUNyQyxDQUFDLEVBQ0QsTUFBTyxFQUNULENBQUMsRUFDRCxHQUFJb0QsRUFBSSxPQUFTLEtBQU9BLEVBQUksUUFBVSxJQUNwQyxNQUFNLElBQUksTUFBTSx5REFBWUEsRUFBSSxNQUFNLFFBQUcsRUFDM0NmLEdBQWEsQ0FDZixDQUNBLE9BQU9BLENBQ1QsQ0FFQSxNQUFjLGdCQUFnQlksRUFBMEMsQ0FDakUsS0FBSyxJQUFJLE1BQU0sc0JBQXNCbkUsQ0FBWSxHQUNwRCxNQUFNLEtBQUssSUFBSSxNQUFNLGFBQWFBLENBQVksRUFFM0MsS0FBSyxJQUFJLE1BQU0sc0JBQXNCRSxDQUFZLEdBQ3BELE1BQU0sS0FBSyxJQUFJLE1BQU0sYUFBYUEsQ0FBWSxFQUVoRCxJQUFNNkIsRUFBUzdCLEVBQ1RxRSxFQUFXLEdBQUdDLEVBQWFMLEVBQUssS0FBSyxDQUFDLElBQUlBLEVBQUssU0FBUyxNQUFNLEdBQUcsQ0FBQyxNQUNsRWxDLEVBQU8sR0FBR0YsQ0FBTSxJQUFJd0MsQ0FBUSxHQUM1QkUsRUFBVyxLQUFLLElBQUksTUFBTSxzQkFBc0J4QyxDQUFJLEVBQzFELEdBQUl3QyxhQUFvQixRQUFPLE9BQU9BLEVBQ3RDLElBQU0xRCxFQUFPTyxFQUFjLENBQUMsWUFBYTZDLEVBQUssS0FBTSxHQUFHQSxFQUFLLElBQUksQ0FBQyxFQUMzRDlDLEVBQWMsQ0FDbEIsTUFDQSwrQkFDQSx3QkFBd0JxRCxFQUFXUCxFQUFLLFFBQVEsQ0FBQyxJQUNqRCxvQkFBb0JPLEVBQVdQLEVBQUssSUFBSSxDQUFDLElBQ3pDLDJCQUEyQk8sRUFBV1AsRUFBSyxXQUFXLENBQUMsSUFDdkQsNEJBQ0EsV0FBV08sRUFBV1AsRUFBSyxLQUFLLENBQUMsSUFDakMsR0FBSUEsRUFBSyxlQUNMLENBQUMsOEJBQThCTyxFQUFXUCxFQUFLLGNBQWMsQ0FBQyxHQUFHLEVBQ2pFLENBQUMsRUFDTCxRQUNBLEdBQUdwRCxFQUFLLElBQUtDLEdBQVEsT0FBT0EsQ0FBRyxFQUFFLEVBQ2pDLE1BQ0EsR0FDQSxLQUFLbUQsRUFBSyxLQUFLLEdBQ2YsRUFDRixFQUNNUSxFQUFPUixFQUFLLGlCQUFpQixLQUFLLEVBQ3BDLENBQUMsOEJBQVcsR0FBSUEsRUFBSyxnQkFBZ0IsS0FBSyxFQUFHLEdBQUksOEJBQVcsRUFBRSxFQUM5RCxDQUFDLDhCQUFXLEdBQUksOEJBQVcsR0FBSSxvQ0FBWSxHQUFJLG9DQUFZLEVBQUUsRUFDakUsT0FBTyxNQUFNLEtBQUssSUFBSSxNQUFNLE9BQU9sQyxFQUFNLENBQUMsR0FBR1osRUFBYSxHQUFHc0QsQ0FBSSxFQUFFLEtBQUs7QUFBQSxDQUFJLENBQUMsQ0FDL0UsQ0FDRixFQUVNakUsRUFBTixjQUFtQyxrQkFBaUIsQ0FDbEQsWUFDRWtFLEVBQ2lCQyxFQUNqQixDQUNBLE1BQU1ELEVBQUtDLENBQU0sRUFGQSxZQUFBQSxDQUduQixDQUNBLFNBQWdCLENBQ2QsR0FBTSxDQUFFLFlBQUFDLENBQVksRUFBSSxLQUN4QkEsRUFBWSxNQUFNLEVBQ2xCQSxFQUFZLFNBQVMsS0FBTSxDQUFFLEtBQU0saURBQW9CLENBQUMsRUFDeERBLEVBQVksU0FBUyxJQUFLLENBQ3hCLEtBQU0sOFdBQ1IsQ0FBQyxFQUNELElBQUksVUFBUUEsQ0FBVyxFQUNwQixRQUFRLHNDQUFRLEVBQ2hCLFFBQVEsZ0xBQXdELEVBQ2hFLFVBQVdDLEdBQ1ZBLEVBQU8sY0FBYyxnQ0FBTyxFQUFFLFFBQVEsU0FBWSxDQUNoRCxNQUFNLEtBQUssT0FBTywwQkFBMEIsQ0FDOUMsQ0FBQyxDQUNILEVBQ0YsSUFBSSxVQUFRRCxDQUFXLEVBQ3BCLFFBQVEsc0NBQVEsRUFDaEIsUUFBUSw2TEFBNEMsRUFDcEQsVUFBV0UsR0FDVkEsRUFBTyxTQUFTLEtBQUssT0FBTyxTQUFTLFFBQVEsRUFBRSxTQUFTLE1BQU9DLEdBQVUsQ0FDdkUsS0FBSyxPQUFPLFNBQVMsU0FBV0EsRUFDaEMsTUFBTSxLQUFLLE9BQU8sYUFBYSxDQUNqQyxDQUFDLENBQ0gsRUFDRixJQUFJLFVBQVFILENBQVcsRUFDcEIsUUFBUSwwQkFBTSxFQUNkLFFBQ0MsS0FBSyxPQUFPLFNBQVMsY0FDakIscUJBQU0sS0FBSyxPQUFPLFNBQVMsYUFBYSxHQUN4QyxLQUFLLE9BQU8sU0FBUyxhQUNuQixHQUFHLEtBQUssT0FBTyxTQUFTLFlBQVksU0FBSSxLQUFLLE9BQU8sU0FBUyxpQkFBbUIsMEJBQU0sR0FDdEYsc0NBQ1IsRUFDRixJQUFJLFVBQVFBLENBQVcsRUFDcEIsUUFBUSxzQ0FBUSxFQUNoQixRQUFRLGtGQUEyQixFQUNuQyxRQUFTSSxHQUNSQSxFQUFLLFNBQVMsS0FBSyxPQUFPLFNBQVMsY0FBYyxFQUFFLFNBQVMsTUFBT0QsR0FBVSxDQUMzRSxLQUFLLE9BQU8sU0FBUyxlQUFpQkEsRUFDdEMsTUFBTSxLQUFLLE9BQU8sYUFBYSxDQUNqQyxDQUFDLENBQ0gsRUFDRixJQUFJLFVBQVFILENBQVcsRUFDcEIsUUFBUSxnQ0FBTyxFQUNmLFFBQVEsNEZBQTBDLEVBQ2xELFFBQVNJLEdBQ1JBLEVBQUssU0FBUyxLQUFLLE9BQU8sU0FBUyxXQUFXLEVBQUUsU0FBUyxNQUFPRCxHQUFVLENBQ3hFLEtBQUssT0FBTyxTQUFTLFlBQWNBLEVBQ25DLE1BQU0sS0FBSyxPQUFPLGFBQWEsQ0FDakMsQ0FBQyxDQUNILEVBQ0YsSUFBSSxVQUFRSCxDQUFXLEVBQ3BCLFFBQVEseUJBQWUsRUFDdkIsUUFBUSw2REFBb0MsRUFDNUMsUUFBU0ksR0FDUkEsRUFBSyxTQUFTLEtBQUssT0FBTyxTQUFTLFVBQVUsRUFBRSxTQUFTLE1BQU9ELEdBQVUsQ0FDdkUsS0FBSyxPQUFPLFNBQVMsV0FBYUEsRUFDbEMsTUFBTSxLQUFLLE9BQU8sYUFBYSxDQUNqQyxDQUFDLENBQ0gsRUFDRixJQUFJLFVBQVFILENBQVcsRUFBRSxRQUFRLGlCQUFPLEVBQUUsUUFBU0ksR0FDakRBLEVBQUssU0FBUyxLQUFLLE9BQU8sU0FBUyxZQUFZLEVBQUUsU0FBUyxNQUFPRCxHQUFVLENBQ3pFLEtBQUssT0FBTyxTQUFTLGFBQWVBLEVBQ3BDLE1BQU0sS0FBSyxPQUFPLGFBQWEsQ0FDakMsQ0FBQyxDQUNILEVBQ0EsSUFBSSxVQUFRSCxDQUFXLEVBQ3BCLFFBQVEsMEJBQU0sRUFDZCxRQUFRLHNKQUE2QyxFQUNyRCxRQUFTSSxHQUNSQSxFQUFLLFNBQVMsS0FBSyxPQUFPLFNBQVMsVUFBVSxFQUFFLFNBQVMsTUFBT0QsR0FBVSxDQUN2RSxLQUFLLE9BQU8sU0FBUyxXQUFhQSxFQUNsQyxNQUFNLEtBQUssT0FBTyxhQUFhLENBQ2pDLENBQUMsQ0FDSCxDQUNKLENBQ0YsRUFFQSxTQUFTOUIsRUFBc0JFLEVBQStCSixFQUEyQixDQUN2RixHQUFJLENBQUNJLEVBQU0sTUFBTyxrRkFDbEIsR0FBSUEsRUFBSyxTQUFXLE9BQVEsTUFBTywrREFDbkMsR0FBSUEsRUFBSyxTQUFXLFNBQ2xCLE1BQ0UsZ0JBQVdBLEVBQUssV0FBVyx1RUFBZ0JBLEVBQUssZ0JBQWdCLHNIQUlwRSxJQUFNOEIsRUFBdUMsQ0FDM0MsQ0FBQyxHQUFHbkYsQ0FBWSxnQkFBZ0IsRUFBRyxlQUNuQyxDQUFDLEdBQUdBLENBQVksYUFBYSxFQUFHLGVBQ2hDLENBQUMsR0FBR0EsQ0FBWSxhQUFhLEVBQUcsZUFDaEMsQ0FBQyxHQUFHQSxDQUFZLGFBQWEsRUFBRyxjQUNsQyxFQUNNb0YsRUFBUyxJQUFJLElBQ25CLFFBQVc1QixLQUFVSCxFQUFLLFFBQVMsQ0FDakMsSUFBTWdDLEVBQVFGLEVBQWEzQixFQUFPLGFBQWEsR0FBS0EsRUFBTyxjQUMzRDRCLEVBQU8sSUFBSUMsR0FBUUQsRUFBTyxJQUFJQyxDQUFLLEdBQUssR0FBSyxDQUFDLENBQ2hELENBQ0EsSUFBTUMsRUFBZSxDQUFDLEdBQUdGLEVBQU8sUUFBUSxDQUFDLEVBQ3RDLElBQUksQ0FBQyxDQUFDQyxFQUFPRSxDQUFLLElBQU0sR0FBR0YsQ0FBSyxJQUFJRSxDQUFLLFNBQUksRUFDN0MsS0FBSyxRQUFHLEVBQ1gsTUFBTyw4Q0FBV3RDLENBQVMsbUNBQWVxQyxDQUFZLGNBQ3hELENBRUEsU0FBU3hFLEVBQVdtRSxFQUF5QixDQUMzQyxPQUFPQSxFQUNKLE1BQU0sR0FBRyxFQUNULElBQUtPLEdBQVNBLEVBQUssS0FBSyxFQUFFLFFBQVEsYUFBYyxFQUFFLENBQUMsRUFDbkQsT0FBTyxPQUFPLENBQ25CLENBQ0EsU0FBU2pFLEVBQWEwRCxFQUEwQixDQUM5QyxPQUFPLE1BQU0sUUFBUUEsQ0FBSyxFQUN0QkEsRUFBTSxPQUFRZCxHQUF5QixPQUFPQSxHQUFTLFFBQVEsRUFDL0QsT0FBT2MsR0FBVSxTQUNmLENBQUNBLENBQUssRUFDTixDQUFDLENBQ1QsQ0FDQSxTQUFTM0QsRUFBY21FLEVBQTRCLENBQ2pELE1BQU8sQ0FBQyxHQUFHLElBQUksSUFBSUEsRUFBTyxJQUFLUixHQUFVQSxFQUFNLFFBQVEsS0FBTSxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUMzRixDQUNBLFNBQVM5RCxFQUFVRCxFQUFhTCxFQUFtQkUsRUFBZ0I2RCxFQUFtQixDQUNwRixJQUFNeEQsRUFBUXdELEVBQUksY0FBYyxhQUFhMUQsQ0FBSSxFQUNqRCxHQUNFQSxFQUFLLEtBQUssV0FBVyxHQUFHZixDQUFlLEdBQUcsR0FDMUNlLEVBQUssS0FBSyxXQUFXLHVCQUF1QixHQUM1Q0EsRUFBSyxXQUFhLGFBQ2xCQSxFQUFLLFdBQWEsZ0JBQ2xCLE9BQU8sVUFBVSxlQUFlLEtBQUtULEVBQWVTLEVBQUssSUFBSSxHQUM3REUsR0FBTyxhQUFhLGlCQUFtQixHQUV2QyxNQUFPLEdBQ1QsSUFBTXNFLEVBQWM3RSxFQUFRLEtBQ3pCa0IsR0FBV2IsRUFBSyxPQUFTYSxHQUFVYixFQUFLLEtBQUssV0FBVyxHQUFHYSxDQUFNLEdBQUcsQ0FDdkUsRUFDTTRELEVBQVdyRSxFQUFjLENBQzdCLElBQUlGLEdBQU8sTUFBUSxDQUFDLEdBQUcsSUFBS0osR0FBUUEsRUFBSSxHQUFHLEVBQzNDLEdBQUdPLEVBQWFILEdBQU8sYUFBYSxJQUFJLENBQzFDLENBQUMsRUFDRCxPQUFPc0UsR0FBZTNFLEVBQUssS0FBTUMsR0FBUTJFLEVBQVMsU0FBUzNFLENBQUcsQ0FBQyxDQUNqRSxDQUNBLFNBQVNRLEVBQVV5RCxFQUFnQmxFLEVBQThCLENBQy9ELElBQU02RSxFQUNKLE9BQU9YLEdBQVUsU0FDYkEsRUFDQWxFLEVBQUssS0FBTUMsR0FDVCxDQUNFLGFBQ0EsVUFDQSxxQkFDQSxnQkFDQSxhQUNBLGVBQ0YsRUFBRSxTQUFTQSxDQUFHLENBQ2hCLEVBQ04sTUFDRSxDQUNFLGFBQ0EsVUFDQSxxQkFDQSxnQkFDQSxhQUNBLGVBQ0YsRUFDQSxTQUFTNEUsR0FBYSxFQUFFLEVBQ3JCQSxFQUNELGVBQ04sQ0FDQSxTQUFTckQsRUFBNEJzRCxFQUFrQkMsRUFBNEIsQ0FDakYsSUFBSXhELEVBQVV1RCxFQUNYLFdBQVcscUNBQXNDLHVDQUF1QyxFQUN4RixXQUFXLGtDQUFtQyxvQ0FBb0MsRUFDbEYsV0FBVyw2QkFBOEIsK0JBQStCLEVBQ3hFLFdBQVcsMEJBQTJCLDRCQUE0QixFQUNsRSxXQUFXLDRCQUE2Qiw4QkFBOEIsRUFDdEUsV0FBVyx5QkFBMEIsMkJBQTJCLEVBQ2hFLFdBQVcsK0JBQTJCLGlDQUE0QixFQUNsRSxXQUNDLDRFQUNBLDJHQUNGLEVBQ0YsT0FDRUMsRUFBVyxXQUFXLEdBQUc5RixDQUFZLGlCQUFpQixHQUN0RDhGLEVBQVcsV0FBVyxHQUFHOUYsQ0FBWSxjQUFjLEtBRW5Ec0MsRUFBVUEsRUFBUSxXQUFXLGdCQUFpQixrQkFBa0IsSUFFOUR3RCxFQUFXLFNBQVMsZUFBZSxHQUFLQSxFQUFXLFNBQVMsa0JBQWtCLEtBQ2hGeEQsRUFBVUEsRUFBUSxXQUNoQixpQ0FDQSxnRUFDRixHQUVLQSxDQUNULENBQ0EsU0FBU2IsRUFBVW9FLEVBQWtCRSxFQUF1QixDQUMxRCxPQUFPRixFQUNKLFFBQVEsc0JBQXVCLEVBQUUsRUFDakMsUUFBUSxtQkFBb0IsRUFBRSxFQUM5QixRQUFRLDhCQUErQixJQUFJLEVBQzNDLFFBQVEsWUFBYSxHQUFHLEVBQ3hCLFFBQVEsUUFBUyxHQUFHLEVBQ3BCLEtBQUssRUFDTCxNQUFNLEVBQUdFLENBQUssQ0FDbkIsQ0FDQSxTQUFTdkIsRUFBYVMsRUFBdUIsQ0FDM0MsT0FDRUEsRUFDRyxRQUFRLGdCQUFpQixHQUFHLEVBQzVCLEtBQUssRUFDTCxNQUFNLEVBQUcsRUFBRSxHQUFLLE9BRXZCLENBQ0EsU0FBU1AsRUFBV08sRUFBdUIsQ0FDekMsT0FBT0EsRUFBTSxRQUFRLE1BQU8sTUFBTSxFQUFFLFFBQVEsS0FBTSxLQUFLLENBQ3pELENBQ0EsZUFBZVosRUFBT1ksRUFBZ0MsQ0FDcEQsSUFBTWIsRUFBUyxNQUFNLE9BQU8sT0FBTyxPQUFPLFVBQVcsSUFBSSxZQUFZLEVBQUUsT0FBT2EsQ0FBSyxDQUFDLEVBQ3BGLE9BQU8sTUFBTSxLQUFLLElBQUksV0FBV2IsQ0FBTSxFQUFJNEIsR0FBU0EsRUFBSyxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUcsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQ2pHIiwKICAibmFtZXMiOiBbIm1haW5fZXhwb3J0cyIsICJfX2V4cG9ydCIsICJCaW5uQWdlbnRYTGVhcm5pbmdTeW5jUGx1Z2luIiwgIl9fdG9Db21tb25KUyIsICJpbXBvcnRfb2JzaWRpYW4iLCAiTElCUkFSWV9ST09UIiwgIkxJQlJBUllfRk9MREVSUyIsICJJTkJPWF9GT0xERVIiLCAiVEVNUExBVEVfRk9MREVSIiwgIkFUVEFDSE1FTlRfRk9MREVSIiwgIkNVUlJFTlRfTElCUkFSWV9WRVJTSU9OIiwgIkRBU0hCT0FSRF9NSUdSQVRJT05TIiwgIkRFRkFVTFRfU0VUVElOR1MiLCAiTEVBUk5JTkdfVEVNUExBVEVTIiwgIkxJQlJBUllfTk9URVMiLCAiQmlubkFnZW50WFNldHRpbmdUYWIiLCAiZXJyb3IiLCAibWVzc2FnZSIsICJmb2xkZXJzIiwgInNwbGl0U2NvcGUiLCAidGFncyIsICJ0YWciLCAiZmlsZXMiLCAiZmlsZSIsICJpc0FsbG93ZWQiLCAiY2FjaGUiLCAiZnJvbnRtYXR0ZXIiLCAidW5pcXVlU3RyaW5ncyIsICJhcnJheVN0cmluZ3MiLCAiaW5mZXJLaW5kIiwgInN1bW1hcml6ZSIsICJlbnRyaWVzIiwgImVudHJ5IiwgInNob3dOb3RpY2UiLCAiaW5zdGFsbGVkIiwgIm5hbWUiLCAiZm9sZGVyIiwgImNvbnRlbnQiLCAicGF0aCIsICJtaWdyYXRlZCIsICJsZWdhY3lQYXRoIiwgInRhcmdldFBhdGgiLCAibGVnYWN5IiwgInVwZGF0ZWQiLCAidXBkYXRlTWFuYWdlZERhc2hib2FyZExpbmtzIiwgImNvbmZpZ3VyYWJsZVZhdWx0IiwgInBhdGNoIiwgImFkYXB0ZXIiLCAiY3VycmVudCIsICJyYXciLCAicGFyc2VkIiwgImV4cG9ydGVkIiwgInJlc3BvbnNlIiwgInJlc3VsdCIsICJvcmdhbml6ZWQiLCAib3JnYW5pemF0aW9uU3VtbWFyeSIsICJzdW1tYXJpemVPcmdhbml6YXRpb24iLCAic3luY1N1bW1hcnkiLCAicGxhbiIsICJhbGxvd2VkVGFyZ2V0cyIsICJjb21wbGV0ZWQiLCAiYWN0aW9uIiwgImZpbGVOYW1lIiwgImV4dGVuc2lvbkluZGV4IiwgImJhc2VOYW1lIiwgImV4dGVuc2lvbiIsICJiYXNlUGF0aCIsICJyZXRyeVBhdGgiLCAic291cmNlIiwgImJhc2UiLCAiaGVhZGVycyIsICJleHBvcnRzIiwgIml0ZW0iLCAiZGlnZXN0IiwgInNoYTI1NiIsICJhY2siLCAiZmlsZW5hbWUiLCAic2FmZUZpbGVuYW1lIiwgImV4aXN0aW5nIiwgInlhbWxTdHJpbmciLCAiYm9keSIsICJhcHAiLCAicGx1Z2luIiwgImNvbnRhaW5lckVsIiwgImJ1dHRvbiIsICJ0b2dnbGUiLCAidmFsdWUiLCAidGV4dCIsICJmb2xkZXJMYWJlbHMiLCAiY291bnRzIiwgImxhYmVsIiwgImRlc3RpbmF0aW9ucyIsICJjb3VudCIsICJwYXJ0IiwgInZhbHVlcyIsICJwYXRoQWxsb3dlZCIsICJmaWxlVGFncyIsICJjYW5kaWRhdGUiLCAibWFya2Rvd24iLCAic291cmNlUGF0aCIsICJsaW1pdCIsICJieXRlIl0KfQo=
