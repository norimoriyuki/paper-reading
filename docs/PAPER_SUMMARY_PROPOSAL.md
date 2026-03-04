# 論文要約ページの構成提案

## 目的
読んだ論文を要約して一覧・詳細で見られるようにする。

---

## 推奨: マークダウン + ファイルベース

### 選ぶ理由
- **追記が簡単**: 新しい論文は `content/papers/〇〇.md` を1つ追加するだけ
- **Gitで管理しやすい**: 要約の変更履歴がそのまま残る
- **書き慣れた形式**: マークダウンでメモ・要約を書ける
- **将来の拡張**: 後からJSON/DBに移しやすい

### フォルダ構成（案）

```
paper/
├── app/
│   ├── page.tsx              # トップ = 論文一覧
│   ├── papers/
│   │   └── [slug]/
│   │       └── page.tsx      # 各論文の要約ページ
│   └── layout.tsx
├── content/
│   └── papers/               # 論文要約のマークダウンファイル
│       ├── attention-is-all-you-need.md
│       ├── bert-pretraining.md
│       └── ...
├── lib/
│   └── papers.ts             # 論文一覧取得・1件取得のユーティリティ
└── docs/
    └── PAPER_SUMMARY_PROPOSAL.md  # 本提案
```

### 各論文ファイルの形式（Frontmatter + 本文）

```yaml
---
title: "Attention Is All You Need"
authors: ["Vaswani et al."]
year: 2017
venue: "NeurIPS"
url: "https://arxiv.org/abs/1706.03762"
tags: ["NLP", "Transformer", "Attention"]
readAt: "2025-03-01"
oneLiner: "Self-attentionのみで系列を扱うTransformerを提案した論文。"
---

# 概要
（ここにマークダウンで要約本文）
```

- **slug**: ファイル名の `.md` を除いた部分がURLになる（例: `attention-is-all-you-need` → `/papers/attention-is-all-you-need`）

### URL設計

| ページ       | URL例                    |
|-------------|--------------------------|
| 論文一覧    | `/`                      |
| 論文の要約  | `/papers/[slug]`         |

---

## 他の選択肢（参考）

| 方式 | メリット | デメリット |
|------|----------|------------|
| **JSON/TSで一覧 + MDで本文** | 一覧のソート・フィルタをコードで制御しやすい | 論文を足すたびにJSONとMDの両方を更新する必要 |
| **Notion/外部CMS** | 編集UIが豊富 | このリポジトリだけで完結しない・API連携が必要 |
| **DB（SQLite等）** | 検索・タグ絞り込みが得意 | セットアップと運用が重い |

まずは **マークダウン + ファイルベース** で始め、必要になったら一覧用のJSONや検索用のDBを足す形がおすすめです。

---

## 追加したい機能（将来）

- タグでフィルタ（例: `?tag=NLP`）
- 年・venueでソート
- 全文検索（例: クライアント側 or 簡易API）
- RSS / 一覧のJSON export

---

## まとめ

1. **1論文 = 1ファイル**: `content/papers/<slug>.md`
2. **Frontmatter** でタイトル・著者・年・タグ・URL・読んだ日・1行要約
3. **本文** はマークダウンで自由に要約
4. **トップ** で一覧、**/papers/[slug]** で詳細表示

この形で実装を進めます。
