---
title: "Utonia: Toward One Encoder for All Point Clouds"
authors: ["Yujia Zhang", "Xiaoyang Wu", "Yunhan Yang", "Xianzhe Fan", "Han Li", "Yuechen Zhang", "Zehao Huang", "Naiyan Wang", "Hengshuang Zhao"]
year: 2026
venue: "arXiv"
url: "https://arxiv.org/abs/2603.03283"
tags: ["3D", "Point Cloud", "Self-Supervised Learning", "Foundation Model", "Cross-Domain", "PTv3", "RoPE"]
readAt: "2026-03-12"
oneLiner: "複数ドメインの点群で 1 つの自己教師ありエンコーダを学習し、統一表現空間を目指す"
editor: "morix"
---

# 概要

**多様なドメインの点群**（リモートセンシング、屋外 LiDAR、室内 RGB-D、物体 CAD、動画から復元した点群など）を**一つの自己教師あり Point Transformer V3 (PTv3) エンコーダ**で事前学習し、**ドメインを超えた統一表現**を得ることを目指した研究。Sonata・Concerto は室内／屋外などドメインごとに分かれた学習が中心で、ドメイン間の転移が弱い。Utonia は「なぜ単純なデータ混合では統一学習がうまくいかないか」をパイロットで整理し、**3 つのドメイン非依存な設計**で共同事前学習を安定化させる。

- **問題の整理（Pilot Study）**: (1) **粒度のずれ** — グリッドサイズやスケールがドメインごとに違うと、同じ演算が「センチ」と「メートル」で効き、学習が不安定になる。(2) **重力（z 軸）への依存** — シーンは「上」が決まっているが物体は向きが任意であり、z に強く依存すると物体ドメインへの転移が悪化する。(3) **モダリティの有無** — 色・法線の有無がドメインで異なり、あるときにだけそれに依存すると欠損時に性能が落ちる。これらを扱わないと、共同学習はドメイン固有の手がかりに支配され転移が弱くなる。

- **3 つの設計**:  
  - **Causal Modality Blinding**: 座標以外のモダリティ（色・法線）を**ランダムにマスク**する。サンプル単位でモダリティ群ごと落とす「per-data blinding」と、点単位でさらにマスクする「per-point blinding」を併用。色や法線がなくても動くようにしつつ、あれば利用する。  
  - **Perceptual Granularity Rescale**: 観察者が**ほぼ一定の最小分解能**で見るという考えに基づき、**共通の知覚的粒度**に合わせて座標をリスケールする。ドメインごとの「元のグリッドサイズ」ではなく、**固定グリッド＋座標のリスケール**で空間単位を揃え、共同学習を安定化させる。シーンは重力整列を保ち、物体は SE(3) の強い augmentation で向き不変を促す。  
  - **RoPE on Granularity-Aligned Coordinates**: 粒度を揃えた座標に **3D RoPE（Rotary Position Embedding）** を適用し、Q/K に回転をかける。離散グリッドに縛られない**連続的な相対幾何**の手がかりにし、密度やサンプリングがドメインで違っても attention が幾何に基づくようにする。座標のジッター・等方スケールで augmentation し、特定の軸スケールに semantics が張り付くのを防ぐ。

- **学習とデータ**: Teacher–student 自己蒸留（Sonata/Concerto のレシピ）をベースに、**約 25 万のクロスドメイン点群**と **Cap3D からサンプルした約 100 万の物体**で 2 段階事前学習。バックボーンは PTv3（137M など）。

- **結果**: 室内（ScanNet, ScanNet200, S3DIS 等）・屋外（NuScenes, Waymo, SemanticKITTI）・物体（ModelNet40, ScanObjectNN, ShapeNetPart, PartNetE）のセマンティックセグメンテーション・分類・パート分割で、Concerto 等と比較して**線形 probing・decoder probing・full fine-tuning のいずれでも競合以上**。色・法線を落とした評価では **Utonia が Concerto よりはるかに頑健**。さらに **VLM に Utonia 特徴を組み込むと空間推論が向上**し、**VLA のロボット操作**でも Utonia を条件にすると成功率が上がる。オープンワールドな物体パートセグメンテーション（PartObjaverse-Tiny）や、クラッター操作シーンの特徴可視化でも、Utonia の方が一貫した part 構造や幾何に基づく表現を示すと報告している。

プロジェクト: [Utonia](https://pointcept.github.io/Utonia) 