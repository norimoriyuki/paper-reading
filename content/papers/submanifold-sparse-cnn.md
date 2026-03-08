---
title: "3D Semantic Segmentation with Submanifold Sparse Convolutional Networks"
authors: ["Benjamin Graham", "Martin Engelcke", "Laurens van der Maaten"]
year: 2018
venue: "CVPR"
url: "https://openaccess.thecvf.com/content_cvpr_2018/papers/Graham_3D_Semantic_Segmentation_CVPR_2018_paper.pdf"
tags: ["3D", "Point Cloud", "Semantic Segmentation", "Sparse Convolution", "Submanifold", "SSCN", "Voxel"]
readAt: "2026-03-08"
oneLiner: "スパースな3Dデータ用に活性サイトを広げない Submanifold Sparse Convolution を提案し、深いネットで高精度な3Dセマンティックセグメンテーションを実現"
editor: "morix"
---

# 概要

3D 点群やボクセルは**空間的にスパース**なデータだが、従来のスパース畳み込みは層を重ねるごとに「活性サイト」が広がり（**submanifold dilation**）、計算・メモリが膨らむ問題があった。本論文では**Submanifold Sparse Convolution (SSC)** を定義し、**出力を「入力で活性だったサイトのみ」に制限**することで、層を重ねてもスパース性を保つ。これにより ResNet や DenseNet のような深いネットワークを 3D スパースデータに適用可能にし、**Submanifold Sparse Convolutional Networks (SSCN)** として FCN や U-Net 風の構造で 3D セマンティックセグメンテーションを行う。

---

# スパース性の定義と dilation 問題

- **入力の表現**: $d$ 次元畳み込みネットの入力は特徴の次元が増えた $(d+1)$ 次元テンソルである。特徴はボクセルに含まれる点の密度を含む。各格子点を**サイト**、そのサイトの特徴ベクトルが非ゼロ（ground state でない）のとき**活性 (active)** と定義する。
- **従来のスパース畳み込みでの活性の伝播**: 隠れ層のサイトは「その受容野内に 1 つでも活性入力があれば」活性になる（帰納的定義）。サイズ 3 の畳み込みなら 1 層で $3^d$、2 層で $5^d$ と活性サイトが増える → **submanifold dilation**。
- 深いネットでは活性サイトが爆発し、計算・メモリが現実的でなくなる。

# Sparse Convolution (SC) と Submanifold Sparse Convolution (SSC)

- **$\mathrm{SC}(m,n,f,s)$**: 入力 $m$ チャネル、出力 $n$ チャネル、カーネルサイズ $f$、ストライド $s$。出力の活性は「受容野内に 1 つでも活性入力があれば」活性（通常のスパース畳み込み）。**非活性サイトの入力は 0 とみなす**ことで計算量を約半分に削減。
- **$\mathrm{SSC}(m,n,f)$**: $\mathrm{SC}(m,n,f,s=1)$ の変種。**出力サイトが活性になる条件を「入力の対応するサイト（受容野の中心）が活性のときのみ」に制限** → 層を重ねても活性のパターンのスパース性維持。

# その他の演算

- **活性に限定した演算**: ReLU、BatchNorm は活性サイトのみに適用。
- **Pooling**: MaxとAverage
- **Deconvolution $\mathrm{DC}(\cdot,\cdot,f,s)$**: 対応する $\mathrm{SC}(\cdot,\cdot,f,s)$ の逆

# 実装（Rule book と Hash table）

## 1 層の状態の持ち方

- **ハッシュテーブル**: 各活性サイトについて (座標のタプル, 行番号) のペア。座標は整数 $(i_1,\ldots,i_d)$ で、行番号は特徴行列の何行目かを示す。実装には [sparsehash](https://github.com/sparsehash/sparsehash) を使用。
- **特徴行列**: サイズ $a \times m$（活性サイト数 $a$ × 入力チャネル数 $m$）。非活性サイトは行列に含めず、メモリに持たない。

### Rule book の定義と役割

- **定義**: フィルタの空間オフセット $F = \{0,1,\ldots,f-1\}^d$ ごとに、整数行列 $R_i$ を $f^d$ 個用意。これらをまとめて **rule book** $R = (R_i : i \in F)$ と呼ぶ。
- **各 $R_i$ の行**: $(j, k)$ のペア。$j$ は入力側の行番号（入力のどの活性サイトか）、$k$ は出力側の行番号。「入力サイト $j$ が、出力サイト $k$ の受容野内でオフセット $i$ の位置にある」という接続を表す。

### SC の実装アルゴリズム

1. **ハッシュと Rule book の構築**: 入力ハッシュを 1 回走査。入力層の各点と、それが「見える」出力層の各点を列挙。出力サイトを初めて訪れたら出力ハッシュに追加。各活性入力 $x$ が出力 $y$ の受容野内でオフセット $i$ にあるとき、$R_i$ に行（$x$ の行番号, $y$ の行番号）を追加。
2. **畳み込み計算**: 出力行列を 0 で初期化。各 $i \in F$ に対しパラメータ $W^i \in \mathbb{R}^{m \times n}$ を用意。$R_i$ の各行 $(j,k)$ について、入力の $j$ 行目に $W^i$ をかけた結果を出力の $k$ 行目に加算。

## SSC の実装と効率

- **ハッシュの再利用**: SSC では入出力の活性パターンが同じなので、**入力のハッシュテーブルをそのまま出力にも使う**。Rule book も、pooling や strided convolution に当たるまで**同じものを再利用**できる。

### 全体の計算コスト

- ハッシュテーブル構築: $O(a)$。活性点数に線形。
- FCN / U-Net では、ダウンサンプリングで活性サイト数が乗法的に減るため、全層のハッシュ・rule book 構築の合計も $O(a)$ となり、ネットワークの深さに依存しない。

---

# 入力のボクセル化

## ShapeNet 用の前処理

- 点群を中心化し、直径 $S$ の球に収まるようにスケール。$S \in \{16, 32, 48\}$。$S=48$ では約 99% が空ボクセル。
- **グリッド配置**: Dense ネットでは球をサイズ $S$ のグリッドに置く。SSCN では**グリッドサイズ $4S$** に置く（より細かい格子でボクセル化）。
- **ボクセル化**: 各ボクセルに含まれる点の数を計測し、非空ボクセルの**平均密度が 1 になるように正規化**。これにより「サイト = ボクセル」「活性 = 点が 1 つ以上含まれるボクセル」となり、SSC/SC の入力として扱える。

## RGB-D（NYU Depth）用の拡張

- 深度から 3D 点群へ変換。各点の特徴は 4 次元: RGB（$[-1,1]$ に正規化）+ **indicator 特徴**（常に 1）。indicator は「ボクセルが活性だが RGB がすべて 0」のケースを区別するため。
- ボクセル化前に点群を 1/2 にスケール。各ボクセルの特徴は、そのボクセルに属する点の特徴の**平均**とする。