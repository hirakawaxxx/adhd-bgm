# Soft Mint デザインシステム

温かいオフホワイトの面と淡いミントで構成する、クレイ（粘土）調のやわらかい立体のデザインシステムです。特定のアプリに依存せず、どの Web アプリにもそのまま持ち込めます。全部品の見本は `styleguide.html` で確認できます。

## コンセプト

- **やわらかい立体感**: 部品は粘土やソフトなプラスチックのように、背景から厚みを持って盛り上がる。光源は上で、影は部品の下に大きくぼけて落ちる。表面は上端のハイライトと下端の陰で丸く膨らんで見せる。
- **枠線に頼らない輪郭**: 細く濃い枠線は使わず、影とハイライトの差、および面の色の差で形を出す。ただし状態の表示（選択・フォーカス・値）は、はっきりしたコントラストで示す。
- **低刺激**: 彩度を抑えたミントとグレーが中心。動きはゆっくり小さく、点滅は使わない。
- **落ち着き**: 情報量を絞り、余白を広めに取る。

## 使い方

1. Zen Maru Gothic を読み込む（[フォントの読み込み](#フォントの読み込み)）。読み込まない場合はフォールバックのシステムフォントで表示される。
2. `tokens.css` を読み込む。これだけで色、文字、余白、角丸、影、モーションのトークンが使える。
3. 既製のコンポーネントを使う場合は、続けて `components.css` を読み込む。
4. アプリ固有のスタイルはその後に読み込み、値はトークン（`var(--…)`）経由でのみ参照する。

```html
<link rel="stylesheet" href="fonts.css" />
<link rel="stylesheet" href="tokens.css" />
<link rel="stylesheet" href="components.css" />
<link rel="stylesheet" href="app.css" />
```

- ライト/ダークは `prefers-color-scheme` で自動的に切り替わる。
- `prefers-reduced-motion: reduce` のとき、duration トークンは `0ms` になる。ループするアニメーションは利用側で `animation: none` にする。
- インラインの `style` 属性、`<style>`、`data:` URI を使わないため、`default-src 'self'` の CSP 下でも動く。
- スライダーの塗りだけは JS から `el.style.setProperty('--fill', '30%')` で更新する。CSSOM 経由の設定は CSP の対象外。

## トークン

### 色

意味に基づく名前で定義しています。生の色値はトークン定義の中だけに書いてください。

| トークン | ライト | ダーク | 用途 |
|---|---|---|---|
| `--color-bg` | `#eeede9` | `#141716` | ページ背景（温かいオフホワイト） |
| `--color-surface` | `#f5f4f1` | `#1c201e` | パネル |
| `--color-surface-raised` | `#fcfbf9` | `#252a27` | カード・ボタンなど盛り上がった面 |
| `--color-surface-sunken` | `#e2e1dc` | `#0f1211` | トラック・溝など凹んだ面 |
| `--color-layer` | `#e4e3de` | `#191d1b` | カードの下に見える層 |
| `--color-input` | `#ffffff` | `#111413` | 入力欄の内側の面 |
| `--color-rim` | `#8e918d` | `#68706b` | 入力欄のリム（盛り上がった縁） |
| `--color-text` | `#2b302d` | `#e5eae7` | 本文 |
| `--color-text-muted` | `#575f5b` | `#a2aba6` | 補足・ラベル |
| `--color-indicator` | `#767c78` | `#808984` | 未選択の状態マーク（3:1 以上） |
| `--color-divider` | `#d8d7d1` | `#2c322f` | 装飾的な区切り |
| `--color-primary` | `#a8e6cf` | `#8edcb8` | ミント。主要ボタン・選択中の面 |
| `--color-primary-hover` | `#b8edd9` | `#a2e5c6` | 主要ボタンのホバー |
| `--color-primary-soft` | `#d4f2e5` | `#21382d` | 押し込まれた面（再生中など） |
| `--color-primary-strong` | `#2f7f61` | `#8edcb8` | 面の上の状態表示（タブ下線、スライダーの塗り） |
| `--color-on-primary` | `#134a36` | `#0c2c20` | ミントの上の文字・マーク（濃い緑） |
| `--glow-color` | `157 58% 66%` | `152 55% 62%` | 発光の色（HSL の成分） |
| `--color-focus` | `#2b8a64` | `#9be6c4` | フォーカスリング |
| `--color-disabled-bg` | `#bebeb9` | `#3a3f3c` | 無効状態の面（ミドルグレー） |
| `--color-disabled-text` | `#f3f3f0` | `#757c78` | 無効状態の文字（薄いグレー） |
| `--color-success-bg` / `-text` | `#cdefdf` / `#1d5a40` | `#1c3a2d` / `#b0e8cc` | 成功（ミント） |
| `--color-warning-bg` / `-text` | `#faedc2` / `#66490a` | `#3a3014` / `#f2d88f` | 注意（パステルイエロー） |
| `--color-error-bg` / `-text` | `#f8d5cc` / `#8a2c22` | `#43221e` / `#f5b8ae` | エラー（サーモンピンク） |
| `--color-level-1` 〜 `-5` | `#e3e2dd` → `#fdfcfa` | `#171a19` → `#2f3531` | Elevation ごとの面（上の層ほど明るい） |

### タイポグラフィ

書体は丸ゴシックの [Zen Maru Gothic](https://fonts.google.com/specimen/Zen+Maru+Gothic)（SIL Open Font License 1.1）に統一します。角の丸い字形が、クレイ調の丸みのある部品となじみます。

- `--font-sans`: `"Zen Maru Gothic"` を先頭にし、読み込み前や読み込み失敗時はヒラギノ角ゴ / Noto Sans JP / Yu Gothic UI / Meiryo / system-ui の順にフォールバックする。
- 太さは `--font-weight-regular`（500）と `--font-weight-bold`（700）の 2 段階だけ。Zen Maru Gothic は 300/400/500/700/900 があるが、細い線は凹んだ面の上で薄く見えるため本文も 500 にする。読み込むウェイトもこの 2 つだけにし、それ以外の値は書かない（読み込んでいない太さはブラウザが近いものに置き換えるか、太字を合成して字形が崩れる）。
- 和文は全角幅で組まれ、プロポーショナル字詰め（`palt`）は持たない。字間を詰めずにそのまま使う。

| 段階 | トークン / クラス | サイズ | 行間 | 太さ |
|---|---|---|---|---|
| Display | `--font-display` / `.ui-text-display` | 40px | 1.2 | 700 |
| Title | `--font-title` / `.ui-text-title` | 28px | 1.3 | 700 |
| Heading | `--font-heading` / `.ui-text-heading` | 20px | 1.4 | 700 |
| Body | `--font-body` / `.ui-text-body` | 16px | 1.7 | 500 |
| Label | `--font-label` / `.ui-text-label` | 14px | 1.5 | 700 |
| Caption | `--font-caption` / `.ui-text-caption` | 12px | 1.6 | 500 |

#### フォントの読み込み

`tokens.css` は書体名を指定するだけで、フォントファイルは持ちません。利用側で次のどちらかを選びます。

**(1) Google Fonts から読み込む**: 手軽だが、外部オリジンへの通信が発生する。

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&display=swap" />
```

CSP では `style-src` に `https://fonts.googleapis.com`、`font-src` に `https://fonts.gstatic.com` を許可する必要がある（例: `default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com`）。オフライン対応（Service Worker）では外部のフォントがキャッシュ対象から漏れやすい点にも注意する。

**(2) サブセット化してセルフホストする**: 画面に出る文字だけを含む WOFF2 を同じオリジンから配信する。和文フォントは 1 ウェイト数 MB あるが、UI の文字だけに絞れば 1 ウェイト数十 KB になり、`default-src 'self'` のままで使える。

1. [google/fonts の `ofl/zenmarugothic/`](https://github.com/google/fonts/tree/main/ofl/zenmarugothic) から `ZenMaruGothic-Medium.ttf`、`ZenMaruGothic-Bold.ttf`、`OFL.txt` を取得する。
2. 表示する全文字（HTML・JS のメッセージ・CSS の `content`）と ASCII の印字可能文字を集めたテキストファイルを作り、fonttools でサブセット化する。

   ```sh
   uv run --with fonttools --with brotli pyftsubset ZenMaruGothic-Medium.ttf \
     --text-file=glyphs.txt --flavor=woff2 --layout-features='*' --name-IDs='*' \
     --output-file=fonts/zen-maru-gothic-500.woff2
   ```

3. `@font-face` を `font-weight` 500 / 700 で 1 つずつ宣言し（`font-display: swap`）、本文ウェイトを先読みする。

   ```html
   <link rel="preload" href="fonts/zen-maru-gothic-500.woff2" as="font" type="font/woff2" crossorigin />
   <link rel="stylesheet" href="fonts.css" />
   ```

4. 再配布になるため `OFL.txt` をフォントと一緒に置く。OFL ではサブセット化は許可された改変で、Zen Maru Gothic には Reserved Font Name が無いため、書体名はそのまま使える。表示上のクレジットは不要。

文言を追加・変更したら、サブセットを作り直さないとその文字だけフォールバックの書体で表示される。

### 余白（4px 基準）

| トークン | 値 | トークン | 値 |
|---|---|---|---|
| `--space-1` | 4px | `--space-6` | 24px |
| `--space-2` | 8px | `--space-8` | 32px |
| `--space-3` | 12px | `--space-10` | 40px |
| `--space-4` | 16px | `--space-12` | 48px |
| `--space-5` | 20px | `--space-16` | 64px |

### 角丸とサイズ

| トークン | 値 | 用途 |
|---|---|---|
| `--radius-sm` / `-md` / `-lg` / `-xl` | 12 / 18 / 24 / 36px | 小部品 / スウォッチ / Card / パネル・Alert |
| `--radius-pill` | 999px | ボタン、入力欄、Chip、タブ、丸ボタン |
| `--tap-min` | 44px | タップ領域の最小値 |
| `--control-height` | 52px | ボタン・入力欄の高さ |
| `--rim-width` | 6px | 入力欄のリムの太さ |
| `--indicator-width` | 6px | タブの下線、選択マークのリングの太さ |
| `--focus-width` / `--focus-offset` | 3px / 3px | フォーカスリング |

### 影（クレイの立体）

立体は 3 種類の影を重ねて作ります。

1. **drop**: 外側の大きなぼかし影。下方向にずらし、spread をマイナスにして部品の真下に柔らかく溜まるようにする。
2. **bevel**: 上端内側の白いハイライトと、下端内側の陰。これで表面が丸く膨らんで見える。
3. **glow**: ミントの外側発光。ホバーとフォーカスに使う。

| トークン | 構成 | 用途 |
|---|---|---|
| `--drop-1` 〜 `--drop-5` | 近い影 + 大きくぼけた影（ぼかし 10px → 64px） | 外側の影だけが欲しいとき |
| `--bevel` / `--bevel-lg` | `inset` の上端ハイライト + `inset` の下端の陰 | 表面の膨らみ（大きい部品は lg） |
| `--elevation-1` 〜 `--elevation-3` | `--drop-N` + `--bevel` | Chip、ボタン、カードなど |
| `--elevation-4` 〜 `--elevation-5` | `--drop-N` + `--bevel-lg` | 主役の大きなボタン、浮いたパネル |
| `--shadow-inset` | 上側の内側の影 + 下側の内側のハイライト + 下縁の外側ハイライト | 凹み（溝、入力面、押し込み） |
| `--shadow-stack` | `0 10px 0 -5px var(--color-layer)` | Card の下に見える層 |
| `--shadow-glow` | 3px のミントのリング + 28px のぼかし | Primary のホバー、フォーカスの発光 |
| `--shadow-glow-soft` | 22px のぼかしだけ | 選択中のカードのうっすらとした発光 |

- ライトでは影を暖かいグレー（`--shadow-color: 40 10% 32%`）、ハイライトを白（不透明度 0.9）にする。
- ダークでも考え方は同じで、影は濃い黒（不透明度 0.35〜0.7）、ハイライトは低い不透明度の白（0.1 前後）にする。
- Elevation の面は「上の層ほど明るい」（`--color-level-1` → `-5`）。影はレベルとともに大きくなる。

### モーション

| トークン | 値 | 用途 |
|---|---|---|
| `--duration-fast` | 120ms | 押し込み |
| `--duration-base` | 200ms | 色 |
| `--duration-slow` | 320ms | 影・発光 |
| `--duration-breath` | 8s | 呼吸するような発光（片道の時間） |
| `--easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 標準 |
| `--easing-breath` | `cubic-bezier(0.45, 0, 0.55, 1)` | 呼吸 |

- 動かしてよいのは色、影、発光の不透明度、1px の押し込みだけ。
- 呼吸のアニメーションは周期 6 秒以上、不透明度の振れ幅は 0.35 程度までにする。
- `prefers-reduced-motion: reduce` では呼吸を止める。

## コンポーネント

すべてのクラスに `ui-` 接頭辞が付きます。状態は ARIA 属性とネイティブの擬似クラスで表します。境界線は `transparent` の 1px にしていて、普段は見えませんが、強制カラーモードでは輪郭として現れます。

### Button

| クラス / 状態 | 表現 |
|---|---|
| `.ui-button` | ピル型の盛り上がったボタン（`surface-raised` + `--elevation-2`） |
| `.ui-button--primary` | ミントの面、濃い緑の文字 |
| `.ui-button--secondary` | 白に近い面、本文色の文字 |
| `.ui-button--round` | 正円。幅は利用側で指定 |
| `:hover`（ホバー可能な端末のみ） | `--elevation-3`。Primary はさらに `--shadow-glow` で発光 |
| `:active` / `.is-pressed` | `--shadow-inset` で凹み、1px 沈む |
| `:focus-visible` | フォーカスのアウトライン + 発光 |
| `:disabled` / `[aria-disabled="true"]` | ミドルグレーの面、薄いグレーの文字、浅い盛り上がり |

### Input

`.ui-input` は、外側に分厚いグレーのリム（`--rim-width` の `--color-rim`、外側に `--drop-2`）があり、その内側が凹んだ白い入力面（`--color-input` + `--shadow-inset`）です。

- `:focus-visible`: アウトライン + ミントの発光
- `[aria-invalid="true"]`: リムがエラーの文字色になる。エラー内容はテキストでも示す
- `:disabled`: 入力面が凹んだグレーになる

### Segmented tabs

`.ui-segmented` はグレーの凹んだピル型トラックです。`.ui-segmented__item` のうち選択中（`aria-pressed="true"` または `aria-selected="true"`）の項目だけが、ミントの盛り上がったピルになり、先頭にチェックマークが付きます。

### Underline tabs

`.ui-tabs` の `.ui-tabs__item[aria-selected="true"]` の下に、6px の太いバー（`--color-primary-strong` + 立体の影）が付きます。選択中は文字色も本文色になります。

### Chip

`.ui-chip` は小さいピルで、タップ領域は 44px 以上です。`aria-pressed="true"` でミントの面になり、先頭にチェックマークが付きます。

### Alert

`.ui-alert` は全幅のパステル色で塗りつぶした、盛り上がったピル（`--radius-xl`）です。枠線や左の縦線はありません。

| クラス | 色 | 先頭アイコン（`.ui-alert__icon` の線画 SVG） |
|---|---|---|
| `.ui-alert--success` | ミント | ✓（円 + チェック） |
| `.ui-alert--warning` | パステルイエロー | ⚠（三角 + !） |
| `.ui-alert--error` | サーモンピンク | !（円 + !） |

- アイコンは `stroke: currentColor` で文字と同じ色になる。
- 動的なメッセージは、常に存在する `role="status"` の要素の中に置く。

### Card

`.ui-card` は白に近い面で、角丸は 24px です。下に一段重なった層（`--shadow-stack`）と `--elevation-3` で厚みを出します。

`.ui-card--selectable` はボタン要素に付ける選択式カードで、左に状態マークを持ちます。

- 未選択: 凹んだ穴に、2px の `--color-indicator` のリング
- 選択中（`aria-pressed` / `aria-checked` が `true`）: ミントの面 + うっすらとした発光。マークは `--color-on-primary` の太いリングになる

### Slider

`.ui-slider` は `input[type="range"]` に付けます。

- トラック: 14px の凹んだピル溝。値までを `--color-primary-strong` で塗る（`--fill` カスタムプロパティで指定）
- つまみ: 32px の盛り上がったミントの球。中心に `--color-on-primary` の芯がある
- 塗りは Chrome、Safari、Firefox とも同じ見た目になる
- 値はテキスト（`<output>` や `aria-valuetext`）でも示す

## アクセシビリティ基準

### 文字

- 本文・ラベルは 4.5:1 以上、大きい文字（24px 以上、または 18.66px 以上の太字）は 3:1 以上にする。
- ミントの上の文字は必ず `--color-on-primary`（濃い緑）にする。

### 非テキストのコントラスト（WCAG 1.4.11）の解釈

1.4.11 が求めるのは「部品を識別するために必要な視覚情報」と「状態」が 3:1 以上であることです。

- **部品の輪郭（必須ではない）**: ラベル文字で識別できるボタン、カード、Chip、タブ項目は、輪郭線の 3:1 を必須としない。輪郭は影とハイライト、面の色の差で表現する。ボタンには必ず見える文字（またはアイコン + アクセシブルネーム）を付ける。
- **状態の表示（必須）**: 次の要素は、隣り合う色に対して 3:1 以上を維持する。
  - 選択マーク: 選択式カードのリング、Chip / Segmented のチェック、タブの下線
  - フォーカスリング
  - スライダーのつまみの芯と塗り
- **入力欄**: 入力できる領域を識別するために、リムと入力面の間を 3:1 以上にする。
- **色だけに頼らない**: 選択はマークの形（チェック、塗りつぶしたリング）、押し込みは凹みの影でも伝える。
- **フォーカスリングは必須**: `:focus-visible` で `--focus-width` のアウトラインを付ける。発光（box-shadow）は飾りで、強制カラーモードでも残るのはアウトラインの方。
- **タップ領域**: 44×44px 以上（`--tap-min`）。
- **モーション**: `prefers-reduced-motion` を尊重する。点滅は使わない。
- **無効状態**: WCAG のコントラスト要件の対象外として、意図的に薄くしている。

### コントラスト比（実測）

WCAG 2.x の相対輝度の式で計算した値です。基準は、文字が 4.5、状態表示と境界が 3.0 です。

| 区分 | 組み合わせ | ライト | ダーク | 基準 |
|---|---|---|---|---|
| 文字 | text / bg | 11.47 | 14.82 | 4.5 |
| 文字 | text / surface | 12.21 | 13.54 | 4.5 |
| 文字 | text / surface-raised | 12.99 | 11.99 | 4.5 |
| 文字 | text / input | 13.43 | 15.23 | 4.5 |
| 文字 | text / primary-soft | 11.28 | 10.34 | 4.5 |
| 文字 | text-muted / bg | 5.61 | 7.66 | 4.5 |
| 文字 | text-muted / surface | 5.98 | 6.99 | 4.5 |
| 文字 | text-muted / surface-raised | 6.36 | 6.19 | 4.5 |
| 文字 | text-muted / surface-sunken | 5.02 | 7.99 | 4.5 |
| 文字 | text-muted / input | 6.58 | 7.86 | 4.5 |
| 文字 | on-primary / primary | 7.22 | 9.36 | 4.5 |
| 文字 | on-primary / primary-hover | 7.84 | 10.42 | 4.5 |
| 文字 | primary-strong / surface-raised | 4.69 | 9.09 | 4.5 |
| 文字 | success-text / success-bg | 6.57 | 9.02 | 4.5 |
| 文字 | warning-text / warning-bg | 7.12 | 9.30 | 4.5 |
| 文字 | error-text / error-bg | 6.24 | 8.31 | 4.5 |
| 状態 | indicator（未選択リング）/ surface-raised | 4.12 | 4.05 | 3.0 |
| 状態 | on-primary（選択マーク・チェック・つまみの芯）/ primary | 7.22 | 9.36 | 3.0 |
| 状態 | primary-strong（タブ下線）/ surface | 4.41 | 10.26 | 3.0 |
| 状態 | primary-strong（スライダーの塗り）/ surface-sunken | 3.70 | 11.73 | 3.0 |
| 状態 | focus / bg | 3.64 | 12.47 | 3.0 |
| 状態 | focus / surface | 3.88 | 11.38 | 3.0 |
| 境界 | rim / input | 3.19 | 3.63 | 3.0 |

- ライトでは、ミントの面（`--color-primary`）と背景の比は 1.20 で、部品の輪郭としては 3:1 に届かない（ダークでは 11.24）。上記の解釈に基づき、ボタンはラベル文字で識別させている。
- そのためライトでは、状態の表示（下線・塗り）に淡いミントではなく `--color-primary-strong` を使う。
