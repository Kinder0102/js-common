# 0006 參數校驗走 assert 而不是拋自定義錯誤

## 狀態

已接受。

## 背景

這些模塊是基礎設施，被三個下游共用。入參錯誤如果只在深層某處拋出一個 `TypeError: Cannot read property of undefined`，排查成本很高；但爲此定義一套錯誤類層級，又會讓調用方被迫 import 類型去做 `instanceof` 判斷。

## 決策

統一用 `assert(condition, message, type)`：

```js
assert(isString(value), 'value', STRING_NON_BLANK)
```

- 前兩個參數是給機器的：條件、出錯對象的名字。
- 第三個參數是類型標籤，取自 `js-constant` 的常量（`STRING_NON_BLANK`、`HTML_ELEMENT`、`ARRAY_STRING` 等）。
- 校驗失敗時拋普通 `Error`，不定義子類。

## 理由

- 常量化類型描述，保證同樣的錯誤在不同模塊裏措辭一致，日誌可聚合。
- 不引入錯誤類層級：調用方不需要爲了 catch 而 import 本倉庫，保持「用哪個模塊就 import 哪個」。
- 斷言在調用邊界做一次，內部函數信任入參，避免每層重複檢查。

## 後果

- 錯誤信息是給人看的短句，不是結構化數據。需要結構化錯誤碼的場景，由上層（如 `ajax-form` 的 middleware）自己加，`ERROR_CONFIRM` / `ERROR_VALIDATION` 就是爲這層預留的標籤。
- `assert` 不是「可關閉的調試斷言」：生產環境同樣生效，所以不要把它放在熱路徑循環裏。
- 新增類型標籤請加到 `js-constant`，不要在各處手寫字符串。
