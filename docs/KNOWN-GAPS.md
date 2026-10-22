# 已知缺口

本文件只記錄**當前代碼與配置的缺陷**，不含設計討論。接手時先讀一遍：這些是「看起來該修、但修了會影響下游」或「已確認但不影響運行」的問題。

2025-10 補齊測試（`test/` + `node:test` + `jsdom`）時**未改動 `src/` 任何一行**，只新增測試、`devDependencies` 與文檔。以下條目除特別標註外仍爲待辦。

## 打包與入口

### 1. `main` 指向不存在的文件

`package.json` 的 `"main": "index.js"`，但倉庫沒有 `index.js`。以 CommonJS / 默認入口方式解析會失敗。

### 2. `exports` 缺根入口

`exports` 只列了 10 個子路徑，沒有 `"."`。因此 `import 'js-common'` 會拋 `ERR_PACKAGE_PATH_NOT_EXPORTED`。下游全部走子路徑，暫時無人踩到，但這意味着「沒有默認導出面」是既成事實，而非設計聲明。

> 原第 3 條（`build.js` 的 `#` / `#libs` alias）已移除：兩條 alias 從未被任何源碼匹配，刪除後 21 個產物逐位元組一致。編號保留空白，以免破壞 `docs/api/` 與 ADR 中的錨點引用。

### 4. `files` 字段缺失；測試只覆蓋公開面

`package.json` 沒有 `files`，發佈/安裝面完全依賴 `.gitignore` 與默認行爲。

測試已於 2025-10 補齊：`npm test` / `npm run test:coverage` 兩條腳本，`test/` 與 `src/` 一一對應，`jsdom` 進 `devDependencies`。但依 ADR-0008，測試**只測公開面**，`js-dom-helper` 按黑盒處理，私有函數與若干分支仍未覆蓋，明細見文末「測試覆蓋缺口」。

## 公開 API

### 5. `pipelines` 命名（已於 2026-10 修正，編號留空保錨點）

歷史上是 `piplines` / `addPipline`，曾以「下游已按此書寫」爲由凍結。2026-10 全盤核查推翻了該前提：三下游與業務項目零真實引用，`ajax-form` 只傳 `handlers`。現已改爲標準拼寫 `pipelines` / `addPipeline`，未保留別名。見 ADR-0004「修訂」。

### 6. `PluginHost.ready()` 的 resolve 不等於「插件已就緒」

`addPlugin` 超時後只做 `console.error('[PluginHost] Plugin failed to register in time.')`：清掉輪詢、不 reject、不拋錯，也不帶插件標識。`ready()` 因爲輪詢集合歸零而正常 resolve。

調用方若把 `await host.ready()` 當作「全部插件註冊完成」，在超時場景下會誤判爲成功。寫法上應把 `ready()` 理解爲「輪詢已結束」。

## 實現脆弱點

### 7. `formatDate` 依賴 `RegExp.$1`

`js-utils` 的 `formatDate` 用 `RegExp.$1` 讀取上一次匹配結果。`RegExp.$n` 是全局靜態屬性，在重入或多段格式字符串連續替換時可能被其它正則匹配覆蓋，導致格式化結果串味。

### 8. 模塊級無界緩存

`js-dsl-factory` 內有三個模塊級緩存：`PROPERTY_CACHE`、`TEMPLATE_CACHE`、`FILTER_CACHE`。它們以 DSL 字符串爲鍵，只增不減。長生命週期頁面裏若 DSL 字符串是動態生成的（含數據內容），會持續增長。

這是有意的性能取捨，見 ADR-0007；但需知曉「DSL 字符串不要拼接易變數據」這條隱含約束。

### 9. `createConfig` 與 `findObjectValue` 的取值回退

- `createConfig()` 用 `arguments` 收集 source，不是 rest 參數，`createConfig()` 空調用合法但無意義。
- `get('user.name')` 返回的對象鍵名是路徑**最後一段**（`{ name: ... }`），點號路徑只在讀取時用。
- `findObjectValue` 在點號路徑（`a.b.c`）**全部 miss** 時會回退爲「取最後一段鍵名在頂層對象裏查」。因此 `{ a: { b: 1 }, c: 2 }` 查 `a.b.c` 會命中頂層的 `c`。跨層同名鍵可能取錯。
- 同類問題：`datasetHelper.getValue(el, key, defaultValue)` 用 `||` 兜底，值爲 `0`、`''`、`false` 時會落回 `defaultValue`。需要區分「沒寫」與「寫了個假值」時不要用它。

## 死代碼

### 10. `current-index` 只寫不讀

`js-dom-helper` 中 `CURRENT_INDEX_KEY = 'current-index'`，僅在數組渲染時 `setValue(el, 'current-index', currentIndex)` 寫入，倉庫內與三個下游均無任何讀取方。屬於遺忘的遺留屬性，可刪；保留亦無害，但它寫在 DOM 上會污染容器 dataset。

> 注意：`array-seq` 不是死代碼，它是 `dom-helper-index` 取值的底座，刪掉會連帶破壞索引功能。

## 測試覆蓋缺口

首版基線（2025-10，201 個用例，`npm run test:coverage`）：

| 指標 | 全倉庫 | 最低模塊 |
|---|---|---|
| 行 | 97.45% | `js-dom-helper` 92.48% |
| 分支 | 93.74% | `js-dom-helper` 70.93% |
| 函數 | 92.24% | `js-dom-helper` 70.18% |

不設硬閘，理由見 ADR-0008。以下是**已知測不到 / 尚未覆蓋**的面，屬記錄而非待辦隊列：

| 面 | 位置 | 爲何未覆蓋 |
|---|---|---|
| `processEnum` 全函數 | `js-dom-helper` | 只經 `data-*-enum` 進入，且優先在 `window[enumProps]` 上找命名對象；需要先釘死 enum 的 DSL 寫法才能穩定測 |
| `replaceString` 的 `pattern` 分支 | `js-dom-helper` | 需 `typeFormat` 提供 `pattern:` 才觸發，屬未文檔化的用法 |
| `processNumber` 的 `* / + -` 修飾 | `js-dom-helper` | 同上，`typeFormat` 未在 API 文檔中定義寫法 |
| 嵌套數組 → `DocumentFragment` 分支 | `js-dom-helper#setArrayToElement` | 需要 `array-value` 指向數組字段，模板結構也需配合，屬黑盒可測但未測 |
| 無模板時直填 `input` / `select` | `js-dom-helper#setArrayToElement` | 同上，未測 |
| `arrayValues`（屬性值是數組）分支 | `js-dom-helper#setValue` | 需要一個元素同時命中多個數組字段，構造成本高 |
| `dom-helper-remove` 標記清理 | `js-dom-helper#clearElement` | 倉庫內無任何地方寫入該 class，等於死分支 |
| `throttle` 的 `leading` 生效分支 | `js-utils` | 首版只鎖了 `leading:false` 下首次調用被丟棄的行爲 |
| `filter` 值類型轉換的邊角 | `js-dsl-factory#stringToValue` | `'true'` / `'false'` / 純數字以外的輸入未逐個覆蓋 |

這些行爲目前**沒有保護**：改動時請以 `docs/api/` 的契約描述爲準，或先補測試再改。

