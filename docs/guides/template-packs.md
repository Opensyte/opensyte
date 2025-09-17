### Template Packs: Export, Install, and Best Practices

This document explains how Template Packs work in OpenSyte: exporting assets, installing with preflight checks, resolving variables and integrations, and testing.

#### Export Contents

- Workflows: full graph including nodes, triggers, connections, and action sub-entities (Email, SMS, WhatsApp, Slack, Calendar). Integration IDs are converted to placeholders `{ type, key }` based on the org's `IntegrationConfig` name.
- Reports: only `template`, `filters`, and `dateRange` are exported; no generated data.
- UI Layouts: selected `OrganizationUiConfig` keys as JSON.
- RBAC: custom roles with permission names.
- Variables: definitions with type/scope/required/default.
- Seeds: minimal sanitized records using `localKey` and foreign keys expressed via local keys.

#### Installation Flow

1. Preflight checks (tRPC `templates.preflight`):
   - Missing integrations and variables collected from manifest.
   - Name collisions computed; a plan (merge/overwrite/prefix) is suggested.
2. Install (tRPC `templates.startInstall`):
   - Creates roles, variables, reports, workflows, nodes, triggers, connections.
   - Resolves integration placeholders to `IntegrationConfig.id` and creates action sub-entities.
   - Applies name prefix when requested.
   - Writes `TemplateInstallItem` logs for each asset.
3. Seeds are applied last, resolving `localKey` to created IDs.

#### Developer Notes

- Never export secrets (credentials/endpoints). The exporter scrubs PII and content.
- Prefer using `OrganizationUiConfig` for feature-level UI settings to allow safe export/import.
- Keep integration keys stable (e.g., `primary_smtp`) to simplify mapping.

#### Testing

- Roundtrip: export a package, then install into a clean org and verify:
  - Workflows can activate, nodes/triggers exist and action entities resolve integrations.
  - Reports appear and render with saved template/filters/dateRange.
  - UI layouts are applied or fall back via `useUiConfig` hook.
- Use `bun run check` to ensure type and lint checks pass.
