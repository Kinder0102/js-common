# 0001 不提供根入口

## 狀態

已接受。適用於當前所有版本。

## 背景

倉庫有 10 個模塊，各自獨立可引用。曾經存在的 `index.js`（`main` 字段仍指向它）已經沒有實體文件，`exports` 也從未補上 `"."`。

下游三個包全部按 `js-common/js-utils` 這類子路徑 import，沒有任何一個用過默認入口。

## 決策

不補 `index.js`，不加 `exports["."]`。每個模塊就是它自己的入口。

## 理由

- 加 barrel 會讓任何一次內部重構都可能影響全部下游的加載圖，而收益只是省幾個字符。
- `js-dom-helper` 與 `js-value-processor` 有副作用（掛 `globalThis`）。barrel 會讓「只想用 `isTrue`」的下游被迫執行這兩個模塊的加載。
- 子路徑 import 天然給出「我依賴哪個模塊」的信息，依賴關係在代碼裏可讀。

## 後果

- 必需：`main` 字段應刪掉或改成一個真實存在的文件。當前指向 `index.js` 是配置錯誤，見 [KNOWN-GAPS](../KNOWN-GAPS.md)。
- 下游不能寫 `import x from 'js-common'`，會拋 `ERR_PACKAGE_PATH_NOT_EXPORTED`。
- 新增模塊不需要回頭登記到某個總表裏，`exports` 里加一行即可。
