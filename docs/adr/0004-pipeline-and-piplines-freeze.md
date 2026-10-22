# 0004 三段式 pipeline、handler 回退與 piplines 拼寫凍結

## 狀態

已接受。拼寫部分爲**凍結**決定，不可「順手修正」。

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

### 3. 拼寫凍結

構造選項名是 `opts.piplines`，註冊方法是 `addPipline`。正確拼寫應爲 `pipelines` / `addPipeline`，但**保持現狀不改**。

## 理由

- 三段順序對應「先理解數據、再改結構、最後擺格式」的直覺，改動順序會讓下游 handler 的作者重新推演。
- `undefined` 透傳是稀疏註冊的前提：三個下游各註冊幾個 handler，互相不知道對方存在。
- 拼寫已出現在下游 `ajax-form` 的 config 裏。改名需要對所有下游做一次機械但不可見的破壞性改動，收益只是拼寫正確。**成本在別人身上，收益在審美上，不值得。**

## 後果

- 新寫文檔、新寫示例一律使用 `piplines`，不要「糾正」，否則代碼跑不起來。
- 編輯器拼寫檢查會報警，忽略它。
- 未來若真要做 2.0，可在新選項名 `pipelines` 上並存一個別名，讓舊名保留一個版本週期，屆時另寫 ADR 取代本篇。
- handler 不拋錯、不返回值是合法用法，排查「值沒變」時先懷疑 handler 返回了 `undefined`。
