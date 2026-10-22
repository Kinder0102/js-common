---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_deec08edce3011f1aa22525400393706
    ReservedCode1: xXOEU2+AU11fqQpNNct/YVrf+GoNGGATR72tPvII3Glv3R36m536HZjTvIP2mK/I1PEiAvN10WIoeZWhNO9qJjaiOWZvr4fIeugcDeSBB0I0LjRa4E+mJSL2CwXiZEdfBhQw/nAdPd6O/v4FJeyoB/G44xWYgIvxK6PjRXszX2eZbt994Eoouz0HydA=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_deec08edce3011f1aa22525400393706
    ReservedCode2: xXOEU2+AU11fqQpNNct/YVrf+GoNGGATR72tPvII3Glv3R36m536HZjTvIP2mK/I1PEiAvN10WIoeZWhNO9qJjaiOWZvr4fIeugcDeSBB0I0LjRa4E+mJSL2CwXiZEdfBhQw/nAdPd6O/v4FJeyoB/G44xWYgIvxK6PjRXszX2eZbt994Eoouz0HydA=
---

# 0008 測試策略

## 狀態

已接受。2025-10 落地首版。

## 背景

在本篇之前，本倉庫**沒有任何自動化測試**：驗證手段只有 `npm run build` 與 `dist/test.html` 手工點一遍。而它的對外契約恰恰是最容易靜默壞掉的部分——`data-*` DSL、`dom-helper-*` 取值、ValueProcessor pipeline 順序，任何一處改動都不會報錯，只會讓下游頁面渲染成錯的東西。

同時這個倉庫有一個硬約束：**零運行時依賴**，且下游三個套件都以子路徑 import `src/` 裏的原始文件。測試設施不能把 `src/` 拖進任何編譯或轉譯流程。

## 決策

四條原則，缺一不可。

### 1. 測試棧：`node:test` + `jsdom`

- 用 Node 內建 `node:test` / `node:assert`，不引入 mocha / jest / vitest。
- 用 `jsdom` 提供 `document` / `window`，由 `test/setup.js` 以 `--import` 預加載，測試文件裏直接使用全局 `document`。
- `jsdom` 是唯一的測試期依賴，寫進 `devDependencies`。`dependencies` 仍然爲空。

理由：兩個依賴就能覆蓋全部需求；`--test` 模式下**每個測試文件獨立進程**，正好規避模塊級緩存（ADR-0007）與 `globalThis` 副作用在文件之間串味。

### 2. 只測公開面

`exports` 裏列出的 10 個子路徑就是測試的邊界。私有函數、模塊級緩存內部結構、`#` 私有字段一律不直接斷言。

代價是部分邏輯只能間接覆蓋（典型：`js-dom-helper` 的 `processEnum` / `replaceString` / `processNumber`）。這是**有意的**：一旦爲可測性加導出，這些函數就成了事實上的公開 API，本倉庫再也不能自由重構。

### 3. characterization test 鎖現狀

測試的目的不是「證明代碼正確」，而是「證明行爲沒變」。當前實現裏存在已知缺陷（見 `docs/KNOWN-GAPS.md`），測試**按缺陷現狀寫斷言**，並在用例裏用註釋標明這是一條 characterization：

- `datasetHelper.getValue` 用 `||` 兜底，`0` / `''` / `false` 會落回默認值。
- `createProperty` / `createTemplateHandler` / `createFilter` 的模塊級緩存會讓同一 DSL 字符串返回**同一個對象**，調用方改動會污染後續調用。
- `ValueProcessor` 的 pipeline 執行順序是 `type → transform → format`（與常量宣告的書寫順序一致）。
- `PluginHost.ready()` 在插件超時後仍然 resolve。

缺陷本身記在 `docs/KNOWN-GAPS.md`，測試只負責「鎖住」，不負責「修正」。修缺陷時會有一批測試變紅——這是預期信號，屆時同步改斷言並從 KNOWN-GAPS 刪條目。

### 4. `js-dom-helper` 按黑盒測

只斷言可觀察結果：寫入的 class（`dom-helper-create-*` / `dom-helper-filled`）、`dom-helper-index` 系列取值、`setValueToElement` / `clearElement` 之後的 DOM 形狀。不斷言內部調用次數、不斷言私有方法、不 mock 內部協作者。

## 佈局

```
test/
  setup.js              # jsdom 全局裝配
  helpers/dom.js        # mount / cleanup：每個用例獨立的 DOM fixture
  <module>.test.js      # 與 src/<module>.js 一一對應
```

- 文件名鏡像 `src/`，`describe` / `it` 標題用英文，涉及缺陷的註釋用繁體中文。
- 每個用例自帶 fixture，`afterEach` 統一清理，不共享 DOM 狀態。
- 模塊級緩存相關的用例單獨成組，避免與純函數用例混跑產生順序依賴。

## npm 腳本

| 腳本 | 內容 |
|---|---|
| `npm test` | `node --import ./test/setup.js --test test/` |
| `npm run test:coverage` | 同上 + `--experimental-test-coverage` |

首版**不設覆蓋率硬閘**。基線：行 97.45%、分支 93.74%、函數 92.24%。覆蓋率只作爲報告輸出，避免爲了數字去測私有實現——那與原則 2 直接衝突。若將來接入 CI，閘門應設在「不得低於基線」而非絕對值。

## 後果

1. 改動 `src/` 後有了可執行的回歸信號，`dist/test.html` 降級爲補充手段而非唯一驗證。
2. 私有實現受限：不能爲了方便測試而加導出。
3. 缺陷被固化：KNOWN-GAPS 裏的條目在修復前，測試會把錯誤行爲當成契約保護起來。這是有意的——先鎖住，再改。
4. 測試文件與源文件同層命名，新增模塊時**必須**補對應測試，否則 `test/` 與 `src/` 的鏡像關係斷裂。
*（内容由AI生成，仅供参考）*
