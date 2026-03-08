---

title: "Point-BERT: Pre-Training 3D Point Cloud Transformers With Masked Point Modeling"
authors: ["Xumin Yu", "Lulu Tang", "Yongming Rao", "Tiejun Huang", "Jie Zhou", "Jiwen Lu"]
year: 2022
venue: "CVPR"
url: "https://arxiv.org/abs/2111.14819"
tags: ["3D", "Point Cloud", "Self-supervised Learning", "BERT", "Masked Point Modeling", "Transformer", "Pre-training", "dVAE"]
readAt: "2026-03-08"
oneLiner: "点群を離散トークン化し BERT 風マスク予測で事前学習する純粋 Transformer"
editor: "morix"
---
# 概要

**BERT の概念を 3D 点群に拡張**し、標準的な点群 Transformer を事前学習

- **Masked Point Modeling (MPM)**: 点群を **局所パッチ** に分割し、**離散 Variational AutoEncoder (dVAE)** で各パッチを **離散点トークン** に変換する。入力の一部パッチをランダムにマスクし、バックボーンの Transformer に渡し、**マスク位置の元の点トークンを復元する** ことを事前学習の目的とする。画像の MAE と異なり、再構成ターゲットは連続座標ではなく **Tokenizer（dVAE）が出力する離散トークン** である。
- **純粋 Transformer**: 人手の設計や強い帰納バイアスを抑え、**標準的な点群 Transformer** を事前学習で強化する。
- **他タスクへの転移**: 学習した表現は few-shot 点群分類などにも転移し、SOTA を更新している。

コード: [Point-BERT](https://github.com/lulutang0608/Point-BERT)


# 提案手法

## 処理のフロー

**1. 入力**  
点群 $\mathbf{p} \in \mathbb{R}^{N \times 3}$（$N$ 点、座標のみ）。

**2. パッチ化**  
Farthest Point Sampling（FPS）で $g$ 個の中心をサンプルし、各中心から KNN で $n$ 近傍を取って $g$ 個の局所パッチ（サブクラウド）$\{p_i\}_{i=1}^g$ に分割。各パッチは**中心座標を引いて正規化**し、構造パターンと絶対位置を分離する。

**3. 埋め込み**  
各パッチを **mini-PointNet**（2 層 MLP + global max pooling）で 1 本のベクトルに写し、点埋め込み $\{f_i\}_{i=1}^g$ を得る。

**4. 正解トークン（事前に学習済みの dVAE で取得）**  
各パッチ $p_i$ をトークナイザ $\mathcal{Q}_\phi(z|p)$ で離散トークン $z_i$ に変換。これがマスク位置の**正解ラベル**になる。dVAE は MPM 事前学習の**前**に別途学習し、**固定**して用いる。

**5. マスキング**  
入力の **block-wise** にマスク（ある中心パッチとその近傍 $m$ パッチをまとめてマスク）。マスク率 $r$ に応じて $\lfloor rg \rfloor$ 位置をマスクし、マスク位置の集合 $\mathcal{M}$ を得る。

**6. 埋め込みの組み立て**  
可視位置 $i \notin \mathcal{M}$ では $x_i = f_i + pos_i$（点埋め込み + 位置埋め込み、同次元で加算）。マスク位置 $i \in \mathcal{M}$ では **学習可能なマスク埋め込み $\mathbf{E}[\mathrm{M}]$** に **位置埋め込み $pos_i$ はそのまま足す**。さらに先頭に **クラストークン $\mathbf{E}[\mathrm{s}]$** を付与。入力系列は $H^0 = \mathbf{E}[\mathrm{s}], x_1, \ldots, x_g$（マスク済み）。

**7. バックボーン Transformer**  
上記入力を **標準 Transformer エンコーダ**（multi-head self-attention + FFN、$L$ 層）に通す。出力は $H^L = h_{\mathrm{s}}^L, h_1^L, \ldots, h_g^L$。

**8. マスク位置の予測**  
マスク位置 $i \in \mathcal{M}$ に対応する出力 $h_i^L$ から、語彙 $\mathcal{V}$（サイズ $N$）上の**離散トークン**を予測（分類）。

**9. 損失**  
マスク位置における**正解離散トークン $z_i$**（dVAE が生成）との **負の対数尤度（クロスエントロピー）** を最小化。式では $\max \sum_{\mathbf{X}} \mathbb{E}*{\mathcal{M}}[\sum*{i \in \mathcal{M}} \log \mathcal{P}(z_i | \mathbf{X}^{\mathcal{M}})]$。加えて **Point Patch Mixing**（2 サンプルのパッチを混ぜた仮想サンプルでも同様に MPM）と **MoCo による対比学習**を補助タスクとして用い、局所幾何と高レベル意味の両方を学習する。

## 点群のパッチ化

- 入力点群 $\mathbf{p} \in \mathbb{R}^{N \times 3}$ に対し、**Farthest Point Sampling (FPS)** で $g$ 個の中心点を選び、**K 近傍 (KNN)** で各中心から $n$ 点を取って $g$ 個の局所パッチ $\{p_i\}_{i=1}^g$ を構成。各パッチ内の点は**中心座標を引いた相対座標**で表現し、絶対位置と局所形状を分離する。これにより言語や画像と同様に、サブクラウドを単位として扱える。

## トークナイザ（dVAE）

- *dVAE: 点群用Vocabularyを作成。「パッチ → 離散トークン（vocabulary ID）」の写像を学習する。**エンコーダ $\mathcal{Q}_\phi(z|p)$** はパッチ（または point embedding）を vocabulary $\mathcal{V}$ 上の離散トークン $z \in 1,\ldots,N$ に写す。**デコーダ $\mathcal{P}_\varphi(p|z)$** は離散トークン $z$ からパッチ（点群）を再構成する。学習は点群再構成の ELBO 最大化**。潜在が離散なので **Gumbel-softmax** で勾配を通し、一様事前を仮定する。dVAE は Masked Point Modeling（MPM） の**前**に学習し、MPM 事前学習時は**重みを固定**して ground truth token のみ生成する。



- **エンコーダ（Tokenizer）**: 入力は 256 次元（point embedding 64 次元を線形層で 256 に拡張）。**4 層 DGCNN**（でパッチ間の関係をモデル化し、最後に全パッチの表現をまとめて Linear で **8192 次元**（vocabulary size $N$、ハイパーパラメータ）の logits に写す。推論時は
$$ z_i = \arg\max_{k \in 1,\ldots,N}  \log \mathcal{Q}*\phi(z=k \mid p_i), \quad z_i \in 1,\ldots,N. $$
学習時は離散なので **Gumbel-softmax** で $\mathcal{Q}*\phi(z|p_i)$ を連続緩和し、温度 $\tau$ を 1 から 0.0625 に 100k ステップで cosine 減衰させる。
- **デコーダ**: トークン $z_i$ を **codebook**（学習可能な $N \times 256$ の embedding）で 256 次元ベクトル $e_{z_i}$ に写す。続けて **4 層 DGCNN**（128→256→512→512→1024）+ Linear(2304→256) + **MLP** + **FoldingLayer**（2D グリッドを入力に 3D 点群を生成）で再構成パッチ $\hat{p}_i$ を出力する：
$$ \hat{p}*i = \mathcal{P}*\varphi(p \mid z_i). $$
- **再構成損失**: $\ell_1$ 型 Chamfer Distance
$$ d_{CD}^{\ell_1}(\mathcal{P},\mathcal{G}) = \frac{1}{|\mathcal{P}|}\sum_{p \in \mathcal{P}} \min_{g \in \mathcal{G}} p - g + \frac{1}{|\mathcal{G}|}\sum_{g \in \mathcal{G}} \min_{p \in \mathcal{P}} g - p, $$
ここで $\mathcal{P}$ は予測点集合、$\mathcal{G}$ は正解点集合。
- **dVAE の目的関数**:
$$ \mathcal{L}*{\text{dVAE}} = d*{CD}^{\ell_1}(\mathcal{P}*{fine},\mathcal{G}) + d*{CD}^{\ell_1}(\mathcal{P}*{coarse},\mathcal{G}) + \alpha \mathcal{L}*{KL}. $$
$\mathcal{L}_{KL}$ は予測トークン分布と一様事前の KL divergence。

## マスキングと埋め込み

- **block-wiseマスク**: BERT や MAE の**ランダムマスク**ではなく、ある中心パッチ $c_i$ とその**近傍 $m$ 個のサブクラウド**をまとめてマスクし、連続した局所領域を隠す。実験では **25%〜45%** をマスク。
- **可block-wise マスク視パッチ（マスクされていないパッチ）の埋め込み**: 各パッチ $p_i$ を mini-PointNet で点埋め込み $f_i$ に写す。**位置埋め込み**はパッチの**中心座標 $c_i$** を MLP で埋め込み次元に写した $pos_i$。入力埋め込みは $x_i = f_i + pos_i$。
- **マスクトークン**: マスクした位置 $i \in \mathcal{M}$ では、点埋め込み $f_i$ を**同じ学習可能なマスク埋め込み $\mathbf{E}[\mathrm{M}]$** で置き換える。**位置埋め込み $pos_i$ はそのまま付与**する（$\mathbf{E}[\mathrm{M}] + pos_i$）。これにより位置情報は残しつつ、中身だけを隠す。
- **クラストークン**: Transformer の入力先頭に **$\mathbf{E}[\mathrm{s}]$**（クラストークン）を付加。出力の $h_{\mathrm{s}}^L$ がグローバル表現として分類などに使われる。マスクした入力は $\mathbf{X}^{\mathcal{M}} = x_i : i \notin \mathcal{M} \cup \mathbf{E}[\mathrm{M}]+pos_i : i \in \mathcal{M}$ にクラストークンを付けた系列である。

## バックボーン Transformer と MPM 目的

- **エンコーダの入力・出力**: 入力は $H^0 = \mathbf{E}[\mathrm{s}], x_1, \ldots, x_g$（HはHidden、EはEmbeddingの頭文字）。**標準 Transformer**（multi-head self-attention + FFN）を $L$ 層重ねる。出力 $H^L = h_{\mathrm{s}}^L, h_1^L, \ldots, h_g^L$ のうち、$h_i^L$ がパッチ $i$ の符号化表現。実験では **depth 12、次元 384、6 ヘッド**。Stochastic depth（drop path）を 0.1 で適用。
- **実装**  
**Multi-Head Self-Attention**: 入力を Query $Q$、Key $K$、Value $V$ に写し、
$$ \text{MultiHead}(Q,K,V) = W^o  \text{Concat}(\text{head}_1, \ldots, \text{head}_h), $$
$$ \text{head}_i = \mathrm{softmax}\left( \frac{Q W_i^Q (K W_i^K)^\top}{\sqrt{d_k}} \right) V W_i^V. $$
$W_i^Q, W_i^K, W_i^V$ は各ヘッド用の線形射影、$d_k$ はキー次元、$W^o$ は出力の線形層。
各ブロックでは LayerNorm → Multi-Head Attention → 残差 → LayerNorm → **FFN**（2 層線形 + ReLU + dropout）→ 残差。
- **マスク位置の離散トークン予測**: マスク位置 $i \in \mathcal{M}$ について、$h_i^L$ から語彙 $\mathcal{V}$ 上の確率分布 $\mathcal{P}(z_i | \mathbf{X}^{\mathcal{M}})$ を出力し、**正解トークン $z_i$**（dVAE がパッチ $p_i$ から生成）との **クロスエントロピー**で学習。目的は $\max \sum_{\mathbf{X}} \mathbb{E}*{\mathcal{M}}[\sum*{i \in \mathcal{M}} \log \mathcal{P}(z_i | \mathbf{X}^{\mathcal{M}})]$。
- **補助タスク**: **(1) Point Patch Mixing** — 2 つの点群からパッチを混ぜて仮想サンプルを作り、そのマスク位置でも元のサンプルに対応するトークンを予測させる（CutMix 的）。絶対位置を正規化しているため、パッチの混ぜ合わせが容易。**(2) 対比学習 (MoCo)** — 混ぜたサンプルの特徴 $q$ を、元の 2 サンプルの特徴 $k_1^+$, $k_2^+$ に近づける。混ぜ比 $r$ に応じた重み付きで、高レベル意味の学習を補助する。
- **Point-MAE との違い**: Point-MAE はマスクした**パッチの座標（連続値）を再構成し、L2 Chamfer Distance で学習する。Point-BERT はマスクした位置の離散トークン（語彙 ID）を予測し、クロスエントロピーで学習する。つまり「何番目の幾何パターンか」を当てる分類**であり、連続再構成ではない。

# 実験方法と結果

## 事前学習

- **データ**: **ShapeNet**（55 クラス、50,000 以上の 3D モデル）。各サンプルで **1024 点** をサンプルし、**64 パッチ**（各パッチ **32 点**）に分割。mini-PointNet で各パッチを **64 次元**の点埋め込みに写す。この埋め込みを dVAE と Transformer の両方の入力に用いる。
- **dVAE**: 語彙サイズ **8192**。エンコーダは **4 層 DGCNN**、デコーダは **DGCNN + FoldingNet**。再構成損失は **$\ell_1$ Chamfer Distance**。離散潜在のため Gumbel-softmax を用い、温度を 1 から 0.0625 に 100k ステップで減衰。KLD 重みは最初 10k ステップで 0、その後 100k ステップで 0.1 まで増加。150k ステップ、バッチ 64、学習率 0.0005、cosine schedule、warmup 60k。
- **MPM 事前学習**: Transformer は **12 層、次元 384、6 ヘッド**。Tokenizer（dVAE）は**固定**。マスク率 **25%〜45%**。**300 エポック**、バッチ 128、AdamW（学習率 0.0005、weight decay 0.05）。MoCo はメモリバンク 16,384、温度 0.07、momentum 0.999。

## ダウンストリーム評価

- **物体分類 — ModelNet40**: 入力 1k 点で **93.2%**、4k 点で **93.4%**、8k 点で **93.8%**（標準 Transformer ベースで SOTA）。スクラッチの標準 Transformer（91.4%）を上回り、OcCo 事前学習（92.1%）や PCT / Point Transformer などの専用設計モデルとも競合以上。
- **物体分類 — ScanObjectNN**: 実世界スキャン・難設定で **83.1%** を報告（当時 SOTA）。
- **Few-shot 分類（ModelNet40）**: 5-way 10-shot / 20-shot、10-way 10-shot / 20-shot で、DGCNN-OcCo や Transformer-OcCo を上回る。
- **パートセグメンテーション**: 事前学習した Point-BERT をバックボーンに用いた場合、ベースラインより向上することを報告。

## Ablation・分析

- **マスク率**: 25%〜45% の範囲で block-wise マスクを変えて評価し、適度なマスク率の有効性を分析。
- **トークナイザ（dVAE）の有無**: 離散トークンによる MPM と、トークナイザなしの設定を比較し、dVAE による語彙化の効果を示す。
- **事前学習の有無**: スクラッチの Transformer と Point-BERT 事前学習後の fine-tuning を比較。事前学習により精度が大きく向上することを示す。

