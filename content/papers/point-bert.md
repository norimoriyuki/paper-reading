---
title: "Point-BERT: Pre-Training 3D Point Cloud Transformers With Masked Point Modeling"
authors: ["Xumin Yu", "Lulu Tang", "Yongming Rao", "Tiejun Huang", "Jie Zhou", "Jiwen Lu"]
year: 2022
venue: "CVPR"
url: "https://arxiv.org/abs/2111.14819"
tags: ["3D", "Point Cloud", "Self-supervised Learning", "BERT", "Masked Point Modeling", "Transformer", "Pre-training", "dVAE"]
readAt: ""
oneLiner: "点群を離散トークン化し BERT 風マスク予測で事前学習する純粋 Transformer"
editor: "morix"
---

# 概要

**BERT の概念を 3D 点群に拡張**し、標準的な点群 Transformer を事前学習

- **Masked Point Modeling (MPM)**: 点群を **局所パッチ** に分割し、**離散 Variational AutoEncoder (dVAE)** で各パッチを **離散点トークン** に変換する。入力の一部パッチをランダムにマスクし、バックボーンの Transformer に渡し、**マスク位置の元の点トークンを復元する** ことを事前学習の目的とする。画像の MAE と異なり、再構成ターゲットは連続座標ではなく **Tokenizer（dVAE）が出力する離散トークン** である。
- **純粋 Transformer**: 人手の設計や強い帰納バイアスを抑え、**標準的な点群 Transformer** を事前学習で強化する。ModelNet40 で **93.7%**、ScanObjectNN の最難設定で **83.1%** を達成し、当時の専用設計モデルを上回る。
- **他タスクへの転移**: 学習した表現は few-shot 点群分類などにも転移し、SOTA を更新している。

コード: [Point-BERT](https://github.com/lulutang0608/Point-BERT)
