# 會議錄音轉寫

把會議錄音手動丟進自架的語音轉寫 → 會議紀錄流程，看進度、讀結果。
一個沒有建置步驟的 PWA（純 HTML / CSS / JS），做法沿用[名片簿](https://github.com/tzengtw-hub/BusinessCard_n8n)。

## 這是什麼

```
Google Drive 新音檔 ─┐
                      ├→ n8n → GTR7 本機 whisper 轉寫 → Claude 整理 → PDF → Gmail + Telegram
本頁面手動上傳 ──────┘                                              ↓
                                                              本頁面顯示結果
```

兩個入口共用同一個子流程「會議紀錄產出核心」，所以不論從哪邊進來，
產出的會議紀錄、PDF 與 Telegram 發佈完全一致。

轉寫跑在自己的機器上，音檔不會離開家裡的網路。

## 功能

- 選檔或拖曳上傳，**上傳本身有進度條**（一小時的錄音可能幾十 MB）
- 轉寫中顯示進度、已耗時、剩餘時間
- 排隊時顯示「前面還有幾件、約多久才輪到」—— Drive 自動流程和手動上傳共用同一個
  單工佇列，會互相排隊。沒有這個資訊，排隊和當機在畫面上長得一模一樣
- **停滯偵測**：進度超過三分鐘沒變化就明講，不會讓你對著不動的畫面猜
- 完成後顯示會議紀錄全文與逐字稿；PDF 由原流程寄到 Gmail 並發 Telegram
- 關掉網頁不影響：輪詢與發佈都在 n8n 那邊跑，重開頁面會自動接回未完成的工作

## 設定

部署後第一次開啟時輸入兩項，都只存在該裝置的瀏覽器裡：

| 欄位 | 說明 |
| --- | --- |
| 伺服器位址 | n8n webhook 的基底網址，結尾是 `/webhook` |
| 存取密碼 | n8n 端 Header Auth 憑證的值，標頭名為 `X-API-Key` |

兩者都不在原始碼裡——這個 repo 是公開的（GitHub Pages 的站台一律公開，
即使 repo 設成 private）。

## 後端需要的三個端點

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| POST | `/webhook/audio-submit` | 上傳音檔（multipart，欄位名 `audio`），立刻回 `job_id` 與預估時間 |
| GET | `/webhook/audio-status?job_id=` | 轉寫進度：`status`、`progress`、`eta`、排隊時的 `ahead` / `eta_start` |
| GET | `/webhook/audio-result?job_id=` | 完成後的會議紀錄本文 |

三個都要 `X-API-Key` 標頭，CORS 只開放這個頁面的來源。
實作在 n8n 的「會議錄音 API（給 PWA 用）」工作流程。

## 已知限制

- **上傳大小受 n8n 的 `N8N_PAYLOAD_SIZE_MAX` 限制**（常見預設 16 MB）。
  超過會收到 HTTP 413，頁面會明確告訴你。Drive 自動流程不受影響，
  因為它是由 n8n 自己從 Drive 拉檔，不經過 webhook。
- 轉寫進度在開頭一段時間是**推估值**（畫面上會標示）。批次推論要整批跑完才
  吐出段落，在那之前沒有真實進度可回報；進度條用已耗時除以預估總時長代替。
- 需要能連到 n8n。這取決於 n8n 怎麼對外：若只用 Tailscale Serve，裝置必須在
  tailnet 裡；若開了 Tailscale Funnel，從一般網路也打得到。
- **後端只靠 `X-API-Key` 一道驗證**，沒有第二因素。如果 n8n 是對公網開放的，
  那把 key 就是唯一的鎖——請用夠長的隨機字串，不要用順手敲的短字串。
