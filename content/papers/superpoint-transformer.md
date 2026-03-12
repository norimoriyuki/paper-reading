---
title: "Efficient 3D Semantic Segmentation with Superpoint Transformer"
authors: ["Damien Robert", "Hugo Raguet", "Loic Landrieu"]
year: 2023
venue: "ICCV"
url: "https://arxiv.org/abs/2306.08045"
tags: ["3D", "Point Cloud", "Semantic Segmentation", "Superpoint", "Transformer", "Efficiency"]
readAt: "2026-03-10"
oneLiner: "階層的スーパーポイント＋マルチスケール Transformer で大規模 3D セマンティックセグメンテーションを軽量・高速に"
editor: "morix"
---

# 概要

**スーパーポイントベースの Transformer** で、大規模 3D シーンのセマンティックセグメンテーションを**少パラメータ・短学習時間**で行う手法（ICCV 2023）。点群をまず**階層的スーパーポイント**に分割し、**点ではなくスーパーポイント単位**で Transformer の self-attention を複数スケールにかけることで、大規模シーンを扱いながら SOTA に近い精度を実現している。

- **階層的スーパーポイント分割**: 点群を**階層的なスーパーポイント構造**に分割する**高速アルゴリズム**を導入。既存のスーパーポイントベース手法と比べて**前処理が約 7 倍高速**としている。この分割により、点の数ではなくスーパーポイント数で attention を計算するため、計算量を抑えつつ広い文脈を扱える。

- **マルチスケール Transformer**: 複数スケールのスーパーポイント間で **self-attention** を適用し、スーパーポイント同士の関係をモデル化する。階層構造を活かしてスケール間の情報を統合し、セマンティックセグメンテーションの予測を行う。

- **効率**: **パラメータ数は約 21.2 万**で、同等性能の他 SOTA と比べて**最大約 200 倍コンパクト**。**S3DIS の 1 fold を 1 GPU で約 3 時間**で学習でき、最高性能の他手法と比べて **7〜70 倍少ない GPU 時間**で済むと報告している。

- **ベンチマーク**: **S3DIS** で 6-fold 検証 **mIoU 76.0%**、**KITTI-360** で Val **63.5%**、**DALES** で **79.6%** と、3 データセットで SOTA クラスの性能を達成している。

コード: [GitHub (drprojects/superpoint_transformer)](https://github.com/drprojects/superpoint_transformer)

# 提案手法

全体は **（1）階層的スーパーポイント分割（前処理）→（2）スーパーポイント埋め込み →（3）マルチスケール Transformer →（4）点ラベルへのデコード** の 4 段階である。以下、実装に必要な記号と数式をまとめる。

---

## 1. 入出力と記号

- **入力**: 点群 $\mathcal{P} = \{p_i\}_{i=1}^N$。各 $p_i \in \mathbb{R}^{3+d}$ は座標（と任意の属性、例: RGB）。
- **出力**: 各点のセマンティックラベル $\hat{y}_i \in \{1,\ldots,C\}$（$C$ はクラス数）。
- **スーパーポイント**: 点の集合の分割。レベル $\ell$ では $\mathcal{S}^{(\ell)} = \{S_1^{(\ell)},\ldots,S_{n_\ell}^{(\ell)}\}$ で、$\bigcup_k S_k^{(\ell)} = \mathcal{P}$ かつ互いに素。各 $S_k^{(\ell)}$ を「レベル $\ell$ の 1 個のスーパーポイント」と呼ぶ。
- **階層**: レベル $0$（最も細かい）から $L$（最も粗い）まで。子–親対応を $S_k^{(\ell)} \subseteq S_{k'}^{(\ell+1)}$ で表す（レベル $\ell$ のスーパーポイントがレベル $\ell+1$ の 1 つに含まれる）。

---

## 2. 階層的スーパーポイント分割（前処理）

目的は、点群を**幾何的に一様な塊**にまとめ、かつ**複数解像度**の階層を作ることである。論文では既存のスーパーポイント手法（例: SPG の oversegmentation）より**約 7 倍高速**なアルゴリズムで、**階層的**な分割を一度に得るとしている。

**「幾何的に一様」に分ける典型的なやり方**

スーパーポイント（supervoxel）では、**法線・曲率・局所形状**が似ている点を同じ塊にまとめる。

- **(1) ボクセル化＋マージ**: 点群をボクセル化し、隣接ボクセル同士で法線や色の差が小さいときだけ**マージ**（領域成長）する。
- **(2) グラフ分割**: 点やボクセルをノード、隣接を辺とするグラフで、辺の重みを「幾何の類似度」にし、最小カットやクラスタリングで分割する。SPG では幾何的 primitives への分割に **$\ell_0$-cut pursuit** のような最適化を使う。
- **(3) 学習ベース**: 点の局所近傍から埋め込みを学習し、埋め込みが近い点を同じスーパーポイントにまとめる。

いずれも「平面・球面など単純な形の塊」ができるようにし、物体境界では塊が分かれるようにする。

- **与えるもの**: 点群 $\mathcal{P}$、レベル数 $L+1$、各レベルの粗さ（例: 目標スーパーポイント数やボクセルサイズ）。
- **得るもの**:
  - 各レベル $\ell$ の分割 $\mathcal{S}^{(\ell)}$（各点 $p_i$ の所属ラベル $s_i^{(\ell)} \in \{1,\ldots,n_\ell\}$ でもよい）。
  - 隣接関係: レベル $\ell$ で「隣接する」スーパーポイント対の集合 $\mathcal{E}^{(\ell)}$（共通境界や距離閾値で定義）。必要に応じて親子リンク $S_k^{(\ell)} \mapsto S_{k'}^{(\ell+1)}$。

実装時は、**ボクセル化＋領域成長**や**段階的マージ**などで、複数スケールの oversegmentation を一度に計算する。ポイントは「点ごとではなくスーパーポイント単位で後段を扱う」ことで、$n_\ell \ll N$ なので計算量が削減される。

---

## 3. スーパーポイントの埋め込み

レベル $\ell$ の各スーパーポイント $S_k^{(\ell)}$ を、ベクトル $\mathbf{f}_k^{(\ell)} \in \mathbb{R}^D$ に写す。

**手順（典型）**:
1. 各点 $p_i$ に 1 層以上の MLP を適用して点特徴 $\mathbf{h}_i \in \mathbb{R}^{d'}$ を得る（必要なら座標正規化や相対座標を入力に含める）:
   $$
   \mathbf{h}_i = \mathrm{MLP}_{\mathrm{point}}(p_i).
   $$
2. スーパーポイント $S_k^{(\ell)}$ に属する点の特徴を**プーリング**（平均または max）して 1 ベクトルにする:
   $$
   \mathbf{f}_k^{(\ell)} = \mathrm{Pool}\bigl(\{\mathbf{h}_i : p_i \in S_k^{(\ell)}\}\bigr) \in \mathbb{R}^{d'}.
   $$
3. 必要なら MLP で次元を $D$ に揃える:
   $$
   \mathbf{x}_k^{(\ell)} = \mathrm{MLP}_{\mathrm{sp}}(\mathbf{f}_k^{(\ell)}) \in \mathbb{R}^D.
   $$

これでレベル $\ell$ の「トークン」$\{\mathbf{x}_1^{(\ell)},\ldots,\mathbf{x}_{n_\ell}^{(\ell)}\}$ が得られる。位置情報を使う場合は、スーパーポイントの重心などを用いた**位置エンコーディング** $\mathbf{pe}_k^{(\ell)}$ を加え、$\mathbf{z}_k^{(\ell)} = \mathbf{x}_k^{(\ell)} + \mathbf{pe}_k^{(\ell)}$ を Transformer の入力にする。

---

## 4. マルチスケール Transformer

各レベル（および必要ならレベル間）で、スーパーポイントをトークンとする **self-attention** をかける。

**単一ヘッドの self-attention**（レベル $\ell$、トークン $\mathbf{z}_1^{(\ell)},\ldots,\mathbf{z}_{n_\ell}^{(\ell)}$）:
$$
\mathbf{Q}_k = \mathbf{W}_Q \mathbf{z}_k^{(\ell)}, \quad \mathbf{K}_j = \mathbf{W}_K \mathbf{z}_j^{(\ell)}, \quad \mathbf{V}_j = \mathbf{W}_V \mathbf{z}_j^{(\ell)},
$$
$$
\mathrm{Attention}(\mathbf{z}_k) = \sum_{j=1}^{n_\ell} \frac{\exp(\mathbf{Q}_k^\top \mathbf{K}_j / \sqrt{d})}{\sum_{j'=1}^{n_\ell} \exp(\mathbf{Q}_k^\top \mathbf{K}_{j'} / \sqrt{d})} \, \mathbf{V}_j.
$$

**マルチヘッド**: ヘッド数 $H$ で上を $H$ 回行い、出力を連結して線形写像:
$$
\mathrm{MultiHead}(\mathbf{z}_k) = \mathrm{Concat}(\mathrm{head}_1,\ldots,\mathrm{head}_H) \, \mathbf{W}_O.
$$

**Transformer ブロック**（1 層）:
$$
\tilde{\mathbf{z}}_k = \mathbf{z}_k + \mathrm{MultiHead}(\mathrm{LN}(\mathbf{z}_k)), \quad \mathbf{z}_k' = \tilde{\mathbf{z}}_k + \mathrm{MLP}(\mathrm{LN}(\tilde{\mathbf{z}}_k)),
$$
ここで $\mathrm{LN}$ は Layer Normalization。これを複数層・複数レベルで繰り返す。**マルチスケール**では、レベルごとに attention をかけ、上位レベルから下位レベルへ情報を渡す（例: 親スーパーポイントの特徴を子に加える）か、全レベルを 1 シーケンスにまとめて level embedding を付与し 1 本の Transformer で処理する、などの形が考えられる。

最終的にレベル 0（最も細かい）のスーパーポイント特徴 $\mathbf{z}_k^{(0)}$ を MLP でクラス数次元に写し、**スーパーポイントの logits** $\mathbf{o}_k \in \mathbb{R}^C$ を得る:
$$
\mathbf{o}_k = \mathrm{MLP}_{\mathrm{cls}}(\mathbf{z}_k^{(0)}).
$$

---

## 5. 点ラベルへのデコード

点 $p_i$ はレベル 0 のいずれか 1 つのスーパーポイント $S_{k(i)}^{(0)}$ に属する。そのスーパーポイントの logits をそのまま点に割り当てる:
$$
\hat{y}_i = \arg\max_{c} \; (\mathbf{o}_{k(i)})_c.
$$

学習時は、点ごとの交差エントロピー損失（またはクラス重み付き）を、GT ラベル $y_i$ と $\mathbf{o}_{k(i)}$ の softmax で計算すればよい。

---

## 6. 実装上のまとめ

| 段階 | 入力 | 出力 | 備考 |
|------|------|------|------|
| 階層分割 | $\mathcal{P}$ | $\mathcal{S}^{(\ell)}$, $\mathcal{E}^{(\ell)}$, 親子 | 前処理・論文の高速アルゴリズム |
| 埋め込み | $\mathcal{P}$, $\mathcal{S}^{(\ell)}$ | $\mathbf{z}_k^{(\ell)}$ | 点→MLP→Pool→MLP、+位置エンコーディング |
| Transformer | $\mathbf{z}_k^{(\ell)}$ | 更新された $\mathbf{z}_k^{(0)}$ | マルチヘッド self-attention、複数層・複数スケール |
| デコード | $\mathbf{z}_k^{(0)}$ | $\mathbf{o}_k$ → $\hat{y}_i$ | MLP_cls、点は所属スーパーポイントの logits を継承 |

Attention の計算量は点の数 $N$ ではなくレベルごとのスーパーポイント数 $n_\ell$ に比例するため、$n_\ell \ll N$ であれば大規模シーンでも扱いやすい。論文ではパラメータ約 21.2 万・1 GPU で S3DIS 1 fold を約 3 時間で学習できる効率を報告している。