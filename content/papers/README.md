# 論文要約の追加方法

このフォルダに **1論文1ファイル** で `.md` を追加すると、トップの一覧と `/papers/ファイル名` で表示されます。

## ファイル名 = URL

- `my-paper.md` → 表示URL: `/papers/my-paper`
- 英数字とハイフン推奨（スラッグ）

## テンプレート

```md
---
title: "論文のタイトル"
authors: ["著者1", "著者2"]
year: 2024
venue: "学会・ジャーナル名"
url: "https://..."
tags: ["タグ1", "タグ2"]
readAt: "2025-03-01"
oneLiner: "1行で言うとどんな論文か。"
editor: "ページ制作者"
---

# 概要
（ここからマークダウンで自由に要約）
```

- `url` は任意（PDFリンクなど）
- `readAt` で一覧の並び順（新しい順）が決まります

## 図を入れる場合

- **置き場所**: `public/papers/<スラッグ>/` に画像を置く（例: `public/papers/attention-is-all-you-need/fig1.png`）
- **記述**: 本文に `![図のキャプション](/papers/<スラッグ>/fig1.png)` と書く（絶対パス）。キャプションは図の下に表示される。
- 詳しくはルートの `docs/FIGURES.md` を参照。
