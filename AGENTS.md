# AGENTS.md

給接手本倉庫的 LLM / 開發者的入口文檔。讀完這份再動代碼。

## 這是什麼

`js-common` 是 Kinder 自用的一組**零運行時依賴的瀏覽器端 ES Module**，被多個上層套件當作共同依賴：

- `ajax-form`（prefix `af`）
- `pagination`
- `toggle`（prefix `tg`）

上層統一以 **ESM 子路徑**方式引用，例如：

```js
import DOMHelper from 'js-common/js-dom-helper'
import { assert, toArray } from 'js-common/js-utils'
import { createDatasetHelper } from 'js-common/js-dataset-helper'
```

`dist/` 下的壓縮產物**不入版控**（見 `.gitignore`），從 GitHub 安裝的下游項目只拿到 `src/`。`dist/test.html` 是手工驗證頁，用 `globalThis.DOMHelper` / `globalThis.ValueProcessor` 跑，屬於非正式面，不承諾兼容。

## 必讀順序

1. 本文件（分層與禁區）
2. [`GLOSSARY.md`](./GLOSSARY.md)（術語，先統一語言）
3. [`docs/api/README.md`](./docs/api/README.md)（模塊導出面、分層與符號索引）
4. [`docs/api/js-dsl-factory.md`](./docs/api/js-dsl-factory.md)（對外契約的主體：`data-*` DSL）
5. [`docs/KNOWN-GAPS.md`](./docs/KNOWN-GAPS.md)（已知缺陷，改之前先看）

## 分層與依賴方向

```
L0  js-constant
L1  js-utils
L2  js-dom-utils   js-cache   js-dataset-helper
L3  js-dsl-factory   js-config   js-plugin
L4  js-value-processor
L5  js-dom-helper
```

規則：

- **只能向下依賴**，禁止反向或同層互引。新增模塊必須先定層。
- `src/` 內部一律**相對路徑** import（`./js-utils.js`）。不要用 `build.js` 裏那兩條 alias（`#`、`#libs`），它們與現狀脫節，見 KNOWN-GAPS。
- 不引入任何運行時依賴。`esbuild` 只在 devDependencies。

## 三個核心概念

**prefix** —— 每個消費方給自己的 `data-*` 命名空間取一個前綴（`af`、`tg`）。`createDatasetHelper(prefix)` 負責在 `data-af-value` 與 `dataset.afValue` 之間互轉。前綴由消費方在構造時傳入，本倉庫自己不持有。

**data-\* DSL** —— 對外契約不是 JS 配置對象，而是寫在 HTML 上的屬性字符串。`data-af-template="#tpl|empty:#empty"` 這種寫法就是 API。語法見 reference。

**ValueProcessor pipeline** —— `type → transform → format` 三級順序執行，每級按 handlerKey 取 handler，未命中走 `fallback`。`DOMHelper` 內部爲 `value` / `class` / `attr` 各持一個實例。

## 改動前須知

- **不要改 `piplines` 這個拼寫**。它出現在 `ValueProcessor` 的構造選項裏，下游可能已經按此書寫（詳見 ADR-0004）。若將來要修，必須同步改所有下游。
- **不要改 `data-*` 鍵名或語義**。鍵名即公開 API，改動等於破壞下游 HTML。
- **不要讓 `src/` 依賴 `dist/`**，也不要提交 `dist/`。
- **`js-dom-helper` 視爲黑盒**：內部結構可重構，但對外可觀察的行爲（寫入的 class、`dom-helper-index` 系列取值、`setValueToElement` / `clearElement` 的效果）必須保持不變。
- 改完沒有任何自動化測試可跑：`npm run build` 確認可構建，再用 `dist/test.html` 手工驗證。

## 文檔地圖

| 文檔 | 內容 |
|---|---|
| [`GLOSSARY.md`](./GLOSSARY.md) | 術語表 |
| [`docs/adr/`](./docs/adr/) | 7 篇決策記錄：0001 無根入口、0002 `data-*` 即契約、0003 可逆 class 標記、0004 pipeline 與 `piplines` 拼寫凍結、0005 插件事件握手、0006 assert 風格、0007 模塊級緩存 |
| [`docs/api/`](./docs/api/README.md) | 對外 API 全量條目：一頁一模塊、一節一符號 |
| [`docs/api/js-dsl-factory.md`](./docs/api/js-dsl-factory.md) | DSL 語法、轉義、filter 運算符 |
| [`docs/api/js-dom-helper.md`](./docs/api/js-dom-helper.md) | `DOMHelper` 用法與全部 `data-*` 鍵 |
| [`docs/api/js-plugin.md`](./docs/api/js-plugin.md) | `PluginHost` / `Plugin` 協議 |
| [`docs/api/README.md`](./docs/api/README.md#使用方須知) | 新套件如何接入 |
| [`docs/KNOWN-GAPS.md`](./docs/KNOWN-GAPS.md) | 已知缺陷與待辦 |
