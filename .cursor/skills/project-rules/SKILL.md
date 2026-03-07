---
name: project-rules
description: Creates or updates Cursor rules in .cursor/rules/ for the paper project (論文要約サイト). Covers paper summary Markdown format, frontmatter fields, slug, and figure paths. Use when creating or editing project rules, or when asked about paper project conventions.
---

# Project Rules (paper)

このプロジェクトで Cursor が従うルールは `.cursor/rules/` の `.mdc` で定義する。ルールの追加・更新時は以下に従う。

ルールファイルは `.cursor/rules/<名前>.mdc`。YAML frontmatter に `description`, `globs`（任意）, `alwaysApply`（任意）を書く。詳細は Cursor の create-rule スキルを参照。

## このプロジェクトの慣習（ルールに含める候補）

- **論文要約**: 1論文1ファイル `content/papers/<slug>.md`。ファイル名が URL の slug（`/papers/<slug>`）。
- **Frontmatter**: `title`, `authors`, `year`, `venue`, `url`（任意）, `tags`, `readAt`, `oneLiner`, `editor`（任意）。`lib/papers.ts` の `PaperMeta` と一致させる。
- **図**: 配置は `public/papers/<slug>/`。マークダウンでは **絶対パス** `![キャプション](/papers/<slug>/ファイル名.png)` で記述。相対パスは使わない。

## 参照ドキュメント

- 論文要約の形式・提案: `docs/PAPER_SUMMARY_PROPOSAL.md`
- 追加方法・テンプレート: `content/papers/README.md`
- 図の管理・記述: `docs/FIGURES.md`

## MDファイルの書き方
論文内の式を参照する場合、式そのものを記述し、論文の式番号を参照しない。
「本論文では」などなくてもわかる記述は省略して可能な限り簡潔に書く。
できるだけ別論文を参照しない。必要があり別論文を参照するとき、リファレンス番号では参照せず、論文名などで記述する。
