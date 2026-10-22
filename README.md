# js-common

瀏覽器端 ES Module 工具集：用 `data-*` 屬性把 HTML 聲明成模板，配合統一的取值、格式化與插件機制，把「資料填進 DOM」收成可宣告的契約。零運行時依賴，ESM only。

## 安裝

```json
"dependencies": {
  "js-common": "github:Kinder0102/js-common#v1.0.0"
}
```

**務必鎖定 tag**（`#v1.0.0`）。不寫 tag 等於每次 `npm install` 都跟 `main` 的最新提交走，無法回滾。不要裸寫 `"js-common": "^1.0.0"`，這個名字沒有 scope，公共 registry 上可能裝到別人的包。

## 模塊總覽

| 子路徑 | 分層 | 一句話 |
|---|---|---|
| [`js-common/js-constant`](./docs/api/js-constant.md) | L0 | 斷言型別 token 與標籤名常量 |
| [`js-common/js-utils`](./docs/api/js-utils.md) | L1 | 型別判定、`assert`、字串與格式化、流程控制 |
| [`js-common/js-cache`](./docs/api/js-cache.md) | L2 | 鍵值緩存與元素實例表 |
| [`js-common/js-dom-utils`](./docs/api/js-dom-utils.md) | L2 | class、查詢、顯隱、事件、MutationObserver |
| [`js-common/js-dataset-helper`](./docs/api/js-dataset-helper.md) | L2 | `data-{prefix}-*` ↔ `dataset` 互轉 |
| [`js-common/js-config`](./docs/api/js-config.md) | L3 | 多來源配置取值 |
| [`js-common/js-dsl-factory`](./docs/api/js-dsl-factory.md) | L3 | DSL 解析、模板選取、條件編譯 |
| [`js-common/js-plugin`](./docs/api/js-plugin.md) | L3 | 宿主與插件的 CustomEvent 握手 |
| [`js-common/js-value-processor`](./docs/api/js-value-processor.md) | L4 | `type → transform → format` 取值管線 |
| [`js-common/js-dom-helper`](./docs/api/js-dom-helper.md) | L5 | 把資料渲染進 DOM 的執行器 |

依賴只能由上往下，禁止反向或同層互引。

## 核心概念

**prefix** —— 每個消費方給自己的 `data-*` 命名空間取前綴（`af`、`tg`）。`createDatasetHelper(prefix)` 負責在 `data-af-value` 與 `dataset.afValue` 之間互轉，同頁共存靠前綴隔離。

**`data-*` DSL** —— `|` 分 token、`:` 分鍵值、`,` 分多值、`\` 轉義。如 `data-af-template="row:#row|empty:#empty"`。語法見 [`createProperty` 契約](./docs/api/js-dsl-factory.md#契約)。

**取值管線** —— `type → transform → format` 三級順序執行，每級按 handlerKey 取 handler，未命中走 `fallback`，回傳 `undefined` 則透傳。見 [`ValueProcessor`](./docs/api/js-value-processor.md)。

**插件握手** —— 宿主與插件互不 import，靠 `js-plugin:check` / `js-plugin:register` 兩個事件完成握手。見 [`js-plugin`](./docs/api/js-plugin.md)。

## 文檔

| 文檔 | 內容 |
|---|---|
| [`docs/api/`](./docs/api/README.md) | 對外 API 全量條目：一頁一模塊、一節一符號 |
| [`docs/adr/`](./docs/adr/) | 8 篇決策記錄：無根入口、`data-*` 即契約、可逆 class 標記、`piplines` 拼寫凍結、插件握手、`assert` 風格、模塊級緩存、測試策略 |
| [`docs/KNOWN-GAPS.md`](./docs/KNOWN-GAPS.md) | 已知缺陷與待辦（改代碼前必看） |
| [`GLOSSARY.md`](./GLOSSARY.md) | 術語表 |
| [`AGENTS.md`](./AGENTS.md) | 接手入口、分層與禁區 |

## 注意

- **沒有根入口**：`import 'js-common'` 會報 `ERR_PACKAGE_PATH_NOT_EXPORTED`，必須寫完整子路徑，如 `js-common/js-utils`。
- **只有兩個默認導出**：`js-dom-helper`、`js-value-processor`；其餘皆具名導出，混用會拿到 `undefined`。
- **`dist/` 不入版控**：從 GitHub 安裝只拿到 `src/`。`dist/test.html` 是手工驗證頁，屬於非正式面。
- **構造選項拼寫是 `piplines`**（小寫 p），歷史遺留，見 [ADR-0004](./docs/adr/0004-pipeline-and-piplines-freeze.md)。
- **`startsWith` / `endsWith` 不返回布爾值**：返回 `{ exist, value }`，別跟 `String.prototype` 同名方法混淆。
- **`js-dom-helper` 是黑盒**：只依賴對外可觀察的行為，內部實現不受契約保護。
- **測試只測公開面**：`npm test`（node:test + jsdom）、`npm run test:coverage` 出報告；已知缺陷按現狀以 characterization test 鎖住，見 [ADR-0008](./docs/adr/0008-testing-strategy.md)。改完先跑測試，再跑 `npm run build`。
