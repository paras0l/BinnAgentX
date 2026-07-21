# BinnAgentX Learning Sync for Obsidian

This desktop-only Obsidian plugin pulls pending BinnAgentX assets into a managed
Vault folder and imports only user-approved learning context into BinnAgentX.
It never deletes, moves, or overwrites existing Vault files.

## Privacy model

- A user must select one or more folders and/or tags before a scan can run.
- It sends a bounded plain-text excerpt, title, kind, tags, path key, and
  modification time—not an unrestricted Vault dump.
- The preview command reports the matching note count before sync.
- The plugin keeps its connection credential in Obsidian's local plugin data.

## Build and install for development

```bash
pnpm install
pnpm build
```

Copy `manifest.json` and the generated `main.js` into:

```text
<your-vault>/.obsidian/plugins/binnagentx-learning-sync/
```

Then enable **BinnAgentX Learning Sync** in Obsidian's Community plugins.

## Install for learners

1. Download `BinnAgentX-Learning-Sync-v0.1.2.zip` from the BinnAgentX release.
2. Unzip it into `<your-vault>/.obsidian/plugins/`; the final path must be
   `<your-vault>/.obsidian/plugins/binnagentx-learning-sync/main.js`.
3. Open Obsidian **Settings → Community plugins**, turn off Restricted mode if
   necessary, then enable **BinnAgentX Learning Sync**.
4. In BinnAgentX's **学习资产 → 配置 Obsidian**, generate a plugin connection
   credential and paste its Connection ID and Sync Secret into this plugin's
   settings.
   Keep the default BinnAgentX address as `http://127.0.0.1:8000/learner`.

## User workflow

1. In plugin settings, choose `BinnAgentX/` or specific grammar/vocabulary
   folders and tags.
2. Use **Preview learning context** from the command palette.
3. Paste the connection ID and sync secret issued by BinnAgentX.
4. Use **Sync approved learning context**. The command first creates pending
   BinnAgentX asset notes under `BinnAgentX/Assets/`, then uploads only the
   selected note excerpts. New template-based notes become metadata-only assets
   in BinnAgentX and can influence personalized material generation.

Automatic bidirectional sync is enabled by default after pairing and runs when
Obsidian opens and every 60 seconds. It can be disabled in plugin settings.

The BinnAgentX pairing endpoint is intentionally separate from regular browser
login so a plugin never receives browser session cookies.
