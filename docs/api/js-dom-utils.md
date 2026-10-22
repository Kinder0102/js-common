---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_9521f641ce2d11f1a475525400248c00
    ReservedCode1: InwJ43+/jyhmrbmfIB69dyJz/R2pbf+UPKHqp2iLrC/hS5hk08IBENLoCLzqba9JnrlzZ5x+TY51L+ZBLOEKsFQBK4hIW9RMDCHwS19ew1ghbiiGbCZwWBAMYmP3FF7jw/J7JUqjpP1i9Bo55kSvjTd5bapZXODY3ou6nGDyYHmF6KxpqMYjln8FcZ0=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_9521f641ce2d11f1a475525400248c00
    ReservedCode2: InwJ43+/jyhmrbmfIB69dyJz/R2pbf+UPKHqp2iLrC/hS5hk08IBENLoCLzqba9JnrlzZ5x+TY51L+ZBLOEKsFQBK4hIW9RMDCHwS19ew1ghbiiGbCZwWBAMYmP3FF7jw/J7JUqjpP1i9Bo55kSvjTd5bapZXODY3ou6nGDyYHmF6KxpqMYjln8FcZ0=
---

# js-dom-utils

DOM 層的最小原語：標籤判斷、class 增刪、查詢、顯示／啟用切換、事件與 DOM 變更監聽。

- 入口：`import { querySelector, registerEvent, showElements } from 'js-common/js-dom-utils'`
- 依賴：`js-constant`、`js-utils`
- 分層：L2

## 契約

- **標記一律是 class**，不是 attribute。`hidden` 是 class + inline style，`disabled` 是 attribute。混淆兩者是本模塊最常見的誤用。
- **查詢回傳陣列**，不是 `NodeList`，不是單一元素；`querySelector` 名字容易誤導，它實際是 `querySelectorAll` 語義。
- **多元素參數**接受單一元素、`document`、元素陣列，或含元素值的物件；不合法元素會被**靜默丟棄**，只有整包型別錯誤才拋。
- 事件名、class 名等字串參數走 [`split`](./js-utils.md#splitstr-delimiter)，`,` 與空白都算分隔。

---

## elementIs(el, type)

```js
function elementIs(el: any, type: string | string[]): boolean
```

判斷元素是不是指定型別，**同時比對標籤名與 `el.type`**。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `el` | `any` | 是 | 非元素直接回 `false` |
| `type` | `string \| string[]` | 是 | 標籤名（`'input'`）或 input 的 type（`'checkbox'`、`'radio'`） |

- 回傳：`boolean`；命中任一即 `true`
- 拋錯：無

```js
elementIs(el, HTML_CHECKBOX)          // input[type=checkbox] → true
elementIs(el, [HTML_INPUT, HTML_SELECT])
```

---

## hasClass(el, classname)

```js
function hasClass(el: any, classname: string): boolean
```

| 參數 | 說明 |
|---|---|
| `el` | 非元素回 `false` |
| `classname` | **單一 class**，不做 `split` |

- 回傳：`boolean`；`classname` 非非空字串回 `false`
- 拋錯：無

⚠ 傳 `'a b'` 不會拆開，一定回 `false`。多 class 判斷請自行 `split().every()`。

---

## addClass(el, classname)

```js
function addClass(el: Element, classname: string): void
```

### 參數

| 名稱 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `el` | `Element` | 是 | 目標元素 |
| `classname` | `string` | 是 | 可含多個 class，以 `,` 或空白分隔 |

- 回傳：無
- 副作用：修改 `el.classList`
- 拋錯：`el` 非元素 → `Argument 1 must be HTMLElement`

```js
addClass(el, 'hidden is-open')   // 兩個都加上
```

## removeClass(el, classname)

```js
function removeClass(el: Element, classname: string): void
```

參數、副作用、拋錯同 `addClass`，方向相反。

---

## querySelector(selectors, el?, includeSelf?)

```js
function querySelector(
  selectors: string | Element | (string | Element)[],
  el?: Element | Document,
  includeSelf?: boolean    // 預設 false
): Element[]
```

在 `el` 內查找，回傳**去重後的元素陣列**。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `selectors` | `string \| Element \| 陣列` | 是 | 元素物件直接入結果；字串走 `querySelectorAll`；陣列逐項處理 |
| `el` | `Element \| Document` | 否 | 查找根；非元素時根為 `document` |
| `includeSelf` | `boolean` | 否 | 預設 `false`；根是 `document` 時此參數無效 |

- 回傳：`Element[]`，`Set` 去重、插入序
- 副作用：無

### ⚠ 注意

- **多個選擇器要傳陣列**（`['.a', '.b']`），不是空格串。空格在 CSS 裡是後代選擇器，`'.a .b'` 只會命中 `.a` 內的 `.b`。
- 選擇器語法錯誤會被 `try/catch` 吃掉，**靜默回空**，不報錯。
- `includeSelf` 只對元素根生效：`querySelector('.root', root, true)` 會把 `root` 自己算進去。
- 深層查找要自己遞迴呼叫；它不做「連子樹一起掃」的魔法。

```js
querySelector('[data-af-value]', root)              // root 內所有
querySelector(['.item', '.last'], list)             // 兩組結果合併去重
querySelector('.item', list, true)                  // 含 list 自身
```

---

## getTargets(targets, el)

```js
function getTargets(targets: string | Element, el: Element): Element[]
```

用「關係關鍵字 + 選擇器」描述一組元素，`ajax-form` 的 `data-af-*` 定位全靠它。

### 參數

| 名稱 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `targets` | `string \| Element` | 是 | 多組以 `,` 分隔；組內以空白分詞；元素物件直接入結果 |
| `el` | `Element` | 是 | 關係起點；只有當組的第一個詞是關係關鍵字時才會用到 |

### 關係關鍵字

| 關鍵字 | 作用 |
|---|---|
| `self` | 起點自身 |
| `parent` | 起點的父元素 |
| `children` | 起點的子元素 |
| `closest` | 往上找最近匹配 |

- 第一個詞**不是**關係關鍵字時，起點是 `document`（即全域查找）
- 後續每個選擇器都在前一輪結果**內部**查找
- 回傳：`Element[]`，`Set` 去重；`null` 結果（如 `parentElement` 不存在）自動濾掉
- 拋錯：無（非法選擇器被內層 `querySelector` 吞掉）

### ⚠ 注意

`closest` 是**修飾下一個選擇器**的開關，不是獨立目標。寫成 `'closest'` 結尾（後面沒有選擇器）時該組結果會被整組丟棄：

```js
getTargets('closest', el)          // []
getTargets('closest .field', el)   // el.closest('.field')
```

```js
getTargets('parent .label', el)          // 父元素內的 .label
getTargets('.item, self', el)            // 全域 .item + el 自己
getTargets('children input', el)         // 子元素內的 input（不含 el 自身）
```

---

## showElements(elements)

```js
function showElements(elements): void
```

移除 class `hidden` 並把 `style.display` 清成 `''`（回到 CSS 預設）。

- 副作用：改 `classList` 與 inline style
- 拋錯：整包型別不合法 → `Argument 1 must be document or HTMLElement or HTMLElementArray`

## hideElements(elements)

```js
function hideElements(elements): void
```

加上 class `hidden` 並設 `style.display = 'none'`（inline 優先級，壓過 CSS）。

⚠ 成對使用才可逆。只呼叫 `hideElements` 又想靠改 CSS 類覆蓋會失敗——inline style 贏。

---

## enableElements(elements)

```js
function enableElements(elements): void
```

移除 `disabled` attribute。

## disableElements(elements)

```js
function disableElements(elements): void
```

設定 `disabled=""`。

⚠ 兩者都是**移除／設定屬性**，與 [`addClass`](#addclassel-classname) 的 class 標記無關。表單控件恢復可用只能靠 `enableElements`。

---

## registerMutationObserver(callback, target?)

```js
function registerMutationObserver(
  callback: (addedNode: Node) => void,
  target?: Element
): MutationObserver
```

監聽子樹的新增節點。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `callback` | `(addedNode) => void` | 是 | 每個新增節點呼叫一次 |
| `target` | `Element` | 否 | 觀察根；**非元素時退回 `document.body`** |

- 回傳：`MutationObserver`，需自行 `disconnect()`
- 配置：`{ childList: true, subtree: true }`；屬性與文字變更**不觸發**

### ⚠ 注意

傳 `document` 不會觀察整個文件，會靜默退化成 `document.body`。要含 `head` 只能自己傳 `document.documentElement`。

---

## registerAttributeChange(el, attrName, callback)

```js
function registerAttributeChange(
  el: Element,
  attrName: string,
  callback: () => void
): MutationObserver
```

監聽屬性變更，`attributeName` **以 `attrName` 為前綴**即觸發。

| 參數 | 說明 |
|---|---|
| `el` | 觀察目標，**不做元素校驗**（傳錯由 `observer.observe` 拋） |
| `attrName` | 前綴，如 `'data-af-value'` |
| `callback` | **不收參數**，不帶新舊值 |

- 回傳：`MutationObserver`，需自行 `disconnect()`
- 觀察配置：`{ attributes: true }`（不觀察子樹）

### ⚠ 注意

- **前綴匹配會誤觸**：觀察 `'data-af-value'` 時，寫入 `data-af-value-format` 也算命中。
- 只給「有變更」的訊號，拿不到舊值與新值；需要值請自己讀 `el.dataset` / `getAttribute`。
- 屬性被移除時 `attributeName` 為 `null`，前綴檢查不成立，**不會觸發**。

```js
registerAttributeChange(el, 'data-af-value', () => rerender(el))
```

---

## registerEvent(elements, eventName, callback, options?)

```js
function registerEvent(
  elements,
  eventName: string | string[],
  callback: EventListener,
  options?: boolean | AddEventListenerOptions
): void
```

批次綁定事件。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `elements` | 元素 / 陣列 / `document` / 含元素值的物件 | 是 | 非法元素靜默跳過 |
| `eventName` | `string \| string[]` | 是 | 可含多個，以 `,` 或空白分隔 |
| `callback` | `Function` | 是 | `addEventListener` 的 listener |
| `options` | `boolean \| object` | 否 | 原樣透傳 |

- 回傳：無
- 副作用：綁定事件；**沒有對應的解綁 API**，需自己保存 `elements` 與 `callback` 做 `removeEventListener`

### 拋錯

| 情境 | 訊息 |
|---|---|
| `eventName` 既非陣列也非非空字串 | `Argument 2 must be Array or NonBlankString` |
| `callback` 非函數 | `Argument 3 must be Function` |
| `elements` 整包型別錯誤 | `Argument 1 must be document or HTMLElement or HTMLElementArray` |

```js
registerEvent(root, 'click, input', handler)
registerEvent([el1, el2], ['mouseenter'], handler, { passive: true })
```

---

## triggerEvent(elements, eventName, payload?)

```js
function triggerEvent(elements, eventName: string, payload?: any): void
```

派發 `CustomEvent`，`detail` 即 `payload`。

- 回傳：無
- 副作用：觸發監聽器
- 拋錯：`eventName` 非非空字串 → `Argument 2 must be NonBlankString`

⚠ **冒泡關閉**（未設 `bubbles`），事件不會傳到祖先。同一個 `CustomEvent` 實例派給多個目標，`detail` 是共享引用。

```js
triggerEvent(pluginRoot, 'js-plugin:check', { systemRoot })
```

---

## stopDefaultEvent(event)

```js
function stopDefaultEvent(event: Event): void
```

`preventDefault()` + `stopPropagation()`，兩者都走 optional chaining，傳 `undefined` 也不炸。

- 回傳：無
- 副作用：阻止預設行為與冒泡
*（内容由AI生成，仅供参考）*
