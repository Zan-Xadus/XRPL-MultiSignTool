# Decisions

## 2026-07-02: Small branches and pull requests

Decision:

This repository will use small topic branches and small pull requests.

Reason:

The project touches sensitive transaction workflows. Small changes are easier to review, test, revert and document.

Status:

Accepted.

## 2026-07-02: Documentation before large refactors

Decision:

Large refactors and migrations should be preceded by written plans and test fixtures.

Reason:

The current application is a legacy Vue 2 project. Documentation and fixtures reduce migration risk.

Status:

Accepted.
