---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_9847ea30ce2d11f1aa22525400393706
    ReservedCode1: VcCnx9afAROVhN4c+ap+f0hIqpvsF2Xqqj1wXzmFisnuIo5nT4QEnfjQKvA2V+7QuZ2XMEykpzCguP+y4V3si8lYsLhZviRxJjvPWVffU/7aIt42bdvoTwFaQeG2gz6UxacGiUdUsfkZDMcbPaiHh/UuII0j2NcGeOf4Yn8CV9lInVWIN5QW2Ag+UCg=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_9847ea30ce2d11f1aa22525400393706
    ReservedCode2: VcCnx9afAROVhN4c+ap+f0hIqpvsF2Xqqj1wXzmFisnuIo5nT4QEnfjQKvA2V+7QuZ2XMEykpzCguP+y4V3si8lYsLhZviRxJjvPWVffU/7aIt42bdvoTwFaQeG2gz6UxacGiUdUsfkZDMcbPaiHh/UuII0j2NcGeOf4Yn8CV9lInVWIN5QW2Ag+UCg=
---

# js-value-processor

可插拔的值處理鏈：把「屬性值 + DSL + pipeline」依序套用成一條轉換管線。

- 入口：`import ValueProcessor from 'js-common/js-value-processor'`（**default 導出**）
- 依賴：`js-constant`、`js-utils`、`js-dsl-factory`、`js-dataset-helper`
- 分層：L4

## 契約

- 一個 `ValueProcessor` 對應**一個 DSL 鍵**（`value`、`class`、`attr`…），構造時以 `key` 指定。
- pipeline 是一條**固定順序的鏈**：預設 `type → transform → format`，自訂 pipeline 追加在後。每個環節都吃前一個的輸出。
- 每個環節用「props 上的同名鍵」決定要跑哪個 handler；找不到就用該環節的 `fallback`；連 `fallback` 都沒有就原值透傳。
- **拼寫凍結**：`piplines` / `addPipline` 少一個 `e`，是對外契約，不可「順手修正」，見 [ADR-0004](../adr/0004-pipeline-and-piplines-freeze.md)。

---

## ValueProcessor

```js
new ValueProcessor(opts?: {
  key?: string,
  prefix?: string,
  piplines?: Record<string, (prop) => string>,
  handlers?: Record<string, Record<string, Function>>
})
```

### 構造參數

| 名稱 | 型別 | 必填 | 預設 | 說明 |
|---|---|---|---|---|
| `key` | `string` | 否 | `undefined` | 默認讀哪個 DSL 鍵，如 `'value'`；`process()` 第三參數可覆寫 |
| `prefix` | `string` | 否 | `''` | 傳給 `createDatasetHelper` 的命名空間 |
| `piplines` | `object` | 否 | `{}` | 追加的 pipeline，鍵為環節名，值為「如何從 props 取 handlerKey」的函數 |
| `handlers` | `object` | 否 | `{}` | 環節名 → handlerKey → 處理函數 |

實際執行順序 = `DEFAULT_PIPLINE`（`type`、`transform`、`format`）在前，`opts.piplines` 的自訂鍵在後。

### 靜態屬性

```js
ValueProcessor.CONST   // { TYPE: 'type', FORMAT: 'format', TRANSFORM: 'transform' }
```

預設環節的名字常量，避免各處硬編字串。

---

### process(el, value, key?)

```js
process(el: Element, value: any, key?: string): any
```

把資料餵進管線，回傳最後一環的輸出。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `el` | `Element` | 是 | 取 DSL 與屬性的來源元素 |
| `value` | `any` | 是 | 待處理值 |
| `key` | `string` | 否 | 覆寫構造時的 `key` |

- 回傳：處理後的值，型別由 handler 決定
- 副作用：會讀 `el.dataset`，並在首次解析時寫入模塊級緩存
- 拋錯：`el` 非元素時由 `datasetHelper` 拋 `Argument 1 must be HTMLElement`

### 處理流程

1. `value` 無值或 `toArray(value)` 為空 → **直接 `return undefined`**
2. 組 props：`createProperty(el.dataset[key])` + `resolveValues(el, key)` 的後綴屬性（如 `-format`、`-enum`），並附一個 `get(propName)` 取「第一個字串」
3. 逐環節：`handlerKey = 該環節取值函數(props[環節名])` → `handler = handlers[環節][handlerKey] ?? handlers[環節].fallback` → `result = handler(result, 環節主值, props) ?? result`
4. 回傳 `result`

「環節主值」是 `props.value?.[0] ?? props`：通常就是 DSL 裡第一個無鍵 token（如 `type:number` 的取值路徑），沒有時退化成整個 props 物件。內建 handler 多數不用它。

### ⚠ 注意

- **空值回 `undefined`，不是原值**。呼叫方若直接拿結果去 `setAttribute`，會得到字串 `'undefined'`；先判斷 `hasValue`。
- **handler 回傳 `undefined` 視為「不處理」**，保留上一環結果；但回傳 `0`、`''`、`false` 會被採用（`??` 只擋 `null`/`undefined`）。
- **`addHandler` 對「尚未加入的環節」靜默無效**：必須先 `addPipline` 建環節，再掛 handler，順序反了 handler 直接丟失（無錯誤、無警告）。
- props 裡的值是 `{ type, value }` 物件，不是字串。寫 handler 時用 `props.get('format')`，不要用 `props.format`。
- 第二個參數 `主值` 對多數 handler 無用，`DOMHelper` 內建 handler 就把它當 `_` 忽略。

### 示例

```js
const processor = new ValueProcessor({ key: 'value', prefix: 'af' })

// <span data-af-value="number" data-af-value-format="{0} 件">
processor.process(el, '3')
// '{0} 件' → 由 DOMHelper 註冊的 number handler 先轉數字再套格式
```

---

### addPipline(piplineKey, callback)

```js
addPipline(piplineKey: string, callback?: (prop) => string): void
```

新增一個處理環節。**拼寫是 `Pipline`**。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `piplineKey` | `string` | 是 | 環節名，同時是 props 上的鍵名 |
| `callback` | `Function` | 否 | 由「props 上該鍵的值」算出 handlerKey；省略時用預設取值（陣列取第一個、物件取 `value[0]`） |

- 回傳：無
- 副作用：插到鏈尾（`opts.piplines` 的既有順序在後）
- 拋錯：`piplineKey` 非非空字串 → `Argument 1 must be NonBlankString`；`callback` 有值但非函數 → `Argument 2 must be Function`

```js
processor.addPipline('transform')
processor.addHandler('transform', 'upper', value => String(value).toUpperCase())
```

### addHandler(piplineKey, handlerKey, callback)

```js
addHandler(piplineKey: string, handlerKey: string, callback: Function): void
```

為既有環節註冊 handler。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `piplineKey` | `string` | 是 | 必須已存在於 pipeline 表 |
| `handlerKey` | `string` | 是 | 對應 props 上的值，如 `type:date` 的 `'date'` |
| `callback` | `Function` | 是 | `(value, 主值, props) => 新值` |

- 回傳：無
- 副作用：寫入該環節的 handler 表；同名覆蓋
- 拋錯：三個參數各自 `Argument 1/2/3 must be ...`

⚠ `piplineKey` 不在 pipeline 表內時**不做任何事**，也不報錯。

```js
processor.addHandler(ValueProcessor.CONST.TYPE, 'date', (values, _, props) => values)
processor.addHandler(ValueProcessor.CONST.TYPE, 'fallback', (values) => values)
```

---

## 相關

- [ADR-0004 pipeline 與 piplines 凍結](../adr/0004-pipeline-and-piplines-freeze.md)
- [js-dsl-factory](./js-dsl-factory.md)
- [js-dataset-helper](./js-dataset-helper.md)
*（内容由AI生成，仅供参考）*
