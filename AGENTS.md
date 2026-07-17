## OpenWiki 操作权限

- OpenWiki 由用户本人手动维护。
- 除非用户在当前请求中明确要求执行某项 OpenWiki 操作，否则 Agent 不得运行 `openwiki` 命令，不得刷新或重建 `openwiki/` 生成页，不得切换模型、修改 OpenWiki 配置，也不得触发或调整 OpenWiki 自动更新工作流。
- “更新项目文档”“同步文档”“检查文档”等一般请求不构成 OpenWiki 授权。此时只修改权威源文档或代码，并在交付说明中提醒用户可自行运行 OpenWiki。
- 一次明确授权只适用于该次请求所指定的操作，不延续到后续任务。
- 未获授权时不得为了修复生成页、更新导航、验证模型或保持 Wiki 一致性而自行例外执行。

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
