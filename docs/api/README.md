---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: dbd2d77e320edcf371fe3df57dbf0677_92531318ce2d11f1a475525400248c00
    ReservedCode1: ZSPb5H9zrXso06GxRgki4/E6G3WaoCSQuooEZ5hMg+yl2adzJeP3hpKo0fViPJXKqHuAzRmXRbvU2WBY3Ad/NsDRmAd6adYqcrg9lfJOBpy/GKOpcnWm7dktjssSS3K+7XXq5MuMNPFAgEjxYGCMEyBe37zz9N3Ilh12hLtuMic8RM9L/6/JtM8ANpU=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: dbd2d77e320edcf371fe3df57dbf0677_92531318ce2d11f1a475525400248c00
    ReservedCode2: ZSPb5H9zrXso06GxRgki4/E6G3WaoCSQuooEZ5hMg+yl2adzJeP3hpKo0fViPJXKqHuAzRmXRbvU2WBY3Ad/NsDRmAd6adYqcrg9lfJOBpy/GKOpcnWm7dktjssSS3K+7XXq5MuMNPFAgEjxYGCMEyBe37zz9N3Ilh12hLtuMic8RM9L/6/JtM8ANpU=
---

# API 文檔索引

`js-common` 的對外契約，一頁一子路徑、一條目一符號。全部內容以 `src/` 當下的實現為準，不描述「應該怎樣」。

## 讀法

每頁固定三段：

1. **契約** —— 這個模塊不可違背的前提（命名、語義、標記形式）
2. **符號條目** —— 簽名、參數、回傳、副作用、拋錯，一個符號一個小節
3. **⚠ 注意** —— 與直覺相反的實際行為，改代碼前必看

先讀契約再讀條目：多數誤用來自「以為它是別的東西」，不是參數寫錯。

## 模塊索引

| 子路徑 | 分層 | 導出 | 一句話 |
|---|---|---|---|
| [`js-common/js-constant`](./js-constant.md) | L0 | 具名常量 | 斷言型別 token 與標籤名常量 |
| [`js-common/js-utils`](./js-utils.md) | L1 | 具名函數 | 型別判定、`assert`、字串與格式化、流程控制 |
| [`js-common/js-cache`](./js-cache.md) | L2 | `createCache` / `createInstanceMap` | 閉包級鍵值緩存與元素實例表 |
| [`js-common/js-dom-utils`](./js-dom-utils.md) | L2 | 具名函數 | class、查詢、顯隱、事件、MutationObserver |
| [`js-common/js-dataset-helper`](./js-dataset-helper.md) | L2 | `createDatasetHelper` | `data-{prefix}-*` ↔ `dataset` 雙向映射 |
| [`js-common/js-config`](./js-config.md) | L3 | `createConfig` | 多來源配置取值 |
| [`js-common/js-dsl-factory`](./js-dsl-factory.md) | L3 | `createProperty` / `createTemplateHandler` / `createFilter` | DSL 解析、模板選取、條件編譯 |
| [`js-common/js-plugin`](./js-plugin.md) | L3 | `PluginHost` / `Plugin` | 宿主與插件的 CustomEvent 握手 |
| [`js-common/js-value-processor`](./js-value-processor.md) | L4 | `default` `ValueProcessor` | `type → transform → format` 取值管線 |
| [`js-common/js-dom-helper`](./js-dom-helper.md) | L5 | `default` `DOMHelper` | 把資料渲染進 DOM 的執行器 |

依賴方向只能由上往下：`dom-helper → value-processor → dsl-factory / config / plugin → dom-utils / cache / dataset-helper → utils → constant`。

## 符號索引

### js-constant

[斷言型別 token](./js-constant.md#斷言型別-token)（`OBJECT` `FUNCTION` `ARRAY` `ARRAY_STRING` `ARRAY_HTML_ELEMENT` `STRING_NON_BLANK`）、
[環境 token](./js-constant.md#環境-token)（`DOCUMENT` `HTML_ELEMENT`）、
[標籤名常量](./js-constant.md#標籤名常量)（`HTML_INPUT` `HTML_SELECT` `HTML_CHECKBOX` `HTML_RADIO`）、
[錯誤哨兵](./js-constant.md#錯誤哨兵)（`ERROR_CONFIRM` `ERROR_VALIDATION`）

### js-utils

**原生別名**：[`isArray`](./js-utils.md#isarrayvalue) [`objectKeys`](./js-utils.md#objectkeysobj) [`objectValues`](./js-utils.md#objectvaluesobj) [`objectEntries`](./js-utils.md#objectentriesobj)

**型別判斷**：[`assert`](./js-utils.md#assertcondition-message-type) [`hasValue`](./js-utils.md#hasvaluevalue) [`isBoolean`](./js-utils.md#isbooleanvalue) [`isTrue`](./js-utils.md#istruevalue) [`isInteger`](./js-utils.md#isintegervalue) [`isString`](./js-utils.md#isstringstr) [`isNotBlank`](./js-utils.md#isnotblankstr) [`isFunction`](./js-utils.md#isfunctionfunc) [`isPromise`](./js-utils.md#ispromisep) [`isObject`](./js-utils.md#isobjectobj) [`isElement`](./js-utils.md#iselementel) [`isURL`](./js-utils.md#isurlstr)

**轉換**：[`toArray`](./js-utils.md#toarrayvalue-mapfn-thisarg) [`valueToString`](./js-utils.md#valuetostringvalue) [`stringToValue`](./js-utils.md#stringtovaluestr)

**字串**：[`split`](./js-utils.md#splitstr-delimiter) [`startsWith`](./js-utils.md#startswithstr-mark) [`endsWith`](./js-utils.md#endswithstr-mark) [`toCamelCase`](./js-utils.md#tocamelcasestr) [`toKebabCase`](./js-utils.md#tokebabcasestr)

**物件**：[`findObjectValue`](./js-utils.md#findobjectvalueobj-key)

**格式化**：[`formatNumber`](./js-utils.md#formatnumbervalue-n-x) [`formatString`](./js-utils.md#formatstringtemplate-args) [`formatDate`](./js-utils.md#formatdatevalue-format) [`jsonToQueryString`](./js-utils.md#jsontoquerystringjsonobject) [`addBasePath`](./js-utils.md#addbasepathurl-basepath)

**流程控制**：[`delay`](./js-utils.md#delaytime) [`debounce`](./js-utils.md#debouncecallback-delay--leading-trailing) [`throttle`](./js-utils.md#throttlecallback-wait--leading-trailing) [`abortable`](./js-utils.md#abortablepromisefn--abort)

### js-cache

[`createCache`](./js-cache.md#createcache) [`createInstanceMap`](./js-cache.md#createinstancemapconditioncallback-createcallback)

### js-dom-utils

[`elementIs`](./js-dom-utils.md#elementisel-type) [`hasClass`](./js-dom-utils.md#hasclassel-classname) [`addClass`](./js-dom-utils.md#addclassel-classname) [`removeClass`](./js-dom-utils.md#removeclassel-classname) [`querySelector`](./js-dom-utils.md#queryselectorselectors-el-includeself) [`getTargets`](./js-dom-utils.md#gettargetstargets-el) [`showElements`](./js-dom-utils.md#showelementselements) [`hideElements`](./js-dom-utils.md#hideelementselements) [`enableElements`](./js-dom-utils.md#enableelementselements) [`disableElements`](./js-dom-utils.md#disableelementselements) [`registerMutationObserver`](./js-dom-utils.md#registermutationobservercallback-target) [`registerAttributeChange`](./js-dom-utils.md#registerattributechangeel-attrname-callback) [`registerEvent`](./js-dom-utils.md#registereventelements-eventname-callback-options) [`triggerEvent`](./js-dom-utils.md#triggereventelements-eventname-payload) [`stopDefaultEvent`](./js-dom-utils.md#stopdefaulteventevent)

### js-dataset-helper

[`createDatasetHelper`](./js-dataset-helper.md#createdatasethelperprefix) →
[`keyToInputName`](./js-dataset-helper.md#keytoinputnamekey) [`keyToAttrName`](./js-dataset-helper.md#keytoattrnamekey) [`keyToDatasetName`](./js-dataset-helper.md#keytodatasetnamekey) [`datasetNameToKey`](./js-dataset-helper.md#datasetnametokeydatasetname) [`getKeys`](./js-dataset-helper.md#getkeysel-prefix) [`getValue`](./js-dataset-helper.md#getvalueel-key-defaultvalue) [`setValue`](./js-dataset-helper.md#setvalueel-key-value) [`resolveValues`](./js-dataset-helper.md#resolvevaluesel-key-additional)

### js-config

[`createConfig`](./js-config.md#createconfigsources) → `get(keys)`

### js-dsl-factory

[`createProperty`](./js-dsl-factory.md#createpropertyprops) [`createTemplateHandler`](./js-dsl-factory.md#createtemplatehandlertemplateprop) [`createFilter`](./js-dsl-factory.md#createfilterfilterprop)

### js-plugin

[`PluginHost`](./js-plugin.md#pluginhost)（[`addPlugin`](./js-plugin.md#addpluginpluginroot-timeoutms-intervalms) [`ready`](./js-plugin.md#ready) [`broadcast`](./js-plugin.md#broadcasteventname-payload)）、
[`Plugin`](./js-plugin.md#plugin)（[`broadcast`](./js-plugin.md#broadcasteventname-payload-1)）

### js-value-processor

[`ValueProcessor`](./js-value-processor.md#valueprocessor)（[`process`](./js-value-processor.md#processel-value-key) [`addPipeline`](./js-value-processor.md#addpipelinepipelinekey-callback) [`addHandler`](./js-value-processor.md#addhandlerpipelinekey-handlerkey-callback)）

### js-dom-helper

[`DOMHelper`](./js-dom-helper.md#new-domhelperopts)（[`setValueToElement`](./js-dom-helper.md#setvaluetoelementel-value-opts) [`clearElement`](./js-dom-helper.md#clearelementel-group)）

## `data-*` DSL 速查

語法只在一處定義：[`createProperty` 的契約](./js-dsl-factory.md#契約)。摘要：

| 記號 | 含義 | 例子 |
|---|---|---|
| `\|` | 多個 token | `template:#a\|empty:#b` |
| `:` | 第一個未轉義的冒號分鍵與值 | `type:number` |
| `,` | 一個鍵對應多值 | `value:a,b` |
| `\` | 轉義下一個字元 | `title:a\:b` |
| 無鍵 token | 進 `value` 陣列 | `user.name` |

- 只有**第一個**未轉義冒號分鍵值；鍵裡不能有冒號。
- 以 `http://` 開頭的值不當 DSL 解析，直接進 `value`。
- `!` 只有出現在**開頭**才是取反，寫在比較運算符之後會被覆蓋。

## 使用方須知

### 只走子路徑

```js
import { createProperty } from 'js-common/js-dsl-factory'
import DOMHelper from 'js-common/js-dom-helper'
```

`import 'js-common'` 會拋 `ERR_PACKAGE_PATH_NOT_EXPORTED`，本倉庫沒有也不打算有根入口，見 [ADR-0001](../adr/0001-no-barrel-entry.md)。

**具名 vs 默認**：只有 `js-dom-helper` 與 `js-value-processor` 是 `export default`，其餘全是具名導出。混用會拿到 `undefined`。

### 依賴來源

從 GitHub 安裝，沒有 registry 版本、沒有 semver。**務必鎖 tag 或 commit**：

```json
{ "js-common": "github:Kinder0102/js-common#v1.0.0" }
```

不鎖等於每次 `npm install` 都跟 `main` 最新提交，無法回滾。改動本倉庫的鍵名、預設值、導出名、事件名即等於對所有下游做破壞性變更。

### 下游各自的前綴

| 下游 | prefix |
|---|---|
| `ajax-form` | `af` |
| `toggle` | `tg` |
| `pagination` | 自定 |

前綴由下游構造時傳入，本倉庫不猜。同頁共存靠前綴隔離 `data-*` 命名空間。

### 三種接入形態

```js
// 1. 只解析屬性
import { createProperty } from 'js-common/js-dsl-factory'
const props = createProperty(el.dataset.afValue)   // { type: [], value: ['userName'] }

// 2. 完整綁定
import DOMHelper from 'js-common/js-dom-helper'
const helper = new DOMHelper({ prefix: 'af', basePath: '/api' })
helper.setValueToElement(container, data)
helper.clearElement(container)

// 3. 自定義取值處理
import ValueProcessor from 'js-common/js-value-processor'
const processor = new ValueProcessor({ key: 'value', prefix: 'af' })
processor.addHandler('transform', 'upper', value => String(value).toUpperCase())
processor.process(el, value)
```

`addHandler` 是三個參數：`(stage, handlerKey, fn)`，`handlerKey` 對應 DSL 的 `type:xxx` 中的 `xxx`，未命中走該 stage 的 `fallback`。構造選項名是 `pipelines`（複數），見 [ADR-0004](../adr/0004-pipeline-and-handler-fallback.md)。

### 不要做的事

| 不要 | 原因 |
|---|---|
| import `js-common/dist/*` | 不是發佈面，隨時可能消失 |
| 依賴 `globalThis.DOMHelper` / `globalThis.ValueProcessor` | 模塊載入副作用，Node 環境沒有；正式途徑是 import |
| 讀 `dom-helper-create-*` / `dom-helper-filled` | 框架私有狀態，見 [js-dom-helper](./js-dom-helper.md#契約) |
| 讀 `data-{p}-current-index` | 只寫不讀的遺留鍵，見 [KNOWN-GAPS #10](../KNOWN-GAPS.md#10-current-index-只寫不讀) |
| 假設 `ready()` 代表插件全部就緒 | 超時也會 resolve，見 [KNOWN-GAPS #6](../KNOWN-GAPS.md#6-pluginhostready-的-resolve-不等於插件已就緒) |
| 在 DSL 字串裡拼易變資料 | 解析結果進模塊級緩存，見 [KNOWN-GAPS #8](../KNOWN-GAPS.md#8-模塊級無界緩存) |

### 跨包改動清單

動了 `src/` 之後：

1. `npm run build` 是否還通過
2. 新增／改名的 `data-*` 鍵是否已登記到 [js-dom-helper](./js-dom-helper.md#標記與關鍵字總表)
3. 導出名有沒有變（下游 import 會靜默拿到 `undefined`）
4. 三個下游的 prefix 是否仍隔離
5. 需要不兼容變更時，先寫新的 ADR，不要改舊的

## 相關

- [ADR 決策記錄](../adr/)
- [KNOWN-GAPS 已知缺口](../KNOWN-GAPS.md)
- [GLOSSARY 術語表](../../GLOSSARY.md)
- [AGENTS.md 接手入口](../../AGENTS.md)
*（内容由AI生成，仅供参考）*
