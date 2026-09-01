<p align="center"><a href="README.md">简体中文</a> | <b>English</b></p>

<h1 align="center">astock-peg</h1>

<p align="center">
  <b>PEG valuation tool for China A-shares — Next.js full-stack · AI-generated reports · sector PE comparison · zero database</b>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white" alt="Next.js">
  <a href="https://github.com/simonlin1212/astock-peg/stargazers"><img src="https://img.shields.io/github/stars/simonlin1212/astock-peg?style=social" alt="Stars"></a>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#peg-calculation">PEG Calculation</a>
</p>

A PEG (Price/Earnings-to-Growth) valuation analysis tool for China A-shares, inspired by Peter Lynch's investment methodology.

## Features

- **PEG Dashboard** — Real-time stock monitoring with PE, PB, market cap, and instant PEG calculation
- **AI Analysis Reports** — Auto-collect financial data → AI generates structured 7-section PEG valuation report → Export as PDF
- **Sector PE Comparison** — Input any ticker → Auto-detect industry → Show top-20 peers by market cap with PE distribution
- **News Feed** — Stock-specific news + market headlines aggregation

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS
- **Data**: Tencent Finance API (real-time quotes) + mootdx (sector detection + financial snapshot) + direct HTTP (Eastmoney / THS / Sina / cninfo for reports, news, announcements, consensus EPS, statements — zero akshare)
- **AI**: Anthropic Claude / OpenAI GPT (bring your own key)
- **Storage**: JSON files (zero database dependency)

## Quick Start

```bash
git clone https://github.com/simonlin1212/astock-peg.git
cd astock-peg/web
cp .env.example .env  # Fill in your AI API key
npm install && npm run dev
```

Prerequisites: Node.js 18+, Python 3.10+ (Windows auto-detected, no `python3` needed), `pip install -r scripts/requirements.txt` (akshare removed in v1.1.0)

## PEG Calculation

```
Forward PE = Current Price / Consensus EPS (2026)
PEG = Forward PE / (Net Profit CAGR × 100)
PE Digestion Years = ln(Forward PE / 30) / ln(1 + CAGR)
```

---

## The Author Is Open to Opportunities

The author is open to AI roles at Tencent and other leading technology companies in Shenzhen, and hopes to join a team passionate about AI development. Areas of interest include AI / Agent product development, real-world deployment, and AI consulting.

Contact: [simonlin0423@gmail.com](mailto:simonlin0423@gmail.com)

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

---

## Disclaimer

This tool is for educational and research purposes only. It does not constitute investment advice. Please consult licensed professionals for investment decisions.

---

## Support

If this tool saved you time, a coffee is appreciated ☕

<p align="center">
  <a href="https://buymeacoffee.com/simonlin1212"><img src="./assets/bmc-qr.png" width="180" alt="Buy Me a Coffee"></a>
</p>

> Need something that isn't here? Open an [Issue](https://github.com/simonlin1212/astock-peg/issues); sponsors' issues go first.

---

## License

Apache 2.0

**Author:** Simon Lin · X [@linsizhen](https://x.com/linsizhen) · Email: [simonlin0423@gmail.com](mailto:simonlin0423@gmail.com)
