---
title: "Attention Is All You Need"
authors: ["Vaswani et al."]
year: 2017
venue: "NeurIPS"
url: "https://arxiv.org/abs/1706.03762"
tags: ["NLP", "Transformer", "Attention"]
readAt: "2018-01-01"
oneLiner: "Self-attentionのみで系列を扱うTransformerを提案した論文。"
editor: "morix"
---

# 概要

従来の系列モデルは RNN や CNN に依存し、長距離依存の学習や並列化に課題があった。本論文では **Recurrence を一切使わず**、**Self-Attention** のみで入出力の依存関係を扱う Encoder-Decoder モデル **Transformer** を提案した。

主な利点は次のとおりである。

- **並列化**: 系列長にわたる計算を同時に行えるため、学習が大幅に高速化する。
- **長距離依存**: 任意の位置間を 1 ステップで結べるため、長い文でも情報が届きやすい。
- **計算量**: 層あたりの計算は $O(1)$ だが、Self-Attention 自体は系列長 $n$ に対して $O(n^2)$ となる（長文ではボトルネックになる）。

WMT 2014 英独・英仏翻訳で当時の SOTA を更新し、かつ学習コストを抑えている。

# モデル構造

## Positional Encoder

Self-Attention は単語の並び順の情報を持たないため、**位置情報** を埋め込みに足し込む。本論文では sin/cos による固定の Positional Encoding を用いる。

位置 $\mathrm{pos}$、次元インデックス $i$、モデル次元 $d_{\mathrm{model}}$ に対して、偶数次元は sin、奇数次元は cos で次のように与える。

$$
PE_{(\mathrm{pos}, 2i)} = \sin\left(\frac{\mathrm{pos}}{10000^{2i/d_{\mathrm{model}}}}\right)
$$

$$
PE_{(\mathrm{pos}, 2i+1)} = \cos\left(\frac{\mathrm{pos}}{10000^{2i/d_{\mathrm{model}}}}\right)
$$

- **pos**: 系列内の位置（0, 1, 2, …）。何単語目かを表す。
- **2i / 2i+1**: 埋め込みの次元の番号。偶数番目は sin、奇数番目は cos で役割を分けている。
- **10000^{2i/d_model}**: 次元ごとに波の周期を変えている。$i$ が大きいほど周期が長くなり、位置の「細かさ」が次元ごとに違う。

得られた位置ベクトル $PE$ は、単語埋め込み $\mathbf{x}$ に **加算** して使う：$\mathbf{x} + PE$。学習可能な埋め込みではなく固定値なので、学習パラメータは増えない。

![Positional Encoding のヒートマップ（縦軸: 位置、横軸: 埋め込み次元。低次元で高周波・高次元で低周波の sin/cos が可視化されている）](/papers/attention-is-all-you-need/positional_encoder_visualization.png)

**出典:** [Attention Is All You Need - Medium](https://medium.com/@marvelous_catawba_otter_200/attention-is-all-you-need-f9fe38d6e2fc)

## Encoder

Encoder は **$N=6$ 層**の同一構造の積み重ねである。各層は次の 2 つのサブレイヤーからなる。

1. **Multi-Head Self-Attention**  
   入力を線形変換して Query / Key / Value とし、複数ヘッドで Self-Attention を行う。本論文ではヘッド数 $h=8$、$d_k = d_v = 64$（$d_{\mathrm{model}}=512$ を $h$ で割った値）を用いている。各サブレイヤーの出力は「残差接続 + Layer Normalization」で処理する。

2. **Position-wise Feed-Forward Network (FFN)**  
   各位置に同じ 2 層 MLP を適用する。内側の次元は $d_{\mathrm{model}}=512$ から $d_{ff}=2048$ に拡張し、ReLU を挟んで再度 $d_{\mathrm{model}}$ に戻す。ここにも残差接続と Layer Normalization を適用する。

入力はまず埋め込み（語彙 × $d_{\mathrm{model}}$）とし、Positional Encoding を加算したのち、上記 6 層を通して Encoder の最終出力を得る。この出力が Decoder の各層で「Key・Value」として参照される。

## Decoder

Decoder も **$N=6$ 層**である。各層は次の 3 つのサブレイヤーからなる。

1. **Masked Multi-Head Self-Attention**  
   Decoder の入力系列に対して Self-Attention を行うが、**マスク**により位置 $i$ は位置 $1 \ldots i$ にしか attend できない（未来の位置を参照しない）。これにより自己回帰的な生成が可能になる。残差 + Layer Normalization を適用。

2. **Multi-Head Attention（Encoder 出力への Attention）**  
   Query は Decoder 側の出力、Key と Value は **Encoder の最終出力**から得る。これにより Decoder が入力系列の任意の位置を参照できる。残差 + Layer Normalization を適用。

3. **Position-wise FFN**  
   Encoder と同様の 2 層 MLP（$d_{\mathrm{model}} \to 2048 \to d_{\mathrm{model}}$ + ReLU）。残差 + Layer Normalization を適用。

Decoder の入力は、出力側の系列を 1 トークンずらして用いる（「右に 1 つシフト」したターゲット）。最終層の出力から線形層 + softmax で語彙上の確率分布を出し、次のトークンを予測する。

# 実験

**データ**: WMT 2014 English–German（約 450 万ペア）、English–French（約 3600 万ペア）。Byte-pair encoding (BPE) で語彙を共有。

**設定**: $d_{\mathrm{model}}=512$、$h=8$、$d_{ff}=2048$、dropout $0.1$。ラベル平滑化 $\varepsilon_{ls}=0.1$。Adam（$\beta_1=0.9$, $\beta_2=0.98$）と、ウォームアップ付き学習率スケジュールを使用。

**結果**:

- **WMT 2014 En–De**: テスト BLEU **28.4**（当時の既存 SOTA を上回る）。8×P100 GPU で約 3.5 日間の学習。
- **WMT 2014 En–Fr**: テスト BLEU **41.0**。大きな En–Fr データでも、従来の強力なモデルより少ない学習コストで SOTA を達成。

**その他**:

- 学習可能な Positional Embedding と固定 sin/cos の比較では、ほぼ同程度の性能。固定でも十分であることを示している。
- モデルサイズ（層数・$d_{\mathrm{model}}$・ヘッド数など）の変化に対する ablation も報告されている。Attention のヘッド数は 16 や 32 に増やしても 8 より良くならず、$d_k$ が小さくなりすぎると性能が落ちる傾向がある。
