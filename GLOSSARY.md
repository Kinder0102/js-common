# js-common

一組被多個瀏覽器端套件共用的基礎模塊。它存在的理由只有一個：讓「DOM 數據綁定」「插件通信」「類型斷言與格式化」這些反覆出現的需求只實現一次。

## Language

**prefix**：
消費方爲自己的 `data-*` 命名空間取的短標識，如 `af`、`tg`。它由消費方在構造時傳入，倉庫自身不持有任何前綴。
_Avoid_: namespace、ns

**key**：
`data-{prefix}-{key}` 中位於 prefix 之後的那一段，代表一個邏輯屬性名。key 在 JS 側以 camelCase 出現（`array-value` ↔ `arrayValue`）。
_Avoid_: name、field

**DSL**：
寫在屬性值裏、用 `|` 分隔 token 的字符串語法，例如 `#tpl|empty:#empty`。它是本倉庫對外的契約載體。
_Avoid_: expression、syntax string

**property**：
`createProperty` 的返回值，形如 `{ type: [...], value: [...] }` 的結構化對象，DSL 解析後的中間形態。
_Avoid_: parsed object、config

**stage**：
`ValueProcessor` 處理鏈條上的一級，固定三級：`type`、`transform`、`format`。
_Avoid_: phase、step

**pipeline**：
多個 stage 按 `type → transform → format` 組成的處理鏈。
_Avoid_: chain、flow

**handler**：
某個 stage 下針對某個 handlerKey 的處理函數，簽名爲 `(value, propValue, props) => newValue`。
_Avoid_: processor、callback

**fallback**：
stage 內未命中具體 handlerKey 時使用的兜底 handler。
_Avoid_: default、catch-all

**group**：
`setValueToElement` / `clearElement` 的批次名，默認 `item`。同一容器內不同 group 的生成物互不干擾。
_Avoid_: batch、scope

**create 元素**：
由數組渲染產生的克隆節點，帶 `dom-helper-create-{group}` class。
_Avoid_: item element、clone

**filled 元素**：
被填入過值的元素，帶 `dom-helper-filled` class，`clearElement` 時會被複位。
_Avoid_: bound element

**empty template**：
數組爲空時用於渲染佔位內容的模板，寫作 `template` DSL 裏的 `empty:` 鍵。
_Avoid_: placeholder、no-data template

**boolean keys**：
以屬性存在與否表達開合的 HTML 屬性集合（`disabled`、`readonly`、`required`、`checked`、`multiple`、`autofocus`），賦值走 `setAttribute` / `removeAttribute`。
_Avoid_: flags、switch attributes

**comparable**：
filter 表達式裏的一條比較單元，由 `key`、`operator`、`values` 組成。
_Avoid_: condition、clause

**plugin**：
掛在某個根元素下、通過自定義事件與宿主通信的獨立組件。
_Avoid_: widget、component

**plugin host**：
管理 plugin 註冊時序並向外廣播的宿主。
_Avoid_: container、manager

**instance map**：
以 DOM 元素爲鍵、保存其實例的緩存（`createInstanceMap`），保證每個元素只有一個實例。
_Avoid_: element cache

**target**：
`getTargets` 解析的描述串，取值 `self`、`parent`、`children`、`closest` 或 CSS 選擇器。
_Avoid_: selector（僅當指 CSS 選擇器時使用）

**characterization test**：
按代碼**當前實際行爲**寫斷言的測試，包括已知缺陷的行爲。目的是「鎖住現狀，讓改動可見」，而非「證明正確」。缺陷修復時這類用例會變紅，屬預期信號。
_Avoid_: regression test（回歸測試是目的，表徵測試是手段）、snapshot test

**fixture**：
單個用例自建、用後即清的 DOM 片段。本倉庫要求每個用例獨立 fixture，避免 `DOMHelper` 寫入的 class / dataset 互相污染。
_Avoid_: mock、sandbox
