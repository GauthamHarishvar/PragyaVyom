# PragyaVyom

An explainable AI pipeline for detecting exoplanet transit signals in TESS light curves. Built for the **BrainWave** competition.

**Live:** https://pragya-vyom.vercel.app

---

## What it does

Space telescopes like TESS (Transiting Exoplanet Survey Satellite) record the brightness of stars over time — these recordings are called light curves. When a planet passes in front of its star, it causes a tiny, periodic dip in brightness. That dip is a transit signal.

The problem: TESS data is noisy. Instrument artifacts, stellar variability, and background contamination all produce dips that look like transits but aren't. Manually reviewing thousands of candidates is slow and error-prone.

PragyaVyom automates this process end-to-end — from raw light curve to a classified, explained result — and runs entirely in the browser.

---

## Pipeline walkthrough

### 1. Signal generation
The app simulates TESS-realistic light curves with configurable stellar parameters. This lets you test the pipeline without needing raw FITS files from the TESS archive.

### 2. Denoising
Raw light curves carry multiple noise layers:
- **Instrumental systematics** — scattered light, momentum dumps, thermal drifts
- **Stellar noise** — granulation, oscillations, spot rotation

The pipeline applies a multi-stage filter to separate genuine astrophysical signal from noise before any detection runs.

### 3. Transit detection
Uses **Transit Least Squares (TLS)** — a period-folding algorithm that searches for the best-fit box-shaped dip across a grid of trial periods and durations. Outputs a ranked list of transit candidates with their periods, depths, and durations.

### 4. Classification
Each candidate is passed through a **CNN + Transformer hybrid** that classifies it into one of five categories:

| Label | Meaning |
|---|---|
| Planetary transit | Genuine exoplanet candidate |
| Eclipsing binary | Two stars orbiting each other |
| Stellar blend | Contamination from a background source |
| Variable star | Intrinsic brightness variation of the host star |
| Noise | No astrophysical signal |

The CNN captures local shape features (ingress, egress, flat bottom), while the Transformer attends to global periodicity patterns across the full light curve.

### 5. Explainability
Classification without explanation is not science. The pipeline generates:
- **SHAP values** — which time-domain features pushed the model toward a given class
- **LIME** — local surrogate model that approximates the decision boundary around each prediction
- **GradCAM** — gradient-weighted activation maps showing which regions of the folded transit the CNN focused on
- **Attention maps** — the Transformer's self-attention weights across the sequence

This makes every prediction auditable.

### 6. Parameter estimation
For candidates classified as planetary transits, the pipeline fits a physical transit model using:
- **batman** (Bad-Ass Transit Model cAlculatioN) — generates the theoretical light curve shape from orbital parameters
- **MCMC (emcee)** — samples the posterior distribution over those parameters

Outputs: orbital period, planet-to-star radius ratio, impact parameter, transit duration — each with uncertainty bounds.

### 7. Dashboard
The web interface ties everything together. You can step through each stage, inspect intermediate outputs, run batch surveys across multiple targets, and export results.

---

## Tech stack

**Frontend**
- React 19, TanStack Router, Recharts, Tailwind CSS v4, Radix UI
- All signal processing runs client-side in the browser (no backend required)

**AI/ML (research pipeline)**
- Python 3.12, PyTorch / TensorFlow, scikit-learn
- SHAP, LIME, GradCAM for explainability
- batman, emcee for transit modeling
- Astropy, NumPy, Pandas

---

## Run locally

```bash
git clone https://github.com/GauthamHarishvar/PragyaVyom.git
cd PragyaVyom
npm install
npm run dev
```

---

## Project context

Submitted to the **BrainWave** competition. The core question we're answering: can a fully browser-based, explainable AI system replace manual vetting in exoplanet candidate review pipelines — and be transparent enough for researchers to trust?

The answer, so far, is yes.
