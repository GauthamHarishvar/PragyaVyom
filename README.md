# 🌌 PragyaVyom
An end-to-end, explainable AI pipeline for analyzing TESS light curves to detect, classify, and interpret potential exoplanet transit signals.

## 📖 Overview

PragyaVyom is designed to help astronomers and researchers process noisy space telescope data with minimal manual intervention. It combines advanced denoising, machine learning classification, explainability techniques, and orbital parameter estimation to provide a complete workflow from raw data to scientific insights.

**Live app**: https://pragya-vyom.lovable.app



## 🚀 Features


TESS Data Processing: Automatic ingestion and preprocessing of light curves.

Multi-Level Denoising: Removes instrumental and stellar noise using specialized filters.

Transit Detection: Implements Transit Least Squares (TLS) for candidate identification.

Hybrid AI Model: CNN + Transformer architecture for signal classification (planetary transit, eclipsing binary, stellar blend, variable star, or noise).

Explainable AI: SHAP, LIME, GradCAM, and Attention Maps to interpret model decisions.

Parameter Estimation: Uses batman (Bad-Ass Transit Model cAlculatioN) + MCMC to estimate orbital parameters with uncertainty bounds.

Interactive Dashboard: Researcher-friendly interface to visualize detections, explanations, and results.


## 🛠️ Tech Stack


Languages: Python 3.12+

Libraries:
```
Data: numpy, pandas, astropy

ML: tensorflow / pytorch, scikit-learn

Explainability: shap, lime, grad-cam

Transit Modeling: batman, emcee (MCMC)

Visualization: matplotlib, plotly, dash
```


## 📂 Project Structure
```
pragya-vyom/
│── data/               # Raw and processed light curves
│── notebooks/          # Jupyter notebooks for experiments
│── src/                # Core pipeline modules
│   ├── preprocessing/  # Denoising & data handling
│   ├── detection/      # Transit Least Squares
│   ├── models/         # CNN + Transformer
│   ├── explainability/ # SHAP, LIME, GradCAM
│   └── estimation/     # batman + MCMC
│── dashboard/          # Interactive visualization
│── tests/              # Unit tests
│── README.md           # Project documentation
```


## ⚙️ Installation
```
git clone https://github.com/deepalakshmi-ssr/pragya-vyom.git
cd pragya-vyom
pip install -r requirements.txt
```


## ▶️ Usage

1. Pre-process Data
```
python src/preprocessing/run_pipeline.py --input data/tess_lightcurve.fits
```

2. Run Transit Detection:
```
python src/detection/tls.py
```

3. Classify Signals:
```
python src/models/classify.py
```

4. Explain Predictions
```
python src/explainability/explain.py
```

5. Estimate Parameters
```
python src/estimation/fit_transit.py
```

6. Launch Dashboard
```
python dashboard/app.py
```


## 📊 Example Output


Transit candidates with confidence scores.

Classification labels (planetary transit, binary, noise).

Explainability plots (SHAP values, GradCAM heatmaps).

Orbital parameters with uncertainty bounds.

Interactive dashboard for exploration.



## 🌍 Applications


Automated exoplanet candidate vetting.

Research support for astronomers using TESS data.

Educational tool for astrophysics and AI courses.



## 🤝 Contributing

Contributions are welcome! Please fork the repo, create a feature branch, and submit a pull request.


## 📜 License

MIT License – free to use, modify, and distribute.
