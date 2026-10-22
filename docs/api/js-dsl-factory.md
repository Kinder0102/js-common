---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_97010996ce2d11f1aa22525400393706
    ReservedCode1: g75brHhDPwCDWqgASRlrb1W8XqMcL7c5vBgOErTEXMVQ+oxxUOR+/NEYXyi+A4IaDuqnunb5fCzF+dO3klJmYFo+UkP9OjvMmHzcFbTvKoZ67D9mRkL2CUCDrhDKr1mBfLwUMRzy8bq8+8IPBWsPEsHFYPx3C1zWr1EMGWdBjx9KkjCLRciYsNwrCu0=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_97010996ce2d11f1aa22525400393706
    ReservedCode2: g75brHhDPwCDWqgASRlrb1W8XqMcL7c5vBgOErTEXMVQ+oxxUOR+/NEYXyi+A4IaDuqnunb5fCzF+dO3klJmYFo+UkP9OjvMmHzcFbTvKoZ67D9mRkL2CUCDrhDKr1mBfLwUMRzy8bq8+8IPBWsPEsHFYPx3C1zWr1EMGWdBjx9KkjCLRciYsNwrCu0=
---

# js-dsl-factory

DSL 字串的三個解析器：`createProperty`（屬性 DSL）、`createTemplateHandler`（模板選擇）、`createFilter`（條件 DSL）。

- 入口：`import { createProperty, createTemplateHandler, createFilter } from 'js-common/js-dsl-factory'`
- 依賴：`js-constant`、`js-utils`、`js-dom-utils`、`js-cache`
- 分層：L3

## 契約

DSL 文法固定為「`|` 分 token、`:` 分鍵值、`,` 分多值」：

```
data-af-value="type:number|format:{0} 元|enum:1:一,2:二"
```

| 位置 | 語法 | 說明 |
|---|---|---|
| token 分隔 | `\|` | 每個 token 會 trim，空 token 丟棄 |
| 鍵值分隔 | `:` | 未出現未轉義的 `:` 時，整段算「無鍵值」，進 `value` |
| 多值分隔 | `,` | **只有逗號**，空白不切（`{0} 元` 的空白會保留） |
| 轉義 | `\,` `\:` `\|` `\ ` | 解析時 `\x` → `x`，反斜線被吃掉 |
| URL | `http(s)://...` | 不當鍵值解析，直接進 `value` |

- 解析結果統一為 `{ type: [], value: [], ...自訂鍵: [] }`，鍵名保序。
- 模塊級緩存只增不減：`createProperty`（DSL 字串 → prop）、`createTemplateHandler`（模板串 → handler）、`Comparable`（條件串 → 比較器）。`createFilter` 本身不緩存，但它內部兩個呼叫都命中緩存。見 [ADR-0007](../adr/0007-module-level-caches.md)。

---

## createProperty(props)

```js
function createProperty(props: string | object | Function | any): { type: string[], value: any[] }
```

### 參數

| 型別 | 行為 |
|---|---|
| 物件（含陣列） | **原樣回傳同一個引用**，不做拷貝、不解析 |
| 函數 | `{ type: ['Function'], value: [fn] }` |
| 非空字串 | 走 DSL 解析（有緩存） |
| 其他（`null`、`''`、`0`） | 回傳 `{ type: [], value: [] }` 的**新拷貝** |

### 回傳

| 欄位 | 說明 |
|---|---|
| `value` | 無鍵值的 token 陣列，即主值 |
| `type` | `type:xxx` 的值 |
| 其他鍵 | 原樣保留，值一律是**字串陣列** |

- 副作用：字串解析結果寫入模塊級緩存
- 拋錯：無

### ⚠ 注意

- **物件入參不複製**。`createProperty(obj).value.push(x)` 會改到呼叫方的物件。
- **陣列入參不算物件**（`isObject` 排除陣列），會落進「其他」分支，得到空 prop。要把陣列當已解析結果請包成 `{ value: [...] }`。
- **同一字串回傳同一物件**。`createProperty('type:date') === createProperty('type:date')`，改到一次就髒全站。
- 緩存鍵是原始字串，動態拼接的 DSL（含用戶資料）會持續撐大內存，見 [KNOWN-GAPS #8](../KNOWN-GAPS.md#8-模塊級無界緩存)。

```js
createProperty('type:number|format:{0} 元')
// { type: ['number'], value: [], format: ['{0} 元'] }

createProperty('a,b|c')
// { type: [], value: ['a', 'b', 'c'] }

createProperty('title:a\\:b')     // 轉義的冒號不切
// { title: ['a:b'], type: [], value: [] }
```

---

## createTemplateHandler(templateProp)

```js
function createTemplateHandler(templateProp): { getTemplate(item: any): Element }
```

把模板描述變成「給一筆資料，回一個可插入的節點」。

### 參數

| 型別 | `getTemplate` 的行為 |
|---|---|
| `Element` | **回傳該元素本身**（不 clone） |
| 空白（`''`、`null`） | 回傳 `<span>` 包住 `valueToString(item)` |
| 字串 | 解析 DSL，從文件裡的 `<template>` 取對應內容並 `cloneNode(true)` |

### 回傳

| 成員 | 簽名 | 說明 |
|---|---|---|
| `getTemplate` | `(item) => Element` | 每次呼叫都產生一個節點；字串模式下是 clone |

### 字串模式細節

- 查找範圍是**整份 `document` 的所有 `<template>`**，不限於當前組件子樹
- 主選擇器取 `value[0]`；形如 `鍵.值:選擇器` 的 token 會建立分支表，資料命中時改用該選擇器
- 命中不到任何模板 → 退回預設 `<span>`
- 產出的節點會 `removeAttribute('id')`，避免重複 id

### ⚠ 注意

- **傳元素當模板不會 clone**。第一次插入後該節點就被搬走，迴圈渲染只會剩下最後一個。要重用請自己傳字串選擇器或手動 clone。
- 分支表只在「鍵路徑在資料裡存在、且該值有對應選擇器」時生效，其餘一律走主選擇器。
- 模板選擇器寫錯不會報錯，直接落回 `<span>`，症狀是「渲染出純文字」。

```html
<template id="row-paid"><tr class="paid"><td></td></tr></template>
<template id="row-free"><tr><td></td></tr></template>
```

```js
const handler = createTemplateHandler('#row-paid|status.paid:#row-paid|status.free:#row-free')
handler.getTemplate({ status: 'free' })   // #row-free 的 clone，且 id 已移除
handler.getTemplate({ status: 'other' })  // 主選擇器 #row-paid 的 clone
```

---

## createFilter(filterProp)

```js
function createFilter(filterProp): {
  keys: string[],
  filter(key: string, value: any): boolean
}
```

條件 DSL 的求值器，`DOMHelper` 的 `data-af-hidden` / `data-af-filter` 就靠它。

### 參數

| 型別 | 說明 |
|---|---|
| `string` | 條件 DSL，如 `'status=paid,total>100,!draft'` |
| 物件 / 陣列 | 原樣傳給 `createProperty`（物件會被當成已解析結果） |

### 回傳

| 成員 | 說明 |
|---|---|
| `keys` | 條件涉及的鍵名清單，**判斷順序** |
| `filter(key, value)` | `key` 不在 `keys` 內回 `false`；否則對該鍵的所有條件做 **AND** |

### 運算子

| 運算子 | 語義 | 多值時 |
|---|---|---|
| （無） | `hasValue(value)`；`boolean` 走 `isTrue` | 單值 |
| `!` | 上一條的否定 | 單值 |
| `=` / `==` | 寬鬆 `==` | **OR**（任一成立） |
| `!=` | 寬鬆 `!=` | **OR**（不等於任一個即成立） |
| `>` `>=` `<` `<=` | 數值／字串比較 | OR |
| `=~` | `new RegExp(值, 'i').test(String(value))` | OR |

- 值**一律是字串**（`split` 產出字串，`'true'` / `'false'` 會轉 boolean；`Number.isFinite('100')` 為 `false`，所以數字字串不會被轉型，比較時靠 `>` `<` 的隱式轉型）
- 無運算子的條件，值為空字串時 `hasValue('')` 為 `true`——形同恆真

### ⚠ 注意

- **`!=` 多值是 OR**。`status!=draft,archived` 的真實含義是「不等於 draft **或** 不等於 archived」，幾乎恆真。要「兩者都不等於」請寫兩組 AND 條件。
- **`!` 後再接運算子會失效**：`!total>100` 會被 `>` 分支覆寫成 `total > 100`，`!` 被丟掉（見 [KNOWN-GAPS](../KNOWN-GAPS.md)）。
- 判斷順序取決於 `keys` 的插入序，同一鍵的多個條件全部 AND。
- 條件字串同樣進模塊級緩存。

```js
const filter = createFilter('status=paid|total>100')
filter.keys                  // ['status', 'total']
filter.filter('status', 'paid')   // true
filter.filter('total', 150)       // true
filter.filter('other', 1)         // false（鍵不在表內）
```

---

## 相關

- [ADR-0002 data-attr DSL 契約](../adr/0002-data-attribute-dsl-contract.md)
- [ADR-0007 模塊級緩存](../adr/0007-module-level-caches.md)
- [KNOWN-GAPS 8. 模塊級無界緩存](../KNOWN-GAPS.md#8-模塊級無界緩存)
*（内容由AI生成，仅供参考）*
