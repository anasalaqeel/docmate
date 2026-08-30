# Documentation Import Guide

This guide explains how to prepare and organize existing documentation (e.g., from GitHub) so it can be imported seamlessly into Docmate.

## Supported Formats
Docmate currently supports importing documentation via:
1. **Markdown ZIP Archives**: Best for multi-page, hierarchical guides.
2. **JSON Data**: Best for direct backup/restore.

---

## 1. Markdown ZIP Structure

To import documentation from Markdown files, you must bundle them into a `.zip` file with a specific folder architecture.

### Directory Layout
```text
your-documentation.zip/
├── _metadata.json
├── _index.md
├── openapi.json (optional)
└── pages/
    ├── getting-started.md
    ├── authentication.md
    └── advanced-usage/
        └── setup.md
```

### File Specifications

#### `_metadata.json` (Required)
Defines the primary settings for the document hub. 
```json
{
  "title": "Your Project Name",
  "description": "Short summary of your documentation.",
  "version": "1.0.0",
  "type": "traditional", 
  "isPublic": true,
  "showApiEndpointsInSidebar": false
}
```
* **`type` options**: 
  * `"traditional"`: Standard multi-page guide.
  * `"api"`: Focuses heavily on API specification layout.
  * `"mixed"`: Displays both traditional pages and API interactions.

#### `_index.md` (Required)
The default "Home" or "Overview" page. This content is displayed immediately when a user visits the documentation hub.

#### `pages/` (Required)
The container for your guide pages.
* You can place standard `.md` files directly in `pages/`.
* You can build multi-level nested folders. Docmate parses folder names and generates nested parent directories/collapsibles in your frontend sidebar automatically.

##### Controlling sidebar order

By default, pages and folders appear in the order Docmate happens to read them from the archive. To pin an exact order, prefix any file or folder name with a number and a hyphen:

```text
pages/
├── 1-getting-started.md
├── 2-authentication.md
└── 3-advanced-usage/
    ├── 1-setup.md
    └── 2-troubleshooting.md
```

The number sets the sidebar position and is stripped from the title (`2-authentication.md` → "Authentication"). Numbers only need to sort correctly relative to their siblings — gaps like `1, 5, 10` are fine. Files without a prefix keep the default archive-order behavior. Docmate's own Markdown export (`GET /:id/export/markdown`) always writes numbered files, so an exported ZIP re-imports with the same order.

#### `openapi.json` (Optional)
Include a standard Swagger/OpenAPI JSON specification at the root if your project incorporates programmatic API reference views.

---

## 2. YAML Frontmatter

Individual pages can specify metadata using YAML frontmatter enclosed by `---` markers at the very top of the markdown payload:

```markdown
---
title: "Custom Sidebar Title"
slug: "custom-url-slug"
---

# Your Markdown Content
Welcome to our documentation...
```
* **`title`**: Overrides the automatic snake_case to Title Case filename conversion.
* **`slug`**: Customizes the URL router targeting path.
