# Loom Script — DripStocks (tag @buildonbase)

**Target length:** ~90 seconds. Record on Base Sepolia against the live deployment below.
Open with the mock disclaimer — judges must hear it in the first 15 seconds.

**Live deployment (Base Sepolia, chain 84532):**
- Vault v2: https://sepolia.basescan.org/address/0x115Fe60FD510c04fC765D06241623eAda42529B2 (Sourcify-verified)
- Mocks: AAPLc `0x9f5c5b98D47A911aD8606907cFF283c2844c9747`, NVDAc `0x2fF05B9030b8B96c747a9918fA4B976538672906`, METAc `0x522f1C33c4726fe855565Dc5231b72A9549917D8`
- Replayable v2 proof:
  - id0 created: https://sepolia.basescan.org/tx/0x14a296f0f0ab90097a96700745cb24ff907e93dc0a52dcf1878c0e95b34ac4cb
  - id0 fully withdrawn: https://sepolia.basescan.org/tx/0x6ef717a01ffa638544ca35e9c45dc74d11c8d60267ea1bde961d62f8ddbf2510
  - id1 claimable created: https://sepolia.basescan.org/tx/0xc25b8587510b568a810429e5a045f1595ff4a9061a0c90e5e6515516dd2adefa
  - id1 claimant-bound commitment: https://sepolia.basescan.org/tx/0x1d949ec4467d9ba0d9ee063f1b4abbd518d821a5d2412d0b77cff7459c79ad79
  - id1 claimed: https://sepolia.basescan.org/tx/0x6b9dce32d0af254c3f8afd0ae98cef2ae9176ee5fc0acf11812e2e3c852c13ee

Batch and cancellation receipts from the original vault are historical evidence only. Record fresh v2 receipts before describing those two flows as live-v2 proof.

## Script

0:00–0:15 — "DripStocks streams tokenized stocks by the second. One disclosure first: real B20 tokens live only on Base mainnet, so this demo runs on Sepolia with mock B20s — identical contracts, and the mainnet B20 addresses are already configured in the app."
0:15–0:40 — Create a direct stream on camera: 1 NVDAc-mock over 10 minutes to a second wallet. Switch wallets, show the dashboard ticking live, withdraw a partial amount mid-stream.
0:40–1:00 — Claim link: generate a secret, create the link, paste secret + ID into the claim panel as the second wallet, show it vest. Then batch: two recipients, one transaction.
1:00–1:20 — If fresh v2 batch and cancellation transactions have been completed, show their receipts and exact results. Otherwise show only the locally verified controls and say those public acceptance receipts are pending. Close on the v2 Basescan links above.
1:20–1:30 — "Stocks as streaming money, built on Base. Links below." Tag @buildonbase.

## Post text

DripStocks on @base: salary that streams per second in tokenized stocks.
Live on Sepolia (mock B20s — real B20s are mainnet-only): direct streaming and secure claimant-bound claim links, with batch and cancellation supported by the audited contract. Verified receipts below 👇
@buildonbase #BaseBuilderQuest
