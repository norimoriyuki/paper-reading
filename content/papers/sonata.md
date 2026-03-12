---
title: "Sonata: Self-Supervised Learning of Reliable Point Representations"
authors: ["Xiaoyang Wu", "Daniel DeTone", "Duncan Frost", "Tianwei Shen", "Chris Xie", "Nan Yang", "Jakob Engel", "Richard Newcombe", "Hengshuang Zhao", "Julian Straub"]
year: 2025
venue: "CVPR"
url: "https://arxiv.org/abs/2503.16429"
tags: ["3D", "Point Cloud", "Self-Supervised Learning", "Linear Probing", "Geometric Shortcut", "Self-Distillation"]
readAt: ""
oneLiner: "幾何ショートカットを抑え、自己蒸留で 14 万点群から線形 probing に強い点群表現を学習"
editor: "morix"
---

# 概要

**線形 probing で評価したときにも信頼できる** 3D 点群の自己教師あり表現を目指した研究（CVPR 2025, Pointcept × Meta）。既存の 3D 自己教師あり学習は、線形 probing での表現品質が弱く、少データ・少計算では使いづらい。原因として **「幾何ショートカット（geometric shortcut）」** を指摘する。点群のスパースさゆえ、表現が**低レベルな空間手がかり**（位置・近傍構造など）に寄り、セマンティクスに collapse しにくいという 3D 特有の課題である。

- **対処の方針**: (1) **空間情報を隠す** — 座標や局所構造を意図的に曖昧にし、幾何ショートカットに頼りにくくする。(2) **入力特徴（色・法線など）への依存を強める** — 座標だけに頼らないようにする。これらを組み合わせ、**自己蒸留**で **約 14 万点群** から学習する「Sonata」を構成する。シンプルな設計だが、得られる表現は線形 probing で強く、ゼロショット可視化でもセマンティックなグループ化や近傍関係に基づく空間推論が現れるとしている。

- **効率**: **パラメータ効率・データ効率**が高い。ScanNet で線形 probing 精度を **21.8% → 72.5%** に約 3 倍改善し、**データ 1%** でも従来法の約 2 倍の性能を報告。**Full fine-tuning** では室内・屋外の 3D 知覚タスクで SOTA を更新している。

- **位置づけ**: Utonia や Concerto の事前学習レシピの土台となっており、Utonia 論文では「Sonata は室内／屋外をドメインごとにスケールし、Concerto はさらに動画由来点群を加えて拡張。Utonia は全ドメインを 1 エンコーダで」と整理されている。

プロジェクト: [Sonata](https://xywu.me/sonata/) / 論文: [arXiv:2503.16429](https://arxiv.org/abs/2503.16429)
