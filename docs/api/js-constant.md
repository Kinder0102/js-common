---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_93102957ce2d11f1a475525400248c00
    ReservedCode1: 3zjCQbK7Q7dW5s/LTZZTZV1CgVTTmUycXcU0Zk5GEFwWA+DY5jrlkg3/YMJ3zrWp4m733b1+fVRTD9z9jJLRdgOMKTqJfKCiL89uLd18P2pFT+AWKpavOaOZhxfpWh0UQ0Dr32eGKY+IuCyRTOZ9RGAuGcWdY8S69Dpwdff1Sb/DeDnqONeW9O+YS4g=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_93102957ce2d11f1a475525400248c00
    ReservedCode2: 3zjCQbK7Q7dW5s/LTZZTZV1CgVTTmUycXcU0Zk5GEFwWA+DY5jrlkg3/YMJ3zrWp4m733b1+fVRTD9z9jJLRdgOMKTqJfKCiL89uLd18P2pFT+AWKpavOaOZhxfpWh0UQ0Dr32eGKY+IuCyRTOZ9RGAuGcWdY8S69Dpwdff1Sb/DeDnqONeW9O+YS4g=
---

# js-constant

斷言型別 token 與標籤名常量。全倉庫 `assert(el, n, type)` 的第三參數都取自這裡；下游也用它當錯誤哨兵。

- 入口：`import { HTML_ELEMENT, ERROR_CONFIRM } from 'js-common/js-constant'`
- 依賴：無
- 分層：L0

## 契約

這些常量是**字串**，不是 class、不是 enum、不能 `instanceof`。它們的唯一用途是被 `assert` 拼進錯誤訊息，或被下游當哨兵比較。

```
Argument {message} must be {type.join(' or ')}
```

其中 `message` 傳的是**參數序號**（`0` 起算），所以真實錯誤長這樣：`Argument 1 must be HTMLElement`。

## 斷言型別 token

| 常量 | 值 | 用途 |
|---|---|---|
| `OBJECT` | `'Object'` | 一般物件 |
| `FUNCTION` | `'Function'` | 函數 |
| `ARRAY` | `'Array'` | 陣列 |
| `ARRAY_STRING` | `'StringArray'` | 字串或字串陣列（`createConfig().get(keys)` 用） |
| `ARRAY_HTML_ELEMENT` | `'HTMLElementArray'` | 元素陣列 |
| `STRING_NON_BLANK` | `'NonBlankString'` | 去空白後非空字串 |

## 環境 token

| 常量 | 值 | 說明 |
|---|---|---|
| `DOCUMENT` | `'document'` | `checkElements` 接受的根 |
| `HTML_ELEMENT` | `'HTMLElement'` | `Element` 或 `DocumentFragment`（見 `isElement`） |

## 標籤名常量

| 常量 | 值 |
|---|---|
| `HTML_INPUT` | `'input'` |
| `HTML_SELECT` | `'select'` |
| `HTML_CHECKBOX` | `'checkbox'`（**是 `input` 的 `type`，不是標籤名**） |
| `HTML_RADIO` | `'radio'`（同上） |

`HTML_CHECKBOX` / `HTML_RADIO` 要餵給 `elementIs(el, type)`——它同時比對 `tagName` 與 `el.type`，所以傳 `'checkbox'` 能命中 `input[type=checkbox]`。直接拿去比 `tagName` 會永遠 false。

## 錯誤哨兵

| 常量 | 值 | 說明 |
|---|---|---|
| `ERROR_CONFIRM` | `'CONFIRM'` | 用戶取消確認時 `reject(new Error(ERROR_CONFIRM))` |
| `ERROR_VALIDATION` | `'VALIDATION'` | 校驗失敗時 `throw new Error(ERROR_VALIDATION)` |

這兩個**本倉庫內沒有任何引用**，純粹是給下游的約定：`ajax-form` 以 `error.message === ERROR_CONFIRM` / `case ERROR_VALIDATION` 分流。要改值必須同步所有下游，等同破壞性變更。

## 示例

```js
import { assert, isElement } from 'js-common/js-utils'
import { HTML_ELEMENT } from 'js-common/js-constant'

assert(isElement(el), 1, HTML_ELEMENT)
// 失敗時：Error: Argument 1 must be HTMLElement
```

```js
import { ERROR_VALIDATION } from 'js-common/js-constant'

try {
  submit()
} catch (error) {
  if (error.message === ERROR_VALIDATION) showFieldErrors()
}
```

## 相關

- [ADR-0006 assert 風格的錯誤處理](../adr/0006-assert-style-error-handling.md)
*（内容由AI生成，仅供参考）*
