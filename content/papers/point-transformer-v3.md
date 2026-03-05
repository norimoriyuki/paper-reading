---
title: "Point Transformer V3: Simpler, Faster, Stronger"
authors: ["Xiaoyang Wu", "Li Jiang", "Peng-Shuai Wang", "Zhijian Liu", "Xihui Liu", "Yu Qiao", "Wanli Ouyang", "Tong He", "Hengshuang Zhao"]
year: 2024
venue: "CVPR"
url: "https://arxiv.org/abs/2312.10035"
tags: ["3D", "Point Cloud", "Transformer", "Self-Attention", "Semantic Segmentation"]
readAt: "2026-03-04"
oneLiner: "Attention の細かい工夫よりスケールとシンプルさを優先"
editor: "morix"
---

![Stronger Performance: PTv3 と PTv2・FlatFormer・OctFormer・SphereFormer・MinkUNet の 16 タスクにおける性能比較（レーダーチャート）](/papers/point-transformer-v3/model_comparison.png)

# 概要

3D 大規模表現学習の知見として「スケールが性能に効く」とし、**シンプルさと効率を優先**しつつモデルを大きくする方針。

- **スケールの重視**: 細かい機構の精度より、受容野の拡大とデータ・モデル規模の拡大を優先する。近傍探索を **KNN から、特定の並びで組織した点群に対する効率的な直列化近傍マッピング**に置き換えるなど、**スケール時に効く簡略化**を採用する。
- **受容野の拡大**: 近傍点数を **16（V2 まで）から 1024** に拡大しつつ、効率を維持する設計とする。
- **効率**: PTv2 と比べて **処理速度は約 3 倍、メモリ効率は約 10 倍**の改善を報告している。

**効果**

室内・室外を含む **20 以上のダウンストリームタスク**で SOTA を達成。さらに **マルチデータセットの共同学習**により、それらの結果をさらに押し上げている。実装は [Pointcept/PointTransformerV3](https://github.com/Pointcept/PointTransformerV3)（CVPR 2024）で公開されている。

# 仮説

## 設計の原則（スケーリングとパイロット）

### 背景：3D のスケール不足と効率の壁

2D や NLP でデータ量・パラメータ数・有効受容野・計算資源といった**スケール**が進歩の要因になってきたが、3D 点群では、ドメインごとにデータの規模・多様性が限られており、スケールの面で遅れがち。3D モデルでは**精度と速度のトレードオフ**が顕著で、多くの研究が精度を優先し効率を犠牲にしてきた。それがTransformer の強みである**受容野のスケーリング**を活かしきれない一因だった。

近年、**マルチデータセットをまたいだ共同学習**（例: Point Prompt Training, PPT）により、3D でもデータスケールを拡大する試みが進み、これと相性の良い**スパース畳み込み**の成果が顕著。**点群 Transformer**は、スパース畳み込みに比べて効率が悪く、この「スケールの恩恵」を十分に受けられていなかったため、**スケーリングの観点で設計の重み付けを見直す**ことを目的に、「性能は複雑な機構よりスケールに強く支配される」と仮定。

### スケーリング原則

PTv1, PTv2では、注意重みの計算に行列積の代わりに学習可能な層や正規化を入れ、精度と安定性を優先する一方で効率を損ないがち。Stratified Transformer や Swin3D では、より複雑な相対位置符号化（RPE）で精度を上げるが、計算は重い。

スパース畳み込みはマルチデータセット学習と組み合わせることで、効率を保ったまま PTv2（スクラッチ）を上回る精度を達成。仮説：**性能はスケール（データ・モデル・受容野）に強く依存し、細部の機構よりスケールのほうが効く**。そこで、**一部の機構の精度を、シンプルさと効率と引き換えにする**ことでスケール可能にし、スケールを利かせればその犠牲は全体性能に対して無視できる、という**スケーリング原則**を採用。

### PTv2のボトルネック：順序不変性と KNN・RPE

![ptv2 latency](/papers/point-transformer-v3/ptv2_latency.png)

v2までのPTは**順序不変性（permutation invariance）** を満たすため、点群を「構造のない集合」として扱っている。PTv1 では局所構造の構築に **K 近傍（KNN）** を用い、PTv2 では KNN の利用を半分に減らしたが、**forward 時間の約 28%** を KNN が依然として占める。さらに、画像ではグリッド構造により相対位置を事前に定義できるのに対し、点群では **相対位置符号化（RPE）** のためにペアごとのユークリッド距離を計算し、学習層やルックアップテーブルで埋め込みに写す必要があり、これが **forward 時間の約 26%** を占める。**KNN と RPE を合わせると 54%**。

### Permutation invariance を破る

OctFormer や FlatFormer など、点群を**特定のパターンで並べた列（シリアライズ）**として扱う手法が現れている。PTv3では、**「点群は順序なし集合である」という前提を崩し**、点群をシリアライズして構造化する。代わりに、**局所を厳密に保存する性質はいくらか損なわれる**。しかし、スケーリング原則に立てば、そのトレードオフ（局所の正確さを少し諦めて効率とスケールを取る）は許容できる。このトレードオフを **設計の出発点** とする。

# 提案手法

## 点群のシリアライズ

### 空間充填曲線

**空間充填曲線（space-filling curve）** は、高次元の離散空間（ここでは 3D）の各格子点を、1 本の曲線の「通る順序」で一列に並べるための写像である。1 次元の添字 $s \in \mathbb{Z}_{\ge 0}$ と $n$ 次元の格子点 $\mathbf{z} \in \mathbb{Z}_{\ge 0}^n$ のあいだの全単射
$$
\varphi : \mathbb{Z}_{\ge 0} \mapsto \mathbb{Z}_{\ge 0}^n,\qquad
\varphi^{-1} : \mathbb{Z}_{\ge 0}^n \mapsto \mathbb{Z}_{\ge 0}
$$
として定義される。点群では $n=3$。実装では有限のグリッド（各軸 $0 \sim 2^m-1$ など）に限定し、$s$ と $\mathbf{z}$ を有限範囲で対応させる。

**局所性の保存**: 曲線に沿って「近い」添字同士は、もとの 3D 空間でもある程度近くにありやすい。完全には一致しないが、空間的に近い点を 1 次元の列上でも近くに並べるために使える。そのため、3D 点群の点に「曲線上の順序」を付与してソートすると、列の上で隣り合う点は多くの場合 3D でも近傍になり、KNN を使わずに「並び順で近傍」を定義できる。

**PTv3 での符号化（論文式）**: 点 $\bm{p}_i \in \mathbb{R}^3$ をグリッド幅 $g$ で量子化した格子 $\mathbf{z} = \lfloor \bm{p} / g \rfloor \in \mathbb{Z}^3$ に写し、逆写像で 1 次元コードを得る。バッチ index $b$ と合わせて 64bit にパックする式は
$$
\text{Encode}(\bm{p}, b, g) = (b \ll k) \mathbin{|} \varphi^{-1}\bigl(\lfloor \bm{p} / g \rfloor\bigr),
$$
ここで $\ll$ は左ビットシフト、$|$ はビット OR、$k$ は座標用に割り当てるビット数（例: 21bit×3 で 63bit）である。

代表的な 2 種が用いられる。

- **Z-order 曲線（Morton order）**  
  各軸の座標を非負整数 $x, y, z$（例: 各 21bit）とし、**ビットを 1 ビットずつ交互に織り交ぜる**。3D では「下位から $i$ 番目のビット組」を $(x_i, y_i, z_i) \in \{0,1\}^3$ として、1 次元コードは
  $$
  \varphi^{-1}(x,y,z) = \sum_{i\ge 0} 2^{3i}(x_i + 2y_i + 4z_i) = \sum_{i\ge 0} 8^i(x_i + 2y_i + 4z_i),\quad x_i,y_i,z_i \in \{0,1\}.
  $$
  つまり 2 進で $x,y,z$ のビットを **x の最下位 → y の最下位 → z の最下位 → x の次の桁 → …** の順に並べた整数が Morton コードである。逆にコード $s$ から座標を復元するには、$x_i = (s \gg 3i) \mathbin{\&} 1$、$y_i = (s \gg 3i+1) \mathbin{\&} 1$、$z_i = (s \gg 3i+2) \mathbin{\&} 1$ で各ビットを取り出し、$x = \sum_i x_i \cdot 2^i$ のようにまとめる。実装は for-loop で 1 ビットずつ入れる方法、マジックビット（shift+mask で 3 ビット間隔に広げる）方法、8bit 用 LUT を 3 回適用する方法などがある。2D なら四分割、3D なら八分割を再帰的にたどる「Z 字形」の走査に対応する。計算が単純で実装しやすいが、象限の境目で曲線が飛ぶため、局所性は Hilbert より劣る場合がある。

- **Hilbert 曲線**   
  Z-order より**局所性が良い**ことが知られており、空間的に近い点が 1D 順序でもまとまりやすい。その分、符号化・復号は Z-order より複雑である。3D では、各レベルで空間を $2\times2\times2$ の 8 サブキューブに分割し、**サブキューブをたどる順序**が再帰的に決まる。実装では、**回転・反転の状態テーブル**（各サブキューブに入る際の座標変換と次の状態）に従い、整数座標の各ビット（または各桁）を順に見て $s$ と $(x,y,z)$ を相互に変換する。

標準の空間充填曲線は 3D を x → y → z の順で走査するが、**軸の走査順を変えた変種**（例: y を x より先に扱う）を **Trans Z-order / Trans Hilbert** として導入し、Z-order・Hilbert・Trans Z-order・Trans Hilbert の **4 パターン** を層ごとに使い分ける。異なるパターンで異なる局所関係が強調されるため、層ごとにパターンを変える **Shift Order** と組み合わせて使う。

**詳しく理解するための文献文献**: 
本曲線の定義・性質： [Hilbert curve (Wikipedia)](https://en.wikipedia.org/wiki/Hilbert_curve)、[Z-order curve (Wikipedia)](https://en.wikipedia.org/wiki/Z-order_curve) 
実装向け：Morton 符号化は [Morton encoding/decoding through bit interleaving (forceflow)](https://www.forceflow.be/2013/10/07/morton-encodingdecoding-through-bit-interleaving-implementations/) や [libmorton](https://github.com/Forceflow/libmorton)、Hilbert は Skilling の方法（"Programming the Hilbert curve", AIP Conf. Proc.）、Hamilton “Compact Hilbert indices” (IPL 2007)、[3D Hilbert Curves (eisenwave)](https://eisenwave.github.io/voxel-compression-docs/rle/hilbert_curves.html) 

### PTv3 での使い方

**シリアライズ符号化**は、点群を「曲線順の 1 本の列」として扱うための前処理。

1. **グリッド化**: 各点の座標 $\bm{p} \in \mathbb{R}^3$ をグリッド幅 $g$ で量子化し、整数格子 $\mathbf{z} = \lfloor \bm{p} / g \rfloor \in \mathbb{Z}^3$ を得る。
2. **曲線コードの計算**: 選んだ空間充填曲線（Z-order / Hilbert など）の逆写像 $\varphi^{-1}$ で、$\mathbf{z}$ を 1 次元の整数コードに変換する。このコードが「曲線上で何番目か」を表す。
3. **64bit パック**: バッチ index $b$ と曲線コードを 1 本の 64bit 整数にまとめる（上位に $b$、下位に $\varphi^{-1}(\mathbf{z})$ を詰める）。これにより「バッチごとに曲線順」で一意にソートできる。
4. **ソート**: 全点をこの 64bit コードの昇順でソートする。ソート後の並びが、曲線に沿った直列化された点列になる（同じバッチ内では曲線順、バッチ間は $b$ で分かれる）。

**マッピングだけ記録する実装**: 論文では、点の座標や特徴を実際に並べ替えた配列は作らず、**「元の点インデックス → 曲線順での位置」**（またはその逆）の対応だけを記録する。つまり「ソートで決まる並び順」をインデックス配列（permutation）として保持する。こうすると、同じ点群に対して **Z-order / Hilbert / Trans Z-order / Trans Hilbert の 4 パターン**を切り替えるときに、点データのコピーは不要で、**パターンごとのマッピングだけ差し替えればよい**。Shift Order で層ごとに異なる曲線を使う場合も、複数種類のマッピングを事前に用意しておくだけで対応できる。

## Serialized Attention（パッチattention）

シリアライズされた点群を「構造化された列」として扱うため、画像 Transformer と同様に **窓（window）・ドット積 Attention** を採用する。点列を **重ならないパッチ** に切り、各パッチ内で Self-Attention を行い、さらに **パッチ間の相互作用** で情報を混ぜる。論文ではこの 2 つを **patch grouping** と **patch interaction** として整理している。

### パッチグループ化

![](/papers/point-transformer-v3/patch_grouping.png)

- シリアライズされた点列を、**パッチサイズ**（例: 64 や 256）で区切った **非重複のパッチ** に分ける。つまり、列の 1 番目〜$S$ 番目がパッチ 1、$S+1$ 番目〜$2S$ 番目がパッチ 2、… とする。
- 点総数がパッチサイズで割り切れない場合は、**隣接パッチから点を借りてパディング** し、全パッチが同じ長さになるようにする。パッチごとの Attention を均一な形状で実行可能に。


パッチ内だけでは受容野が列の一部に限られるため、**パッチ間で情報をやりとりする仕組み** が必須となる→パッチ間相互作用

### Attention 

近傍 Attention や Vector Attention を使うのをやめて、画像と同様のAttentionに切り替える。

**パッチ内 Self-Attention（実装）**: 各パッチを長さ $S$ の系列として、標準的な **スケール付きドット積 Attention** を適用する。パッチ $m$ の特徴を $\mathbf{X}_m \in \mathbb{R}^{S \times C}$ とすると、$Q = \mathbf{X}_m W_Q$、$K = \mathbf{X}_m W_K$、$V = \mathbf{X}_m W_V$（$W_Q, W_K, W_V \in \mathbb{R}^{C \times d}$）を計算し、
$$
\text{Attention}(\mathbf{X}_m) = \text{softmax}\left(\frac{Q K^\top}{\sqrt{d}}\right) V.
$$

### パッチ間相互作用

異なるパッチに属する点同士が情報を交換するための仕組み

![](/papers/point-transformer-v3/patch_interaction.png)

- **Shift Dilation**: パッチの切り方を **ステップ幅でずらす**。例えば「1 番目から 64 個」「65 番目から 
64 個」ではなく、「1, 65, 129, … 番目から 64 個」のように間隔を空けてグループ化する。これにより、隣接パッチ
だけでなく、離れた位置の点も同じパッチに含まれ、受容野が広がる。
- **Shift Patch**: 画像の shift-window と同様に、**列をシフトしてからパッチに切る**。層ごとにシフト量を
変えることで、異なる相対位置の組み合わせが Attention に含まれる。
- **Shift Order**: **層ごとに異なるシリアライズパターン**（Z-order / Hilbert / Trans Z-order / 
Trans Hilbert）を割り当てる。例えば 1 層目は Z-order、2 層目は Hilbert、… と巡回させる。異なる曲線で異な
る局所関係が強調されるため、層を重ねることで多様な空間関係を捉えられる。論文では **Shift Order などが有効** 
と報告されている。
- **Shuffle Order**: 上記 4 パターンの **適用順をランダムにシャッフル** してから各層に割り当てる。順序の
多様性を増すが、論文の実験では Shift Order 等の固定方針が採用されている。

これらにより、パッチ内だけの狭い受容野の制限を補い、シリアライズ＋パッチ Attention で点群全体の文脈を扱えるようにしている。

## V2 からの主な変更

- **KNN の廃止**: 近傍を「シリアライズされた列の上での連続したパッチ」で定義し、直列化近傍マッピングで効率化。
- **相対位置符号化（RPE）の廃止**: RPE をやめ、代わりに **事前のスパース畳み込み層**で位置・文脈を入れる。  
- **Attentionの簡略化**: shift-window や近傍の複雑な相互作用をやめ、シリアライズされた点群向けのパッチ注意＋パッチ間相互作用に統一。

# メモ
Sparse Convを使っているらしいが、論文内では詳しい記述はないので勉強したほうがよさそう。
位置関係はSparse Convのstemで入れているらしい。