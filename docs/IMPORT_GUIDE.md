# Documentation Import Guide

This guide explains how to prepare and organize existing documentation (e.g., from GitHub) so it can be imported seamlessly into Grud.

## Supported Formats
Grud currently supports importing documentation via:
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
* You can build multi-level nested folders. Grud parses folder names and generates nested parent directories/collapsibles in your frontend sidebar automatically.

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
