---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_93994e78ce2d11f1a475525400248c00
    ReservedCode1: GeledmhE7RvD3g0VgJY4BpdzqJVWS7SBION7Sxp04GTeFiiOk/Hh3A1Y3Q3GiHu44cABCrjmZYKqHmgC7E5K3lfNV3392p2cvnxHnlOK93V9UfBuCuRzeowu4qZFx72qInkRCR5Sna3Zvb+PYoH+hkNtXGwvw9h0IySOzAikQbZA11bm1O2rnZSB160=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_93994e78ce2d11f1a475525400248c00
    ReservedCode2: GeledmhE7RvD3g0VgJY4BpdzqJVWS7SBION7Sxp04GTeFiiOk/Hh3A1Y3Q3GiHu44cABCrjmZYKqHmgC7E5K3lfNV3392p2cvnxHnlOK93V9UfBuCuRzeowu4qZFx72qInkRCR5Sna3Zvb+PYoH+hkNtXGwvw9h0IySOzAikQbZA11bm1O2rnZSB160=
---

# js-utils

型別判斷、字串與物件處理、格式化、流程控制。全倉庫的使用頻率最高的模塊，其他模塊幾乎都依賴它。

- 入口：`import { assert, isNotBlank, split } from 'js-common/js-utils'`
- 依賴：`js-constant`
- 分層：L1
- 執行環境：瀏覽器。`isElement` 用到全域 `Element` / `DocumentFragment`，純 Node 環境未注入 DOM shim 時會 `ReferenceError`。

## 契約

- **判斷函數不做型別轉換的猜測**：`isBoolean` 只認真 boolean，`'false'` 是字串不是 boolean。要「字串語義上的真假」用 `isTrue`。
- **`hasValue` 是 `null`/`undefined` 的唯一判準**：`0`、`''`、`false`、`NaN` 都算「有值」。這條貫穿全倉庫的 DSL 與 pipeline 邏輯。
- **`startsWith` / `endsWith` 不回傳 boolean**，回傳 `{ exist, value }`，`value` 是切掉標記後的剩餘字串。
- **錯誤一律 `throw new Error`**，沒有自訂 Error 類；`assert` 的第三參數只影響訊息文字。

## 原生別名

### isArray(value)

```js
const isArray: typeof Array.isArray
```

`Array.isArray` 的直引，沒有包裝。

### objectKeys(obj)

```js
const objectKeys: typeof Object.keys
```

### objectValues(obj)

```js
const objectValues: typeof Object.values
```

### objectEntries(obj)

```js
const objectEntries: (obj) => [string, any][]
```

`Object.entries` 的安全版：`isObject(obj)` 不成立時回傳 `[]`，不拋錯。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `obj` | `any` | 是 | 非物件（含陣列、函數、`null`）一律回 `[]` |

---

## 型別判斷

### assert(condition, message, type)

```js
function assert(condition: any, message: string | number, type?: string | string[]): void
```

條件成立則靜默返回，否則拋錯。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `condition` | `any` | 是 | 真值即通過 |
| `message` | `string \| number` | 是 | 有 `type` 時當**參數序號**；無 `type` 時當完整訊息 |
| `type` | `string \| string[]` | 否 | 型別名，多個用 `' or '` 連接 |

- 回傳：無
- 拋錯：`Error`。有 `type` → `Argument {message} must be {type.join(' or ')}`；無 `type` → `message`，`message` 也空則 `'Assertion failed'`。

```js
assert(isElement(el), 1, HTML_ELEMENT)   // Argument 1 must be HTMLElement
assert(count > 0, '至少一筆')             // 至少一筆
```

### hasValue(value)

```js
function hasValue(value: any): boolean
```

`value != null`。`0`、`''`、`false`、`NaN` 都算有值。

### isBoolean(value)

```js
function isBoolean(value: any): boolean
```

`boolean` 基本型或 `Boolean` 物件。**不含** `'true'` / `'false'` 字串。

### isTrue(value)

```js
function isTrue(value: any): boolean
```

「表單語義的真假」：先 `String(value).trim().toLowerCase()`，再排除 `'false'`、`'0'`、`'no'`、`'off'`、`''`。

| 輸入 | 回傳 |
|---|---|
| `true` / `'true'` / `' yes '` / `1` | `true` |
| `false` / `'false'` / `'0'` / `'no'` / `'off'` / `''` / `null` | `false` |

⚠ 任意非空字串（`'disabled'`、`'abc'`）都是 `true`。它判斷的是「不是假值」，不是「是 true」。

### isInteger(value)

```js
function isInteger(value: any): boolean
```

`Number.isInteger(+value)`。**會轉型**：`'42'`、`' 42 '`、`true`（`+true === 1`）都回 `true`。

### isString(str)

```js
function isString(str: any): boolean
```

`typeof === 'string'`。

### isNotBlank(str)

```js
function isNotBlank(str: any): boolean
```

是字串且 `trim()` 後長度大於 0。`'   '` → `false`。

### isFunction(func)

```js
function isFunction(func: any): boolean
```

`typeof === 'function'`。

### isPromise(p)

```js
function isPromise(p: any): boolean
```

`isObject(p)` 且 `then`、`catch` 都是函數。thenable 也算。

### isObject(obj)

```js
function isObject(obj: any): boolean
```

`typeof === 'object'`，**且排除** `null`、陣列、函數。DOM 元素算物件。

### isElement(el)

```js
function isElement(el: any): boolean
```

`el instanceof Element || el instanceof DocumentFragment`。`document` 本身**不算**——`document instanceof Element` 為 false。需要連 `document` 一起接受的地方（如 `registerEvent`）另有判斷。

### isURL(str)

```js
function isURL(str: any): boolean
```

以內建正則判斷是否 `http(s)://` 開頭的可抓取字串。只看前綴與主體長度，不做真實解析。

---

## 轉換

### toArray(value, mapFn?, thisArg?)

```js
function toArray(value: any, mapFn?: (v, i) => any, thisArg?: any): any[]
```

統一成陣列，並過濾掉 `null` / `undefined`。

| 輸入 | 回傳 |
|---|---|
| `null` / `undefined` | `[]` |
| 陣列 | 原陣列 `filter(hasValue)` 的**新陣列** |
| 字串 | `[字串]`（**不切成字元**） |
| 元素 | `[元素]` |
| 其他有 `Symbol.iterator` 或 `length` 的物件（`Set`、`NodeList`、類陣列） | `Array.from(value, mapFn, thisArg)` 後過濾 |
| 其餘（純物件、數字） | `[value]` |

⚠ `mapFn` 只在走 `Array.from` 那條分支時生效；陣列與字串分支會忽略它。

⚠ 判斷過程會呼叫 `isElement(value)`，所以傳入非字串的純物件時，在**非瀏覽器環境**會因 `Element` 未定義而拋 `ReferenceError`。

### valueToString(value)

```js
function valueToString(value: any): string | null
```

物件與陣列 → `JSON.stringify`；其他有值者 → `String(value)`；`null` / `undefined` → `null`。

### stringToValue(str)

```js
function stringToValue(str: any): object | array | null
```

`JSON.parse`，且**只接受物件或陣列的結果**：`'[1]'` → `[1]`，`'{"a":1}'` → 物件，`'"abc"'` → `null`（原始型別丟棄），解析失敗 → `null`。已是物件或陣列則原樣回傳。

---

## 字串

### split(str, delimiter?)

```js
function split(str: string | any[], delimiter?: string): string[]
```

帶轉義的切分。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `str` | `string \| any[]` | 是 | 陣列 → `filter(hasValue)`；非字串 → `[str].filter(hasValue)` |
| `delimiter` | `string` | 否 | 省略時以 `,` 與空白（含空格）為分隔 |

- 回傳：每段 `trim()` 後、濾掉空字串的陣列
- 轉義：`\` 後的下一字元不參與切分，且**反斜線會保留在結果裡**（`'a\\,b,c'` → `['a\\,b', 'c']`）

```js
split('a,b c')        // ['a', 'b', 'c']
split('a|b', '|')     // ['a', 'b']
split('')             // []
split(['a', null])    // ['a']
```

### startsWith(str, mark)

```js
function startsWith(str: string, mark: string): { exist: boolean, value: string }
```

### endsWith(str, mark)

```js
function endsWith(str: string, mark: string): { exist: boolean, value: string }
```

| 回傳 | 說明 |
|---|---|
| `exist` | 前綴／後綴是否命中 |
| `value` | 命中時是**切掉標記後**的剩餘字串；未命中時是原字串 |

- 拋錯：`mark` 非非空字串 → `Argument 2 must be NonBlankString`
- 邊界：`str.length` 必須**嚴格大於** `mark.length`，相等時 `exist` 為 `false`

```js
startsWith('data-af-value', 'data-af')  // { exist: true, value: '-value' }
endsWith('af-value-format', 'format')   // { exist: true, value: 'af-value-' }
startsWith('ab', 'ab')                  // { exist: false, value: 'ab' }
```

### toCamelCase(str)

```js
function toCamelCase(str: string): string
```

只把 `-x` 轉成 `X`，其餘原樣。空字串或非字串 → `''`。

```js
toCamelCase('array-value')  // 'arrayValue'
toCamelCase('data-af-x')    // 'dataAfX'
```

### toKebabCase(str)

```js
function toKebabCase(str: string): string
```

把大寫字母轉成 `-小寫`。空字串或非字串 → `''`。

⚠ 判定條件是「`letter.toUpperCase() === letter && letter !== '-'`」，所以**數字與 `_` 也被當成大寫邊界**插 `-`：`toKebabCase('a1')` → `'a-1'`、`toKebabCase('a_1')` → `'a-_1'`。只用於純字母鍵名沒問題，帶數字鍵名要先自行處理。

```js
toKebabCase('arrayValueFn')  // 'array-value-fn'
```

---

## 物件

### findObjectValue(obj, key)

```js
function findObjectValue(obj: any, key: string): { key: string, value: any, exist: boolean }
```

以點號路徑取值。

| 回傳欄位 | 說明 |
|---|---|
| `value` | 取到的值 |
| `exist` | 是否取到（`hasValue`） |
| `key` | 路徑**最後一段**（命中時通常是它；全 miss 時是被回退使用的那個鍵） |

邊界：

| 輸入 | 結果 |
|---|---|
| `obj` 無值（`null` / `undefined`） | `{ key, value: obj, exist: false }`，不做任何遍歷 |
| `key` 空且 `obj` 非物件 | `{ key, value: undefined, exist: true }`（奇異但存在） |
| `key` 空且 `obj` 是物件 | `{ key, value: obj, exist: false }`，遍歷分支不進入 |

### ⚠ 注意

**全 miss 時會回退為「用最後一段鍵名在頂層物件裡查」。** `findObjectValue({ a: { b: 1 }, c: 2 }, 'a.b.c')` → 取到頂層的 `c`（`{ key: 'c', value: 2, exist: true }`），而不是 `false`。跨層同名鍵會取錯值，需要嚴格語義時不要用它。

```js
findObjectValue({ user: { name: 'kinder' } }, 'user.name')  // { key: 'name', value: 'kinder', exist: true }
```

---

## 格式化

### formatNumber(value, n, x?)

```js
function formatNumber(value: number, n: number, x?: number): string
```

千分位 + 固定小數位。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `value` | `number` | 是 | **必須是 number 或 Number 物件**，內部直接 `toFixed` |
| `n` | `number` | 是 | 小數位數，`~~n` 取整，負數視為 0 |
| `x` | `number` | 否 | 分組長度，預設 3 |

- 回傳：字串；`n > 0` 才有小數點
- 拋錯：`value` 是字串會 `TypeError: value.toFixed is not a function`

```js
formatNumber(1234567.891, 2)   // '1,234,567.89'
formatNumber(1234, 0)          // '1,234'
formatNumber(1234, 0, 4)       // '1234'
```

### formatString(template, args)

```js
function formatString(template: string, args: object | any[]): string
```

`{key}` 佔位替換。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `template` | `string` | 是 | 含 `{...}` 佔位；空白則走 fallback 分支 |
| `args` | `object \| any[]` | 是 | 物件 → 佔位當點號路徑；其他 → 佔位當**索引** |

- 命中不到 → 替換成空字串
- `template` 為空：`args` 是物件 → `JSON.stringify`；否則 `toArray(args).join()`

```js
formatString('{0} 歲', [30])                        // '30 歲'
formatString('{user.name} / {missing}', { user: { name: 'k' } })  // 'k / '
formatString('', { a: 1 })                          // '{"a":1}'
```

### formatDate(value, format?)

```js
function formatDate(value: Date | number, format?: string): string
```

| 參數 | 型別 | 必填 | 預設 | 說明 |
|---|---|---|---|---|
| `value` | `Date \| number` | 是 | — | `Date` 原樣用；其他一律 `new Date(Number.parseInt(value))`，即**毫秒時間戳** |
| `format` | `string` | 否 | `'yyyy/MM/dd'` | 見下表 |

| 記號 | 意義 |
|---|---|
| `y+` | 年，按記號長度截取（`yyyy` → 4 位） |
| `M+` | 月，1 起算 |
| `d+` | 日 |
| `h+` / `H+` | 時（24 小時制，兩者相同，無 12 小時制） |
| `m+` | 分 |
| `s+` | 秒 |
| `q+` | 季 |
| `S` | 毫秒 |

### ⚠ 注意

- 傳 ISO 字串（`'2026-10-22'`）會 `parseInt` 成 `2026` 毫秒，得到 1970 年。字串請先自己 `new Date()`。
- 內部靠 `RegExp.$1` 讀匹配結果。`RegExp.$n` 是全域靜態屬性，重入或格式串連續替換時可能被其他正則覆蓋（見 [KNOWN-GAPS](../KNOWN-GAPS.md#7-formatdate-依賴-regexp1)）。

```js
formatDate(new Date(2026, 9, 22))       // '2026/10/22'
formatDate(0)                            // '1970/01/01'
formatDate(Date.now(), 'yyyy-MM-dd hh:mm')
```

### jsonToQueryString(jsonObject)

```js
function jsonToQueryString(jsonObject: object): string
```

| 值型別 | 行為 |
|---|---|
| 陣列 | 每個元素以同名 `append`，產生重複 key |
| 有值 | `append` |
| `null` / `undefined` | 略過 |

- 回傳：`URLSearchParams.toString()`，**不含** 前導 `?`
- 值會被 `URLSearchParams` 自動 URL-encode

```js
jsonToQueryString({ a: 1, tags: ['x', 'y'], b: null })
// 'a=1&tags=x&tags=y'
```

### addBasePath(url, basePath)

```js
function addBasePath(url: string, basePath: string): string
```

- 以下情形**原樣回傳**：`url` 非非空字串、`url` 是絕對 URL、`basePath` 非非空字串、`basePath === '/'`、`url` 已包含 `basePath`
- 否則回傳 `(basePath + url).replace('//', '/')`

⚠ 是字串直接相加，不做補斜線。`addBasePath('users/1', '/api')` → `'/apiusers/1'`。要正確拼接，`url` 必須自己帶前導 `/`。

```js
addBasePath('/users/1', '/api')                    // '/api/users/1'
addBasePath('https://x.dev/a', '/api')             // 'https://x.dev/a'
addBasePath('/api/users', '/api')                  // '/api/users'
```

---

## 流程控制

### delay(time)

```js
function delay(time: number): Promise<void>
```

`setTimeout` 的 Promise 化。

### debounce(callback, delay?, { leading?, trailing? }?)

```js
function debounce(
  callback: Function,
  delay?: number,                                  // 預設 200
  options?: { leading?: boolean, trailing?: boolean }  // 預設 { leading: false, trailing: true }
): Function
```

每次調用重置計時器；靜默滿 `delay` 後以**最後一次參數**執行 `callback`。

| 選項 | 預設 | 說明 |
|---|---|---|
| `trailing` | `true` | 週期結束時執行 |
| `leading` | `false` | 週期開始時執行 |

回傳的函數保留調用時的 `this`。

### ⚠ 注意

**`leading: true` 目前無效。** 源碼先 `timeout = setTimeout(...)` 再判斷 `if (leading && !timeout)`，此時 `timeout` 已非空，分支永遠進不去。實測 `debounce(fn, 20, { leading: true })` 連續調用後 `fn` 執行次數為 0。需要「首次立即執行」請用 [`throttle`](#throttlecallback-wait-leading-trailing)。

```js
const save = debounce(draft => api.save(draft), 300)
input.addEventListener('input', e => save(e.target.value))
```

### throttle(callback, wait?, { leading?, trailing? }?)

```js
function throttle(
  callback: Function,
  wait?: number,                                   // 預設 200
  options?: { leading?: boolean, trailing?: boolean }  // 預設 { leading: true, trailing: true }
): Function
```

| 選項 | 預設 | 說明 |
|---|---|---|
| `leading` | `true` | 首次調用立即執行 |
| `trailing` | `true` | 窗口結束時以最後一次參數補執行 |

- 窗口內的重複調用只更新參數，不排隊
- `leading: false` 時首次不執行，只記錄時間，窗口結束補一次（需 `trailing`）

```js
window.addEventListener('scroll', throttle(() => measure(), 100))
```

### abortable(promiseFn, { abort }?)

```js
function abortable(
  promiseFn: () => Promise<any>,
  options?: { abort?: { signal: AbortSignal } }
): Promise<any>
```

讓任意 Promise 可被 `AbortController` 打斷。

| 參數 | 說明 |
|---|---|
| `promiseFn` | 立即調用，回傳 Promise |
| `options.abort` | 需帶 `.signal`；**不是**直接傳 `AbortSignal`，也不是傳 `AbortController`（`controller.signal` 才是） |

- 回傳：`Promise.race([promiseFn(), abortPromise])`
- 拋錯：`signal.aborted` 已為 true 時立即 `reject(new DOMException('Operation aborted', 'AbortError'))`；中途 abort 同樣以 `AbortError` reject

⚠ 只負責「讓 caller 提早拿到 rejection」，不會取消底層請求；`promiseFn` 內的 fetch 要自己接 `signal` 才會真的中止。

```js
const controller = new AbortController()
abortable(() => fetch(url), { abort: controller })
controller.abort()   // → 立即以 AbortError reject
```
*（内容由AI生成，仅供参考）*
