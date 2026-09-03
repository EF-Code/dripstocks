# Loom Script — DripStocks (tag @buildonbase)

**Target length:** ~90 seconds. Record on Base Sepolia against the live deployment below.
Open with the mock disclaimer — judges must hear it in the first 15 seconds.

**Live deployment (Base Sepolia, chain 84532):**
- Vault: https://sepolia.basescan.org/address/0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49 (Sourcify-verified)
- Mocks: AAPLc `0x9f5c5b98D47A911aD8606907cFF283c2844c9747`, NVDAc `0x2fF05B9030b8B96c747a9918fA4B976538672906`, METAc `0x522f1C33c4726fe855565Dc5231b72A9549917D8`
- Replayable proof (streams 2–5, all on Basescan):
  - id2 created: https://sepolia.basescan.org/tx/0xa0157c5771debd68b8ea702918cec5c9603fd789cf583c30195d07af1ebf0c82
  - id3 created: https://sepolia.basescan.org/tx/0xbdbdd6adbd26cc2f45a4d537912576818e3ab301fa2a07114cdf931b4c4948e5
  - id3 claimed: https://sepolia.basescan.org/tx/0xc39089daec25a687d6c42b97271628ee4263625ba4c0e0602e203d68a32a92e8
  - ids 4+5 batch: https://sepolia.basescan.org/tx/0xfd85e6945359ad5fe6d2f20cde4fe2174e27ca2999e51b2124e77f77e5d40134
  - id2 full withdraw (1.5): https://sepolia.basescan.org/tx/0x0f38723d214a032965264c2b999290ec32f51bbe6fa21ada0546e6643f2dde19
  - id3 partial withdraw (0.478 linear): https://sepolia.basescan.org/tx/0x7250e4df84d6cd1bc02b1b4099dd2f29738f9aa624c232de512982d058a15e6e
  - id4 cancel + refund (0.25): https://sepolia.basescan.org/tx/0xb48c784c175c407c3368afdf66f8ef709f51fb17d7d7cbfa726beb031c66fd1e

## Script

0:00–0:15 — "DripStocks streams tokenized stocks by the second. One disclosure first: real B20 tokens live only on Base mainnet, so this demo runs on Sepolia with mock B20s — identical contracts, and the mainnet B20 addresses are already configured in the app."
0:15–0:40 — Create a direct stream on camera: 1 NVDAc-mock over 10 minutes to a second wallet. Switch wallets, show the dashboard ticking live, withdraw a partial amount mid-stream.
0:40–1:00 — Claim link: generate a secret, create the link, paste secret + ID into the claim panel as the second wallet, show it vest. Then batch: two recipients, one transaction.
1:00–1:20 — Cancel as sender, show the exact refund. Close on the Basescan links above: "every claim replayable — direct, claim, batch, withdraw, cancel."
1:20–1:30 — "Stocks as streaming money, built on Base. Links below." Tag @buildonbase.

## Post text

DripStocks on @base: salary that streams per second in tokenized stocks.
Live on Sepolia (mock B20s — real B20s are mainnet-only): direct + claim-link + batch streams, withdraw anytime, cancel with refund. Every flow replayable on Basescan 👇
@buildonbase #BaseBuilderQuest
