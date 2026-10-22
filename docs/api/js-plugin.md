---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_97a476f1ce2d11f1a475525400248c00
    ReservedCode1: wfpSSrXoWGwRtdlLB9FqqZ4HUmlLNTAV5C23jx8Jr7Y9cTudHAnApO7yBeAcCIsvbvPvS1Y7X/5u6FStbvOOnfoTdd/uJX//vDDnoZC/HrcZ4iMFOdz6fo4I0HMD0ZnVLLnLXXJ2bjpIxxU4os0WEedBw6LU72499pIFZTVnLwRWFOlvHkzJ3i3IQSo=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_97a476f1ce2d11f1a475525400248c00
    ReservedCode2: wfpSSrXoWGwRtdlLB9FqqZ4HUmlLNTAV5C23jx8Jr7Y9cTudHAnApO7yBeAcCIsvbvPvS1Y7X/5u6FStbvOOnfoTdd/uJX//vDDnoZC/HrcZ4iMFOdz6fo4I0HMD0ZnVLLnLXXJ2bjpIxxU4os0WEedBw6LU72499pIFZTVnLwRWFOlvHkzJ3i3IQSo=
---

# js-plugin

宿主（`PluginHost`）與插件（`Plugin`）之間的 `CustomEvent` 握手協議。

- 入口：`import { PluginHost, Plugin } from 'js-common/js-plugin'`
- 依賴：`js-constant`、`js-utils`、`js-dom-utils`
- 分層：L3

## 契約

三段式握手，靠事件名約定，不共享任何物件：

| 事件 | 方向 | `detail` |
|---|---|---|
| `js-plugin:check` | 宿主 → 插件 | `{ systemRoot }` |
| `js-plugin:register` | 插件 → 宿主 | `{ pluginName, pluginRoot }` |

1. 宿主對 `pluginRoot` 每 `intervalMs` 派一次 `js-plugin:check`
2. 插件監聽 `check`，收到後把自己的 root 與名字回報給 `systemRoot`
3. 宿主收到 `register`，停止輪詢

- 事件**不冒泡**（`triggerEvent` 的 `CustomEvent` 未開 `bubbles`），所以必須對準具體元素派發，不能指望事件冒到 `document`。
- 兩邊都用元素當身分，不用 id、不用查詢。

---

## PluginHost

### new PluginHost(systemRoot)

```js
new PluginHost(systemRoot: Element)
```

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `systemRoot` | `Element` | 是 | 系統側根節點，也是 `register` 事件的接收點 |

- 回傳：實例
- 副作用：在 `systemRoot` 上註冊 `js-plugin:register` 監聽（無解綁）
- 拋錯：非元素 → `Argument 0 must be HTMLElement`

⚠ 事件綁在 `systemRoot` 上，插件回報時若 `systemRoot` 傳錯，宿主永遠收不到。

---

### addPlugin(pluginRoot, timeoutMs?, intervalMs?)

```js
addPlugin(pluginRoot: Element, timeoutMs?: number, intervalMs?: number): void
```

開始對某個插件輪詢握手。

| 參數 | 型別 | 必填 | 預設 | 說明 |
|---|---|---|---|---|
| `pluginRoot` | `Element` | 是 | — | 插件根節點 |
| `timeoutMs` | `number` | 否 | `5000` | 超時上限 |
| `intervalMs` | `number` | 否 | `100` | 輪詢間隔 |

- 回傳：無（**不回傳任何 handle**，無法取消單次 addPlugin）

### ⚠ 注意

超時只 `console.error('[PluginHost] Plugin failed to register in time.')`，**不 reject、不拋錯，也不帶插件標識**。多個插件同時超時時，日誌分不出是哪一個。

```js
const host = new PluginHost(document.querySelector('#app'))
host.addPlugin(document.querySelector('#plugin-a'))
await host.ready()
```

---

### ready()

```js
ready(): Promise<void>
```

等待所有 `addPlugin` 的輪詢結束。

- 回傳：`Promise<void>`；目前無輪詢時立即 resolve
- 副作用：每 50ms 檢查一次，直到輪詢集合清空

### ⚠ 注意

**resolve 不等於「插件已就緒」**，只等於「輪詢已結束」——超時也會讓集合清空並 resolve。要確認插件真的註冊成功，請自己檢查 `broadcast` 是否被回應，見 [KNOWN-GAPS #6](../KNOWN-GAPS.md#6-pluginhostready-的-resolve-不等於插件已就緒)。

---

### broadcast(eventName, payload?)

```js
broadcast(eventName: string, payload?: any): void
```

對**已註冊**的插件派事件。

- 回傳：無
- 副作用：逐個 `triggerEvent(pluginRoot, eventName, payload)`
- 拋錯：無（`eventName` 不校驗）

⚠ 同一個 `payload` 物件被多個插件共享引用，插件若就地改動會互相污染。
⚠ 未註冊成功的插件收不到任何訊息，`broadcast` 靜默丟棄。

| 情境 | 結果 |
|---|---|
| 插件已註冊 | 收到事件 |
| 插件仍在輪詢中 | 收不到，且不會補發 |
| 插件逾時 | 收不到 |

---

## Plugin

### new Plugin(pluginName, pluginRoot, initialize?)

```js
new Plugin(
  pluginName: string,
  pluginRoot: Element,
  initialize?: () => void | Promise<any>
)
```

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `pluginName` | `string` | 是 | 回報給宿主的名字 |
| `pluginRoot` | `Element` | 是 | 監聽 `check` 的元素 |
| `initialize` | `Function` | 否 | 註冊前的初始化；回傳 Promise 則等它完成才註冊 |

- 回傳：實例
- 副作用：在 `pluginRoot` 上註冊 `js-plugin:check` 監聽（無解綁）
- 拋錯：`pluginName` 非非空字串 → `Argument 0 must be NonBlankString`；`pluginRoot` 非元素 → `Argument 1 must be HTMLElement`

### 註冊時機

| `initialize` 回傳 | 註冊時機 |
|---|---|
| 非 Promise | 建構時立即註冊 |
| Promise | `then` 之後註冊；**reject 則永不註冊**（無 `catch`） |

---

### broadcast(eventName, payload?)

```js
broadcast(eventName: string, payload?: any): void
```

向所有已知宿主派事件。

| 狀態 | 行為 |
|---|---|
| 尚未連上任何宿主 | 放進佇列，等握手成功後補送 |
| 已連上 | 立即派給每個宿主 |

- 回傳：無
- 副作用：連上後依序重放**整個佇列**

### ⚠ 注意

- 佇列**只增不減**：重放後不清空，所以每次新的 `check` 都會把所有歷史訊息再送一遍，宿主會收到重複訊息。
- 佇列無上限，長期離線會持續吃記憶體。
- 未連線時 `broadcast` 不報錯、不回傳任何狀態，呼叫方無法得知訊息還在排隊。
- `#send` 對每個宿主派發**同一個 payload 引用**。

```js
const plugin = new Plugin('todo', document.querySelector('#todo'), async () => {
  await loadConfig()
})
plugin.broadcast('todo:refresh', { reason: 'init' })
```

---

## 生命週期總覽

```
宿主                                    插件
 │
 ├─ addPlugin(pluginRoot)               │
 │   setInterval(intervalMs)            │
 ├─ js-plugin:check ──────────────────▶ │  #pluginHosts.add(systemRoot)
 │                                      │  重放 #messages
 │ ◀──────────────────── js-plugin:register
 │   clearInterval / clearTimeout        │
 │   #plugins.set(pluginRoot, name)      │
 ├─ broadcast(...) ───────────────────▶ │  已連上，直接 #send
 │                                      │
 └─ ready() resolve（輪詢集合清空）      │
```

---

## 相關

- [ADR-0005 插件 CustomEvent 握手](../adr/0005-plugin-customevent-handshake.md)
- [KNOWN-GAPS 6. `ready()` 的 resolve 不等於插件已就緒](../KNOWN-GAPS.md#6-pluginhostready-的-resolve-不等於插件已就緒)
- [js-dom-utils](./js-dom-utils.md#triggereventelements-eventname-payload)
*（内容由AI生成，仅供参考）*
