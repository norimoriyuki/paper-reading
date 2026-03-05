---
title: "OpenIns3D: Snap and Lookup for 3D Open-vocabulary Instance Segmentation"
authors: ["Zhening Huang", "Xiaoyang Wu", "Xi Chen", "Hengshuang Zhao", "Lei Zhu", "Joan Lasenby"]
year: 2024
venue: "ECCV"
url: "https://arxiv.org/abs/2309.00616"
tags: ["3D", "Point Cloud", "Open-vocabulary", "Instance Segmentation", "Vision-Language", "Scene Understanding", "Multi Modal"]
readAt: ""
oneLiner: "3D のみ入力で Mask-Snap-Lookup によりオープン語彙のインスタンス分割"
editor: "morix"
---

# 概要

**3D のみを入力**とする 3D オープン語彙シーン理解のフレームワーク。訓練済み 2D の Vision-Language モデル（VLM）を利用しつつ、**Mask-Snap-Lookup** の 3 段階で「クラスに依存しない 3D マスク提案 → 合成画像で 2D VLM に問い合わせ → マスクにカテゴリ名を付与」を行う。

- **Mask**: 3D 点群から **クラス非依存のマスク提案** を学習するモジュール。何であるかは問わずインスタンス候補を出す。
- **Snap**: 複数スケールで **シーン級の合成画像** を生成し、2D の Vision-Language モデルで「興味ある物体」を検出・抽出する。3D 情報を 2D に写して既存の 2D オープン語彙能力を利用する。
- **Lookup**: Snap の結果（2D 検出・ラベル）を **検索** し、各 3D マスク提案にどのカテゴリ名を付けるか対応づける。

この構成により、**認識・物体検出・インスタンス分割** の各種 3D オープン語彙タスクで室内・室外データセットにわたって SOTA を報告している。また、**2D 検出器を差し替えても再訓練不要**で、強力な 2D オープンワールドモデルや LLM 連携 2D モデルと組み合わせることで、複雑なテキストクエリや推論・実世界知識を要する質問にも対応できるとしている。

プロジェクトページ: [OpenIns3D](https://zheninghuang.github.io/OpenIns3D/)

#更新中
