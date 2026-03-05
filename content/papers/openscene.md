---
title: "OpenScene: 3D Scene Understanding with Open Vocabularies"
authors: ["Songyou Peng", "Kyle Genova", "Chiyu \"Max\" Jiang", "Andrea Tagliasacchi", "Marc Pollefeys", "Thomas Funkhouser"]
year: 2023
venue: "CVPR"
url: "https://arxiv.org/abs/2211.15654"
tags: ["3D", "Point Cloud", "Open-vocabulary", "CLIP", "Semantic Segmentation", "Zero-shot", "Scene Understanding"]
readAt: ""
oneLiner: "3D 点を CLIP 空間に写し、オープン語彙・ゼロショットでシーン理解"
editor: "morix"
---

# 概要

3D シーンの各点に **CLIP の特徴空間と co-embed された密な特徴** を予測し、**ラベル付き 3D データなし**でオープン語彙のシーン理解を実現する手法（[arXiv:2211.15654](https://arxiv.org/abs/2211.15654)）。

- **アプローチ**: 3D 点ごとに、テキスト・画像と同一の CLIP 特徴空間に載る特徴を推論する。タスク非依存で学習し、**ゼロショット**で任意の語彙に汎化する。
- **セマンティック分割**: 全 3D 点の CLIP 特徴を推論したあと、任意のクラス名の埋め込みとの類似度で分類する。従来の教師あり 3D セグメンテーションを上回るゼロショット性能を報告。
- **オープン語彙クエリ**: ユーザーが任意のテキストクエリを入力すると、シーンのどの部分がそれに一致するかを **ヒートマップ** で表示するなど、物体・素材・アフォーダンス・活動・部屋タイプなど多様なクエリに 1 モデルで対応する。
- **学習**: **ラベル付き 3D データは使わない**。CLIP 空間への写像を 2D–3D の対応などで学習し、オープン語彙の質問に答える単一モデルを実現している。

プロジェクトページ: [OpenScene](https://pengsongyou.github.io/openscene)

#更新中