# Analisi-GT — Advanced (branch: advanced-analysis)

Questo folder contiene una web app semplice per l'analisi della produzione auto in Italia.

File principali
- index.html — Dashboard (usa Plotly, html2canvas e jsPDF)
- assets/js/app.js — logica: parsing CSV, aggregazioni, grafici, esportazioni
- assets/css/styles.css — stili minimi
- data/sample.csv — dataset fittizio di esempio

Come provare
- Apri `advanced/index.html` nel browser. Se stai servendo i file da un server HTTP (consigliato), la app caricherà `data/sample.csv` automaticamente.
- In alternativa puoi caricare un CSV usando il pulsante "Carica CSV".

Formato CSV atteso
- Header: year,sector,brand,units (o righe senza header con stesso ordine)
- Esempio: `2024,Passeggeri,Fiat,12000`

Funzionalità
- Filtri per anno, settore e marchio
- Serie temporali per marchio
- Heatmap anno vs settore
- Stacked bar per confronto marchi per settore
- Esportazione PNG (uno per grafico) e PDF (cattura della dashboard)

Sostituire il dataset
- Sostituisci `advanced/data/sample.csv` con il tuo CSV e ricarica la pagina.

Note
- Se apri `index.html` via file:// il fetch del sample potrebbe non funzionare; in tal caso carica il CSV manualmente o esegui un server locale (es. `python -m http.server`).

Commit message: Aggiungi web app con analisi avanzate: serie temporali, heatmap, confronto marchi, esportazione
