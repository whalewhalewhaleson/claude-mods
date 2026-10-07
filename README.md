# whaleson-mods

Claude Code mods, as a plugin marketplace.

- **context-bar**: model, session/weekly usage and a context bar above the prompt.

Use in a repo (cloud sessions included) by adding to its `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "whaleson-mods": { "source": { "source": "github", "repo": "whalewhalewhaleson/claude-mods" } }
  },
  "enabledPlugins": { "context-bar@whaleson-mods": true }
}
```
