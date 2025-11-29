// app.js: parsing, aggregation, Plotly charts, exports
(async function(){
  // Sample fallback dataset (same format as sample.csv)
  let dataset = [
    {year:2018,sector:"Passeggeri",brand:"Fiat",units:22000},
    {year:2018,sector:"Commerciale",brand:"Iveco",units:8000},
    {year:2018,sector:"Elettrico",brand:"Tesla",units:2000},
    {year:2019,sector:"Passeggeri",brand:"Fiat",units:24000},
    {year:2019,sector:"Passeggeri",brand:"Volkswagen",units:15000},
    {year:2019,sector:"Commerciale",brand:"Iveco",units:9000},
    {year:2019,sector:"Elettrico",brand:"Nissan",units:3500},
    {year:2020,sector:"Passeggeri",brand:"Fiat",units:20000},
    {year:2020,sector:"Passeggeri",brand:"Renault",units:12000},
    {year:2020,sector:"Commerciale",brand:"Iveco",units:7000},
    {year:2021,sector:"Passeggeri",brand:"Fiat",units:30000},
    {year:2021,sector:"Elettrico",brand:"Tesla",units:9000},
    {year:2022,sector:"Passeggeri",brand:"Fiat",units:45000},
    {year:2022,sector:"Passeggeri",brand:"Volkswagen",units:32000},
    {year:2022,sector:"Commerciale",brand:"Iveco",units:12000},
    {year:2022,sector:"Elettrico",brand:"Tesla",units:8000},
    {year:2023,sector:"Passeggeri",brand:"Fiat",units:47000},
    {year:2023,sector:"Passeggeri",brand:"Renault",units:22000},
    {year:2023,sector:"Commerciale",brand:"Iveco",units:11000},
    {year:2023,sector:"Elettrico",brand:"Fiat",units:9000},
    {year:2024,sector:"Passeggeri",brand:"Fiat",units:49000},
    {year:2024,sector:"Passeggeri",brand:"Stellantis",units:30000},
    {year:2024,sector:"Commerciale",brand:"Iveco",units:13000},
    {year:2024,sector:"Elettrico",brand:"Tesla",units:15000},
    {year:2024,sector:"Elettrico",brand:"Volkswagen",units:7000}
  ];

  // Try fetch sample CSV (works if served by HTTP); fallback to inline dataset
  async function tryLoadSample() {
    try {
      const resp = await fetch('./data/sample.csv');
      if (!resp.ok) throw new Error('no sample');
      const txt = await resp.text();
      const parsed = parseCSV(txt);
      if (parsed.length) dataset = parsed;
    } catch(e){ /* ignore */ }
  }

  // Utilities
  function uniq(arr){ return Array.from(new Set(arr)); }

  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
    const rows = lines.map(l=> l.split(',').map(x=>x.trim()));
    const headers = rows[0].map(h=>h.toLowerCase());
    let start = 0;
    if (headers.includes('year') && headers.includes('sector') && headers.includes('brand') && headers.includes('units')) start = 1;
    const parsed = [];
    for (let i=start;i<rows.length;i++){
      const r = rows[i];
      let year, sector, brand, units;
      if (start===1){
        const m = {}; headers.forEach((h,idx)=> m[h]=r[idx]);
        year = Number(m.year); sector = m.sector; brand = m.brand; units = Number(m.units);
      } else {
        year = Number(r[0]); sector = r[1]; brand = r[2]; units = Number(r[3]);
      }
      if (!isNaN(year) && sector && brand && !isNaN(units)) parsed.push({year, sector, brand, units});
    }
    return parsed;
  }

  // DOM refs
  const yearSel = document.getElementById('yearFilter');
  const sectorSel = document.getElementById('sectorFilter');
  const brandSel = document.getElementById('brandFilter');
  const fileInput = document.getElementById('fileInput');
  const resetBtn = document.getElementById('resetBtn');
  const downloadCsvBtn = document.getElementById('downloadCsv');
  const exportPngBtn = document.getElementById('exportPng');
  const exportPdfBtn = document.getElementById('exportPdf');

  // Table
  function renderTable(data){
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = data.map(d=>`<tr><td>${d.year}</td><td>${d.sector}</td><td>${d.brand}</td><td>${d.units.toLocaleString()}</td></tr>`).join('');
  }

  function populateFilters(data){
    const years = uniq(data.map(d=>d.year)).sort((a,b)=>b-a);
    const sectors = uniq(data.map(d=>d.sector)).sort();
    const brands = uniq(data.map(d=>d.brand)).sort();
    yearSel.innerHTML = '<option value="">Tutti gli anni</option>' + years.map(y=>`<option value="${y}">${y}</option>`).join('');
    sectorSel.innerHTML = '<option value="">Tutti i settori</option>' + sectors.map(s=>`<option value="${s}">${s}</option>`).join('');
    brandSel.innerHTML = '<option value="">Tutti i marchi</option>' + brands.map(b=>`<option value="${b}">${b}</option>`).join('');
  }

  function applyFilters(data){
    const y = yearSel.value; const s = sectorSel.value; const b = brandSel.value;
    return data.filter(d=>{ if (y && String(d.year)!==y) return false; if (s && d.sector!==s) return false; if (b && d.brand!==b) return false; return true; });
  }

  // Aggregations
  function aggregateByYearBrand(data){
    // returns map year -> brand -> units
    const map = {};
    data.forEach(d=>{ map[d.year] = map[d.year] || {}; map[d.year][d.brand] = (map[d.year][d.brand]||0) + Number(d.units); });
    return map;
  }

  function aggregateYearSectorMatrix(data){
    const years = uniq(data.map(d=>d.year)).sort((a,b)=>a-b);
    const sectors = uniq(data.map(d=>d.sector)).sort();
    const z = years.map(y=> sectors.map(()=>0));
    data.forEach(d=>{
      const yi = years.indexOf(d.year);
      const si = sectors.indexOf(d.sector);
      if (yi>=0 && si>=0) z[yi][si] += Number(d.units);
    });
    return {years,sectors,z};
  }

  function aggregateSectorBrandStack(data){
    // sectors as x, brands as series
    const sectors = uniq(data.map(d=>d.sector)).sort();
    const brands = uniq(data.map(d=>d.brand)).sort();
    const series = brands.map(b=>({brand:b, values: sectors.map(()=>0)}));
    data.forEach(d=>{
      const si = sectors.indexOf(d.sector);
      const bi = brands.indexOf(d.brand);
      if (si>=0 && bi>=0) series[bi].values[si] += Number(d.units);
    });
    return {sectors,brands,series};
  }

  // Plot functions using Plotly
  function renderTimeSeries(data){
    const years = uniq(data.map(d=>d.year)).sort((a,b)=>a-b);
    const brands = uniq(data.map(d=>d.brand)).sort();
    const map = {}; brands.forEach(b=> map[b]= years.map(()=>0));
    data.forEach(d=>{ const yi = years.indexOf(d.year); map[d.brand][yi] += Number(d.units); });
    const traces = brands.map(b=>({ x: years, y: map[b], name: b, type: 'scatter', mode: 'lines+markers' }));
    const layout = { margin:{t:20,l:40,r:20,b:40}, legend:{orientation:'h'} };
    Plotly.newPlot('timeSeries', traces, layout, {responsive:true});
  }

  function renderHeatmap(data){
    const m = aggregateYearSectorMatrix(data);
    const trace = { z: m.z, x: m.sectors, y: m.years, type: 'heatmap', colorscale: 'YlOrRd' };
    const layout = { margin:{t:30,l:60,r:20,b:50}, xaxis:{title:'Settore'}, yaxis:{title:'Anno'} };
    Plotly.newPlot('heatmap', [trace], layout, {responsive:true});
  }

  function renderStackedBar(data){
    const agg = aggregateSectorBrandStack(data);
    const traces = agg.series.map(s=>({ x: agg.sectors, y: s.values, name: s.brand, type: 'bar' }));
    const layout = { barmode: 'stack', margin:{t:30,l:40,r:20,b:80}, xaxis:{title:'Settore'} };
    Plotly.newPlot('stackedBar', traces, layout, {responsive:true});
  }

  // Refresh view
  function refreshView(){
    const filtered = applyFilters(dataset);
    renderTable(filtered);
    renderTimeSeries(filtered);
    renderHeatmap(filtered);
    renderStackedBar(filtered);
  }

  // CSV download
  function downloadCsv(){
    const filtered = applyFilters(dataset);
    const csv = ['year,sector,brand,units', ...filtered.map(d=>`${d.year},${d.sector},${d.brand},${d.units}`)].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'produzione_filtrata.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  // Export PNG: use Plotly.toImage for each plot and download
  async function exportPNG(){
    const ids = ['timeSeries','heatmap','stackedBar'];
    for (const id of ids){
      try{
        const imgData = await Plotly.toImage(document.getElementById(id), {format:'png', width:1200, height:600});
        const a = document.createElement('a'); a.href = imgData; a.download = `${id}.png`; document.body.appendChild(a); a.click(); a.remove();
      } catch(e){ console.warn('export PNG failed for',id,e); }
    }
  }

  // Export PDF: capture the container and save as PDF
  async function exportPDF(){
    const container = document.querySelector('.container');
    const canvas = await html2canvas(container, {scale:2});
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save('dashboard_produzione.pdf');
  }

  // Event listeners
  yearSel.addEventListener('change', refreshView);
  sectorSel.addEventListener('change', refreshView);
  brandSel.addEventListener('change', refreshView);
  resetBtn.addEventListener('click', ()=>{ yearSel.value=''; sectorSel.value=''; brandSel.value=''; refreshView(); });
  downloadCsvBtn.addEventListener('click', downloadCsv);
  exportPngBtn.addEventListener('click', exportPNG);
  exportPdfBtn.addEventListener('click', exportPDF);

  fileInput.addEventListener('change', (e)=>{
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const parsed = parseCSV(reader.result);
        if (parsed.length){ dataset = parsed; populateFilters(dataset); refreshView(); alert('CSV caricato: '+parsed.length+' righe'); }
        else alert('CSV vuoto o formato non riconosciuto');
      } catch(err){ alert('Errore parsing CSV: '+err); }
    };
    reader.readAsText(f);
  });

  // Init
  await tryLoadSample();
  populateFilters(dataset);
  refreshView();
})();
