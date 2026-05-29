# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows semantic versioning.

## [0.1.2] - 2026-05-29

### Changed

- Tightened startup-mode instructions so the specialist stays inside the plugin-managed Octagon connector flow
- Updated setup and reconnect guidance to send users to `Plugins -> Octagon -> Connectors`
- Bumped plugin metadata to `0.1.2` for the startup-flow fix release

## [0.1.1] - 2026-05-29

### Changed

- Updated the plugin display name to `Octagon` and refreshed the marketplace description copy
- Renamed the routing agent in plugin UI surfaces to `Octagon MCP Specialist`
- Bumped plugin metadata to `0.1.1` so fresh installs surface the latest release clearly

## [0.1.0] - 2026-05-19

### Added

- Initial standalone `octagon-claude-plugin` repository
- Claude Code plugin manifest, marketplace manifest, and bundled MCP runtime wiring
- Skills catalog, routing agent, and session-start hook
- Validation tests for manifest, skills, hooks, and MCP configuration

### Changed

- Renamed inherited `octagon-mcp` branding to `octagon-claude-plugin`
- Reworked repository documentation to be plugin-first
- Hardened marketplace compliance posture for secure config, runtime distribution, and validation
