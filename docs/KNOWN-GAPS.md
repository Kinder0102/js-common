# 已知缺口

本文件只記錄**當前代碼與配置的缺陷**，不含設計討論。接手時先讀一遍：這些是「看起來該修、但修了會影響下游」或「已確認但不影響運行」的問題。

本輪未改動任何代碼，以下均爲待辦。

## 打包與入口

### 1. `main` 指向不存在的文件

`package.json` 的 `"main": "index.js"`，但倉庫沒有 `index.js`。以 CommonJS / 默認入口方式解析會失敗。

### 2. `exports` 缺根入口

`exports` 只列了 10 個子路徑，沒有 `"."`。因此 `import 'js-common'` 會拋 `ERR_PACKAGE_PATH_NOT_EXPORTED`。下游全部走子路徑，暫時無人踩到，但這意味着「沒有默認導出面」是既成事實，而非設計聲明。

### 3. `build.js` 的 alias 已失效

```js
alias: {
  '#': path.resolve(__dirname, 'src'),
  '#libs': path.resolve(__dirname, 'libs'),
}
```

- `libs/` 目錄不存在。
- `src/` 中沒有任何 `from '#'` 形式的 import，全部使用相對路徑。

這兩條 alias 是歷史殘留，刪掉不影響構建。

### 4. `files` 字段缺失、無測試

`package.json` 沒有 `files`，也沒有 `test` 腳本，倉庫無任何測試目錄。發佈/安裝面完全依賴 `.gitignore` 與默認行爲。驗證方式只有 `npm run build` + `dist/test.html` 手工跑。

## 公開 API

### 5. `piplines` 拼寫錯誤（不可隨手改）

`ValueProcessor` 的構造選項寫作 `opts.piplines`（正確拼寫應爲 `pipelines`），並且方法名爲 `addPipline`。它是對外選項，下游 `ajax-form` 已經按此書寫 config。**改動必須同步所有下游**，因此本倉庫凍結該拼寫，見 ADR-0004。

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
