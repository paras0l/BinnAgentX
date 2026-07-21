"use strict";
var y = Object.defineProperty;
var T = Object.getOwnPropertyDescriptor;
var B = Object.getOwnPropertyNames;
var O = Object.prototype.hasOwnProperty;
var P = (i, t) => {
    for (var n in t) y(i, n, { get: t[n], enumerable: !0 });
  },
  I = (i, t, n, a) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let e of B(t))
        !O.call(i, e) &&
          e !== n &&
          y(i, e, { get: () => t[e], enumerable: !(a = T(t, e)) || a.enumerable });
    return i;
  };
var R = (i) => I(y({}, "__esModule", { value: !0 }), i);
var z = {};
P(z, { default: () => b });
module.exports = R(z);
var s = require("obsidian"),
  r = "BinnAgentX",
  F = [
    "00-Inbox",
    "01-Vocabulary",
    "02-Grammar",
    "03-Reading",
    "04-Writing",
    "05-Templates",
    "06-Attachments",
  ],
  m = `${r}/00-Inbox`,
  u = `${r}/05-Templates`,
  v = `${r}/06-Attachments`,
  S = 2,
  C = [
    [`${r}/Dashboard.md`, `${r}/00-Dashboard.md`],
    [`${r}/01-Vocabulary/Dashboard.md`, `${r}/01-Vocabulary/00-Dashboard.md`],
    [`${r}/02-Grammar/Dashboard.md`, `${r}/02-Grammar/00-Dashboard.md`],
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
  x = {
    [`${r}/00-Dashboard.md`]: `# BinnAgentX \u5B66\u4E60\u5730\u56FE

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
  b = class extends s.Plugin {
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
          new s.Notice(`BinnAgentX \u5B66\u4E60\u5E93\u521D\u59CB\u5316\u5931\u8D25\uFF1A${n}`);
        }
      this.settings.autoSync && (await this.sync(!1));
    }
    async collectEntriesAsync() {
      let t = k(this.settings.allowedFolders),
        n = k(this.settings.allowedTags).map((e) => e.replace(/^#/, ""));
      if (!t.length && !n.length)
        throw new Error(
          "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u5141\u8BB8\u540C\u6B65\u7684\u6587\u4EF6\u5939\u6216\u6807\u7B7E",
        );
      let a = this.app.vault.getMarkdownFiles().filter((e) => L(e, t, n, this.app));
      if (a.length > this.settings.maxNotes)
        throw new Error(
          `\u5339\u914D\u5230 ${a.length} \u7BC7\u7B14\u8BB0\uFF0C\u8BF7\u7F29\u5C0F\u8303\u56F4\uFF08\u4E0A\u9650 ${this.settings.maxNotes}\uFF09`,
        );
      return Promise.all(
        a.map(async (e) => {
          let o = this.app.metadataCache.getFileCache(e),
            c = o?.frontmatter ?? {},
            l = w([...E(c.tags), ...(o?.tags ?? []).map((g) => g.tag.replace(/^#/, ""))]);
          return {
            source_key: e.path,
            asset_id: typeof c.binnagent_asset_id == "string" ? c.binnagent_asset_id : void 0,
            title: String(c.title ?? e.basename),
            kind: V(c.binnagent_kind, l),
            tags: l,
            excerpt: W(await this.app.vault.read(e), this.settings.maxExcerptCharacters),
            modified_at: new Date(e.stat.mtime).toISOString(),
          };
        }),
      );
    }
    async preview() {
      try {
        let t = await this.collectEntriesAsync();
        new s.Notice(
          `\u5C06\u540C\u6B65 ${t.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF1A${
            t
              .slice(0, 4)
              .map((n) => n.title)
              .join("\u3001") || "\u65E0"
          }`,
        );
      } catch (t) {
        new s.Notice(
          t instanceof Error ? t.message : "\u65E0\u6CD5\u9884\u89C8\u540C\u6B65\u8303\u56F4",
        );
      }
    }
    async initializeLearningLibrary(t = !0) {
      let n = 0;
      this.app.vault.getAbstractFileByPath(r) || (await this.app.vault.createFolder(r), (n += 1));
      for (let a of F) {
        let e = `${r}/${a}`;
        this.app.vault.getAbstractFileByPath(e) || (await this.app.vault.createFolder(e), (n += 1));
      }
      ((n += await this.migrateManagedDashboards()), await this.rewriteManagedDashboardLinks());
      for (let [a, e] of Object.entries(N))
        this.app.vault.getAbstractFileByPath(`${u}/${a}`) ||
          (await this.app.vault.create(`${u}/${a}`, e), (n += 1));
      for (let [a, e] of Object.entries(x))
        this.app.vault.getAbstractFileByPath(a) || (await this.app.vault.create(a, e), (n += 1));
      (await this.configureObsidianFolders(),
        (this.settings.libraryVersion = S),
        await this.saveSettings(),
        t &&
          new s.Notice(
            n
              ? `BinnAgentX \u5B66\u4E60\u5E93\u5DF2\u521D\u59CB\u5316\uFF08\u65B0\u589E ${n} \u9879\uFF09`
              : "BinnAgentX \u5B66\u4E60\u5E93\u5DF2\u5C31\u7EEA\uFF0C\u672A\u8986\u76D6\u4F60\u7684\u4FEE\u6539",
          ));
    }
    async migrateManagedDashboards() {
      let t = 0;
      for (let [n, a] of C) {
        let e = this.app.vault.getAbstractFileByPath(n);
        !(e instanceof s.TFile) ||
          this.app.vault.getAbstractFileByPath(a) ||
          (await this.app.vault.rename(e, a), (t += 1));
      }
      return t;
    }
    async rewriteManagedDashboardLinks() {
      let t = this.app.vault
        .getMarkdownFiles()
        .filter((n) => n.path === `${r}.md` || n.path.startsWith(`${r}/`));
      for (let n of t) {
        let a = await this.app.vault.read(n),
          e = X(a, n.path);
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
        let c = await a.read(t);
        try {
          let l = JSON.parse(c);
          l && typeof l == "object" && !Array.isArray(l) && (e = l);
        } catch {
          throw new Error(
            `\u65E0\u6CD5\u66F4\u65B0 Obsidian \u914D\u7F6E\uFF1A${t} \u4E0D\u662F\u6709\u6548\u7684 JSON`,
          );
        }
      }
      let o = { ...e, ...n };
      JSON.stringify(o) !== JSON.stringify(e) &&
        (await a.write(
          t,
          `${JSON.stringify(o, null, 2)}
`,
        ));
    }
    async sync(t = !0) {
      if (!this.settings.connectionId || !this.settings.syncSecret) {
        t &&
          new s.Notice(
            "\u8BF7\u5148\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u586B\u5199 BinnAgentX \u8FDE\u63A5\u51ED\u636E",
          );
        return;
      }
      try {
        let n = await this.pullPendingAssets(),
          a = await this.collectEntriesAsync(),
          e = await (0, s.requestUrl)({
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
        let o = e.json,
          c = await this.applyOrganizationPlan(o.organization);
        ((this.settings.lastSyncedAt = new Date().toISOString()),
          (this.settings.lastSyncError = ""),
          await this.saveSettings(),
          t &&
            new s.Notice(
              `\u53CC\u5411\u540C\u6B65\u5B8C\u6210\uFF1A\u63A5\u6536 ${n} \u6761\u8D44\u4EA7\uFF0C\u4E0A\u4F20 ${a.length} \u6761\u5B66\u4E60\u4E0A\u4E0B\u6587\uFF0C\u6574\u7406 ${c} \u6761 Inbox \u7B14\u8BB0\u3002`,
            ));
      } catch (n) {
        let a = n instanceof Error ? n.message : "\u540C\u6B65\u5931\u8D25";
        ((this.settings.lastSyncError = a), await this.saveSettings(), t && new s.Notice(a));
      }
    }
    async applyOrganizationPlan(t) {
      if (!t?.actions.length) return 0;
      let n = new Set([
          `${r}/01-Vocabulary`,
          `${r}/02-Grammar`,
          `${r}/03-Reading`,
          `${r}/04-Writing`,
        ]),
        a = [];
      for (let o of t.actions) {
        if (!o.source_key.startsWith(`${m}/`) || !n.has(o.target_folder)) continue;
        let c = o.source_key.slice(o.source_key.lastIndexOf("/") + 1),
          l = c.lastIndexOf("."),
          g = l > 0 ? c.slice(0, l) : c,
          h = l > 0 ? c.slice(l + 1) : "md",
          d = `${o.target_folder}/${c}`,
          A = `${o.target_folder}/${g}-${o.action_id.slice(0, 6)}.${h}`,
          D = this.app.vault.getAbstractFileByPath(o.source_key);
        if (!(D instanceof s.TFile)) {
          (this.app.vault.getAbstractFileByPath(d) instanceof s.TFile ||
            this.app.vault.getAbstractFileByPath(A) instanceof s.TFile) &&
            a.push(o.action_id);
          continue;
        }
        let _ = this.app.vault.getAbstractFileByPath(d) ? A : d;
        this.app.vault.getAbstractFileByPath(_) ||
          (await this.app.vault.rename(D, _), a.push(o.action_id));
      }
      if (a.length !== t.actions.length)
        throw new Error(
          "Inbox \u6574\u7406\u672A\u5168\u90E8\u5B8C\u6210\uFF1B\u672A\u79FB\u52A8\u7684\u7B14\u8BB0\u4F1A\u4FDD\u7559\u5728\u539F\u5904\uFF0C\u4E0B\u6B21\u540C\u6B65\u91CD\u8BD5",
        );
      let e = await (0, s.requestUrl)({
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
        a = await (0, s.requestUrl)({
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
        o = 0;
      for (let c of e) {
        let l = await this.createAssetNote(c),
          g = await this.app.vault.read(l),
          h = await M(g),
          d = await (0, s.requestUrl)({
            url: `${t}/v1/obsidian-sync/${encodeURIComponent(this.settings.connectionId)}/exports/${encodeURIComponent(c.asset_id)}/ack`,
            method: "POST",
            headers: { ...n, "Content-Type": "application/json" },
            body: JSON.stringify({
              source_key: l.path,
              content_hash: h,
              modified_at: new Date(l.stat.mtime).toISOString(),
              vault_name: this.app.vault.getName(),
            }),
            throw: !1,
          });
        if (d.status < 200 || d.status >= 300)
          throw new Error(
            `\u8D44\u4EA7\u540C\u6B65\u56DE\u6267\u5931\u8D25\uFF08${d.status}\uFF09`,
          );
        o += 1;
      }
      return o;
    }
    async createAssetNote(t) {
      (this.app.vault.getAbstractFileByPath(r) || (await this.app.vault.createFolder(r)),
        this.app.vault.getAbstractFileByPath(m) || (await this.app.vault.createFolder(m)));
      let n = m,
        a = `${G(t.title)}-${t.asset_id.slice(-10)}.md`,
        e = `${n}/${a}`,
        o = this.app.vault.getAbstractFileByPath(e);
      if (o instanceof s.TFile) return o;
      let c = w(["binnagent", t.kind, ...t.tags]),
        l = [
          "---",
          'binnagent_schema: "asset/v1"',
          `binnagent_asset_id: "${p(t.asset_id)}"`,
          `binnagent_kind: "${p(t.kind)}"`,
          `binnagent_source_type: "${p(t.source_type)}"`,
          "inbox_status: unprocessed",
          `title: "${p(t.title)}"`,
          ...(t.source_task_id ? [`binnagent_source_task_id: "${p(t.source_task_id)}"`] : []),
          "tags:",
          ...c.map((h) => `  - ${h}`),
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
        [...l, ...g].join(`
`),
      );
    }
  },
  f = class extends s.PluginSettingTab {
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
        new s.Setting(n)
          .setName("\u521D\u59CB\u5316\u5B66\u4E60\u5E93")
          .setDesc(
            "\u521B\u5EFA 00\u201306 \u76EE\u5F55\u3001MOC / Dataview Dashboard\u3001\u6A21\u677F\u4E0E\u5165\u95E8\u793A\u4F8B\uFF1B\u4E0D\u4F1A\u8986\u76D6\u5DF2\u6709\u6587\u4EF6\u3002",
          )
          .addButton((a) =>
            a.setButtonText("\u68C0\u67E5\u5E76\u8865\u9F50").onClick(async () => {
              await this.plugin.initializeLearningLibrary();
            }),
          ),
        new s.Setting(n)
          .setName("\u81EA\u52A8\u53CC\u5411\u540C\u6B65")
          .setDesc(
            "Obsidian \u542F\u52A8\u540E\u53CA\u6BCF 60 \u79D2\u540C\u6B65\u4E00\u6B21\u5DF2\u6388\u6743\u8303\u56F4\uFF1B\u53EF\u968F\u65F6\u5173\u95ED\u5E76\u6539\u7528\u624B\u52A8\u547D\u4EE4\u3002",
          )
          .addToggle((a) =>
            a.setValue(this.plugin.settings.autoSync).onChange(async (e) => {
              ((this.plugin.settings.autoSync = e), await this.plugin.saveSettings());
            }),
          ),
        new s.Setting(n)
          .setName("\u6700\u8FD1\u540C\u6B65")
          .setDesc(
            this.plugin.settings.lastSyncError
              ? `\u5931\u8D25\uFF1A${this.plugin.settings.lastSyncError}`
              : this.plugin.settings.lastSyncedAt || "\u5C1A\u672A\u5B8C\u6210\u540C\u6B65",
          ),
        new s.Setting(n)
          .setName("\u5141\u8BB8\u7684\u6587\u4EF6\u5939")
          .setDesc(
            "\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 BinnAgentX, \u82F1\u8BED/\u8BED\u6CD5",
          )
          .addText((a) =>
            a.setValue(this.plugin.settings.allowedFolders).onChange(async (e) => {
              ((this.plugin.settings.allowedFolders = e), await this.plugin.saveSettings());
            }),
          ),
        new s.Setting(n)
          .setName("\u5141\u8BB8\u7684\u6807\u7B7E")
          .setDesc(
            "\u53EF\u9009\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 binnagent-vocabulary, grammar",
          )
          .addText((a) =>
            a.setValue(this.plugin.settings.allowedTags).onChange(async (e) => {
              ((this.plugin.settings.allowedTags = e), await this.plugin.saveSettings());
            }),
          ),
        new s.Setting(n)
          .setName("BinnAgentX \u5730\u5740")
          .setDesc("\u672C\u673A\u9ED8\u8BA4\uFF1Ahttp://127.0.0.1:8000/learner")
          .addText((a) =>
            a.setValue(this.plugin.settings.apiBaseUrl).onChange(async (e) => {
              ((this.plugin.settings.apiBaseUrl = e), await this.plugin.saveSettings());
            }),
          ),
        new s.Setting(n).setName("\u8FDE\u63A5 ID").addText((a) =>
          a.setValue(this.plugin.settings.connectionId).onChange(async (e) => {
            ((this.plugin.settings.connectionId = e), await this.plugin.saveSettings());
          }),
        ),
        new s.Setting(n)
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
function k(i) {
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
function L(i, t, n, a) {
  let e = a.metadataCache.getFileCache(i);
  if (
    i.path.startsWith(`${u}/`) ||
    i.path.startsWith("BinnAgentX/Templates/") ||
    i.basename === "Dashboard" ||
    i.basename === "00-Dashboard" ||
    Object.prototype.hasOwnProperty.call(x, i.path) ||
    e?.frontmatter?.binnagent_sync === !1
  )
    return !1;
  let o = t.some((l) => i.path === l || i.path.startsWith(`${l}/`)),
    c = w([...(e?.tags ?? []).map((l) => l.tag), ...E(e?.frontmatter?.tags)]);
  return o || n.some((l) => c.includes(l));
}
function V(i, t) {
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
function X(i, t) {
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
    (t.startsWith(`${r}/01-Vocabulary/`) || t.startsWith(`${r}/02-Grammar/`)) &&
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEFwcCwgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIFRGaWxlLCByZXF1ZXN0VXJsIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbnR5cGUgTGVhcm5pbmdLaW5kID1cbiAgfCBcInZvY2FidWxhcnlcIlxuICB8IFwiZ3JhbW1hclwiXG4gIHwgXCJ3cml0aW5nX2V4cHJlc3Npb25cIlxuICB8IFwicmVhZGluZ19za2lsbFwiXG4gIHwgXCJleGFtX3NraWxsXCJcbiAgfCBcIndyaXRpbmdfc2tpbGxcIjtcblxuaW50ZXJmYWNlIFN5bmNTZXR0aW5ncyB7XG4gIGFwaUJhc2VVcmw6IHN0cmluZztcbiAgY29ubmVjdGlvbklkOiBzdHJpbmc7XG4gIHN5bmNTZWNyZXQ6IHN0cmluZztcbiAgYWxsb3dlZEZvbGRlcnM6IHN0cmluZztcbiAgYWxsb3dlZFRhZ3M6IHN0cmluZztcbiAgbWF4Tm90ZXM6IG51bWJlcjtcbiAgbWF4RXhjZXJwdENoYXJhY3RlcnM6IG51bWJlcjtcbiAgYXV0b1N5bmM6IGJvb2xlYW47XG4gIGxpYnJhcnlWZXJzaW9uOiBudW1iZXI7XG4gIGxhc3RTeW5jZWRBdDogc3RyaW5nO1xuICBsYXN0U3luY0Vycm9yOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBMZWFybmluZ0NvbnRleHRFbnRyeSB7XG4gIHNvdXJjZV9rZXk6IHN0cmluZztcbiAgYXNzZXRfaWQ/OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGtpbmQ6IExlYXJuaW5nS2luZDtcbiAgdGFnczogc3RyaW5nW107XG4gIGV4Y2VycHQ6IHN0cmluZztcbiAgbW9kaWZpZWRfYXQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFBlbmRpbmdBc3NldEV4cG9ydCB7XG4gIGFzc2V0X2lkOiBzdHJpbmc7XG4gIGtpbmQ6IExlYXJuaW5nS2luZDtcbiAgdGl0bGU6IHN0cmluZztcbiAgdGFnczogc3RyaW5nW107XG4gIHNvdXJjZV90eXBlOiBzdHJpbmc7XG4gIHNvdXJjZV90YXNrX2lkOiBzdHJpbmcgfCBudWxsO1xuICBpbml0aWFsX2NvbnRlbnQ6IHN0cmluZyB8IG51bGw7XG59XG5cbmludGVyZmFjZSBPcmdhbml6YXRpb25BY3Rpb24ge1xuICBhY3Rpb25faWQ6IHN0cmluZztcbiAgc291cmNlX2tleTogc3RyaW5nO1xuICB0YXJnZXRfZm9sZGVyOiBzdHJpbmc7XG4gIGtpbmQ6IExlYXJuaW5nS2luZDtcbiAgcmVhc29uOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBPcmdhbml6YXRpb25QbGFuIHtcbiAgcnVuX2lkOiBzdHJpbmc7XG4gIGFjdGlvbnM6IE9yZ2FuaXphdGlvbkFjdGlvbltdO1xufVxuXG5pbnRlcmZhY2UgSW1wb3J0UmVzcG9uc2Uge1xuICBpbXBvcnRlZDogbnVtYmVyO1xuICBvcmdhbml6YXRpb246IE9yZ2FuaXphdGlvblBsYW4gfCBudWxsO1xufVxuXG5jb25zdCBMSUJSQVJZX1JPT1QgPSBcIkJpbm5BZ2VudFhcIjtcbmNvbnN0IExJQlJBUllfRk9MREVSUyA9IFtcbiAgXCIwMC1JbmJveFwiLFxuICBcIjAxLVZvY2FidWxhcnlcIixcbiAgXCIwMi1HcmFtbWFyXCIsXG4gIFwiMDMtUmVhZGluZ1wiLFxuICBcIjA0LVdyaXRpbmdcIixcbiAgXCIwNS1UZW1wbGF0ZXNcIixcbiAgXCIwNi1BdHRhY2htZW50c1wiLFxuXSBhcyBjb25zdDtcbmNvbnN0IElOQk9YX0ZPTERFUiA9IGAke0xJQlJBUllfUk9PVH0vMDAtSW5ib3hgO1xuY29uc3QgVEVNUExBVEVfRk9MREVSID0gYCR7TElCUkFSWV9ST09UfS8wNS1UZW1wbGF0ZXNgO1xuY29uc3QgQVRUQUNITUVOVF9GT0xERVIgPSBgJHtMSUJSQVJZX1JPT1R9LzA2LUF0dGFjaG1lbnRzYDtcbmNvbnN0IENVUlJFTlRfTElCUkFSWV9WRVJTSU9OID0gMjtcbmNvbnN0IERBU0hCT0FSRF9NSUdSQVRJT05TID0gW1xuICBbYCR7TElCUkFSWV9ST09UfS9EYXNoYm9hcmQubWRgLCBgJHtMSUJSQVJZX1JPT1R9LzAwLURhc2hib2FyZC5tZGBdLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5L0Rhc2hib2FyZC5tZGAsIGAke0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmQubWRgXSxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDItR3JhbW1hci9EYXNoYm9hcmQubWRgLCBgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkLm1kYF0sXG5dIGFzIGNvbnN0O1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTeW5jU2V0dGluZ3MgPSB7XG4gIGFwaUJhc2VVcmw6IFwiaHR0cDovLzEyNy4wLjAuMTo4MDAwL2xlYXJuZXJcIixcbiAgY29ubmVjdGlvbklkOiBcIlwiLFxuICBzeW5jU2VjcmV0OiBcIlwiLFxuICBhbGxvd2VkRm9sZGVyczogXCJCaW5uQWdlbnRYXCIsXG4gIGFsbG93ZWRUYWdzOiBcIlwiLFxuICBtYXhOb3RlczogODAsXG4gIG1heEV4Y2VycHRDaGFyYWN0ZXJzOiA5MDAsXG4gIGF1dG9TeW5jOiB0cnVlLFxuICBsaWJyYXJ5VmVyc2lvbjogMCxcbiAgbGFzdFN5bmNlZEF0OiBcIlwiLFxuICBsYXN0U3luY0Vycm9yOiBcIlwiLFxufTtcblxuY29uc3QgTEVBUk5JTkdfVEVNUExBVEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBcIlx1OEJDRFx1NkM0Ny5tZFwiOlxuICAgICctLS1cXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxcbmJpbm5hZ2VudF9raW5kOiBcInZvY2FidWxhcnlcIlxcbm1lYW5pbmc6IFwiXCJcXG5zdGF0dXM6IGxlYXJuaW5nXFxuY3JlYXRlZDoge3tkYXRlfX1cXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gdm9jYWJ1bGFyeVxcbi0tLVxcblxcbiMge3t0aXRsZX19XFxuXFxuIyMgXHU2ODM4XHU1RkMzXHU1NDJCXHU0RTQ5XFxuXFxuIyMgXHU1M0QxXHU5N0YzXFxuXFxuIyMgXHU1RTM4XHU3NTI4XHU2NDJEXHU5MTREXFxuXFxuIyMgXHU1MzlGXHU1M0U1XHU0RTBFXHU4QkVEXHU1ODgzXFxuXFxuIyMgXHU2MjExXHU3Njg0XHU0RjhCXHU1M0U1XFxuXFxuIyMgXHU2NjEzXHU2REY3XHU2REM2XHU3MEI5XFxuXFxuIyMgXHU1MTczXHU4MDU0XFxuLSBbW0Jpbm5BZ2VudFgvMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dXFxuJyxcbiAgXCJcdThCRURcdTZDRDUubWRcIjpcbiAgICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJncmFtbWFyXCJcXG5zdGF0dXM6IGxlYXJuaW5nXFxuY3JlYXRlZDoge3tkYXRlfX1cXG50YWdzOlxcbiAgLSBiaW5uYWdlbnRcXG4gIC0gZ3JhbW1hclxcbi0tLVxcblxcbiMge3t0aXRsZX19XFxuXFxuIyMgXHU0RTAwXHU1M0U1XHU4QkREXHU4OUM0XHU1MjE5XFxuXFxuIyMgXHU3RUQzXHU2Nzg0XHU1MTZDXHU1RjBGXFxuXFxuIyMgXHU1MjI0XHU2NUFEXHU3RUJGXHU3RDIyXFxuXFxuIyMgXHU1MzlGXHU1M0U1XHU2MkM2XHU4OUUzXFxuXFxuIyMgXHU1RTM4XHU4OUMxXHU4QkVGXHU1MzNBXFxuXFxuIyMgXHU2NUIwXHU4QkVEXHU1ODgzXHU5QThDXHU4QkMxXFxuXFxuIyMgXHU1MTczXHU4MDU0XFxuLSBbW0Jpbm5BZ2VudFgvMDItR3JhbW1hci8wMC1EYXNoYm9hcmR8XHU4QkVEXHU2Q0Q1IERhc2hib2FyZF1dXFxuJyxcbiAgXCJcdTUxOTlcdTRGNUNcdTg4NjhcdThGQkUubWRcIjpcbiAgICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJ3cml0aW5nX2V4cHJlc3Npb25cIlxcbmNyZWF0ZWQ6IHt7ZGF0ZX19XFxudGFnczpcXG4gIC0gYmlubmFnZW50XFxuICAtIHdyaXRpbmctZXhwcmVzc2lvblxcbi0tLVxcblxcbiMge3t0aXRsZX19XFxuXFxuIyMgXHU4ODY4XHU4RkJFXHU1MjlGXHU4MEZEXFxuXFxuIyMgXHU1M0U1XHU1RjBGXHU5QUE4XHU2N0I2XFxuXFxuIyMgXHU1MzlGXHU1OUNCXHU4MzAzXHU0RjhCXFxuXFxuIyMgXHU2MjExXHU3Njg0XHU2NTM5XHU1MTk5XFxuXFxuIyMgXHU1M0VGXHU2NkZGXHU2MzYyXHU4QkNEXHU2OUZEXFxuJyxcbiAgXCJcdTk2MDVcdThCRkJcdTdCNTZcdTc1NjUubWRcIjpcbiAgICAnLS0tXFxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcXG5iaW5uYWdlbnRfa2luZDogXCJyZWFkaW5nX3NraWxsXCJcXG5jcmVhdGVkOiB7e2RhdGV9fVxcbnRhZ3M6XFxuICAtIGJpbm5hZ2VudFxcbiAgLSByZWFkaW5nLXNraWxsXFxuLS0tXFxuXFxuIyB7e3RpdGxlfX1cXG5cXG4jIyBcdTkwMDJcdTc1MjhcdTU3M0FcdTY2NkZcXG5cXG4jIyBcdTY0Q0RcdTRGNUNcdTZCNjVcdTlBQTRcXG5cXG4jIyBcdThCQzFcdTYzNkVcdTVCOUFcdTRGNERcXG5cXG4jIyBcdTU5MzFcdThEMjVcdTRGRTFcdTUzRjdcXG5cXG4jIyBcdTY1QjBcdTY1ODdcdTdBRTBcdTlBOENcdThCQzFcXG4nLFxufTtcblxuY29uc3QgTElCUkFSWV9OT1RFUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDAtRGFzaGJvYXJkLm1kYF06IGAjIEJpbm5BZ2VudFggXHU1QjY2XHU0RTYwXHU1NzMwXHU1NkZFXG5cblx1N0IyQ1x1NEUwMFx1NkIyMVx1NEY3Rlx1NzUyOFx1OEJGN1x1NTE0OFx1OEJGQiBbW1x1NEY3Rlx1NzUyOFx1NjMwN1x1NTM1N11dXHUzMDAyXHU0RTRCXHU1NDBFXHU0RUNFIFtbMDAtSW5ib3gvXHU2NTM2XHU5NkM2XHU3QkIxXHU0RjdGXHU3NTI4XHU4QkY0XHU2NjBFfFx1NjUzNlx1OTZDNlx1N0JCMV1dIFx1NUYwMFx1NTlDQlx1RkYwQ1x1NjI4QVx1Nzg4RVx1NzI0N1x1NUI5QVx1NjcxRlx1NjU3NFx1NzQwNlx1NTIzMFx1NEUwQlx1OTc2Mlx1NzY4NFx1OTg4Nlx1NTdERlx1NzZFRVx1NUY1NVx1MzAwMlxuXG4jIyBcdTUxODVcdTVCQjlcdTU3MzBcdTU2RkVcdUZGMDhNT0NcdUZGMDlcblxuLSBbWzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRdXVxuLSBbWzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkfFx1OEJFRFx1NkNENSBEYXNoYm9hcmRdXVxuLSBbWzAzLVJlYWRpbmcvXHU5NjA1XHU4QkZCXHU3QjE0XHU4QkIwXHU3OTNBXHU0RjhCfFx1OTYwNVx1OEJGQl1dXG4tIFtbMDQtV3JpdGluZy9cdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTc5M0FcdTRGOEJ8XHU1MTk5XHU0RjVDXV1cbi0gW1swNS1UZW1wbGF0ZXMvXHU4QkNEXHU2QzQ3fFx1N0IxNFx1OEJCMFx1NkEyMVx1Njc3Rl1dXG5cbiMjIFx1NjcwMFx1OEZEMVx1NjZGNFx1NjVCMFx1RkYwOERhdGF2aWV3XHVGRjA5XG5cblxcYFxcYFxcYGRhdGF2aWV3XG5UQUJMRSBXSVRIT1VUIElEIGZpbGUubGluayBBUyBcIlx1N0IxNFx1OEJCMFwiLCBiaW5uYWdlbnRfa2luZCBBUyBcIlx1N0M3Qlx1NTc4QlwiLCBmaWxlLm10aW1lIEFTIFwiXHU2NkY0XHU2NUIwXHU2NUY2XHU5NUY0XCJcbkZST00gXCJCaW5uQWdlbnRYXCJcbldIRVJFIGZpbGUubmFtZSAhPSBcIjAwLURhc2hib2FyZFwiIEFORCBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIiBBTkQgIWNvbnRhaW5zKGZpbGUucGF0aCwgXCIvMDUtVGVtcGxhdGVzL1wiKVxuU09SVCBmaWxlLm10aW1lIERFU0NcbkxJTUlUIDEyXG5cXGBcXGBcXGBcblxuPiBcdTY3MkFcdTVCODlcdTg4QzUgRGF0YXZpZXcgXHU2NUY2XHVGRjBDXHU0RTBBXHU5NzYyXHU3Njg0XHU2N0U1XHU4QkUyXHU0RjFBXHU2NjNFXHU3OTNBXHU0RTNBXHU0RUUzXHU3ODAxXHU1NzU3XHVGRjFCTU9DIFx1OTRGRVx1NjNBNVx1NEVDRFx1NTNFRlx1NkI2M1x1NUUzOFx1NEY3Rlx1NzUyOFx1MzAwMlxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vXHU0RjdGXHU3NTI4XHU2MzA3XHU1MzU3Lm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSBndWlkZVxuLS0tXG5cbiMgQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTVFOTNcdTRGN0ZcdTc1MjhcdTYzMDdcdTUzNTdcblxuXHU4RkQ5XHU1OTU3XHU3NkVFXHU1RjU1XHU2MjhBXHUyMDFDXHU1RkVCXHU5MDFGXHU4QkIwXHU1RjU1XHUyMDFEXHU1NDhDXHUyMDFDXHU5NTdGXHU2NzFGXHU2NTc0XHU3NDA2XHUyMDFEXHU1MjA2XHU1RjAwXHUzMDAyXHU2NzAwXHU3QjgwXHU1MzU1XHU3Njg0XHU3NTI4XHU2Q0Q1XHU1M0VBXHU2NzA5XHU0RTA5XHU2QjY1XHVGRjFBKipcdTUxNDhcdTY1MzZcdTk2QzZcdTMwMDFcdTUxOERcdTY1NzRcdTc0MDZcdTMwMDFcdTVFMzhcdTU2REVcdTk4N0UqKlx1MzAwMlxuXG4jIyBcdTc2RUVcdTVGNTVcdThCRjRcdTY2MEVcblxufCBcdTY1ODdcdTRFRjZcdTU5MzkgfCBcdTc1MjhcdTkwMTQgfCBcdTRFQzBcdTRFNDhcdTY1RjZcdTUwMTlcdTY1M0VcdThGREJcdTUzQkIgfFxufCAtLS0gfCAtLS0gfCAtLS0gfFxufCBcXGAwMC1JbmJveC9cXGAgfCBcdTY1MzZcdTk2QzZcdTdCQjEgfCBCaW5uQWdlbnRYIFx1NTQwQ1x1NkI2NVx1Njc2NVx1NzY4NFx1NjgwN1x1NkNFOFx1MzAwMVx1OTY4Rlx1NjI0Qlx1OEJCMFx1NEUwQlx1NzY4NFx1NTNFNVx1NUI1MFx1MzAwMVx1OEZEOFx1NEUwRFx1NzdFNVx1OTA1M1x1NTk4Mlx1NEY1NVx1NTIwNlx1N0M3Qlx1NzY4NFx1Nzg4RVx1NzI0NyB8XG58IFxcYDAxLVZvY2FidWxhcnkvXFxgIHwgXHU4QkNEXHU2QzQ3IHwgXHU1REYyXHU3RUNGXHU4ODY1XHU1MTQ1XHU0RTg2XHU1NDJCXHU0RTQ5XHUzMDAxXHU2NDJEXHU5MTREXHUzMDAxXHU4QkVEXHU1ODgzXHU2MjE2XHU0RjhCXHU1M0U1XHU3Njg0XHU1MzU1XHU4QkNEXHU1NDhDXHU3N0VEXHU4QkVEIHxcbnwgXFxgMDItR3JhbW1hci9cXGAgfCBcdThCRURcdTZDRDUgfCBcdTgwRkRcdThCRjRcdTZFMDVcdTg5QzRcdTUyMTlcdTMwMDFcdTdFRDNcdTY3ODRcdTMwMDFcdThCRUZcdTUzM0FcdTU0OENcdTlBOENcdThCQzFcdTRGOEJcdTUzRTVcdTc2ODRcdThCRURcdTZDRDVcdTcwQjkgfFxufCBcXGAwMy1SZWFkaW5nL1xcYCB8IFx1OTYwNVx1OEJGQiB8IFx1NjU4N1x1N0FFMFx1NTM5Rlx1NjU4N1x1MzAwMVx1NEU2Nlx1N0M0RFx1NjQ1OFx1OEJCMFx1MzAwMVx1NjQ1OFx1ODk4MVx1MzAwMVx1OEJDMVx1NjM2RVx1NTQ4Q1x1OTYwNVx1OEJGQlx1N0I1Nlx1NzU2NSB8XG58IFxcYDA0LVdyaXRpbmcvXFxgIHwgXHU1MTk5XHU0RjVDIHwgXHU4MkYxXHU2NTg3XHU1MTk5XHU0RjVDXHU3RUMzXHU0RTYwXHUzMDAxVjEvVjIgXHU0RkVFXHU2NTM5XHU4RkM3XHU3QTBCXHU1NDhDXHU1M0VGXHU4RkMxXHU3OUZCXHU4ODY4XHU4RkJFIHxcbnwgXFxgMDUtVGVtcGxhdGVzL1xcYCB8IFx1NkEyMVx1Njc3RiB8IE9ic2lkaWFuIFRlbXBsYXRlcyBcdTY4MzhcdTVGQzNcdTYzRDJcdTRFRjZcdTRGN0ZcdTc1MjhcdTc2ODRcdTdCMTRcdThCQjBcdTZBMjFcdTY3N0YgfFxufCBcXGAwNi1BdHRhY2htZW50cy9cXGAgfCBcdTk2NDRcdTRFRjYgfCBcdTU2RkVcdTcyNDdcdTMwMDFQREZcdTMwMDFcdTk3RjNcdTk4OTFcdTdCNDlcdTk3NUUgTWFya2Rvd24gXHU2NTg3XHU0RUY2IHxcblxuIyMgXHU2M0E4XHU4MzUwXHU1REU1XHU0RjVDXHU2RDQxXG5cbjEuICoqXHU5NjhGXHU2NUY2XHU2NTM2XHU5NkM2KipcdUZGMUFcdTUxNDhcdTYyOEFcdTUxODVcdTVCQjlcdTY1M0VcdThGREIgXFxgMDAtSW5ib3gvXFxgXHVGRjBDXHU0RTBEXHU4OTgxXHU1NkUwXHU0RTNBXHU1MjA2XHU3QzdCXHU4MDBDXHU2MjUzXHU2NUFEXHU1QjY2XHU0RTYwXHUzMDAyXG4yLiAqKlx1NkJDRlx1NTQ2OFx1NjU3NFx1NzQwNioqXHVGRjFBXHU0RTNBXHU2NzA5XHU0RUY3XHU1MDNDXHU3Njg0XHU3ODhFXHU3MjQ3XHU4ODY1XHU0RTBBXHU4MUVBXHU1REYxXHU3Njg0XHU4OUUzXHU5MUNBXHU1NDhDXHU0RjhCXHU1M0U1XHVGRjBDXHU1MThEXHU3OUZCXHU1MkE4XHU1MjMwXHU4QkNEXHU2QzQ3XHUzMDAxXHU4QkVEXHU2Q0Q1XHUzMDAxXHU5NjA1XHU4QkZCXHU2MjE2XHU1MTk5XHU0RjVDXHU3NkVFXHU1RjU1XHUzMDAyXG4zLiAqKlx1NUVGQVx1N0FDQlx1OEZERVx1NjNBNSoqXHVGRjFBXHU3NTI4IFxcYFtbXHU3QjE0XHU4QkIwXHU1NDBEXV1cXGAgXHU2MjhBXHU3NkY4XHU1MTczXHU4QkNEXHU2QzQ3XHUzMDAxXHU4QkVEXHU2Q0Q1XHU1NDhDXHU5NjA1XHU4QkZCXHU3QjE0XHU4QkIwXHU0RTkyXHU3NkY4XHU5NEZFXHU2M0E1XHUzMDAyXG40LiAqKlx1NTZERVx1NTIzMFx1NTczMFx1NTZGRSoqXHVGRjFBXHU0RUNFIFtbMDAtRGFzaGJvYXJkfFx1NjAzQiBEYXNoYm9hcmRdXVx1MzAwMVtbMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmR8XHU4QkNEXHU2QzQ3IERhc2hib2FyZF1dIFx1NjIxNiBbWzAyLUdyYW1tYXIvMDAtRGFzaGJvYXJkfFx1OEJFRFx1NkNENSBEYXNoYm9hcmRdXSBcdTZENEZcdTg5QzhcdTU0OENcdTU5MERcdTRFNjBcdTMwMDJcblxuIyMgXHU2QTIxXHU2NzdGXHU2MDBFXHU0RTQ4XHU3NTI4XG5cblx1NjNEMlx1NEVGNlx1NEYxQVx1NjI4QSBPYnNpZGlhbiBcdTc2ODRcdTZBMjFcdTY3N0ZcdTY1ODdcdTRFRjZcdTU5MzlcdThCQkVcdTRFM0EgXFxgQmlubkFnZW50WC8wNS1UZW1wbGF0ZXNcXGBcdTMwMDJcdTU0MkZcdTc1MjggT2JzaWRpYW4gXHU3Njg0ICoqVGVtcGxhdGVzXHVGRjA4XHU2QTIxXHU2NzdGXHVGRjA5XHU2ODM4XHU1RkMzXHU2M0QyXHU0RUY2KiogXHU1NDBFXHVGRjBDXHU2NUIwXHU1RUZBXHU3QjE0XHU4QkIwXHU1RTc2XHU2MjY3XHU4ODRDXHUyMDFDXHU2M0QyXHU1MTY1XHU2QTIxXHU2NzdGXHUyMDFEXHVGRjBDXHU1MThEXHU5MDA5XHU2MkU5XHU4QkNEXHU2QzQ3XHUzMDAxXHU4QkVEXHU2Q0Q1XHUzMDAxXHU5NjA1XHU4QkZCXHU3QjU2XHU3NTY1XHU2MjE2XHU1MTk5XHU0RjVDXHU4ODY4XHU4RkJFXHU2QTIxXHU2NzdGXHUzMDAyXG5cbiMjIERhc2hib2FyZCBcdTU0OEMgRGF0YXZpZXdcblxuRGFzaGJvYXJkIFx1NjcyQ1x1OEVBQlx1NjYyRlx1NTE4NVx1NUJCOVx1NTczMFx1NTZGRVx1RkYwOE1PQ1x1RkYwOVx1RkYwQ1x1OTFDQ1x1OTc2Mlx1NzY4NFx1NjY2RVx1OTAxQVx1OTRGRVx1NjNBNVx1NEUwRFx1NEY5RFx1OEQ1Nlx1NEVGQlx1NEY1NVx1NjNEMlx1NEVGNlx1MzAwMlx1NUI4OVx1ODhDNVx1NUU3Nlx1NTQyRlx1NzUyOFx1NzkzRVx1NTMzQVx1NjNEMlx1NEVGNiAqKkRhdGF2aWV3KiogXHU1NDBFXHVGRjBDXHU4QkNEXHU2QzQ3XHUzMDAxXHU4QkVEXHU2Q0Q1XHU1NDhDXHU2NzAwXHU4RkQxXHU2NkY0XHU2NUIwXHU1MjE3XHU4ODY4XHU0RjFBXHU4MUVBXHU1MkE4XHU3NTFGXHU2MjEwXHVGRjFCXHU2NzJBXHU1Qjg5XHU4OEM1XHU2NUY2XHU1M0VBXHU0RjFBXHU3NzBCXHU1MjMwXHU2N0U1XHU4QkUyXHU0RUUzXHU3ODAxXHU1NzU3XHVGRjBDXHU0RTBEXHU1RjcxXHU1NENEXHU1MTc2XHU0RUQ2XHU3QjE0XHU4QkIwXHUzMDAyXG5cbiMjIFx1OTY0NFx1NEVGNlxuXG5cdTYzRDJcdTRFRjZcdTRGMUFcdTYyOEEgT2JzaWRpYW4gXHU3Njg0XHU5RUQ4XHU4QkE0XHU5NjQ0XHU0RUY2XHU0RjREXHU3RjZFXHU4QkJFXHU0RTNBIFxcYEJpbm5BZ2VudFgvMDYtQXR0YWNobWVudHNcXGBcdTMwMDJcdTRFNEJcdTU0MEVcdTdDOThcdThEMzRcdTU2RkVcdTcyNDdcdTYyMTZcdTUyQTBcdTUxNjUgUERGIFx1NjVGNlx1RkYwQ1x1OTY0NFx1NEVGNlx1NEYxQVx1OTZDNlx1NEUyRFx1NUI1OFx1NjUzRVx1RkYwQ1x1NkI2M1x1NjU4N1x1NEVDRFx1NTNFRlx1NzUyOCBPYnNpZGlhbiBcdTk0RkVcdTYzQTVcdTVGMTVcdTc1MjhcdTMwMDJcblxuIyMgXHU0RTBEXHU0RjFBXHU1M0QxXHU3NTFGXHU0RUMwXHU0RTQ4XG5cbi0gXHU1MjFEXHU1OUNCXHU1MzE2XHU1M0VGXHU0RUU1XHU5MUNEXHU1OTBEXHU2MjY3XHU4ODRDXHVGRjBDXHU0RjQ2XHU0RTBEXHU0RjFBXHU4OTg2XHU3NkQ2XHU1NDBDXHU1NDBEXHU2NTg3XHU0RUY2XHU2MjE2XHU0RjYwXHU1REYyXHU3RUNGXHU0RkVFXHU2NTM5XHU3Njg0XHU2QTIxXHU2NzdGXHUzMDAyXG4tIFx1NjNEMlx1NEVGNlx1NEUwRFx1NEYxQVx1ODFFQVx1NTJBOFx1NjZGRlx1NEY2MFx1NzlGQlx1NTJBOFx1MzAwMVx1NTIyMFx1OTY2NFx1NjIxNlx1MjAxQ1x1NjU3NFx1NzQwNlx1NUI4Q1x1NjIxMFx1MjAxRFx1NjUzNlx1OTZDNlx1N0JCMVx1OTFDQ1x1NzY4NFx1NTE4NVx1NUJCOVx1MzAwMlxuLSBcdTYzMDdcdTUzNTdcdTMwMDFEYXNoYm9hcmQgXHU1NDhDXHU1MjFEXHU1OUNCXHU1MzE2XHU3OTNBXHU0RjhCXHU1RTI2XHU2NzA5IFxcYGJpbm5hZ2VudF9zeW5jOiBmYWxzZVxcYFx1RkYwQ1x1NEUwRFx1NEYxQVx1NEY1Q1x1NEUzQVx1NEY2MFx1NzY4NFx1NEUyQVx1NEVCQVx1NUI2Nlx1NEU2MFx1NEUwQVx1NEUwQlx1NjU4N1x1NEUwQVx1NEYyMFx1MzAwMlxuYCxcbiAgW2Ake0lOQk9YX0ZPTERFUn0vXHU2NTM2XHU5NkM2XHU3QkIxXHU0RjdGXHU3NTI4XHU4QkY0XHU2NjBFLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuaW5ib3hfc3RhdHVzOiByZWZlcmVuY2VcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gaW5ib3hcbi0tLVxuXG4jIFx1NjUzNlx1OTZDNlx1N0JCMVx1NEY3Rlx1NzUyOFx1OEJGNFx1NjYwRVxuXG5cdTY4MDdcdTZDRThcdTMwMDFcdTcwNzVcdTYxMUZcdTMwMDFcdTRFMERcdTRGMUFcdTVGNTJcdTdDN0JcdTc2ODRcdTg4NjhcdThGQkVcdTUxNDhcdTY1M0VcdTU3MjhcdThGRDlcdTkxQ0NcdUZGMENcdTRFMERcdTk3MDBcdTg5ODFcdTRFMDBcdTVGMDBcdTU5Q0JcdTVDMzFcdTUxOTlcdTVGOTdcdTVCOENcdTY1NzRcdTMwMDJcblxuIyMgXHU2QkNGXHU1NDY4XHU2NTc0XHU3NDA2XG5cbjEuIFx1ODBGRFx1NTkwRFx1NzUyOFx1NzY4NFx1NTM1NVx1OEJDRFx1NjIxNlx1NzdFRFx1OEJFRFx1RkYwQ1x1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0N11dXHUzMDAyXG4yLiBcdTUzRTVcdTVCNTBcdTgwQ0NcdTU0MEVcdTc2ODRcdTg5QzRcdTUyMTlcdUZGMENcdTY1NzRcdTc0MDZcdTUyMzAgW1suLi8wMi1HcmFtbWFyLzAwLURhc2hib2FyZHxcdThCRURcdTZDRDVdXVx1MzAwMlxuMy4gXHU1MzlGXHU2NTg3XHU0RTBFXHU5NjA1XHU4QkZCXHU4QkIwXHU1RjU1XHVGRjBDXHU2NTc0XHU3NDA2XHU1MjMwIFtbLi4vMDMtUmVhZGluZy9cdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTc5M0FcdTRGOEJ8XHU5NjA1XHU4QkZCXV1cdTMwMDJcbjQuIFx1ODFFQVx1NURGMVx1NTE5OVx1NzY4NFx1NkJCNVx1ODQzRFx1RkYwQ1x1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzA0LVdyaXRpbmcvXHU1MTk5XHU0RjVDXHU3RUMzXHU0RTYwXHU3OTNBXHU0RjhCfFx1NTE5OVx1NEY1Q11dXHUzMDAyXG41LiBcdTVERjJcdTU5MDRcdTc0MDZcdTc2ODRcdTc4OEVcdTcyNDdcdTUzRUZcdTVGNTJcdTY4NjNcdTMwMDFcdTc5RkJcdTUyQThcdTYyMTZcdTUyMjBcdTk2NjRcdUZGMUJcdTYzRDJcdTRFRjZcdTRFMERcdTRGMUFcdTY2RkZcdTRGNjBcdTg5ODZcdTc2RDZcdThGRDlcdTRFOUJcdTUxODVcdTVCQjlcdTMwMDJcbmAsXG4gIFtgJHtMSUJSQVJZX1JPT1R9LzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkLm1kYF06IGAjIFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRcblxuXHU4RkQ5XHU2NjJGXHU4QkNEXHU2QzQ3XHU1RTkzXHU3Njg0XHU1MTg1XHU1QkI5XHU1NzMwXHU1NkZFXHUzMDAyXHU2NUIwXHU1RUZBXHU3QjE0XHU4QkIwXHU2NUY2XHU0RjdGXHU3NTI4IFtbLi4vMDUtVGVtcGxhdGVzL1x1OEJDRFx1NkM0N3xcdThCQ0RcdTZDNDdcdTZBMjFcdTY3N0ZdXVx1MzAwMlxuXG4jIyBcdTUxNjhcdTkwRThcdThCQ0RcdTZDNDdcdUZGMDhEYXRhdmlld1x1RkYwOVxuXG5cXGBcXGBcXGBkYXRhdmlld1xuVEFCTEUgV0lUSE9VVCBJRCBmaWxlLmxpbmsgQVMgXCJcdThCQ0RcdTZDNDdcIiwgbWVhbmluZyBBUyBcIlx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVwiLCBzdGF0dXMgQVMgXCJcdTcyQjZcdTYwMDFcIiwgZmlsZS5tdGltZSBBUyBcIlx1NjZGNFx1NjVCMFwiXG5GUk9NIFwiQmlubkFnZW50WC8wMS1Wb2NhYnVsYXJ5XCJcbldIRVJFIGZpbGUubmFtZSAhPSBcIjAwLURhc2hib2FyZFwiIEFORCBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIlxuU09SVCBmaWxlLm10aW1lIERFU0NcblxcYFxcYFxcYFxuXG4jIyBcdTVFRkFcdThCQUVcdTc2ODQgTU9DXG5cbi0gXHU2MzA5XHU0RTNCXHU5ODk4XHVGRjFBXHU1QjY2XHU0RTYwXHUzMDAxXHU1REU1XHU0RjVDXHUzMDAxXHU2NUM1XHU4ODRDXHUzMDAxXHU2MEM1XHU3RUVBXG4tIFx1NjMwOVx1NTE3M1x1N0NGQlx1RkYxQVx1NTQwQ1x1NEU0OVx1OEJDRFx1MzAwMVx1NTNDRFx1NEU0OVx1OEJDRFx1MzAwMVx1NjYxM1x1NkRGN1x1OEJDRFx1MzAwMVx1NTZGQVx1NUI5QVx1NjQyRFx1OTE0RFxuLSBcdTc5M0FcdTRGOEJcdUZGMUFbW3Jlc2lsaWVudF1dXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5L3Jlc2lsaWVudC5tZGBdOiBgLS0tXG5iaW5uYWdlbnRfc3luYzogZmFsc2VcbmJpbm5hZ2VudF9zY2hlbWE6IFwibGVhcm5pbmctY29udGV4dC92MVwiXG5iaW5uYWdlbnRfa2luZDogXCJ2b2NhYnVsYXJ5XCJcbm1lYW5pbmc6IFwiXHU2NzA5XHU5N0U3XHU2MDI3XHU3Njg0XHVGRjFCXHU4MEZEXHU4RkM1XHU5MDFGXHU2MDYyXHU1OTBEXHU3Njg0XCJcbnN0YXR1czogbGVhcm5pbmdcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gdm9jYWJ1bGFyeVxuICAtIGNoYXJhY3RlclxuLS0tXG5cbiMgcmVzaWxpZW50XG5cbiMjIFx1NjgzOFx1NUZDM1x1NTQyQlx1NEU0OVxuXG5BYmxlIHRvIHJlY292ZXIgcXVpY2tseSBhZnRlciBkaWZmaWN1bHR5IG9yIGNoYW5nZS5cblxuIyMgXHU1M0QxXHU5N0YzXG5cbi9yXHUwMjZBXHUwMkM4elx1MDI2QWxpXHUwMjU5bnQvXG5cbiMjIFx1NUUzOFx1NzUyOFx1NjQyRFx1OTE0RFxuXG4tIHJlc2lsaWVudCBwZW9wbGVcbi0gYSByZXNpbGllbnQgZWNvbm9teVxuLSByZW1haW4gcmVzaWxpZW50XG5cbiMjIFx1NTM5Rlx1NTNFNVx1NEUwRVx1OEJFRFx1NTg4M1xuXG5UaGUgdGVhbSByZW1haW5lZCByZXNpbGllbnQgYWZ0ZXIgYW4gZWFybHkgc2V0YmFjay5cblxuIyMgXHU2MjExXHU3Njg0XHU0RjhCXHU1M0U1XG5cbkkgd2FudCB0byBiZWNvbWUgbW9yZSByZXNpbGllbnQgd2hlbiBhIHBsYW4gY2hhbmdlcyB1bmV4cGVjdGVkbHkuXG5cbiMjIFx1NjYxM1x1NkRGN1x1NkRDNlx1NzBCOVxuXG4qKnJlc2lsaWVudCoqIFx1NUYzQVx1OEMwM1x1NTNEN1x1NjMyQlx1NTQwRVx1NzY4NFx1NjA2Mlx1NTkwRFx1ODBGRFx1NTI5Qlx1RkYxQioqcGVyc2lzdGVudCoqIFx1NUYzQVx1OEMwM1x1NjMwMVx1N0VFRFx1NTc1QVx1NjMwMVx1MzAwMlxuXG4jIyBcdTUxNzNcdTgwNTRcblxuLSBbWzAwLURhc2hib2FyZF1dXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMi1HcmFtbWFyLzAwLURhc2hib2FyZC5tZGBdOiBgIyBcdThCRURcdTZDRDUgRGFzaGJvYXJkXG5cblx1OEZEOVx1NjYyRlx1OEJFRFx1NkNENVx1NUU5M1x1NzY4NFx1NTE4NVx1NUJCOVx1NTczMFx1NTZGRVx1MzAwMlx1NjVCMFx1NUVGQVx1N0IxNFx1OEJCMFx1NjVGNlx1NEY3Rlx1NzUyOCBbWy4uLzA1LVRlbXBsYXRlcy9cdThCRURcdTZDRDV8XHU4QkVEXHU2Q0Q1XHU2QTIxXHU2NzdGXV1cdTMwMDJcblxuIyMgXHU1MTY4XHU5MEU4XHU4QkVEXHU2Q0Q1XHU3MEI5XHVGRjA4RGF0YXZpZXdcdUZGMDlcblxuXFxgXFxgXFxgZGF0YXZpZXdcblRBQkxFIFdJVEhPVVQgSUQgZmlsZS5saW5rIEFTIFwiXHU4QkVEXHU2Q0Q1XHU3MEI5XCIsIHN0YXR1cyBBUyBcIlx1NzJCNlx1NjAwMVwiLCBmaWxlLm10aW1lIEFTIFwiXHU2NkY0XHU2NUIwXCJcbkZST00gXCJCaW5uQWdlbnRYLzAyLUdyYW1tYXJcIlxuV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiXG5TT1JUIGZpbGUubXRpbWUgREVTQ1xuXFxgXFxgXFxgXG5cbiMjIFx1NUVGQVx1OEJBRVx1NzY4NCBNT0NcblxuLSBcdTY1RjZcdTYwMDFcdTRFMEVcdThCRURcdTYwMDFcbi0gXHU0RUNFXHU1M0U1XG4tIFx1OTc1RVx1OEMxM1x1OEJFRFx1NTJBOFx1OEJDRFxuLSBcdThGREVcdTYzQTVcdTRFMEVcdTg4NTRcdTYzQTVcbi0gXHU3OTNBXHU0RjhCXHVGRjFBW1thbHRob3VnaCBcdTRFMEUgZGVzcGl0ZV1dXG5gLFxuICBbYCR7TElCUkFSWV9ST09UfS8wMi1HcmFtbWFyL2FsdGhvdWdoIFx1NEUwRSBkZXNwaXRlLm1kYF06IGAtLS1cbmJpbm5hZ2VudF9zeW5jOiBmYWxzZVxuYmlubmFnZW50X3NjaGVtYTogXCJsZWFybmluZy1jb250ZXh0L3YxXCJcbmJpbm5hZ2VudF9raW5kOiBcImdyYW1tYXJcIlxuc3RhdHVzOiBsZWFybmluZ1xudGFnczpcbiAgLSBiaW5uYWdlbnRcbiAgLSBncmFtbWFyXG4gIC0gY29uY2Vzc2lvblxuLS0tXG5cbiMgYWx0aG91Z2ggXHU0RTBFIGRlc3BpdGVcblxuIyMgXHU0RTAwXHU1M0U1XHU4QkREXHU4OUM0XHU1MjE5XG5cbioqYWx0aG91Z2gqKiBcdTU0MEVcdTYzQTVcdTVCOENcdTY1NzRcdTRFQ0VcdTUzRTVcdUZGMUIqKmRlc3BpdGUqKiBcdTU0MEVcdTYzQTVcdTU0MERcdThCQ0RcdTMwMDFcdTRFRTNcdThCQ0RcdTYyMTZcdTUyQThcdTU0MERcdThCQ0RcdTMwMDJcblxuIyMgXHU3RUQzXHU2Nzg0XHU1MTZDXHU1RjBGXG5cbi0gQWx0aG91Z2ggKyBcdTRFM0JcdThCRUQgKyBcdThDMTNcdThCRUQsIFx1NEUzQlx1NTNFNVx1MzAwMlxuLSBEZXNwaXRlICsgXHU1NDBEXHU4QkNEIC8gZG9pbmcsIFx1NEUzQlx1NTNFNVx1MzAwMlxuXG4jIyBcdTUzOUZcdTUzRTVcdTYyQzZcdTg5RTNcblxuQWx0aG91Z2ggaXQgd2FzIHJhaW5pbmcsIHdlIGtlcHQgd2Fsa2luZy5cblxuRGVzcGl0ZSB0aGUgcmFpbiwgd2Uga2VwdCB3YWxraW5nLlxuXG4jIyBcdTVFMzhcdTg5QzFcdThCRUZcdTUzM0FcblxuXHU0RTBEXHU4OTgxXHU1MTk5XHU2MjEwIFx1MjAxQ2Rlc3BpdGUgaXQgd2FzIHJhaW5pbmdcdTIwMURcdTMwMDJcdTUzRUZcdTY1MzlcdTRFM0EgXHUyMDFDZGVzcGl0ZSB0aGUgcmFpblx1MjAxRCBcdTYyMTYgXHUyMDFDZGVzcGl0ZSB0aGUgZmFjdCB0aGF0IGl0IHdhcyByYWluaW5nXHUyMDFEXHUzMDAyXG5cbiMjIFx1NjVCMFx1OEJFRFx1NTg4M1x1OUE4Q1x1OEJDMVxuXG5BbHRob3VnaCB0aGUgdGFzayB3YXMgZGlmZmljdWx0LCBzaGUgZmluaXNoZWQgaXQgb24gdGltZS5cblxuIyMgXHU1MTczXHU4MDU0XG5cbi0gW1swMC1EYXNoYm9hcmRdXVxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDMtUmVhZGluZy9cdTk2MDVcdThCRkJcdTdCMTRcdThCQjBcdTc5M0FcdTRGOEIubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxuYmlubmFnZW50X2tpbmQ6IFwicmVhZGluZ19za2lsbFwiXG5zdGF0dXM6IGV4YW1wbGVcbnRhZ3M6XG4gIC0gYmlubmFnZW50XG4gIC0gcmVhZGluZ1xuLS0tXG5cbiMgXHU5NjA1XHU4QkZCXHU3QjE0XHU4QkIwXHU3OTNBXHU0RjhCXG5cbiMjIFx1Njc2NVx1NkU5MFxuXG5cdTU3MjhcdThGRDlcdTkxQ0NcdThCQjBcdTVGNTVcdTY1ODdcdTdBRTBcdTY4MDdcdTk4OThcdTMwMDFcdTRGNUNcdTgwMDVcdTU0OENcdTk0RkVcdTYzQTVcdTMwMDJcblxuIyMgXHU0RTAwXHU1M0U1XHU4QkREXHU2NDU4XHU4OTgxXG5cblx1NTE0OFx1NzUyOFx1ODFFQVx1NURGMVx1NzY4NFx1OEJERFx1NTE5OVx1NEUwMFx1NTNFNVx1RkYwQ1x1NTE4RFx1ODg2NVx1N0VDNlx1ODI4Mlx1MzAwMlxuXG4jIyBcdTUxNzNcdTk1MkVcdTZCQjVcdTg0M0RcdTRFMEVcdThCQzFcdTYzNkVcblxuXHU2NDU4XHU1RjU1XHU1QzExXHU5MUNGXHU1MTczXHU5NTJFXHU1M0U1XHVGRjBDXHU1RTc2XHU4QkY0XHU2NjBFXHU1QjgzXHU0RTNBXHU0RUMwXHU0RTQ4XHU5MUNEXHU4OTgxXHUzMDAyXG5cbiMjIFx1NjVCMFx1OEJDRFx1NEUwRVx1OEJFRFx1NkNENVxuXG4tIFx1OEJDRFx1NkM0N1x1NTNFRlx1NjU3NFx1NzQwNlx1NTIzMCBbWy4uLzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkfFx1OEJDRFx1NkM0NyBEYXNoYm9hcmRdXVx1MzAwMlxuLSBcdThCRURcdTZDRDVcdTUzRUZcdTY1NzRcdTc0MDZcdTUyMzAgW1suLi8wMi1HcmFtbWFyLzAwLURhc2hib2FyZHxcdThCRURcdTZDRDUgRGFzaGJvYXJkXV1cdTMwMDJcblxuIyMgXHU2MjExXHU3Njg0XHU4OUMyXHU3MEI5XG5cblx1NTE5OVx1NEUwQlx1OEQ1RVx1NTQwQ1x1MzAwMVx1OEQyOFx1NzU5MVx1NjIxNlx1NTNFRlx1NEVFNVx1OEZDMVx1NzlGQlx1NTIzMFx1NTE3Nlx1NEVENlx1NjU4N1x1N0FFMFx1NzY4NFx1NjBGM1x1NkNENVx1MzAwMlxuYCxcbiAgW2Ake0xJQlJBUllfUk9PVH0vMDQtV3JpdGluZy9cdTUxOTlcdTRGNUNcdTdFQzNcdTRFNjBcdTc5M0FcdTRGOEIubWRgXTogYC0tLVxuYmlubmFnZW50X3N5bmM6IGZhbHNlXG5iaW5uYWdlbnRfc2NoZW1hOiBcImxlYXJuaW5nLWNvbnRleHQvdjFcIlxuYmlubmFnZW50X2tpbmQ6IFwid3JpdGluZ19za2lsbFwiXG5zdGF0dXM6IGRyYWZ0XG50YWdzOlxuICAtIGJpbm5hZ2VudFxuICAtIHdyaXRpbmdcbi0tLVxuXG4jIFx1NTE5OVx1NEY1Q1x1N0VDM1x1NEU2MFx1NzkzQVx1NEY4QlxuXG4jIyBcdTk4OThcdTc2RUVcblxuRGVzY3JpYmUgYSBoYWJpdCB0aGF0IGhhcyBpbXByb3ZlZCB5b3VyIGxlYXJuaW5nLlxuXG4jIyBWMSBcdTgzNDlcdTdBM0ZcblxuXHU1MTQ4XHU1MTk5XHU1QjhDXHVGRjBDXHU0RTBEXHU1NzI4XHU3QjJDXHU0RTAwXHU5MDREXHU4RkZEXHU2QzQyXHU1QjhDXHU3RjhFXHUzMDAyXG5cbiMjIFx1NEZFRVx1NjUzOVx1OEJCMFx1NUY1NVxuXG4tIFx1NTE4NVx1NUJCOVx1RkYxQVx1ODlDMlx1NzBCOVx1NjYyRlx1NTQyNlx1NkUwNVx1Njk1QVx1RkYxRlxuLSBcdTdFRDNcdTY3ODRcdUZGMUFcdTZCQjVcdTg0M0RcdTY2MkZcdTU0MjZcdTY3MDlcdTRFM0JcdTk4OThcdTUzRTVcdTU0OENcdThCQzFcdTYzNkVcdUZGMUZcbi0gXHU4QkVEXHU4QTAwXHVGRjFBXHU2NjJGXHU1NDI2XHU4MEZEXHU3NTI4XHU2NkY0XHU1MUM2XHU3ODZFXHU3Njg0XHU4QkNEXHU2QzQ3XHU2MjE2XHU1M0U1XHU1RjBGXHVGRjFGXG5cbiMjIFYyIFx1NUI5QVx1N0EzRlxuXG5cdTY4MzlcdTYzNkVcdTRGRUVcdTY1MzlcdThCQjBcdTVGNTVcdTkxQ0RcdTUxOTlcdUZGMENcdTVFNzZcdTRGRERcdTc1NTkgVjEgXHU2NUI5XHU0RkJGXHU2QkQ0XHU4RjgzXHUzMDAyXG5gLFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmlubkFnZW50WExlYXJuaW5nU3luY1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBTeW5jU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgQmlubkFnZW50WFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwicHJldmlldy1sZWFybmluZy1jb250ZXh0XCIsXG4gICAgICBuYW1lOiBcIlByZXZpZXcgbGVhcm5pbmcgY29udGV4dFwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMucHJldmlldygpLFxuICAgIH0pO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJzeW5jLWxlYXJuaW5nLWNvbnRleHRcIixcbiAgICAgIG5hbWU6IFwiU3luYyBhcHByb3ZlZCBsZWFybmluZyBjb250ZXh0XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5zeW5jKCksXG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImluc3RhbGwtbGVhcm5pbmctdGVtcGxhdGVzXCIsXG4gICAgICBuYW1lOiBcIkluaXRpYWxpemUgQmlubkFnZW50WCBsZWFybmluZyBsaWJyYXJ5XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5pbml0aWFsaXplTGVhcm5pbmdMaWJyYXJ5KCksXG4gICAgfSk7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLm9uTGF5b3V0UmVhZHkoKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLmhhbmRsZUxheW91dFJlYWR5KCk7XG4gICAgfSk7XG4gICAgdGhpcy5yZWdpc3RlckludGVydmFsKFxuICAgICAgd2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuYXV0b1N5bmMpIHZvaWQgdGhpcy5zeW5jKGZhbHNlKTtcbiAgICAgIH0sIDYwXzAwMCksXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0geyAuLi5ERUZBVUxUX1NFVFRJTkdTLCAuLi4oYXdhaXQgdGhpcy5sb2FkRGF0YSgpKSB9O1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGhhbmRsZUxheW91dFJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLnNldHRpbmdzLmxpYnJhcnlWZXJzaW9uIDwgQ1VSUkVOVF9MSUJSQVJZX1ZFUlNJT04pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZUxlYXJuaW5nTGlicmFyeShmYWxzZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlx1NjcyQVx1NzdFNVx1OTUxOVx1OEJFRlwiO1xuICAgICAgICBuZXcgTm90aWNlKGBCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1NUU5M1x1NTIxRFx1NTlDQlx1NTMxNlx1NTkzMVx1OEQyNVx1RkYxQSR7bWVzc2FnZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYXV0b1N5bmMpIGF3YWl0IHRoaXMuc3luYyhmYWxzZSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbGxlY3RFbnRyaWVzQXN5bmMoKTogUHJvbWlzZTxMZWFybmluZ0NvbnRleHRFbnRyeVtdPiB7XG4gICAgY29uc3QgZm9sZGVycyA9IHNwbGl0U2NvcGUodGhpcy5zZXR0aW5ncy5hbGxvd2VkRm9sZGVycyk7XG4gICAgY29uc3QgdGFncyA9IHNwbGl0U2NvcGUodGhpcy5zZXR0aW5ncy5hbGxvd2VkVGFncykubWFwKCh0YWcpID0+IHRhZy5yZXBsYWNlKC9eIy8sIFwiXCIpKTtcbiAgICBpZiAoIWZvbGRlcnMubGVuZ3RoICYmICF0YWdzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKFwiXHU4QkY3XHU5MDA5XHU2MkU5XHU4MUYzXHU1QzExXHU0RTAwXHU0RTJBXHU1MTQxXHU4QkI4XHU1NDBDXHU2QjY1XHU3Njg0XHU2NTg3XHU0RUY2XHU1OTM5XHU2MjE2XHU2ODA3XHU3QjdFXCIpO1xuICAgIGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHRcbiAgICAgIC5nZXRNYXJrZG93bkZpbGVzKClcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+IGlzQWxsb3dlZChmaWxlLCBmb2xkZXJzLCB0YWdzLCB0aGlzLmFwcCkpO1xuICAgIGlmIChmaWxlcy5sZW5ndGggPiB0aGlzLnNldHRpbmdzLm1heE5vdGVzKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgXHU1MzM5XHU5MTREXHU1MjMwICR7ZmlsZXMubGVuZ3RofSBcdTdCQzdcdTdCMTRcdThCQjBcdUZGMENcdThCRjdcdTdGMjlcdTVDMEZcdTgzMDNcdTU2RjRcdUZGMDhcdTRFMEFcdTk2NTAgJHt0aGlzLnNldHRpbmdzLm1heE5vdGVzfVx1RkYwOWAsXG4gICAgICApO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChcbiAgICAgIGZpbGVzLm1hcChhc3luYyAoZmlsZSkgPT4ge1xuICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xuICAgICAgICBjb25zdCBmcm9udG1hdHRlciA9IGNhY2hlPy5mcm9udG1hdHRlciA/PyB7fTtcbiAgICAgICAgY29uc3QgdGFncyA9IHVuaXF1ZVN0cmluZ3MoW1xuICAgICAgICAgIC4uLmFycmF5U3RyaW5ncyhmcm9udG1hdHRlci50YWdzKSxcbiAgICAgICAgICAuLi4oY2FjaGU/LnRhZ3MgPz8gW10pLm1hcCgodGFnKSA9PiB0YWcudGFnLnJlcGxhY2UoL14jLywgXCJcIikpLFxuICAgICAgICBdKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2Vfa2V5OiBmaWxlLnBhdGgsXG4gICAgICAgICAgYXNzZXRfaWQ6XG4gICAgICAgICAgICB0eXBlb2YgZnJvbnRtYXR0ZXIuYmlubmFnZW50X2Fzc2V0X2lkID09PSBcInN0cmluZ1wiXG4gICAgICAgICAgICAgID8gZnJvbnRtYXR0ZXIuYmlubmFnZW50X2Fzc2V0X2lkXG4gICAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgIHRpdGxlOiBTdHJpbmcoZnJvbnRtYXR0ZXIudGl0bGUgPz8gZmlsZS5iYXNlbmFtZSksXG4gICAgICAgICAga2luZDogaW5mZXJLaW5kKGZyb250bWF0dGVyLmJpbm5hZ2VudF9raW5kLCB0YWdzKSxcbiAgICAgICAgICB0YWdzLFxuICAgICAgICAgIGV4Y2VycHQ6IHN1bW1hcml6ZShhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpLCB0aGlzLnNldHRpbmdzLm1heEV4Y2VycHRDaGFyYWN0ZXJzKSxcbiAgICAgICAgICBtb2RpZmllZF9hdDogbmV3IERhdGUoZmlsZS5zdGF0Lm10aW1lKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9O1xuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHJldmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZW50cmllcyA9IGF3YWl0IHRoaXMuY29sbGVjdEVudHJpZXNBc3luYygpO1xuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgYFx1NUMwNlx1NTQwQ1x1NkI2NSAke2VudHJpZXMubGVuZ3RofSBcdTY3NjFcdTVCNjZcdTRFNjBcdTRFMEFcdTRFMEJcdTY1ODdcdUZGMUEke1xuICAgICAgICAgIGVudHJpZXNcbiAgICAgICAgICAgIC5zbGljZSgwLCA0KVxuICAgICAgICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LnRpdGxlKVxuICAgICAgICAgICAgLmpvaW4oXCJcdTMwMDFcIikgfHwgXCJcdTY1RTBcIlxuICAgICAgICB9YCxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIG5ldyBOb3RpY2UoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlx1NjVFMFx1NkNENVx1OTg4NFx1ODlDOFx1NTQwQ1x1NkI2NVx1ODMwM1x1NTZGNFwiKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBpbml0aWFsaXplTGVhcm5pbmdMaWJyYXJ5KHNob3dOb3RpY2UgPSB0cnVlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IGluc3RhbGxlZCA9IDA7XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoTElCUkFSWV9ST09UKSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKExJQlJBUllfUk9PVCk7XG4gICAgICBpbnN0YWxsZWQgKz0gMTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIExJQlJBUllfRk9MREVSUykge1xuICAgICAgY29uc3QgZm9sZGVyID0gYCR7TElCUkFSWV9ST09UfS8ke25hbWV9YDtcbiAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlcikpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlcik7XG4gICAgICAgIGluc3RhbGxlZCArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBpbnN0YWxsZWQgKz0gYXdhaXQgdGhpcy5taWdyYXRlTWFuYWdlZERhc2hib2FyZHMoKTtcbiAgICBhd2FpdCB0aGlzLnJld3JpdGVNYW5hZ2VkRGFzaGJvYXJkTGlua3MoKTtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBjb250ZW50XSBvZiBPYmplY3QuZW50cmllcyhMRUFSTklOR19URU1QTEFURVMpKSB7XG4gICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChgJHtURU1QTEFURV9GT0xERVJ9LyR7bmFtZX1gKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoYCR7VEVNUExBVEVfRk9MREVSfS8ke25hbWV9YCwgY29udGVudCk7XG4gICAgICAgIGluc3RhbGxlZCArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwYXRoLCBjb250ZW50XSBvZiBPYmplY3QuZW50cmllcyhMSUJSQVJZX05PVEVTKSkge1xuICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIGNvbnRlbnQpO1xuICAgICAgICBpbnN0YWxsZWQgKz0gMTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXdhaXQgdGhpcy5jb25maWd1cmVPYnNpZGlhbkZvbGRlcnMoKTtcbiAgICB0aGlzLnNldHRpbmdzLmxpYnJhcnlWZXJzaW9uID0gQ1VSUkVOVF9MSUJSQVJZX1ZFUlNJT047XG4gICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICBpZiAoc2hvd05vdGljZSkge1xuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgaW5zdGFsbGVkXG4gICAgICAgICAgPyBgQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTVFOTNcdTVERjJcdTUyMURcdTU5Q0JcdTUzMTZcdUZGMDhcdTY1QjBcdTU4OUUgJHtpbnN0YWxsZWR9IFx1OTg3OVx1RkYwOWBcbiAgICAgICAgICA6IFwiQmlubkFnZW50WCBcdTVCNjZcdTRFNjBcdTVFOTNcdTVERjJcdTVDMzFcdTdFRUFcdUZGMENcdTY3MkFcdTg5ODZcdTc2RDZcdTRGNjBcdTc2ODRcdTRGRUVcdTY1MzlcIixcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtaWdyYXRlTWFuYWdlZERhc2hib2FyZHMoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBsZXQgbWlncmF0ZWQgPSAwO1xuICAgIGZvciAoY29uc3QgW2xlZ2FjeVBhdGgsIHRhcmdldFBhdGhdIG9mIERBU0hCT0FSRF9NSUdSQVRJT05TKSB7XG4gICAgICBjb25zdCBsZWdhY3kgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgobGVnYWN5UGF0aCk7XG4gICAgICBpZiAoIShsZWdhY3kgaW5zdGFuY2VvZiBURmlsZSkgfHwgdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhcmdldFBhdGgpKSBjb250aW51ZTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlbmFtZShsZWdhY3ksIHRhcmdldFBhdGgpO1xuICAgICAgbWlncmF0ZWQgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIG1pZ3JhdGVkO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXdyaXRlTWFuYWdlZERhc2hib2FyZExpbmtzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHRcbiAgICAgIC5nZXRNYXJrZG93bkZpbGVzKClcbiAgICAgIC5maWx0ZXIoXG4gICAgICAgIChmaWxlKSA9PiBmaWxlLnBhdGggPT09IGAke0xJQlJBUllfUk9PVH0ubWRgIHx8IGZpbGUucGF0aC5zdGFydHNXaXRoKGAke0xJQlJBUllfUk9PVH0vYCksXG4gICAgICApO1xuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgICBjb25zdCB1cGRhdGVkID0gdXBkYXRlTWFuYWdlZERhc2hib2FyZExpbmtzKGNvbnRlbnQsIGZpbGUucGF0aCk7XG4gICAgICBpZiAodXBkYXRlZCAhPT0gY29udGVudCkgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIHVwZGF0ZWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY29uZmlndXJlT2JzaWRpYW5Gb2xkZXJzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGNvbmZpZ3VyYWJsZVZhdWx0ID0gdGhpcy5hcHAudmF1bHQgYXMgdHlwZW9mIHRoaXMuYXBwLnZhdWx0ICYge1xuICAgICAgc2V0Q29uZmlnPzogKGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4gdm9pZDtcbiAgICB9O1xuICAgIGlmICh0eXBlb2YgY29uZmlndXJhYmxlVmF1bHQuc2V0Q29uZmlnID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNvbmZpZ3VyYWJsZVZhdWx0LnNldENvbmZpZyhcImF0dGFjaG1lbnRGb2xkZXJQYXRoXCIsIEFUVEFDSE1FTlRfRk9MREVSKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5tZXJnZUNvbmZpZ0ZpbGUoYCR7dGhpcy5hcHAudmF1bHQuY29uZmlnRGlyfS9hcHAuanNvbmAsIHtcbiAgICAgICAgYXR0YWNobWVudEZvbGRlclBhdGg6IEFUVEFDSE1FTlRfRk9MREVSLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMubWVyZ2VDb25maWdGaWxlKGAke3RoaXMuYXBwLnZhdWx0LmNvbmZpZ0Rpcn0vdGVtcGxhdGVzLmpzb25gLCB7XG4gICAgICBmb2xkZXI6IFRFTVBMQVRFX0ZPTERFUixcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbWVyZ2VDb25maWdGaWxlKHBhdGg6IHN0cmluZywgcGF0Y2g6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgbGV0IGN1cnJlbnQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgaWYgKGF3YWl0IGFkYXB0ZXIuZXhpc3RzKHBhdGgpKSB7XG4gICAgICBjb25zdCByYXcgPSBhd2FpdCBhZGFwdGVyLnJlYWQocGF0aCk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJzZWQ6IHVua25vd24gPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICAgIGlmIChwYXJzZWQgJiYgdHlwZW9mIHBhcnNlZCA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgY3VycmVudCA9IHBhcnNlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgXHU2NUUwXHU2Q0Q1XHU2NkY0XHU2NUIwIE9ic2lkaWFuIFx1OTE0RFx1N0Y2RVx1RkYxQSR7cGF0aH0gXHU0RTBEXHU2NjJGXHU2NzA5XHU2NTQ4XHU3Njg0IEpTT05gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdXBkYXRlZCA9IHsgLi4uY3VycmVudCwgLi4ucGF0Y2ggfTtcbiAgICBpZiAoSlNPTi5zdHJpbmdpZnkodXBkYXRlZCkgIT09IEpTT04uc3RyaW5naWZ5KGN1cnJlbnQpKSB7XG4gICAgICBhd2FpdCBhZGFwdGVyLndyaXRlKHBhdGgsIGAke0pTT04uc3RyaW5naWZ5KHVwZGF0ZWQsIG51bGwsIDIpfVxcbmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc3luYyhzaG93Tm90aWNlID0gdHJ1ZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQgfHwgIXRoaXMuc2V0dGluZ3Muc3luY1NlY3JldCkge1xuICAgICAgaWYgKHNob3dOb3RpY2UpIG5ldyBOb3RpY2UoXCJcdThCRjdcdTUxNDhcdTU3MjhcdTYzRDJcdTRFRjZcdThCQkVcdTdGNkVcdTRFMkRcdTU4NkJcdTUxOTkgQmlubkFnZW50WCBcdThGREVcdTYzQTVcdTUxRURcdTYzNkVcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBleHBvcnRlZCA9IGF3YWl0IHRoaXMucHVsbFBlbmRpbmdBc3NldHMoKTtcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCB0aGlzLmNvbGxlY3RFbnRyaWVzQXN5bmMoKTtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7dGhpcy5zZXR0aW5ncy5hcGlCYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vdjEvb2JzaWRpYW4tc3luYy8ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLnNldHRpbmdzLmNvbm5lY3Rpb25JZCl9L2ltcG9ydGAsXG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5zZXR0aW5ncy5zeW5jU2VjcmV0fWAsXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzY2hlbWFfdmVyc2lvbjogXCJsZWFybmluZy1jb250ZXh0L3YxXCIsXG4gICAgICAgICAgdmF1bHRfbmFtZTogdGhpcy5hcHAudmF1bHQuZ2V0TmFtZSgpLFxuICAgICAgICAgIGVudHJpZXMsXG4gICAgICAgIH0pLFxuICAgICAgICB0aHJvdzogZmFsc2UsXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCaW5uQWdlbnRYIFx1NjJEMlx1N0VERFx1NTQwQ1x1NkI2NVx1RkYwOCR7cmVzcG9uc2Uuc3RhdHVzfVx1RkYwOWApO1xuICAgICAgY29uc3QgcmVzdWx0ID0gcmVzcG9uc2UuanNvbiBhcyBJbXBvcnRSZXNwb25zZTtcbiAgICAgIGNvbnN0IG9yZ2FuaXplZCA9IGF3YWl0IHRoaXMuYXBwbHlPcmdhbml6YXRpb25QbGFuKHJlc3VsdC5vcmdhbml6YXRpb24pO1xuICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0U3luY2VkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICB0aGlzLnNldHRpbmdzLmxhc3RTeW5jRXJyb3IgPSBcIlwiO1xuICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIGlmIChzaG93Tm90aWNlKVxuICAgICAgICBuZXcgTm90aWNlKFxuICAgICAgICAgIGBcdTUzQ0NcdTU0MTFcdTU0MENcdTZCNjVcdTVCOENcdTYyMTBcdUZGMUFcdTYzQTVcdTY1MzYgJHtleHBvcnRlZH0gXHU2NzYxXHU4RDQ0XHU0RUE3XHVGRjBDXHU0RTBBXHU0RjIwICR7ZW50cmllcy5sZW5ndGh9IFx1Njc2MVx1NUI2Nlx1NEU2MFx1NEUwQVx1NEUwQlx1NjU4N1x1RkYwQ1x1NjU3NFx1NzQwNiAke29yZ2FuaXplZH0gXHU2NzYxIEluYm94IFx1N0IxNFx1OEJCMFx1MzAwMmAsXG4gICAgICAgICk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiXHU1NDBDXHU2QjY1XHU1OTMxXHU4RDI1XCI7XG4gICAgICB0aGlzLnNldHRpbmdzLmxhc3RTeW5jRXJyb3IgPSBtZXNzYWdlO1xuICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIGlmIChzaG93Tm90aWNlKSBuZXcgTm90aWNlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgYXBwbHlPcmdhbml6YXRpb25QbGFuKHBsYW46IE9yZ2FuaXphdGlvblBsYW4gfCBudWxsKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBpZiAoIXBsYW4/LmFjdGlvbnMubGVuZ3RoKSByZXR1cm4gMDtcbiAgICBjb25zdCBhbGxvd2VkVGFyZ2V0cyA9IG5ldyBTZXQoW1xuICAgICAgYCR7TElCUkFSWV9ST09UfS8wMS1Wb2NhYnVsYXJ5YCxcbiAgICAgIGAke0xJQlJBUllfUk9PVH0vMDItR3JhbW1hcmAsXG4gICAgICBgJHtMSUJSQVJZX1JPT1R9LzAzLVJlYWRpbmdgLFxuICAgICAgYCR7TElCUkFSWV9ST09UfS8wNC1Xcml0aW5nYCxcbiAgICBdKTtcbiAgICBjb25zdCBjb21wbGV0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBhY3Rpb24gb2YgcGxhbi5hY3Rpb25zKSB7XG4gICAgICBpZiAoIWFjdGlvbi5zb3VyY2Vfa2V5LnN0YXJ0c1dpdGgoYCR7SU5CT1hfRk9MREVSfS9gKSkgY29udGludWU7XG4gICAgICBpZiAoIWFsbG93ZWRUYXJnZXRzLmhhcyhhY3Rpb24udGFyZ2V0X2ZvbGRlcikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZmlsZU5hbWUgPSBhY3Rpb24uc291cmNlX2tleS5zbGljZShhY3Rpb24uc291cmNlX2tleS5sYXN0SW5kZXhPZihcIi9cIikgKyAxKTtcbiAgICAgIGNvbnN0IGV4dGVuc2lvbkluZGV4ID0gZmlsZU5hbWUubGFzdEluZGV4T2YoXCIuXCIpO1xuICAgICAgY29uc3QgYmFzZU5hbWUgPSBleHRlbnNpb25JbmRleCA+IDAgPyBmaWxlTmFtZS5zbGljZSgwLCBleHRlbnNpb25JbmRleCkgOiBmaWxlTmFtZTtcbiAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGV4dGVuc2lvbkluZGV4ID4gMCA/IGZpbGVOYW1lLnNsaWNlKGV4dGVuc2lvbkluZGV4ICsgMSkgOiBcIm1kXCI7XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IGAke2FjdGlvbi50YXJnZXRfZm9sZGVyfS8ke2ZpbGVOYW1lfWA7XG4gICAgICBjb25zdCByZXRyeVBhdGggPSBgJHthY3Rpb24udGFyZ2V0X2ZvbGRlcn0vJHtiYXNlTmFtZX0tJHthY3Rpb24uYWN0aW9uX2lkLnNsaWNlKDAsIDYpfS4ke2V4dGVuc2lvbn1gO1xuICAgICAgY29uc3Qgc291cmNlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGFjdGlvbi5zb3VyY2Vfa2V5KTtcbiAgICAgIGlmICghKHNvdXJjZSBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGJhc2VQYXRoKSBpbnN0YW5jZW9mIFRGaWxlIHx8XG4gICAgICAgICAgdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJldHJ5UGF0aCkgaW5zdGFuY2VvZiBURmlsZVxuICAgICAgICApIHtcbiAgICAgICAgICBjb21wbGV0ZWQucHVzaChhY3Rpb24uYWN0aW9uX2lkKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRhcmdldFBhdGggPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYmFzZVBhdGgpID8gcmV0cnlQYXRoIDogYmFzZVBhdGg7XG4gICAgICBpZiAodGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhcmdldFBhdGgpKSBjb250aW51ZTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlbmFtZShzb3VyY2UsIHRhcmdldFBhdGgpO1xuICAgICAgY29tcGxldGVkLnB1c2goYWN0aW9uLmFjdGlvbl9pZCk7XG4gICAgfVxuICAgIGlmIChjb21wbGV0ZWQubGVuZ3RoICE9PSBwbGFuLmFjdGlvbnMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmJveCBcdTY1NzRcdTc0MDZcdTY3MkFcdTUxNjhcdTkwRThcdTVCOENcdTYyMTBcdUZGMUJcdTY3MkFcdTc5RkJcdTUyQThcdTc2ODRcdTdCMTRcdThCQjBcdTRGMUFcdTRGRERcdTc1NTlcdTU3MjhcdTUzOUZcdTU5MDRcdUZGMENcdTRFMEJcdTZCMjFcdTU0MENcdTZCNjVcdTkxQ0RcdThCRDVcIik7XG4gICAgfVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke3RoaXMuc2V0dGluZ3MuYXBpQmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9vcmdhbml6ZXItcnVucy8ke2VuY29kZVVSSUNvbXBvbmVudChwbGFuLnJ1bl9pZCl9L2Fja2AsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5zZXR0aW5ncy5zeW5jU2VjcmV0fWAsXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgY29tcGxldGVkX2FjdGlvbl9pZHM6IGNvbXBsZXRlZCB9KSxcbiAgICAgIHRocm93OiBmYWxzZSxcbiAgICB9KTtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluYm94IFx1NjU3NFx1NzQwNlx1NTZERVx1NjI2N1x1NTkzMVx1OEQyNVx1RkYwOCR7cmVzcG9uc2Uuc3RhdHVzfVx1RkYwOWApO1xuICAgIHJldHVybiBjb21wbGV0ZWQubGVuZ3RoO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwdWxsUGVuZGluZ0Fzc2V0cygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGJhc2UgPSB0aGlzLnNldHRpbmdzLmFwaUJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IGhlYWRlcnMgPSB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLnNldHRpbmdzLnN5bmNTZWNyZXR9YCB9O1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke2Jhc2V9L3YxL29ic2lkaWFuLXN5bmMvJHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5zZXR0aW5ncy5jb25uZWN0aW9uSWQpfS9leHBvcnRzYCxcbiAgICAgIG1ldGhvZDogXCJHRVRcIixcbiAgICAgIGhlYWRlcnMsXG4gICAgICB0aHJvdzogZmFsc2UsXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBcdTY1RTBcdTZDRDVcdThCRkJcdTUzRDZcdTVGODVcdTU0MENcdTZCNjVcdThENDRcdTRFQTdcdUZGMDgke3Jlc3BvbnNlLnN0YXR1c31cdUZGMDlgKTtcbiAgICBjb25zdCBleHBvcnRzID0gcmVzcG9uc2UuanNvbiBhcyBQZW5kaW5nQXNzZXRFeHBvcnRbXTtcbiAgICBsZXQgY29tcGxldGVkID0gMDtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgZXhwb3J0cykge1xuICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuY3JlYXRlQXNzZXROb3RlKGl0ZW0pO1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgICBjb25zdCBkaWdlc3QgPSBhd2FpdCBzaGEyNTYoY29udGVudCk7XG4gICAgICBjb25zdCBhY2sgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHtiYXNlfS92MS9vYnNpZGlhbi1zeW5jLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuc2V0dGluZ3MuY29ubmVjdGlvbklkKX0vZXhwb3J0cy8ke2VuY29kZVVSSUNvbXBvbmVudChpdGVtLmFzc2V0X2lkKX0vYWNrYCxcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgaGVhZGVyczogeyAuLi5oZWFkZXJzLCBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc291cmNlX2tleTogZmlsZS5wYXRoLFxuICAgICAgICAgIGNvbnRlbnRfaGFzaDogZGlnZXN0LFxuICAgICAgICAgIG1vZGlmaWVkX2F0OiBuZXcgRGF0ZShmaWxlLnN0YXQubXRpbWUpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgdmF1bHRfbmFtZTogdGhpcy5hcHAudmF1bHQuZ2V0TmFtZSgpLFxuICAgICAgICB9KSxcbiAgICAgICAgdGhyb3c6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgICBpZiAoYWNrLnN0YXR1cyA8IDIwMCB8fCBhY2suc3RhdHVzID49IDMwMClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBcdThENDRcdTRFQTdcdTU0MENcdTZCNjVcdTU2REVcdTYyNjdcdTU5MzFcdThEMjVcdUZGMDgke2Fjay5zdGF0dXN9XHVGRjA5YCk7XG4gICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBsZXRlZDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQXNzZXROb3RlKGl0ZW06IFBlbmRpbmdBc3NldEV4cG9ydCk6IFByb21pc2U8VEZpbGU+IHtcbiAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChMSUJSQVJZX1JPT1QpKSB7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoTElCUkFSWV9ST09UKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoSU5CT1hfRk9MREVSKSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKElOQk9YX0ZPTERFUik7XG4gICAgfVxuICAgIGNvbnN0IGZvbGRlciA9IElOQk9YX0ZPTERFUjtcbiAgICBjb25zdCBmaWxlbmFtZSA9IGAke3NhZmVGaWxlbmFtZShpdGVtLnRpdGxlKX0tJHtpdGVtLmFzc2V0X2lkLnNsaWNlKC0xMCl9Lm1kYDtcbiAgICBjb25zdCBwYXRoID0gYCR7Zm9sZGVyfS8ke2ZpbGVuYW1lfWA7XG4gICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgaWYgKGV4aXN0aW5nIGluc3RhbmNlb2YgVEZpbGUpIHJldHVybiBleGlzdGluZztcbiAgICBjb25zdCB0YWdzID0gdW5pcXVlU3RyaW5ncyhbXCJiaW5uYWdlbnRcIiwgaXRlbS5raW5kLCAuLi5pdGVtLnRhZ3NdKTtcbiAgICBjb25zdCBmcm9udG1hdHRlciA9IFtcbiAgICAgIFwiLS0tXCIsXG4gICAgICAnYmlubmFnZW50X3NjaGVtYTogXCJhc3NldC92MVwiJyxcbiAgICAgIGBiaW5uYWdlbnRfYXNzZXRfaWQ6IFwiJHt5YW1sU3RyaW5nKGl0ZW0uYXNzZXRfaWQpfVwiYCxcbiAgICAgIGBiaW5uYWdlbnRfa2luZDogXCIke3lhbWxTdHJpbmcoaXRlbS5raW5kKX1cImAsXG4gICAgICBgYmlubmFnZW50X3NvdXJjZV90eXBlOiBcIiR7eWFtbFN0cmluZyhpdGVtLnNvdXJjZV90eXBlKX1cImAsXG4gICAgICBcImluYm94X3N0YXR1czogdW5wcm9jZXNzZWRcIixcbiAgICAgIGB0aXRsZTogXCIke3lhbWxTdHJpbmcoaXRlbS50aXRsZSl9XCJgLFxuICAgICAgLi4uKGl0ZW0uc291cmNlX3Rhc2tfaWRcbiAgICAgICAgPyBbYGJpbm5hZ2VudF9zb3VyY2VfdGFza19pZDogXCIke3lhbWxTdHJpbmcoaXRlbS5zb3VyY2VfdGFza19pZCl9XCJgXVxuICAgICAgICA6IFtdKSxcbiAgICAgIFwidGFnczpcIixcbiAgICAgIC4uLnRhZ3MubWFwKCh0YWcpID0+IGAgIC0gJHt0YWd9YCksXG4gICAgICBcIi0tLVwiLFxuICAgICAgXCJcIixcbiAgICAgIGAjICR7aXRlbS50aXRsZX1gLFxuICAgICAgXCJcIixcbiAgICBdO1xuICAgIGNvbnN0IGJvZHkgPSBpdGVtLmluaXRpYWxfY29udGVudD8udHJpbSgpXG4gICAgICA/IFtcIiMjIFx1NUI2Nlx1NEU2MFx1NzNCMFx1NTczQVwiLCBcIlwiLCBpdGVtLmluaXRpYWxfY29udGVudC50cmltKCksIFwiXCIsIFwiIyMgXHU2MjExXHU3Njg0XHU3NDA2XHU4OUUzXCIsIFwiXCJdXG4gICAgICA6IFtcIiMjIFx1NjcwMFx1NTIxRFx1OEJFRFx1NTg4M1wiLCBcIlwiLCBcIiMjIFx1NjIxMVx1NzY4NFx1NzQwNlx1ODlFM1wiLCBcIlwiLCBcIiMjIFx1NTNFRlx1OEZDMVx1NzlGQlx1ODlDNFx1NTIxOVwiLCBcIlwiLCBcIiMjIFx1NjVCMFx1OEJFRFx1NTg4M1x1OUE4Q1x1OEJDMVwiLCBcIlwiXTtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIFsuLi5mcm9udG1hdHRlciwgLi4uYm9keV0uam9pbihcIlxcblwiKSk7XG4gIH1cbn1cblxuY2xhc3MgQmlubkFnZW50WFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IEJpbm5BZ2VudFhMZWFybmluZ1N5bmNQbHVnaW4sXG4gICkge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJCaW5uQWdlbnRYIFx1NUI2Nlx1NEU2MFx1OEQ0NFx1NEVBN1x1NTQwQ1x1NkI2NVwiIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlx1NEVDNVx1NTQwQ1x1NkI2NVx1NEY2MFx1NjYwRVx1Nzg2RVx1NTE0MVx1OEJCOFx1NzY4NFx1ODMwM1x1NTZGNFx1MzAwMlx1NzY3Qlx1NUY1NVx1ODlFNlx1NTNEMVx1NzY4NFx1NjU3NFx1NzQwNlx1NTNFQVx1NEYxQVx1NjI4QSAwMC1JbmJveCBcdTdCMTRcdThCQjBcdTc5RkJcdTUyQThcdTUyMzAgQmlubkFnZW50WCBcdTc2ODRcdThCQ0RcdTZDNDdcdTMwMDFcdThCRURcdTZDRDVcdTMwMDFcdTk2MDVcdThCRkJcdTYyMTZcdTUxOTlcdTRGNUNcdTc2RUVcdTVGNTVcdUZGMUJcdTRFMERcdTRGMUFcdTUyMjBcdTk2NjRcdTMwMDFcdTY1MzlcdTUxOTlcdTYyMTZcdTc5RkJcdTUxRkFcdTYyNThcdTdCQTFcdTc2RUVcdTVGNTVcdTMwMDJcIixcbiAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU1MjFEXHU1OUNCXHU1MzE2XHU1QjY2XHU0RTYwXHU1RTkzXCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NTIxQlx1NUVGQSAwMFx1MjAxMzA2IFx1NzZFRVx1NUY1NVx1MzAwMU1PQyAvIERhdGF2aWV3IERhc2hib2FyZFx1MzAwMVx1NkEyMVx1Njc3Rlx1NEUwRVx1NTE2NVx1OTVFOFx1NzkzQVx1NEY4Qlx1RkYxQlx1NEUwRFx1NEYxQVx1ODk4Nlx1NzZENlx1NURGMlx1NjcwOVx1NjU4N1x1NEVGNlx1MzAwMlwiKVxuICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PlxuICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlx1NjhDMFx1NjdFNVx1NUU3Nlx1ODg2NVx1OUY1MFwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5pbml0aWFsaXplTGVhcm5pbmdMaWJyYXJ5KCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHU4MUVBXHU1MkE4XHU1M0NDXHU1NDExXHU1NDBDXHU2QjY1XCIpXG4gICAgICAuc2V0RGVzYyhcIk9ic2lkaWFuIFx1NTQyRlx1NTJBOFx1NTQwRVx1NTNDQVx1NkJDRiA2MCBcdTc5RDJcdTU0MENcdTZCNjVcdTRFMDBcdTZCMjFcdTVERjJcdTYzODhcdTY3NDNcdTgzMDNcdTU2RjRcdUZGMUJcdTUzRUZcdTk2OEZcdTY1RjZcdTUxNzNcdTk1RURcdTVFNzZcdTY1MzlcdTc1MjhcdTYyNEJcdTUyQThcdTU0N0RcdTRFRTRcdTMwMDJcIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT5cbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmF1dG9TeW5jKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hdXRvU3luYyA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NjcwMFx1OEZEMVx1NTQwQ1x1NkI2NVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jRXJyb3JcbiAgICAgICAgICA/IGBcdTU5MzFcdThEMjVcdUZGMUEke3RoaXMucGx1Z2luLnNldHRpbmdzLmxhc3RTeW5jRXJyb3J9YFxuICAgICAgICAgIDogdGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdFN5bmNlZEF0IHx8IFwiXHU1QzFBXHU2NzJBXHU1QjhDXHU2MjEwXHU1NDBDXHU2QjY1XCIsXG4gICAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTUxNDFcdThCQjhcdTc2ODRcdTY1ODdcdTRFRjZcdTU5MzlcIilcbiAgICAgIC5zZXREZXNjKFwiXHU5MDE3XHU1M0Y3XHU1MjA2XHU5Njk0XHVGRjBDXHU0RjhCXHU1OTgyIEJpbm5BZ2VudFgsIFx1ODJGMVx1OEJFRC9cdThCRURcdTZDRDVcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRGb2xkZXJzKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbGxvd2VkRm9sZGVycyA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1NTE0MVx1OEJCOFx1NzY4NFx1NjgwN1x1N0I3RVwiKVxuICAgICAgLnNldERlc2MoXCJcdTUzRUZcdTkwMDlcdUZGMENcdTkwMTdcdTUzRjdcdTUyMDZcdTk2OTRcdUZGMENcdTRGOEJcdTU5ODIgYmlubmFnZW50LXZvY2FidWxhcnksIGdyYW1tYXJcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFsbG93ZWRUYWdzKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hbGxvd2VkVGFncyA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkJpbm5BZ2VudFggXHU1NzMwXHU1NzQwXCIpXG4gICAgICAuc2V0RGVzYyhcIlx1NjcyQ1x1NjczQVx1OUVEOFx1OEJBNFx1RkYxQWh0dHA6Ly8xMjcuMC4wLjE6ODAwMC9sZWFybmVyXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cbiAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcGlCYXNlVXJsKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcGlCYXNlVXJsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcIlx1OEZERVx1NjNBNSBJRFwiKS5hZGRUZXh0KCh0ZXh0KSA9PlxuICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25uZWN0aW9uSWQpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb25uZWN0aW9uSWQgPSB2YWx1ZTtcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICB9KSxcbiAgICApO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdTU0MENcdTZCNjVcdTVCQzZcdTk0QTVcIilcbiAgICAgIC5zZXREZXNjKFwiXHU3NTMxIEJpbm5BZ2VudFggXHU3Njg0XHU4RkRFXHU2M0E1XHU1NDExXHU1QkZDXHU3NTFGXHU2MjEwXHVGRjFCXHU0RUM1XHU0RkREXHU1QjU4XHU1NzI4XHU2NzJDXHU2NzNBIE9ic2lkaWFuIFx1NjNEMlx1NEVGNlx1OEJCRVx1N0Y2RVx1NEUyRFx1MzAwMlwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XG4gICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3luY1NlY3JldCkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3luY1NlY3JldCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3BsaXRTY29wZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gdmFsdWVcbiAgICAuc3BsaXQoXCIsXCIpXG4gICAgLm1hcCgocGFydCkgPT4gcGFydC50cmltKCkucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgXCJcIikpXG4gICAgLmZpbHRlcihCb29sZWFuKTtcbn1cbmZ1bmN0aW9uIGFycmF5U3RyaW5ncyh2YWx1ZTogdW5rbm93bik6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpXG4gICAgPyB2YWx1ZS5maWx0ZXIoKGl0ZW0pOiBpdGVtIGlzIHN0cmluZyA9PiB0eXBlb2YgaXRlbSA9PT0gXCJzdHJpbmdcIilcbiAgICA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBbdmFsdWVdXG4gICAgICA6IFtdO1xufVxuZnVuY3Rpb24gdW5pcXVlU3RyaW5ncyh2YWx1ZXM6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuICByZXR1cm4gWy4uLm5ldyBTZXQodmFsdWVzLm1hcCgodmFsdWUpID0+IHZhbHVlLnJlcGxhY2UoL14jLywgXCJcIikudHJpbSgpKS5maWx0ZXIoQm9vbGVhbikpXTtcbn1cbmZ1bmN0aW9uIGlzQWxsb3dlZChmaWxlOiBURmlsZSwgZm9sZGVyczogc3RyaW5nW10sIHRhZ3M6IHN0cmluZ1tdLCBhcHA6IEFwcCk6IGJvb2xlYW4ge1xuICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgaWYgKFxuICAgIGZpbGUucGF0aC5zdGFydHNXaXRoKGAke1RFTVBMQVRFX0ZPTERFUn0vYCkgfHxcbiAgICBmaWxlLnBhdGguc3RhcnRzV2l0aChcIkJpbm5BZ2VudFgvVGVtcGxhdGVzL1wiKSB8fFxuICAgIGZpbGUuYmFzZW5hbWUgPT09IFwiRGFzaGJvYXJkXCIgfHxcbiAgICBmaWxlLmJhc2VuYW1lID09PSBcIjAwLURhc2hib2FyZFwiIHx8XG4gICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKExJQlJBUllfTk9URVMsIGZpbGUucGF0aCkgfHxcbiAgICBjYWNoZT8uZnJvbnRtYXR0ZXI/LmJpbm5hZ2VudF9zeW5jID09PSBmYWxzZVxuICApXG4gICAgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBwYXRoQWxsb3dlZCA9IGZvbGRlcnMuc29tZShcbiAgICAoZm9sZGVyKSA9PiBmaWxlLnBhdGggPT09IGZvbGRlciB8fCBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtmb2xkZXJ9L2ApLFxuICApO1xuICBjb25zdCBmaWxlVGFncyA9IHVuaXF1ZVN0cmluZ3MoW1xuICAgIC4uLihjYWNoZT8udGFncyA/PyBbXSkubWFwKCh0YWcpID0+IHRhZy50YWcpLFxuICAgIC4uLmFycmF5U3RyaW5ncyhjYWNoZT8uZnJvbnRtYXR0ZXI/LnRhZ3MpLFxuICBdKTtcbiAgcmV0dXJuIHBhdGhBbGxvd2VkIHx8IHRhZ3Muc29tZSgodGFnKSA9PiBmaWxlVGFncy5pbmNsdWRlcyh0YWcpKTtcbn1cbmZ1bmN0aW9uIGluZmVyS2luZCh2YWx1ZTogdW5rbm93biwgdGFnczogc3RyaW5nW10pOiBMZWFybmluZ0tpbmQge1xuICBjb25zdCBjYW5kaWRhdGUgPVxuICAgIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyB2YWx1ZVxuICAgICAgOiB0YWdzLmZpbmQoKHRhZykgPT5cbiAgICAgICAgICBbXG4gICAgICAgICAgICBcInZvY2FidWxhcnlcIixcbiAgICAgICAgICAgIFwiZ3JhbW1hclwiLFxuICAgICAgICAgICAgXCJ3cml0aW5nX2V4cHJlc3Npb25cIixcbiAgICAgICAgICAgIFwicmVhZGluZ19za2lsbFwiLFxuICAgICAgICAgICAgXCJleGFtX3NraWxsXCIsXG4gICAgICAgICAgICBcIndyaXRpbmdfc2tpbGxcIixcbiAgICAgICAgICBdLmluY2x1ZGVzKHRhZyksXG4gICAgICAgICk7XG4gIHJldHVybiAoXG4gICAgW1xuICAgICAgXCJ2b2NhYnVsYXJ5XCIsXG4gICAgICBcImdyYW1tYXJcIixcbiAgICAgIFwid3JpdGluZ19leHByZXNzaW9uXCIsXG4gICAgICBcInJlYWRpbmdfc2tpbGxcIixcbiAgICAgIFwiZXhhbV9za2lsbFwiLFxuICAgICAgXCJ3cml0aW5nX3NraWxsXCIsXG4gICAgXSBhcyBzdHJpbmdbXVxuICApLmluY2x1ZGVzKGNhbmRpZGF0ZSA/PyBcIlwiKVxuICAgID8gKGNhbmRpZGF0ZSBhcyBMZWFybmluZ0tpbmQpXG4gICAgOiBcInJlYWRpbmdfc2tpbGxcIjtcbn1cbmZ1bmN0aW9uIHVwZGF0ZU1hbmFnZWREYXNoYm9hcmRMaW5rcyhtYXJrZG93bjogc3RyaW5nLCBzb3VyY2VQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgdXBkYXRlZCA9IG1hcmtkb3duXG4gICAgLnJlcGxhY2VBbGwoXCJCaW5uQWdlbnRYLzAxLVZvY2FidWxhcnkvRGFzaGJvYXJkXCIsIFwiQmlubkFnZW50WC8wMS1Wb2NhYnVsYXJ5LzAwLURhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFwiQmlubkFnZW50WC8wMi1HcmFtbWFyL0Rhc2hib2FyZFwiLCBcIkJpbm5BZ2VudFgvMDItR3JhbW1hci8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIi4uLzAxLVZvY2FidWxhcnkvRGFzaGJvYXJkXCIsIFwiLi4vMDEtVm9jYWJ1bGFyeS8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIi4uLzAyLUdyYW1tYXIvRGFzaGJvYXJkXCIsIFwiLi4vMDItR3JhbW1hci8wMC1EYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcIltbMDEtVm9jYWJ1bGFyeS9EYXNoYm9hcmRcIiwgXCJbWzAxLVZvY2FidWxhcnkvMDAtRGFzaGJvYXJkXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJbWzAyLUdyYW1tYXIvRGFzaGJvYXJkXCIsIFwiW1swMi1HcmFtbWFyLzAwLURhc2hib2FyZFwiKVxuICAgIC5yZXBsYWNlQWxsKFwiW1tEYXNoYm9hcmR8XHU2MDNCIERhc2hib2FyZFwiLCBcIltbMDAtRGFzaGJvYXJkfFx1NjAzQiBEYXNoYm9hcmRcIilcbiAgICAucmVwbGFjZUFsbChcbiAgICAgICdXSEVSRSBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIiBBTkQgIWNvbnRhaW5zKGZpbGUucGF0aCwgXCIvMDUtVGVtcGxhdGVzL1wiKScsXG4gICAgICAnV0hFUkUgZmlsZS5uYW1lICE9IFwiMDAtRGFzaGJvYXJkXCIgQU5EIGZpbGUubmFtZSAhPSBcIkRhc2hib2FyZFwiIEFORCAhY29udGFpbnMoZmlsZS5wYXRoLCBcIi8wNS1UZW1wbGF0ZXMvXCIpJyxcbiAgICApO1xuICBpZiAoXG4gICAgc291cmNlUGF0aC5zdGFydHNXaXRoKGAke0xJQlJBUllfUk9PVH0vMDEtVm9jYWJ1bGFyeS9gKSB8fFxuICAgIHNvdXJjZVBhdGguc3RhcnRzV2l0aChgJHtMSUJSQVJZX1JPT1R9LzAyLUdyYW1tYXIvYClcbiAgKSB7XG4gICAgdXBkYXRlZCA9IHVwZGF0ZWQucmVwbGFjZUFsbChcIltbRGFzaGJvYXJkXV1cIiwgXCJbWzAwLURhc2hib2FyZF1dXCIpO1xuICB9XG4gIGlmIChzb3VyY2VQYXRoLmVuZHNXaXRoKFwiL0Rhc2hib2FyZC5tZFwiKSB8fCBzb3VyY2VQYXRoLmVuZHNXaXRoKFwiLzAwLURhc2hib2FyZC5tZFwiKSkge1xuICAgIHVwZGF0ZWQgPSB1cGRhdGVkLnJlcGxhY2VBbGwoXG4gICAgICAnV0hFUkUgZmlsZS5uYW1lICE9IFwiRGFzaGJvYXJkXCInLFxuICAgICAgJ1dIRVJFIGZpbGUubmFtZSAhPSBcIjAwLURhc2hib2FyZFwiIEFORCBmaWxlLm5hbWUgIT0gXCJEYXNoYm9hcmRcIicsXG4gICAgKTtcbiAgfVxuICByZXR1cm4gdXBkYXRlZDtcbn1cbmZ1bmN0aW9uIHN1bW1hcml6ZShtYXJrZG93bjogc3RyaW5nLCBsaW1pdDogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuIG1hcmtkb3duXG4gICAgLnJlcGxhY2UoL14tLS1bXFxzXFxTXSo/LS0tXFxzKi91LCBcIlwiKVxuICAgIC5yZXBsYWNlKC9gYGBbXFxzXFxTXSo/YGBgL2d1LCBcIlwiKVxuICAgIC5yZXBsYWNlKC8hPyhcXFsoW15cXF1dKilcXF1cXChbXildKlxcKSkvZ3UsIFwiJDJcIilcbiAgICAucmVwbGFjZSgvWyM+Kl9gXS9ndSwgXCIgXCIpXG4gICAgLnJlcGxhY2UoL1xccysvZ3UsIFwiIFwiKVxuICAgIC50cmltKClcbiAgICAuc2xpY2UoMCwgbGltaXQpO1xufVxuZnVuY3Rpb24gc2FmZUZpbGVuYW1lKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gKFxuICAgIHZhbHVlXG4gICAgICAucmVwbGFjZSgvW1xcXFwvOio/XCI8PnxdL2csIFwiLVwiKVxuICAgICAgLnRyaW0oKVxuICAgICAgLnNsaWNlKDAsIDgwKSB8fCBcImFzc2V0XCJcbiAgKTtcbn1cbmZ1bmN0aW9uIHlhbWxTdHJpbmcodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cXFxcL2csIFwiXFxcXFxcXFxcIikucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xufVxuYXN5bmMgZnVuY3Rpb24gc2hhMjU2KHZhbHVlOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBkaWdlc3QgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChcIlNIQS0yNTZcIiwgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHZhbHVlKSk7XG4gIHJldHVybiBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KGRpZ2VzdCksIChieXRlKSA9PiBieXRlLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpLmpvaW4oXCJcIik7XG59XG4iXSwKICAibWFwcGluZ3MiOiAieWFBQUEsSUFBQUEsRUFBQSxHQUFBQyxFQUFBRCxFQUFBLGFBQUFF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QTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUE0Q2hELENBQUMsR0FBR0EsQ0FBWSw2QkFBNkIsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFxQmhELENBQUMsR0FBR0EsQ0FBWSx3Q0FBbUMsRUFBRztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQXdDdEQsQ0FBQyxHQUFHQSxDQUFZLHFEQUF1QixFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWlDMUMsQ0FBQyxHQUFHQSxDQUFZLHFEQUF1QixFQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxDQThCNUMsRUFFcUJI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QUFVQSxFQUFRLFdBQ2hCLGlDQUNBLGdFQUNGLEdBRUtBLENBQ1QsQ0FDQSxTQUFTYixFQUFVNEQsRUFBa0JFLEVBQXVCLENBQzFELE9BQU9GLEVBQ0osUUFBUSxzQkFBdUIsRUFBRSxFQUNqQyxRQUFRLG1CQUFvQixFQUFFLEVBQzlCLFFBQVEsOEJBQStCLElBQUksRUFDM0MsUUFBUSxZQUFhLEdBQUcsRUFDeEIsUUFBUSxRQUFTLEdBQUcsRUFDcEIsS0FBSyxFQUNMLE1BQU0sRUFBR0UsQ0FBSyxDQUNuQixDQUNBLFNBQVNsQixFQUFhUyxFQUF1QixDQUMzQyxPQUNFQSxFQUNHLFFBQVEsZ0JBQWlCLEdBQUcsRUFDNUIsS0FBSyxFQUNMLE1BQU0sRUFBRyxFQUFFLEdBQUssT0FFdkIsQ0FDQSxTQUFTUCxFQUFXTyxFQUF1QixDQUN6QyxPQUFPQSxFQUFNLFFBQVEsTUFBTyxNQUFNLEVBQUUsUUFBUSxLQUFNLEtBQUssQ0FDekQsQ0FDQSxlQUFlWixFQUFPWSxFQUFnQyxDQUNwRCxJQUFNYixFQUFTLE1BQU0sT0FBTyxPQUFPLE9BQU8sVUFBVyxJQUFJLFlBQVksRUFBRSxPQUFPYSxDQUFLLENBQUMsRUFDcEYsT0FBTyxNQUFNLEtBQUssSUFBSSxXQUFXYixDQUFNLEVBQUl1QixHQUFTQSxFQUFLLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FDakciLAogICJuYW1lcyI6IFsibWFpbl9leHBvcnRzIiwgIl9fZXhwb3J0IiwgIkJpbm5BZ2VudFhMZWFybmluZ1N5bmNQbHVnaW4iLCAiX190b0NvbW1vbkpTIiwgImltcG9ydF9vYnNpZGlhbiIsICJMSUJSQVJZX1JPT1QiLCAiTElCUkFSWV9GT0xERVJTIiwgIklOQk9YX0ZPTERFUiIsICJURU1QTEFURV9GT0xERVIiLCAiQVRUQUNITUVOVF9GT0xERVIiLCAiQ1VSUkVOVF9MSUJSQVJZX1ZFUlNJT04iLCAiREFTSEJPQVJEX01JR1JBVElPTlMiLCAiREVGQVVMVF9TRVRUSU5HUyIsICJMRUFSTklOR19URU1QTEFURVMiLCAiTElCUkFSWV9OT1RFUyIsICJCaW5uQWdlbnRYU2V0dGluZ1RhYiIsICJlcnJvciIsICJtZXNzYWdlIiwgImZvbGRlcnMiLCAic3BsaXRTY29wZSIsICJ0YWdzIiwgInRhZyIsICJmaWxlcyIsICJmaWxlIiwgImlzQWxsb3dlZCIsICJjYWNoZSIsICJmcm9udG1hdHRlciIsICJ1bmlxdWVTdHJpbmdzIiwgImFycmF5U3RyaW5ncyIsICJpbmZlcktpbmQiLCAic3VtbWFyaXplIiwgImVudHJpZXMiLCAiZW50cnkiLCAic2hvd05vdGljZSIsICJpbnN0YWxsZWQiLCAibmFtZSIsICJmb2xkZXIiLCAiY29udGVudCIsICJwYXRoIiwgIm1pZ3JhdGVkIiwgImxlZ2FjeVBhdGgiLCAidGFyZ2V0UGF0aCIsICJsZWdhY3kiLCAidXBkYXRlZCIsICJ1cGRhdGVNYW5hZ2VkRGFzaGJvYXJkTGlua3MiLCAiY29uZmlndXJhYmxlVmF1bHQiLCAicGF0Y2giLCAiYWRhcHRlciIsICJjdXJyZW50IiwgInJhdyIsICJwYXJzZWQiLCAiZXhwb3J0ZWQiLCAicmVzcG9uc2UiLCAicmVzdWx0IiwgIm9yZ2FuaXplZCIsICJwbGFuIiwgImFsbG93ZWRUYXJnZXRzIiwgImNvbXBsZXRlZCIsICJhY3Rpb24iLCAiZmlsZU5hbWUiLCAiZXh0ZW5zaW9uSW5kZXgiLCAiYmFzZU5hbWUiLCAiZXh0ZW5zaW9uIiwgImJhc2VQYXRoIiwgInJldHJ5UGF0aCIsICJzb3VyY2UiLCAiYmFzZSIsICJoZWFkZXJzIiwgImV4cG9ydHMiLCAiaXRlbSIsICJkaWdlc3QiLCAic2hhMjU2IiwgImFjayIsICJmaWxlbmFtZSIsICJzYWZlRmlsZW5hbWUiLCAiZXhpc3RpbmciLCAieWFtbFN0cmluZyIsICJib2R5IiwgImFwcCIsICJwbHVnaW4iLCAiY29udGFpbmVyRWwiLCAiYnV0dG9uIiwgInRvZ2dsZSIsICJ2YWx1ZSIsICJ0ZXh0IiwgInBhcnQiLCAidmFsdWVzIiwgInBhdGhBbGxvd2VkIiwgImZpbGVUYWdzIiwgImNhbmRpZGF0ZSIsICJtYXJrZG93biIsICJzb3VyY2VQYXRoIiwgImxpbWl0IiwgImJ5dGUiXQp9Cg==
