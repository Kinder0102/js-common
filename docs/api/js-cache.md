---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_947f9bdace2d11f1aa22525400393706
    ReservedCode1: yVAeGx0YUk8Q3dIeG9fu+zYf7AttzMUojrykjMuHXddTnpxyqsKdvd2WxBl8uDhTO1GE6/py41Ykte1uEpnzZ40ESX2vlOqJgvDP4rcD4gJIaBoyYkcjphNTcF8Mx8+LdbPgNsxQVXlRrg6foDUIe9zMMRfoQuyQ7b1rpjDeN/y7tqLC9gAGIDFanDQ=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_947f9bdace2d11f1aa22525400393706
    ReservedCode2: yVAeGx0YUk8Q3dIeG9fu+zYf7AttzMUojrykjMuHXddTnpxyqsKdvd2WxBl8uDhTO1GE6/py41Ykte1uEpnzZ40ESX2vlOqJgvDP4rcD4gJIaBoyYkcjphNTcF8Mx8+LdbPgNsxQVXlRrg6foDUIe9zMMRfoQuyQ7b1rpjDeN/y7tqLC9gAGIDFanDQ=
---

# js-cache

以 `Map` 為底的兩個緩存工廠：通用鍵值緩存，以及「一個 DOM 元素只對應一個實例」的實例表。

- 入口：`import { createCache, createInstanceMap } from 'js-common/js-cache'`
- 依賴：`js-constant`、`js-utils`
- 分層：L2

## 契約

- 緩存只在**工廠閉包內**存在，沒有全域實例，沒有過期與淘汰。
- `initialize` 只在未命中時執行一次；但回傳值為 `null` / `undefined` 時**不入表**，下次仍會重跑。`0`、`''`、`false`、`NaN` 依 `hasValue`（`!= null`）判定為有值，會正常緩存。
- 以物件（含 DOM 元素）為鍵時走的是 `Map` 的引用相等，不是結構比較。

---

## createCache()

```js
function createCache(): { get(key, initialize?), set(key, value) }
```

回傳一個獨立的鍵值緩存。

### 參數

無。

### 回傳

| 成員 | 簽名 | 說明 |
|---|---|---|
| `get` | `(key, initialize?) => any` | 命中直接回傳；未命中時若 `initialize` 是函數則 `initialize(key)`，否則直接用該值 |
| `set` | `(key, value) => Map` | `value` 是函數時以 `value(舊值)` 更新，否則直接寫入；回傳底層 `Map` |

### 副作用

寫入閉包內的 `Map`；無全域副作用。

### ⚠ 注意

- `get` 只在 `hasValue(result)`（即 `result != null`）時寫表。工廠回傳 `null` / `undefined` 等於沒有緩存，每次都會重跑。
- `set(key, fn)` 的 `fn` 收到的是**上一次的值**（首次為 `undefined`），不是 key。

### 示例

```js
import { createCache } from 'js-common/js-cache'

const cache = createCache()
let built = 0

cache.get('a', () => `${++built}`)  // '1'
cache.get('a', () => `${++built}`)  // '1'（命中）
cache.get('zero', () => 0)          // 0
cache.get('zero', () => 0)          // 0（未命中，工廠重跑）

cache.set('count', prev => (prev ?? 0) + 1)
cache.get('count')                  // 1
```

---

## createInstanceMap(conditionCallback, createCallback)

```js
function createInstanceMap(
  conditionCallback: (el: Element) => boolean,
  createCallback: (el: Element) => any
): { create(el): void, get(el): any }
```

保證同一元素只有一個實例。

### 參數

| 名稱 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `conditionCallback` | `(el) => boolean` | 是 | 回傳 true 才建立實例 |
| `createCallback` | `(el) => any` | 是 | 實例工廠，只在首次 `create` 時執行 |

### 回傳

| 成員 | 簽名 | 說明 |
|---|---|---|
| `create` | `(el) => void` | 條件成立且未建過時建立；**不回傳實例** |
| `get` | `(el) => any` | 取已建立的實例，沒有則 `undefined` |

### 副作用

寫入內部緩存。

### 拋錯

`create` / `get` 的第一參數不是元素時：`Argument 1 must be HTMLElement`。

### ⚠ 注意

`create` 是「確保存在」，不是「建立並回傳」。要拿實例必須再呼叫 `get(el)`，鏈式寫法 `map.create(el).doSomething()` 會直接炸。

### 示例

```js
import { createInstanceMap } from 'js-common/js-cache'

const map = createInstanceMap(
  el => el.matches('[data-af-toggle]'),
  el => new Toggle(el)
)

map.create(root.querySelector('[data-af-toggle]'))
map.get(root.querySelector('[data-af-toggle]'))  // Toggle 實例
```
*（内容由AI生成，仅供参考）*
