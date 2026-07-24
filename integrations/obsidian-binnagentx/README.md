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

1. Download `BinnAgentX-Learning-Sync-v0.1.6.zip` from the BinnAgentX release.
2. Unzip it into `<your-vault>/.obsidian/plugins/`; the final path must be
   `<your-vault>/.obsidian/plugins/binnagentx-learning-sync/main.js`.
3. Open Obsidian **Settings → Community plugins**, turn off Restricted mode if
   necessary, then enable **BinnAgentX Learning Sync**.
4. In BinnAgentX's **学习资产 → 配置 Obsidian**, generate a plugin connection
   credential and paste its Connection ID and Sync Secret into this plugin's
   settings.
   Keep the default BinnAgentX address as `http://127.0.0.1:8000/learner`.

## User workflow

1. On first load the plugin initializes `BinnAgentX/00-Inbox` through
   `BinnAgentX/06-Attachments`, creates `BinnAgentX/使用指南.md`, MOC / Dataview
   dashboards, templates, a `Spaced Repetition 使用指南.md`, and non-syncing
   examples, including a ready-to-review flashcard deck. Existing files are
   never overwritten. You can rerun **Initialize BinnAgentX learning library** at any time.
   Managed dashboards use the `00-Dashboard.md` filename so they remain the
   first note when Obsidian's file explorer is sorted by filename A–Z.
2. The plugin configures Obsidian's Templates folder as
   `BinnAgentX/05-Templates` and its attachment folder as
   `BinnAgentX/06-Attachments`. Enable the Templates core plugin, install and
   enable the Spaced Repetition community plugin for flashcard review, and
   optionally install Dataview to render automatic dashboard tables. The
   vocabulary template joins the `flashcards/binnagentx/vocabulary` deck and
   creates a rich multi-line recall card that reuses the note's meaning,
   pronunciation, collocations, example, and contrast sections. A managed CSS
   snippet gives the review window a compact visual hierarchy without changing
   normal note rendering. The template deliberately avoids a reverse card
   because Spaced Repetition's default card context displays the source filename
   and would reveal the word. On upgrade, only unchanged managed vocabulary
   templates are migrated automatically; user-customized templates are preserved.
3. In plugin settings, choose `BinnAgentX/` or specific grammar/vocabulary
   folders and tags, then use **Preview learning context**.
4. Paste the connection ID and sync secret issued by BinnAgentX.
5. Use **Sync approved learning context**. Pending BinnAgentX annotations and
   fragments first arrive under `BinnAgentX/00-Inbox/`; the same established
   sync flow then uploads only selected note excerpts. After a BinnAgentX login,
   the organizer can return a one-time move plan; the plugin accepts only the
   Vocabulary, Grammar, Reading, and Writing managed folders, moves files without
   rewriting their content, and acknowledges the complete plan. Templates,
   dashboards, the guide, and bundled examples are excluded from sync.

The completion notice reports each part separately: assets received from
BinnAgentX, approved context uploaded, Inbox notes detected and reliably
classified, notes actually moved, and destination counts. “Sync completed”
does not by itself mean that Inbox organization moved files. If any intent
classification batch fails or omits a note, the plugin moves none of that run,
reports that organization is pending retry, and retries the same queued run on
the next sync.

Automatic bidirectional sync is enabled by default after pairing and runs when
Obsidian opens and every 60 seconds. It can be disabled in plugin settings.

The BinnAgentX pairing endpoint is intentionally separate from regular browser
login so a plugin never receives browser session cookies.
