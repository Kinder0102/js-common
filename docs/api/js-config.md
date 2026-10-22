---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_96685910ce2d11f1a475525400248c00
    ReservedCode1: qBmVp3wGkl0fezUOhE+7Mp7q51P//vDYKxiPFRXmMc6+Ip4GKmiAw6+tKgDAScXJQHWLFmOFtzHBjwzK8IRoLm+Hd5ngL3NKQ+VON/fN7MpeomRaN4td9vcArfoxcb/rfjzu7XZp3DBNACFpzoAcz3Xp5udfFI8KVBYqR3V4VInnxirnLgEIF6ryKCU=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_96685910ce2d11f1a475525400248c00
    ReservedCode2: qBmVp3wGkl0fezUOhE+7Mp7q51P//vDYKxiPFRXmMc6+Ip4GKmiAw6+tKgDAScXJQHWLFmOFtzHBjwzK8IRoLm+Hd5ngL3NKQ+VON/fN7MpeomRaN4td9vcArfoxcb/rfjzu7XZp3DBNACFpzoAcz3Xp5udfFI8KVBYqR3V4VInnxirnLgEIF6ryKCU=
---

# js-config

多來源配置讀取：依序在多個物件裡找同一個鍵，取第一個命中的。

- 入口：`import { createConfig } from 'js-common/js-config'`
- 依賴：`js-constant`、`js-utils`
- 分層：L3

## 契約

- 來源是**位置參數**（`createConfig(a, b, c)`），用 `arguments` 收集，不是陣列、不是物件包裝。
- 前一個來源有值就停，不做深度合併，不回填後面的來源。
- 回傳物件的鍵名是**路徑最後一段**，不是完整路徑——點號路徑只在讀取時有效。

---

## createConfig(...sources)

```js
function createConfig(...sources: object[]): { get(keys): object }
```

### 參數

| 名稱 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `sources` | `object`（可多個） | 是（但可為 0 個） | 依優先序排列的配置來源 |

### 回傳

| 成員 | 簽名 | 說明 |
|---|---|---|
| `get` | `(keys: string \| string[]) => object` | 逐鍵查找，回傳 `{ [最後一段鍵名]: 值 }` |

### 回傳值的形狀

| `get` 的入參 | 回傳 |
|---|---|
| `'user.name'` | `{ name: 值 }` |
| `['user.name', 'theme']` | `{ name: 值, theme: 值 }` |
| 找不到的鍵 | 該鍵不出現在回傳物件裡（不會是 `undefined` 鍵） |

### 拋錯

`keys` 內任一項是空字串或非字串：`Argument 0 must be StringArray or NonBlankString`。

### ⚠ 注意

- `createConfig()` 空調用合法，`get` 恆回傳 `{}`。
- 全 miss 時 `findObjectValue` 會退回「用最後一段鍵名在頂層查找」，所以 `get('a.b.c')` 可能取到頂層的 `c`。跨層同名鍵是主要陷阱，詳見 [`findObjectValue`](./js-utils.md#findobjectvalueobj-key)。
- 鍵名被壓平成最後一段，所以 `get(['a.name','b.name'])` 後者會覆蓋前者——同一層兩個 `name` 只能留一個。

### 示例

```js
import { createConfig } from 'js-common/js-config'

const defaultConfig = { theme: { color: 'blue' }, lang: 'zh' }
const pageConfig = { theme: { color: 'red' } }

const config = createConfig(pageConfig, defaultConfig)
config.get('theme.color')  // { color: 'red' }    ← 前一來源優先
config.get('lang')         // { lang: 'zh' }      ← 回落
config.get(['theme.color', 'lang'])
// { color: 'red', lang: 'zh' }
```
*（内容由AI生成，仅供参考）*
