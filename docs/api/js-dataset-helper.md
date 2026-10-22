---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_95c7ccf0ce2d11f1aa22525400393706
    ReservedCode1: ME6Fxa7ayxA/7UbveX913VhCfX6tJ3pvA4VD7d02ilHdff0P5K/0jQbfLFbvhkZllwbMcn0cXRe7JgwMl6VtYUytVykZd7YVncZclg8bD0PxiUr8qRIIZHe2C/q+BPkfwsUqq+8QGRkjXMVjW3SnJHdXYLZBpoQzm/qaBtIg0cjq8Lh3xcwCr92Y+9s=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_95c7ccf0ce2d11f1aa22525400393706
    ReservedCode2: ME6Fxa7ayxA/7UbveX913VhCfX6tJ3pvA4VD7d02ilHdff0P5K/0jQbfLFbvhkZllwbMcn0cXRe7JgwMl6VtYUytVykZd7YVncZclg8bD0PxiUr8qRIIZHe2C/q+BPkfwsUqq+8QGRkjXMVjW3SnJHdXYLZBpoQzm/qaBtIg0cjq8Lh3xcwCr92Y+9s=
---

# js-dataset-helper

`data-{prefix}-*` 與 `dataset` 之間的雙向映射工廠，並把 `-format`、`-enum` 這類後綴屬性聚合成一組 prop。

- 入口：`import { createDatasetHelper } from 'js-common/js-dataset-helper'`
- 依賴：`js-constant`、`js-utils`
- 分層：L2

## 契約

給定前綴 `af`，三種寫法指的是同一件事：

| 形態 | 值 | 產出者 |
|---|---|---|
| key（kebab，不含前綴） | `value` | `datasetNameToKey` |
| 屬性名 | `data-af-value` | `keyToAttrName` |
| dataset 鍵（camel） | `afValue` | `keyToDatasetName` |

前綴為空字串時，屬性名退化成 `data-value`，dataset 鍵退化成 `value`。

`prefix` 只在工廠建立時固定一次，之後所有方法都隱含它；helper 本身不持有任何 DOM。

---

## createDatasetHelper(prefix?)

```js
function createDatasetHelper(prefix?: string): DatasetHelper   // prefix 預設 ''
```

### 參數

| 名稱 | 型別 | 必填 | 預設 | 說明 |
|---|---|---|---|---|
| `prefix` | `string` | 否 | `''` | 命名空間短標識，如 `'af'`；空白字串視同未給 |

### 回傳

`DatasetHelper` 物件，含 8 個方法。

---

### keyToInputName(key)

```js
(key: string) => string
```

`'value'` → `'af-value'`。用於拼 `<input name>` 或事件鍵名，不含 `data-` 前綴。

### keyToAttrName(key)

```js
(key: string) => string
```

`'value'` → `'data-af-value'`。要拿去 `querySelector('[data-af-value]')` 時用這個。

### keyToDatasetName(key)

```js
(key: string) => string
```

`'value'` → `'afValue'`；`'attr-href'` → `'afAttrHref'`。回傳的是 `el.dataset` 上的**鍵名**。

### datasetNameToKey(datasetName)

```js
(datasetName: string) => string
```

`'afAttrHref'` → `'attr-href'`。`keyToDatasetName` 的反向，並會剝掉前綴。

### getKeys(el, prefix?)

```js
(el: Element, prefix?: string) => { key: string, name: string }[]
```

列出元素上符合前綴的 dataset 鍵。

| 參數 | 說明 |
|---|---|
| `el` | 目標元素 |
| `prefix` | **key 的前綴**（如 `'attr'`），不是命名空間前綴；給了就只留 `dataset` 鍵以 `keyToDatasetName(prefix)` 開頭者 |

| 回傳欄位 | 說明 |
|---|---|
| `key` | 完整 kebab 鍵（含前綴段），如 `'attr-data-af-value'`；`getValue(el, key)` 要餵這個 |
| `name` | 去掉 `prefix-` 後的部分，如 `'data-af-value'`；可讀性用途 |

- 拋錯：`el` 非元素 → `Argument 1 must be HTMLElement`

```js
// <span data-af-attr-data-af-value="show">
helper.getKeys(el, 'attr')
// [{ key: 'attr-data-af-value', name: 'data-af-value' }]
```

### getValue(el, key, defaultValue?)

```js
(el: Element, key: string, defaultValue?: any) => any
```

讀 `el.dataset[keyToDatasetName(key)]`。

- `defaultValue` 有值時**不檢查** `el` 是否為元素，容忍 `el` 為 `null`（走 optional chaining）
- 沒給 `defaultValue` 時先 `assert(isElement(el), 1, HTML_ELEMENT)`

### ⚠ 注意

實作是 `el?.dataset?.[...] || defaultValue` —— **用 `||` 兜底**。屬性值為 `'0'`、`'false'`、`''` 時都會落回 `defaultValue`，`0` 這種數字更直接是 falsy。要區分「沒寫」與「寫了個假值」時不能用它，請直接讀 `el.dataset`。

```js
// <div data-af-count="0">
helper.getValue(el, 'count', 10)   // 10 ← 不是 '0'
```

### setValue(el, key, value)

```js
(el: Element, key: string, value: any) => void
```

寫入 `el.dataset`。值會被 DOM 強制轉成字串。

- 副作用：修改 `el.dataset`
- 拋錯：`el` 非元素 → `Argument 1 must be HTMLElement`

### resolveValues(el, key, additional?)

```js
(el: Element, key: string, additional?: object) => object
```

把同一 key 的所有後綴屬性聚合成物件，是 DSL 解析的原料。

```js
// <input data-af-value="number" data-af-value-format="{0} 元" data-af-value-enum="1:一,2:二">
helper.resolveValues(el, 'value')
// {
//   value:   'number',
//   format:  '{0} 元',
//   enum:    '1:一,2:二'
// }
```

| 參數 | 說明 |
|---|---|
| `key` | 要聚合的 key，`'value'` 會收 `data-af-value*` 全部 |
| `additional` | 起始物件，會先攤進去再疊加 |

- 回傳：鍵名為 camelCase 後的後綴名；同一名稱已存在時併成陣列
- 值一律是**原始字串**，不做型別解析
- 拋錯：`el` 非元素 → `Argument 1 must be HTMLElement`

### 拋錯總覽

除 `getValue`（給了 `defaultValue` 時）與 `keyTo*` / `datasetNameToKey`（只檢查字串）外，凡接受元素的方法都會 `assert`：

| 情境 | 訊息 |
|---|---|
| 元素參數不是元素 | `Argument 1 must be HTMLElement` |
| key 參數非非空字串 | `Argument 1 must be NonBlankString` |
*（内容由AI生成，仅供参考）*
