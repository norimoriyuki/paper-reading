---
title: "Point Transformer"
authors: ["Hengshuang Zhao", "Li Jiang", "Jiaya Jia", "Philip Torr", "Vladlen Koltun"]
year: 2021
venue: "ICCV"
url: "https://arxiv.org/abs/2012.09164"
tags: ["3D", "Point Cloud", "Transformer", "Self-Attention", "Semantic Segmentation"]
readAt: "2026-03-04"
oneLiner: "3D点群にSelf-Attentionを適用"
editor: "morix"
---

# 概要

**提案の新規性**  
点群は順序のない点の集合であり、グリッド状の画像と異なるため、そのまま 2D の Attention を適用するのではなく、(1) **Vector Attention**（スカラーではなくベクトル単位の注意）、(2) 各点の **k 近傍内での局所 Attention**（全点対は使わない）、(3) 点間の**相対位置を MLP で符号化**し attention と value に付与する **位置符号化**、の 3 点を組み合わせた点群用レイヤーを設計している。セグメンテーションでは U-Net 型の Encoder-Decoder にこのレイヤーを積み重ねた構造としている。

**今後の課題**  
局所 Attention とはいえ、点群が大規模になると計算量・メモリ負荷が依然として大きいこと、また長距離依存を扱うには層を重ねるか別の設計が必要なことなどが挙げられる。その後 Point Transformer V2 / V3 では、グループ化した Vector Attention やサンプリング・プーリングの効率化などが提案されており、本論文は 3D 点群 Transformer の一つのベースラインとして位置づけられる。

## Vector Attention と Scalar Attention の違い

- **Scalar Attention**（通常の Transformer）: クエリとキーのペア $(i, j)$ ごとに **1 つのスカラー** $\alpha_{ij}$ を計算し、value ベクトル全体に同じ係数をかけて足し合わせる（$\sum_j \alpha_{ij} \cdot \mathbf{v}_j$）。「どの位置 $j$ をどれだけ見るか」だけが変わり、**チャンネル（次元）ごとの強弱は付けられない**。
- **Vector Attention**（本論文）: ペア $(i,j)$ ごとに特徴ベクトルの次元の **$C$ 次元のベクトル** $\boldsymbol{\alpha}_{ij}$ を MLP 等で求め、value の各チャンネルに**要素ごと**にかける（$\sum_j \boldsymbol{\alpha}_{ij} \odot (\mathbf{W}_3 \mathbf{x}_j + \boldsymbol{\delta}_{ij})$）。「どの $j$ を、どの次元をどれだけ強く見るか」まで制御でき、点群の各特徴次元を別々に調整できる。本論文では [Zhao et al., Exploring Self-attention for Image Recognition, 2020](https://arxiv.org/abs/2004.13621) の Vector Attention を点群用に拡張して用いている。

# モデル構造

## 全体構成（Encoder-Decoder）

- **セグメンテーション**（セマンティック・パート）: **U-Net 型**の Encoder-Decoder。Encoder と Decoder はそれぞれ **5 段階**。Encoder では各段で点を **1/4 にダウンサンプリング**（downsampling rate 4）し、特徴次元は段ごとに **2 倍**に増やす。Decoder では各段で **4 倍にアップサンプリング**し、特徴次元は 2 分の 1 に減らす。同一解像度の Encoder 出力と Decoder 側を **スキップ接続**で足し合わせる。
- **分類**: Encoder 部分のみを用い、最後に **Global Average Pooling** と **MLP** でクラス予測する。
- いずれも、各段では **Transition Down / Transition Up** と **Point Transformer ブロック**を組み合わせて用いる。

## Point Transformer ブロック

1 ブロックの流れは次のとおり。

1. **線形層**で特徴を写像（計算量削減のため次元を落とす場合もある）。
2. **Point Transformer Layer**: 局所領域内で Vector Attention を実行（下式）。クエリ・キー・value の線形変換（$\mathbf{W}_1, \mathbf{W}_2, \mathbf{W}_3$）と、相対位置 $\boldsymbol{\delta}_{ij}$ を attention の入力と value の両方に加える。
3. もう一つの**線形層**を通し、**残差接続**で入力を足して出力とする。

Point Transformer Layer の式（点 $i$ の出力）:

$$
\mathbf{x}_i' = \sum_{j \in \mathcal{N}(i) \cup \{i\}} \boldsymbol{\alpha}_{ij} \odot \left( \mathbf{W}_3 \mathbf{x}_j + \boldsymbol{\delta}_{ij} \right)
$$

$$
\boldsymbol{\alpha}_{ij} = \mathrm{softmax}\left( \gamma_\Theta \left( \mathbf{W}_1 \mathbf{x}_i - \mathbf{W}_2 \mathbf{x}_j + \boldsymbol{\delta}_{ij} \right) \right)
$$

$\gamma_\Theta$ は 2 層の MLP（線形 + ReLU + 線形）。attention 重み $\boldsymbol{\alpha}_{ij}$ はベクトルであり、value 側と要素積 $\odot$ でかける（Vector Attention）。

## 局所 Attention と k 近傍

全点対で Attention を取ると点数 $N$ に対して $O(N^2)$ となり、大規模点群では計算量・メモリが膨大になる。そのため、各点 $i$ について **k 近傍 (k-NN)** で得た近傍 $\mathcal{N}(i)$ と自分自身 $\{i\}$ だけを相手に Attention を計算する。本論文では **$k=16$** を用い、S3DIS などの ablation でこの値が有効であることを示している。これにより、各点は局所的な幾何・文脈を集約しつつ、層を重ねることで間接的に広い範囲の情報も得る。

## 相対位置符号化

点群では 3D 座標 $\mathbf{p}_i, \mathbf{p}_j$ がそのまま使えるため、**相対位置** $\mathbf{p}_i - \mathbf{p}_j$ を MLP $h_\Theta$（2 層線形 + ReLU）で $C$ 次元ベクトルに写し、$\boldsymbol{\delta}_{ij} = h_\Theta(\mathbf{p}_i - \mathbf{p}_j)$ とする。この $\boldsymbol{\delta}_{ij}$ を (1) **Attention の入力**（$\mathbf{W}_1 \mathbf{x}_i - \mathbf{W}_2 \mathbf{x}_j + \boldsymbol{\delta}_{ij}$ の項）と、(2) **Value 側**（$\mathbf{W}_3 \mathbf{x}_j + \boldsymbol{\delta}_{ij}$）の両方に加える。2D の Transformer のように sin/cos の固定符号化ではなく、座標差を MLP で学習可能な符号化にしている点が特徴である。

## ダウンサンプリング・アップサンプリング

- **Transition Down**: 点を減らして段を下る。**Farthest Point Sampling (FPS)** で代表点を選び、その周りを **k-NN (k=16)** でグループ化。各グループ内の特徴を MLP（線形 + BatchNorm + ReLU）で変換し、**Max Pooling** で 1 点に集約する。これで点数が約 1/4 になり、次の Point Transformer ブロックへ渡す。
- **Transition Up**: 段を上る。入力を線形 + BatchNorm + ReLU で変換し、**トリリニア補間**などで Encoder 側の点位置へアップサンプリングする。対応する Encoder のスキップ接続と**加算**して、次のブロックへ渡す。これにより、粗いスケールの情報と細かいスケールの情報が融合する。

# memo
Positional encodingは周囲k個の点との相対関係を示しており、空間内での絶対的位置はEncodingされていない。この点で正弦波のPositional Encoderと異なる。