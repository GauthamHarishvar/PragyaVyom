<div align="center">

# 🪐 PragyaVyom
### *Explainable AI for Exoplanet Transit Detection*

**Finding worlds beyond our solar system — one light curve at a time.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_App-6366f1?style=for-the-badge)](https://pragya-vyom.vercel.app)
[![MIT License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![TanStack](https://img.shields.io/badge/Built_with-TanStack_Start-f97316?style=for-the-badge)](https://tanstack.com/start)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)

</div>

---

## ✨ What is PragyaVyom?

**PragyaVyom** *(Sanskrit: प्रज्ञाव्योम — "Intelligent Sky")* is an **end-to-end, explainable AI pipeline** that analyzes raw TESS (Transiting Exoplanet Survey Satellite) light curves to detect, classify, and interpret potential exoplanet transit signals — right in your browser.

No downloads. No setup. Just science.

> 🔭 Point it at a star. Watch it hunt for planets.

---

## 🌟 Key Features

| Feature | Description |
|---|---|
| 🌊 **Multi-Level Denoising** | Removes instrumental and stellar noise using specialized filters |
| 🔍 **Transit Detection** | Transit Least Squares (TLS) algorithm for candidate identification |
| 🤖 **Hybrid AI Model** | CNN + Transformer architecture classifies signals into 5 categories |
| 🧠 **Explainable AI** | SHAP, LIME, GradCAM & Attention Maps to interpret every decision |
| 📐 **Parameter Estimation** | `batman` + MCMC to estimate orbital parameters with uncertainty bounds |
| 📊 **Live Dashboard** | Interactive browser-based visualization — no install required |
| 🗂️ **Batch Processing** | Run multi-target surveys across hundreds of light curves |

---

## 🛰️ Signal Classification

PragyaVyom classifies every detected signal into one of:

- 🪐 **Planetary Transit** — a real exoplanet candidate
- ☀️ **Eclipsing Binary** — two stars orbiting each other
- 🌫️ **Stellar Blend** — contamination from a background star
- 🌀 **Variable Star** — intrinsic stellar variability
- 📉 **Noise** — instrumental artifact, no signal

---

## 🛠️ Tech Stack

**Frontend (Web App)**
```
React 19 · TanStack Start · TanStack Router · Recharts · Tailwind CSS v4
Radix UI · TypeScript · Vite
```

**AI/ML Pipeline**
```
Python 3.12+ · TensorFlow / PyTorch · scikit-learn
SHAP · LIME · GradCAM · batman (transit modeling) · emcee (MCMC)
NumPy · Pandas · Astropy · Matplotlib · Plotly
```

---

## 📂 Project Structure

```
pragya-vyom/
├── src/
│   ├── components/         # UI components (header, footer, charts, panels)
│   ├── routes/             # App pages (detection, batch, methodology, project)
│   ├── lib/
│   │   └── pipeline/       # Core signal processing (generate, analyze, stats)
│   └── styles.css          # Global design system
├── public/                 # Static assets
├── vite.config.ts          # Build configuration
└── vercel.json             # Deployment config
```

---

## 🚀 Run Locally

```bash
# Clone the repo
git clone https://github.com/GauthamHarishvar/PragyaVyom.git
cd PragyaVyom

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🌍 Use Cases

- 🔬 **Research** — Automated exoplanet candidate vetting from TESS data
- 📚 **Education** — Interactive tool for astrophysics & AI courses
- 🏆 **Competitions** — Showcase-ready explainable AI for space science

---

## 👥 Team

Built with ❤️ for the **Design Thinking & Innovation** course.

---

## 📜 License

[MIT](LICENSE) — free to use, modify, and distribute.
