# 0003 綁定狀態用可逆的 class 標記

## 狀態

已接受。

## 背景

渲染會往 DOM 上寫東西：填值、加 class、寫屬性、插入克隆節點。如果這些寫入不可逆，同一棵子樹就無法用新數據重渲染，調用方只能整塊銷燬重建 DOM，代價高且會丟掉事件監聽。

## 決策

所有由框架寫入的狀態都必須可逆，且逆操作只依賴 DOM 上已有的 class，不依賴外部記賬。

- 新建的克隆節點加 `dom-helper-create-{group}`，清除時按 class 整塊刪除。
- 被填入過值的節點加 `dom-helper-filled`，清除時把值復位。
- 模板作者可聲明 `dom-helper-remove`，表示該節點在清除時整個移除。

## 理由

- 逆操作可從 DOM 自證：即使中間有外部代碼插入了節點，也不會被誤刪（因爲沒有標記）。
- 不需要維護「誰被改過」的旁路表，避免表與 DOM 不一致。
- 同一套 class 可以同時服務於 CSS，例如 `[dom-helper-filled] + .placeholder { display: none }`。

## 後果

- 標記 class 是**框架私有**，模板作者不得讀寫；例外是 `dom-helper-remove` 與 `dom-helper-last`，這兩個是給模板作者的開關。見 [js-dom-helper](../api/js-dom-helper.md#契約)。
- 清除只能恢復「框架寫過的」部分。調用方自己改的 DOM 不會被還原。
- 標記 class 佔用 `dom-helper-*` 命名空間且**不帶 prefix**，多個 `DOMHelper` 實例共享同一套標記。因此同一子樹不要交給兩個不同 `prefix` 的實例管理。
- `group` 不同則 `create-{group}` 不同，這是同一容器內區分批次的手段；渲染與清除必須用同一 group。
- 清除時若 `el` 自身就帶 `create-{group}`，`el` 會被移出文檔，調用方需丟棄該引用。
