---
title: "Point Transformer V2: Grouped Vector Attention and Partition-based Pooling"
authors: ["Xiaoyang Wu", "Yixing Lao", "Li Jiang", "Xihui Liu", "Hengshuang Zhao"]
year: 2022
venue: "NeurIPS"
url: "https://arxiv.org/abs/2210.05666"
tags: ["3D", "Point Cloud", "Transformer", "Self-Attention", "Semantic Segmentation"]
readAt: "2026-03-04"
oneLiner: "Grouped Vector Attention と partition-based pooling で効率・性能を向上"
editor: "morix"
---

# 概要

Point Transformer (V1) を前提に、本論文は **Point Transformer V2** として、V1 の限界を補う 3 つの設計を提案している。

**提案の新規性**

1. **Grouped Vector Attention**  
   V1 の Vector Attention はチャンネル数・層が増えると過学習しやすく、パラメータも増大する。V2 では Vector Attention を **グループに分割**し、グループ内で重みを共有する **Grouped Vector Attention** を導入する。学習可能な重み符号化と Multi-Head Attention の両方の利点を保ちつつ、パラメータ効率と表現力のバランスを改善した。

2. **位置符号化の強化（Position Encoding Multiplier）**  
   3D 点群では位置関係が 2D より重要であるとして、**関係ベクトルに位置符号化を乗算する**項を追加し、Attention における位置情報を明示的に強めている。

3. **Partition-based Pooling**  
   V1 の FPS + k-NN に代えて、**パーティション（空間分割）に基づく軽量なプーリング**を採用する。空間的な整列がしやすく、サンプリングも効率化される。

# モデル構造

![PTv1 と PTv2 のアテンション機構の比較（左）、および通常のプーリング/アンプーリングと Partition-based のプーリング/アンプーリング（右）](/papers/point-transformer-v2/model_architecture.png)

## 全体構成（V1 との関係）

全体の骨格は V1 と同様、**U-Net 型の Encoder-Decoder**（セグメンテーション）および **Encoder のみ + Global Pooling + MLP**（分類）を採用している。各段は「ダウンサンプリング／アップサンプリング用のプーリング」と「Attention ブロック」の組み合わせで構成される。V2 では (1) Attention ブロックを **Grouped Vector Attention** に差し替え、位置符号化に **Position Encoding Multiplier** を追加し、(2) ダウン／アップサンプリングを **Partition-based Pooling** に置き換えている。つまり、V1 の Point Transformer ブロックと Transition Down / Up が、それぞれ V2 用のブロックと Partition-based のプーリングに置き換わった形である。

## Grouped Vector Attention

V1 の Vector Attention はチャンネル数 $C$ が大きいほどパラメータが増え、深いモデルでは過学習しやすかった。V2 では $C$ 次元のチャンネルを **$G$ 個のグループ**に分割し、**グループごとに** Vector Attention を計算する。グループ内では同じ重み（Grouped weight encoding layer）を共有するため、パラメータ数は抑えられる。一方で、複数グループが並列に動くことで、Multi-Head Attention と同様に複数の表現サブスペースを扱える。

**具体的な計算**  
関係ベクトル $\mathbf{r}_{ij} \in \mathbb{R}^C$（V2 では $\mathbf{r}_{ij} = (\mathbf{W}_1 \mathbf{x}_i - \mathbf{W}_2 \mathbf{x}_j) + \boldsymbol{\delta}_{ij} \odot \mathbf{m}_{ij}$ など）を **$G$ 個のブロック**に分割し、$g$ 番目のブロックを $\mathbf{r}_{ij}^{(g)} \in \mathbb{R}^{C/G}$ とする。**Grouped weight encoding** では、**同じ** MLP $\gamma_\Theta : \mathbb{R}^{C/G} \to \mathbb{R}^{C/G}$ を全グループで共有し、各グループで

$$
\boldsymbol{\alpha}_{ij}^{(g)} = \mathrm{softmax}\left( \gamma_\Theta \bigl( \mathbf{r}_{ij}^{(g)} \bigr) \right)
$$

とする。V1 では $\gamma_\Theta$ が $\mathbb{R}^C \to \mathbb{R}^C$ だったのに対し、V2 では入出力とも $C/G$ 次元の $\gamma_\Theta$ を 1 つだけ持ち、$G$ 回同じ関数を適用する。得られた $\boldsymbol{\alpha}_{ij}^{(1)}, \ldots, \boldsymbol{\alpha}_{ij}^{(G)}$ をチャンネル方向に連結して

$$
\boldsymbol{\alpha}_{ij} = \bigl[ \boldsymbol{\alpha}_{ij}^{(1)} ; \cdots ; \boldsymbol{\alpha}_{ij}^{(G)} \bigr] \in \mathbb{R}^C
$$

とする。value 側 $\mathbf{v}_{ij} = \mathbf{W}_3 \mathbf{x}_j + \boldsymbol{\delta}_{ij}$（および V2 の乗算項があれば同様）も $C$ 次元なので、集約は V1 と同じ形

$$
\mathbf{x}_i' = \sum_{j \in \mathcal{N}(i) \cup \{i\}} \boldsymbol{\alpha}_{ij} \odot \mathbf{v}_{ij}
$$

でよい。パラメータ削減は、$\gamma_\Theta$ を 1 本の「$C/G$ 次元用 MLP」にすることで実現している（V1 の $C$ 次元用 1 本より少ない）。

**$G$ のとり方**  
$G$ は**点数 $N$ には依存しない**ハイパーパラメータで、**チャンネル次元 $C$ に対する**設定である。点数に対しては $O(1)$ であり、点が増えても $G$ を変える必要はない。論文・実装では $C$ を $G$ で割り切れるようにし、1 グループあたり $C/G$ チャンネルとするのが一般的である。$G$ の具体的な値は、Multi-Head のヘッド数と同様に **8 や 16 といった小さな定数**が使われることが多く、本論文の設定は論文本文・Supplementary または公式実装（[Pointcept/PointTransformerV2](https://github.com/Pointcept/PointTransformerV2) の config）で確認できる。点数のオーダーで決めるのではなく、「チャンネルを何グループに分けるか」という表現力とパラメータ効率のトレードオフで選ばれる。

## Position Encoding Multiplier

V1 では相対位置符号化 $\boldsymbol{\delta}_{ij}$ を関係ベクトル（クエリ−キーに相当する部分）や value に**加算**していた。V2 では、位置情報をより強く効かせるため、**位置符号化を関係ベクトルに乗算する**項を追加する（Position Encoding Multiplier）。3D 点群では 2D 画像と比べて位置・幾何の情報が重要であるため、Attention の入力において位置を明示的に強調する設計である。

**具体的な計算**  
相対位置 $\Delta\mathbf{p}_{ij} = \mathbf{p}_i - \mathbf{p}_j$ から、V1 と同様に **加算用の位置符号化** $\boldsymbol{\delta}_{ij} = h_\Theta(\Delta\mathbf{p}_{ij})$（MLP $h_\Theta$ の出力）を求める。さらに V2 では、**同じ $\Delta\mathbf{p}_{ij}$ を別の MLP $g_\Theta$ に入力**し、同じ次元のベクトル $\mathbf{m}_{ij} = g_\Theta(\Delta\mathbf{p}_{ij})$ を得る。**Position Encoding Multiplier** はこの $\mathbf{m}_{ij}$ で、関係ベクトルに入れる位置項を「加算だけ」から「加算と要素ごとの乗算」に拡張する。

- **Attention の関係ベクトル（重みの入力）**:  
Position Encoding Multiplierでは**位置から 2 本の MLP**（$h_\Theta$: 加算用、$g_\Theta$: 乗算用）を出し、**$\boldsymbol{\delta} \odot \mathbf{m}$ を関係や value に足す**

  $\mathbf{r}_{ij} = (\mathbf{W}_1 \mathbf{x}_i - \mathbf{W}_2 \mathbf{x}_j) + \boldsymbol{\delta}_{ij} \odot \mathbf{m}_{ij}$  
  ここで $\odot$ は要素積。V1 では $\mathbf{r}_{ij} = (\mathbf{W}_1 \mathbf{x}_i - \mathbf{W}_2 \mathbf{x}_j) + \boldsymbol{\delta}_{ij}$ だったが、V2 では $\boldsymbol{\delta}_{ij}$ に $\mathbf{m}_{ij}$ をかけた項を足すことで、位置に応じて関係ベクトルを強く変調する。

- **Value 側**でも、同様に $\boldsymbol{\delta}_{ij} \odot \mathbf{m}_{ij}$ を value に組み込む実装が考えられる（詳細は論文・コード要確認）。



## Partition-based Pooling

V1 の **Farthest Point Sampling (FPS) + k-NN** によるダウンサンプリング・近傍構築は、点の選び方が FPS に強く依存し、空間的な整列が取りにくい面があった。V2 では **空間パーティション（空間分割）に基づくプーリング**を導入する。空間を規則的に分割し、各セル（パーティション）内の点をまとめて代表点や特徴に集約する。これにより、サンプリングが空間と対応しやすくなり、整列性と計算効率の両方を改善する。Transition Down ではこの Partition-based のダウンサンプリングで点数を減らし、Transition Up では対応するアップサンプリングとスキップ接続で解像度を戻す。

**立体の切り方**  
3D 空間は **ボクセルグリッド（各軸を等間隔に区切った直方体セル）** で分割する。各軸ごとの分割数 $n_x, n_y, n_z$ を決め、全体のパーティション数は $n_x \times n_y \times n_z$ となる。軸対称性は前提としないため、**総数が三乗根で整数になる必要はない**。実装では「解像度（voxel size）」や「各軸の分割数」で指定し、点の座標から所属セルを求め、セル内で集約する。なお、前節の **$G=16$ は Grouped Vector Attention のグループ数**であり、空間パーティションの個数とは別である。

## V2 ブロックの流れ

Point Transformer V2のブロックあたりの処理：
(1) 入力を線形層で写像（必要に応じて次元調整）
(2) **Grouped Vector Attention** を適用する。ここで、クエリ・キー・value の関係ベクトルに **Position Encoding Multiplier** をかけた上で、グループごとの Vector Attention で重みを計算し、value を集約する。
(3) 出力に **Layer Normalization** と **残差接続**を施す。
(4) 必要に応じてさらに線形層や FFN を挟む。V1 ブロックと同様に残差で安定化しつつ、Grouped Vector Attention と位置乗算がブロックの中心となる。