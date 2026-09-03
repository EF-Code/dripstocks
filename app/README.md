# DripStocks frontend

Next.js 16 + wagmi/viem app for the DripStocks streaming vault. See the root
`README.md` for the full picture (contracts, audit, deployment, demo).

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npx vitest run
```

## Configure it

Copy `.env.example` to `.env.local` and fill the 7 `NEXT_PUBLIC_*` addresses
from the DeployTestnet output (vault + 6 mock tokens). Without them the UI
renders its not-deployed state. The live Sepolia addresses are tracked in the
root `TODO.md`.
