# 論文ページでの図の管理と記述方法

## 図の置き場所（管理方法）

**1論文ごとにフォルダを分けて**、Next.js の `public` 配下に置く。

```
public/
└── papers/
    └── <論文スラッグ>/          ← content/papers/<スラッグ>.md と同じ名前
        ├── fig1-architecture.png
        ├── fig2-attention.png
        └── ...
```

- **スラッグ** はマークダウンのファイル名と一致させる（例: `attention-is-all-you-need.md` → フォルダ `attention-is-all-you-need`）。
- ファイル名は図の内容が分かるようにする（例: `fig1-architecture.png`, `encoder-layer.png`）。
- 対応: `content/papers/foo.md` の図 → `public/papers/foo/` に配置。

こうすると、その論文のページから相対パス `./fig1-architecture.png` で参照でき、URL は `/papers/foo/fig1-architecture.png` になる。

---

## マークダウンでの記述方法

### 基本形

```md
![キャプション（図の説明）](./ファイル名.png)
```

- **キャプション**: `![ ]` の ` ]` の前の文字列。画面では図の下に「図の説明」として表示される。
- **パス**: **絶対パス** `/papers/<スラッグ>/ファイル名.png` を使う。相対パス `./` はページURLによっては正しく解決されないため避ける。

### 例（attention-is-all-you-need の場合）

**配置するファイル**

- `public/papers/attention-is-all-you-need/fig1-architecture.png`

**マークダウン**

```md
![図1: Transformer の全体構造（論文 Fig.1 より）](/papers/attention-is-all-you-need/fig1-architecture.png)
```

図の直前に見出しを付けると分かりやすい。

```md
## モデル構造

![図1: Transformer の全体構造](./fig1-architecture.png)

Encoder は 6 層で...
```

### 複数図を並べる

```md
![図1: Encoder の1層](/papers/attention-is-all-you-need/fig1-encoder-layer.png)

![図2: Scaled Dot-Product Attention](/papers/attention-is-all-you-need/fig2-attention.png)
```

---

## 対応している形式

- `public/` に置いたファイルはそのまま配信されるので、**.png / .jpg / .jpeg / .gif / .webp / .svg** など一般的な形式が使える。

---

## まとめ

| やること | 内容 |
|----------|------|
| 図の配置 | `public/papers/<論文スラッグ>/` に画像ファイルを置く |
| マークダウン | `![キャプション](/papers/<スラッグ>/ファイル名.png)` と書く（絶対パス） |
| キャプション | 図の下に表示される。図番号や出典をここに書くとよい |
