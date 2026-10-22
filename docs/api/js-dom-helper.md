---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_98e02797ce2d11f1a475525400248c00
    ReservedCode1: Fa4LExkfuJQ/GXGzb6nzRmeA+3srNrSeQJcuicvwUzOYiuPxdr7YdKHiQmdd61YLtUyetous0WsOXs/KNWau5jHf164pBa645RalmWvuvpn/qXN/D91P00H/Ykg8IcDgX2j9mHiFHbN2GFeI9QvknANKr83Sa7Uh4fPty6xmmZey9X/uAMEmmUEliso=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_98e02797ce2d11f1a475525400248c00
    ReservedCode2: Fa4LExkfuJQ/GXGzb6nzRmeA+3srNrSeQJcuicvwUzOYiuPxdr7YdKHiQmdd61YLtUyetous0WsOXs/KNWau5jHf164pBa645RalmWvuvpn/qXN/D91P00H/Ykg8IcDgX2j9mHiFHbN2GFeI9QvknANKr83Sa7Uh4fPty6xmmZey9X/uAMEmmUEliso=
---

# js-dom-helper

把「一份資料」渲染進「一段 DOM」的執行器：讀元素上的 `data-af-*` DSL，決定取值、格式、樣式、屬性，並負責陣列渲染與清理。

- 入口：`import DOMHelper from 'js-common/js-dom-helper'`（**default 導出**，同時掛 `globalThis.DOMHelper`）
- 依賴：`js-constant`、`js-utils`、`js-dom-utils`、`js-dataset-helper`、`js-dsl-factory`、`js-value-processor`、`js-cache`
- 分層：L5（最高層，`ajax-form` 直接用）

## 契約

- **`prefix` 決定整個 DSL 命名空間**：`prefix: 'af'` → 所有屬性都是 `data-af-*`。同頁多個實例必須用不同 prefix。
- **渲染靠 class 標記追蹤產物**：陣列產生的節點掛 `dom-helper-create-{group}`，單值填充的節點掛 `dom-helper-filled`。`clearElement` 就是靠這兩個 class 找回來。
- **模板選擇器寫在資料屬性裡**，實際 `<template>` 元素全頁共用。

## 標記與關鍵字總表

| 名稱 | 值 | 用途 |
|---|---|---|
| `dom-helper-create-{group}` | class | 陣列渲染出的節點，`group` 預設 `item` |
| `dom-helper-filled` | class | 被單值填充過的節點 |
| `dom-helper-remove` | class | `clearElement` 直接移除 |
| `dom-helper-last` | class | 陣列插入位置錨點，新節點插在它前面 |
| `template` | dataset 鍵 | 陣列模板 |
| `array-value` | dataset 鍵 | 每筆資料取哪個欄位（點號路徑） |
| `array-index` | dataset 鍵 | `first` / `last` / 數字索引（**0 起**） |
| `array-seq` | dataset 鍵 | 自動寫入的層級序號，格式 `{n},{父序號}`，**1 起** |
| `current-index` | dataset 鍵 | 只寫不讀，見 [KNOWN-GAPS #10](../KNOWN-GAPS.md#10-current-index-只寫不讀) |
| `hidden` | dataset 鍵 | 條件成立時 hide |
| `filter` | dataset 鍵 | 條件不成立時移除節點 |
| `attr-*` | dataset 鍵 | 設定屬性 |
| `class` | dataset 鍵 | 加上 class |
| `value` | dataset 鍵 | 填內容 |
| `dom-helper-value` / `dom-helper-index` | DSL 值 | 特殊取值器：整筆值 / 陣列序號 |

---

## new DOMHelper(opts?)

```js
new DOMHelper(opts?: { prefix?: string, basePath?: string })
```

| 參數 | 型別 | 必填 | 預設 | 說明 |
|---|---|---|---|---|
| `prefix` | `string` | 否 | `undefined` | DSL 命名空間；不給時屬性退化成 `data-value`、`data-class`… |
| `basePath` | `string` | 否 | `'/'` | 只影響 `<a href>` 與 `<form action>` 的 [`addBasePath`](./js-utils.md#addbasepathurl-basepath) |

內部固定建立三個處理器：`value`（`key: 'value'`）、`class`（`key: 'class'`）、`attr`（無固定 key，逐屬性名處理），共用同一組 type handler。

⚠ 建構時即寫 `globalThis.DOMHelper`，屬模塊載入副作用。

---

## setValueToElement(el, value, opts?)

```js
setValueToElement(el: Element, value: any, opts?: { template?: string | Element, group?: string }): void
```

對外唯一入口。依資料型態走兩條完全不同的路徑。

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `el` | `Element` | 是 | 渲染容器 |
| `value` | `any` | 是 | 陣列 → 走陣列渲染；其他 → 走單值填充 |
| `opts.template` | `string \| Element` | 否 | 覆寫 dataset 上的 `template` |
| `opts.group` | `string` | 否 | 預設 `'item'`，決定 `dom-helper-create-{group}` 的後綴 |

### 兩條路徑

| 條件 | 行為 |
|---|---|
| `value` 是陣列，**或** template 非空 | 陣列渲染：每筆資料產生一個節點，掛 `dom-helper-create-{group}` |
| 其他 | 單值填充：就地改屬性、class、內容；**不加 create class** |

### 空資料

陣列渲染後若節點數為 0，會讀 DSL 的 `empty` 鍵（`data-af-template="empty:#tpl-empty"`），非空則用 `[{}]` 再渲染一次當佔位。

- 回傳：無
- 副作用：插入／移除 DOM、寫 `dataset`、加減 class
- 拋錯：`el` 非元素 → `Argument 1 must be HTMLElement`

```js
// <div data-af-template="#row" data-af-array-value="list">
helper.setValueToElement(root, { list: [{ id: 1 }, { id: 2 }] })
```

---

## clearElement(el, group?)

```js
clearElement(el: Element, group?: string): void   // group 預設 'item'
```

清掉上一次渲染的產物。

| 對象 | 處理 |
|---|---|
| `.dom-helper-remove`（含 `el` 自身） | 直接 `remove()` |
| `el` 自身帶 `dom-helper-create-{group}` | 整個 `el` 被移除 |
| 後代 `.dom-helper-create-{group}` | 逐一 `remove()` |
| 後代 `.dom-helper-filled` | 內容清空（`value` / `textContent` 等依標籤） |

- 回傳：無
- 拋錯：`el` 非元素 → `Argument 1 must be HTMLElement`

⚠ `group` 必須與渲染時一致，否則 create 節點清不掉，只會清 filled。第一次渲染用 `setValueToElement(el, data, { group: 'a' })`、清理用 `clearElement(el)`（預設 `item`）就會殘留。

---

## 渲染規則

### 取值：`data-af-value` / `data-af-class` / `data-af-attr-*` 的值

屬性的值是一組**取值路徑**（以 `|` 分隔），逐條從資料裡取：

```
data-af-value="user.name|id"
```

| 情況 | 行為 |
|---|---|
| 路徑命中單值 | 收集成一個字串 |
| 命中陣列 | 走陣列渲染子流程 |
| 全部未命中 | 不填（保留原內容） |

特殊路徑：

| 值 | 效果 |
|---|---|
| `dom-helper-value` | 直接取傳進來的整筆值 |
| `dom-helper-index` | 取 `array-seq` 中對應層級的序號 |

### 填充：用在哪個標籤

| 標籤 | 寫入位置 |
|---|---|
| `input` | `checked`（type=checkbox，走 `isTrue`）或 `value` |
| `select` | `value` |
| `img` / `iframe` / `source` / `object` | `src` / `src` / `srcset` / `data` |
| `a` / `form` | `href` / `action`（套 `basePath`） |
| 其他 | `textContent` |

### 屬性：`data-af-attr-*`

dataset 鍵去掉 `attr-` 就是屬性名：

| 寫法 | 效果 |
|---|---|
| `data-af-attr-href="url"` | `el.href = 資料.url` |
| `data-af-attr-data-id="id"` | 設 `data-id`（含 `data-` 時**不轉駝峰**） |
| `data-af-attr-title` 後接 `data-af-attr-title-format` | 設 `title` 並套格式 |

布林屬性（`disabled`、`readonly`、`required`、`checked`、`multiple`、`autofocus`）：真值設 `"true"`，假值 `removeAttribute`。

後綴 `-format`、`-enum`、`-value-type` 不會被當成獨立屬性處理。

### 條件：`data-af-hidden` / `data-af-filter`

- `hidden`：條件成立 → `hideElements`；否則 `showElements`
- `filter`：條件**不**成立 → `elem.remove()`，並標記 `_removed`

⚠ 用 `filter` 移除的節點不會再回來，重新渲染前必須 `clearElement` 或重建 DOM。

### 型別轉換：`-type` 與 `-typeFormat`

| type | 行為 |
|---|---|
| `date` | 逐值 `formatDate`，可用 `-typeFormat` 指定日期格式 |
| `number` | **所有值相加**，再套 `-typeFormat` 的 `*` `/` `+` `-` 運算與 `.` 小數位，最後 `formatNumber` |
| 其他 / 未指定 | 走 `replaceString`：`-typeFormat` 的 `pattern` 與替換字串做 `replace` |

```html
<span data-af-value="price" data-af-value-type="number"
      data-af-value-typeFormat="*:1|.:2" data-af-value-format="{0} 元"></span>
```

⚠ `type:number` 是**加總語義**：`data-af-value="a,b"` 會得到 `a+b`，不是逐值格式化。要逐值請拆成多個節點。
⚠ `-typeFormat` 的 `-` 鍵會被 DSL 的 `:`、`|` 解析規則吃掉部分寫法，負數運算建議改用 `*:-1`。

### 枚舉：`-enum`

支援四種來源，依序嘗試：

| 寫法 | 來源 |
|---|---|
| `-enum="window 上的變數名"` | `window[名]` 物件 |
| `-enum="#selectId"` | 該 `select` 的 `options` 建映射；非 select 則取其 `value` 當 JSON 解析 |
| `-enum="1:一,2:二"` | DSL 直接映射 |
| 值不存在 | 回原值；物件有 `default` 鍵則用 `default` |

⚠ `-enum` 依賴 `window` / `document`，純 Node 環境不可用。

---

## 陣列渲染細節

1. `array-index` 有值時只取一筆：`first`、`last` 或數字（**0 起**）
2. 每筆用 `array-value` 指定的路徑取值
3. 取到的值本身是陣列 → 建 `DocumentFragment` 遞迴渲染
4. 無 template 且容器是 `input` / `select` → 直接賦 `value`，不產生子節點
5. 否則用 `createTemplateHandler(template)` 產生節點，寫入 `array-seq`（`{當前子節點數+1},{父層序號}`），再對它遞迴 `setValueToElement`
6. 插入位置：`.dom-helper-last` 之前；沒有錨點則 `append`

### ⚠ 注意

- **`array-seq` 是 1 起，`array-index` 是 0 起**。兩者混用會差一位。
- `array-index` 只作用於「本次傳入的陣列」，不是跨次渲染的游標。
- 用元素當模板（`template` 傳 Element）不會 clone，只會渲染出一筆，見 [js-dsl-factory](./js-dsl-factory.md#createtemplatehandlertemplateprop)。
- 巢狀陣列的 `array-seq` 由「父容器上 `[data-af-array-seq]` 的最近祖先」與「當前直接子節點數」推算，靠 `:scope > ` 選擇器，容器不是元素時會失準。

---

## 完整示例

```html
<div id="list"
     data-af-template="row:#row|empty:#empty"
     data-af-array-value="items">
  <div class="dom-helper-last">底部</div>
</div>

<template id="row">
  <div class="row">
    <span data-af-value="name"></span>
    <span data-af-value="price"
          data-af-value-type="number"
          data-af-value-format="{0} 元"></span>
    <a data-af-attr-href="url" data-af-value="label"></a>
  </div>
</template>

<template id="empty"><div class="empty">沒有資料</div></template>
```

```js
const helper = new DOMHelper({ prefix: 'af', basePath: '/api' })
helper.clearElement(list)
helper.setValueToElement(list, { items: [{ name: 'A', price: 100, url: '/a', label: '看' }] })
```

---

## 相關

- [ADR-0002 data-attr DSL 契約](../adr/0002-data-attribute-dsl-contract.md)
- [ADR-0003 可逆 class 標記](../adr/0003-reversible-class-markers.md)
- [js-value-processor](./js-value-processor.md)
- [js-dsl-factory](./js-dsl-factory.md)
- [js-dataset-helper](./js-dataset-helper.md)
*（内容由AI生成，仅供参考）*
