## OpenWiki 操作权限

- OpenWiki 由用户本人手动维护。
- 除非用户在当前请求中明确要求执行某项 OpenWiki 操作，否则 Agent 不得运行 `openwiki` 命令，不得刷新或重建 `openwiki/` 生成页，不得切换模型、修改 OpenWiki 配置，也不得触发或调整 OpenWiki 自动更新工作流。
- “更新项目文档”“同步文档”“检查文档”等一般请求不构成 OpenWiki 授权。此时只修改权威源文档或代码，并在交付说明中提醒用户可自行运行 OpenWiki。
- 一次明确授权只适用于该次请求所指定的操作，不延续到后续任务。
- 未获授权时不得为了修复生成页、更新导航、验证模型或保持 Wiki 一致性而自行例外执行。

## 既有功能集成军规

- 所有新增能力默认必须作为最接近的既有用户旅程、领域聚合、API 和界面的扩展点实现，不得另起一套平行流程、重复状态机或旁路工作区。
- 开发前必须先明确该能力归属的既有功能，以及应复用的进入、执行、暂停、恢复、完成、证据和异常处理链路；验收必须证明新增入口最终进入这些既有链路。
- 新材料、新来源、新策略和新入口只改变对应扩展点，不得复制既有训练、作答、提示、修订、标注、状态持久化或完成逻辑。
- 如果仓库中确实没有可承载该需求的既有功能，Agent 必须先向用户说明缺口；只有用户明确说明这是全新功能，才允许建立新的用户流程或领域边界。
- 用户在当前请求中明确要求独立新功能时，可按其说明例外；该例外只适用于当前明确范围，不得外推。

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
