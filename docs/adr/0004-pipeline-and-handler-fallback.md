# 0004 三段式 pipeline 與 handler 回退

## 狀態

已接受。原「拼寫凍結」條款已於 2026-10 撤銷，見文末「修訂」。

## 背景

一個值從數據到 DOM 要經過若干處理：類型解析（`type`）、結構變換（`transform`）、最終格式化（`format`）。下游需要按 prefix 註冊自己的處理器（例如 `af` 的日期類型），又不能改本倉庫代碼。

## 決策

### 1. 固定的三段順序

`ValueProcessor.process` 依次執行 `type` → `transform` → `format`。

- 三段的名字是常量：`CONST.TYPE` / `CONST.FORMAT` / `CONST.TRANSFORM`。
- 每段可掛多個 handler，按註冊順序執行，後一個的輸入是前一個的輸出。
- 新增 stage 只能追加在 `format` 之後，不得插進前三段之間。

### 2. handler 返回 `undefined` 不覆蓋

handler 返回值是 `undefined` 時視爲「我不處理」，鏈條繼續用上一個值往下走。這讓 handler 可以只處理自己關心的輸入，其餘透傳，不需要寫 `if` 兜底。

### 3. 命名一律用標準拼寫

構造選項 `opts.pipelines`、註冊方法 `addPipeline()`、私有欄位 `#pipelines`，全部用 `pipeline` 的正確拼寫。歷史上曾寫作 `piplines` / `addPipline`，該拼寫已無任何保留。

## 理由

- 三段順序對應「先理解數據、再改結構、最後擺格式」的直覺，改動順序會讓下游 handler 的作者重新推演。
- `undefined` 透傳是稀疏註冊的前提：三個下游各註冊幾個 handler，互相不知道對方存在。
- 曾經的凍結理由是「拼寫已出現在下游 config 裏，改名成本在別人身上」。2026-10 全盤核查推翻該前提：`ajax-form` 的 `src/` 從未傳過 `piplines`（只傳 `handlers`），其餘下游與業務項目零引用，`dist/` 裏的拼寫只是本倉庫代碼被打包的結果。既然沒有人依賴，就沒有凍結的必要。

## 後果

- 新寫文檔、新寫示例一律使用 `pipelines` / `addPipeline`。
- 編輯器拼寫檢查不再報警。
- 若外部仍有未登記的使用者按舊拼寫傳參，該參數會被 `process()` 忽略（等價於不傳），不拋錯——這與「未知選項靜默忽略」的既有行爲一致。

## 修訂

2026-10：撤銷原第 3 節「拼寫凍結」。依據是三下游與業務項目全盤 grep 零引用，`ajax-form` 自證只傳 `handlers`（見其 `docs/known-gaps.md`）。`src/js-value-processor.js` 內 `piplines` → `pipelines`、`addPipline` → `addPipeline`、`DEFAULT_PIPLINE` → `DEFAULT_PIPELINE`，測試與文檔同步，未保留別名。

---
以上内容对应memory_id为：memory_ad0a6a6a93b94adcb40b7af95d4c24ae，可以使用该memory_id传递。
