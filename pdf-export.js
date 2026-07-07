function getDefault20to20Period() {
  const now = new Date(), day = now.getDate();
  let start, end;
  if (day >= 20) { start = new Date(now.getFullYear(), now.getMonth(), 20); end = new Date(now.getFullYear(), now.getMonth()+1, 19); }
  else           { start = new Date(now.getFullYear(), now.getMonth()-1, 20); end = new Date(now.getFullYear(), now.getMonth(), 19); }
  start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  return { start, end };
}

function parseDMY(dmy) {
  const [d,m,y] = dmy.split('/').map(Number);
  return new Date(y, m-1, d);
}

// Draws the Schürmann Gebäude+Energie logo in old style onto the PDF
function drawSchuermannLogo(doc, x, y, pageWidth, margin) {
  // Red accent bar on left of logo block
  doc.setFillColor(192, 57, 43);
  doc.rect(x, y, 2.5, 14, 'F');

  // Company name: SCHÜRMANN  (bold, large)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('SCHÜRMANN', x + 6, y + 6.5);

  // Subtitle: Gebäude + Energie  (lighter, smaller, same font)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Gebäude  +  Energie', x + 6, y + 12);

  // Thin red underline under the whole logo block
  doc.setDrawColor(192, 57, 43);
  doc.setLineWidth(0.4);
  doc.line(x, y + 14.5, x + 68, y + 14.5);
}

function triggerPDFExportEngine(useCustom = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(), pageHeight = doc.internal.pageSize.getHeight(), margin = 15;
  let y = margin;

  const user = localStorage.getItem('schuermann_current_user')
    || localStorage.getItem('schuermann_auth_display')
    || 'Mitarbeiter';

  const sessions = (globalLoggedSessionsDatabaseMock || []).filter(s => s.type === 'work' || s.type === 'schule');

  let periodStart, periodEnd;
  if (useCustom) {
    const startVal = document.getElementById('export-start-date')?.value;
    const endVal   = document.getElementById('export-end-date')?.value;
    if (startVal && endVal) { periodStart = new Date(startVal); periodStart.setHours(0,0,0,0); periodEnd = new Date(endVal); periodEnd.setHours(23,59,59,999); }
    else { const def = getDefault20to20Period(); periodStart = def.start; periodEnd = def.end; }
  } else { const def = getDefault20to20Period(); periodStart = def.start; periodEnd = def.end; }

  const filteredSessions = sessions.filter(s => { const d = parseDMY(s.date); return d >= periodStart && d <= periodEnd; });
  const today = new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });

  const groups = {};
  filteredSessions.forEach(s => { (groups[s.date] = groups[s.date] || []).push(s); });
  const dateKeys = Object.keys(groups).sort((a, b) => {
    const [da,ma,ya] = a.split('/').map(Number), [db,mb,yb] = b.split('/').map(Number);
    return new Date(ya,ma-1,da) - new Date(yb,mb-1,db);
  });

  const totalNet   = filteredSessions.reduce((sum,s) => sum + ((s.duration||0)-((s.breakTime||0)/60)), 0);
  const primaryRed = [192,57,43], darkSlate = [44,62,80], lightGray = [248,250,252], borderGray = [229,231,235], textDark = [15,23,42], textMuted = [100,116,139];

  // ── Header ──
  doc.setFillColor(...primaryRed); doc.rect(0, 0, pageWidth, 3, 'F');
  y = 8;

  // Schürmann logo left side
  drawSchuermannLogo(doc, margin, y, pageWidth, margin);

  // Right side: ARBEITSBERICHT + date
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...textDark);
  doc.text('ARBEITSBERICHT', pageWidth - margin, y + 6, {align:'right'});
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...textMuted);
  doc.text('Ausstellungsdatum: ' + today, pageWidth - margin, y + 12, {align:'right'});

  y += 20;
  doc.setDrawColor(...primaryRed); doc.setLineWidth(0.8); doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Summary cards: MITARBEITER | EINTRÄGE | GESAMTARBEITSZEIT (NO vacation cards) ──
  const cardWidth = (pageWidth - margin*2 - 4) / 3, cardHeight = 18;
  [{label:'MITARBEITER', value:user, accent:false},
   {label:'EINTRÄGE',    value:filteredSessions.length.toString(), accent:false},
   {label:'GESAMTARBEITSZEIT', value:totalNet.toFixed(2)+' h', accent:true}
  ].forEach((card, i) => {
    const x = margin + i*(cardWidth+2);
    doc.setFillColor(...(card.accent ? darkSlate : lightGray));
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setFillColor(...(card.accent ? primaryRed : darkSlate));
    doc.rect(x, y, 2, cardHeight, 'F');
    doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.setTextColor(...(card.accent ? [203,213,225] : textMuted));
    doc.text(card.label, x+6, y+6);
    const nameFont = card.label === 'MITARBEITER' && card.value.length > 18 ? 9 : 11;
    doc.setFontSize(nameFont); doc.setFont('helvetica','bold');
    doc.setTextColor(...(card.accent ? [255,255,255] : textDark));
    doc.text(card.value, x+6, y+13);
  });
  y += cardHeight + 10;

  // ── Work entries ──
  const fmtDate = (key) => { const [d,m,yr] = key.split('/').map(Number); return new Date(yr,m-1,d).toLocaleDateString('de-DE', {weekday:'long',day:'2-digit',month:'long',year:'numeric'}); };

  if (!dateKeys.length) {
    doc.setFontSize(11); doc.setTextColor(...textMuted);
    doc.text('Keine Arbeitseinträge vorhanden.', pageWidth/2, y+20, {align:'center'});
  } else {
    dateKeys.forEach(key => {
      const items = groups[key].slice().sort((a,b) => (a.startTime||'').localeCompare(b.startTime||''));
      let dailyNet = 0, dailyBreak = 0;
      const estimatedHeight = 25 + items.length*8 + 10;
      if (y + estimatedHeight > pageHeight - 20) {
        doc.addPage(); y = margin;
        doc.setFillColor(...primaryRed); doc.rect(0,0,pageWidth,3,'F');
        drawSchuermannLogo(doc, margin, 8, pageWidth, margin);
        y = 30;
      }

      doc.setFillColor(243,244,246); doc.roundedRect(margin,y,pageWidth-margin*2,8,1,1,'F');
      doc.setFillColor(...primaryRed); doc.rect(margin,y+7,pageWidth-margin*2,1,'F');
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(...textDark);
      doc.text(fmtDate(key), margin+4, y+5.5);
      y += 10;

      const tableData = items.map(s => {
        const isSchule = s.type === 'schule';
        const net = isSchule ? 0 : ((s.duration||0)-((s.breakTime||0)/60));
        dailyNet += net; dailyBreak += isSchule ? 0 : ((s.breakTime||0)/60);
        return [
          isSchule ? '—' : (s.startTime && s.endTime ? s.startTime+' – '+s.endTime : '—'),
          isSchule ? 'BERUFSSCHULE (Schultag)' : (s.project||'—'),
          isSchule ? '—' : net.toFixed(2)+' h'
        ];
      });

      doc.autoTable({
        startY: y,
        head: [['ZEIT','BAUSTELLE','DAUER']],
        body: tableData,
        margin: {top:28, left:margin, right:margin, bottom:15},
        styles: {fontSize:9, cellPadding:3, textColor:textDark, lineColor:borderGray, lineWidth:0.1},
        headStyles: {fillColor:darkSlate, textColor:[255,255,255], fontStyle:'bold', fontSize:8, cellPadding:2.5},
        alternateRowStyles: {fillColor:[250,251,252]},
        columnStyles: {0:{cellWidth:35}, 2:{cellWidth:25, halign:'right'}},
        didDrawPage: (data) => {
          if (data.pageNumber > 1) { doc.setFillColor(...primaryRed); doc.rect(0,0,pageWidth,3,'F'); }
        }
      });
      y = doc.lastAutoTable.finalY + 1;

      doc.setFillColor(248,250,252); doc.rect(margin,y,pageWidth-margin*2,7,'F');
      doc.setDrawColor(...borderGray); doc.line(margin,y,pageWidth-margin,y);
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...textMuted);
      doc.text('Tagesarbeit: '+dailyNet.toFixed(2)+' h    |    Pause: '+dailyBreak.toFixed(2)+' h', pageWidth-margin-4, y+4.5, {align:'right'});
      y += 12;
    });
  }

  // ── Footer on every page ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderGray); doc.setLineWidth(0.3);
    doc.line(margin, pageHeight-12, pageWidth-margin, pageHeight-12);
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...textMuted);
    doc.text('Schürmann Gebäude + Energie', margin, pageHeight-8);
    doc.text(user + '  |  Erstellt am ' + today, pageWidth/2, pageHeight-8, {align:'center'});
    doc.text('Seite '+i+' von '+totalPages, pageWidth-margin, pageHeight-8, {align:'right'});
    doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text('https://meinestunden.online/', pageWidth/2, pageHeight-4, {align:'center'});
  }

  const lang = activeLanguageGlobal==='en' ? 'en-GB' : 'de-DE';
  const fmt = d => d.toLocaleDateString(lang,{day:'2-digit',month:'short',year:'numeric'}).replace(/\./g,'').replace(/\s+/g,'_');
  const safeName = user.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_äöüÄÖÜß-]/g,'');
  doc.save(safeName+'_'+fmt(periodStart)+'-'+fmt(periodEnd)+'.pdf');
}

function generateEmployeePDFDocument(employeeName) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(), pageHeight = doc.internal.pageSize.getHeight(), margin = 15;

  const empData    = adminAllEntriesCache.filter(r => r.user === employeeName);
  const defPeriod  = getDefault20to20Period();
  const empPeriod  = empData.filter(r => {
    if (!r.date) return true;
    try { const d = r.date.includes('/') ? parseDMY(r.date) : new Date(r.date); return d >= defPeriod.start && d <= defPeriod.end; }
    catch(e) { return true; }
  });
  const workEntries = empPeriod.filter(r => r.category === 'WORK');
  const totalHours  = workEntries.reduce((sum,r) => sum+r.hrs, 0);
  const vacDays     = empPeriod.filter(r => r.category === 'VACATION').length;
  const sickDays    = empPeriod.filter(r => r.category === 'SICK').length;
  const today       = new Date().toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'});

  const workByDate = {};
  workEntries.forEach(s => { (workByDate[s.rawDate] = workByDate[s.rawDate]||[]).push(s); });
  const dateKeys = Object.keys(workByDate).sort((a,b) => {
    const parse = k => { const [d,m,y] = k.split('/').map(Number); return new Date(y,m-1,d); };
    return parse(a) - parse(b);
  });

  const red=[192,57,43], slate=[44,62,80], hdrGray=[236,240,244], sumGray=[248,250,252], txtDark=[15,23,42], txtMuted=[100,116,139], white=[255,255,255];
  const fmtDate = (key) => { const [d,m,y] = key.split('/').map(Number); return new Date(y,m-1,d).toLocaleDateString('de-DE', {weekday:'short',day:'2-digit',month:'long',year:'numeric'}); };

  const drawHeader = () => {
    doc.setFillColor(...red); doc.rect(0,0,pageWidth,3,'F');
    // Schürmann logo in header
    drawSchuermannLogo(doc, margin, 8, pageWidth, margin);
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(...txtDark);
    doc.text('Arbeitsbericht', pageWidth-margin, 13, {align:'right'});
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...txtMuted);
    doc.text(today, pageWidth-margin, 19.5, {align:'right'});
    doc.setDrawColor(...hdrGray); doc.setLineWidth(0.5); doc.line(margin, 26, pageWidth-margin, 26);
  };

  drawHeader(); let y = 33;

  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...txtDark);
  doc.text(employeeName, margin, y); y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...txtMuted);
  doc.text(
    workEntries.length+' Arbeitseinträge   |   Gesamtarbeit: '+totalHours.toFixed(2)+' h'
    +(vacDays?'   |   Urlaub: '+vacDays+' Tag(e)':'')
    +(sickDays?'   |   Krank: '+sickDays+' Tag(e)':''),
    margin, y
  ); y += 10;

  // ── NO vacation cards on admin employee PDF either — just the work table ──

  const tableBody = [], dateHeaderRows = new Set(), dailySumRows = new Set();
  if (!dateKeys.length) {
    tableBody.push([{content:'Keine Arbeitseinträge vorhanden.',colSpan:4,styles:{halign:'center',textColor:txtMuted,fontStyle:'italic'}}]);
  } else {
    dateKeys.forEach(key => {
      const items = workByDate[key];
      dateHeaderRows.add(tableBody.length);
      tableBody.push([{content:fmtDate(key),colSpan:4,styles:{}}]);
      let dailyWork=0, dailyBreak=0;
      items.forEach(row => {
        const timeStr = (row.startTime&&row.endTime) ? row.startTime+' \u2013 '+row.endTime : '\u2013';
        dailyWork += row.hrs; dailyBreak += (row.breakHrs||0);
        tableBody.push([timeStr, row.desc||'\u2013', 'Arbeitszeit', row.hrs.toFixed(2)+' h']);
      });
      dailySumRows.add(tableBody.length);
      tableBody.push([{content:'Tagesarbeit: '+dailyWork.toFixed(2)+' h   |   Pause: '+dailyBreak.toFixed(2)+' h',colSpan:4,styles:{}}]);
    });
  }

  doc.autoTable({
    startY:y, head:[['ZEIT','PROJEKT / BAUSTELLE','AUFGABE','DAUER']], body:tableBody,
    margin:{left:margin,right:margin}, tableWidth:'auto',
    styles:{fontSize:9,cellPadding:{top:3,right:5,bottom:3,left:5},textColor:txtDark,lineColor:[220,225,230],lineWidth:0.1,overflow:'linebreak'},
    headStyles:{fillColor:slate,textColor:white,fontStyle:'bold',fontSize:8,cellPadding:{top:4,right:5,bottom:4,left:5}},
    alternateRowStyles:{fillColor:[250,251,252]},
    columnStyles:{0:{cellWidth:34},1:{cellWidth:'auto'},2:{cellWidth:28},3:{cellWidth:22,halign:'right',fontStyle:'bold',textColor:slate}},
    didParseCell:(data) => {
      if (data.section !== 'body') return;
      const ri = data.row.index;
      if (dateHeaderRows.has(ri)) { data.cell.styles.fillColor=hdrGray; data.cell.styles.textColor=txtDark; data.cell.styles.fontStyle='bold'; data.cell.styles.fontSize=9; data.cell.styles.cellPadding={top:5,right:8,bottom:5,left:8}; }
      if (dailySumRows.has(ri))   { data.cell.styles.fillColor=sumGray; data.cell.styles.textColor=txtMuted; data.cell.styles.fontStyle='bold'; data.cell.styles.halign='right'; data.cell.styles.fontSize=8; data.cell.styles.cellPadding={top:4,right:8,bottom:4,left:8}; data.cell.styles.lineColor=[200,210,220]; }
    },
    didDrawPage:(data) => {
      if (data.pageNumber > 1) drawHeader();
      const pg = data.pageNumber;
      doc.setDrawColor(220,225,230); doc.setLineWidth(0.3);
      doc.line(margin, pageHeight-12, pageWidth-margin, pageHeight-12);
      doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...txtMuted);
      doc.text('Schürmann Gebäude + Energie', margin, pageHeight-8);
      doc.text(employeeName+'  |  '+today, pageWidth/2, pageHeight-8, {align:'center'});
      doc.text('Seite '+pg, pageWidth-margin, pageHeight-8, {align:'right'});
      doc.setFontSize(8); doc.setTextColor(150,150,150);
      doc.text('https://meinestunden.online/', pageWidth/2, pageHeight-4, {align:'center'});
    }
  });

  const lang = activeLanguageGlobal==='en' ? 'en-GB' : 'de-DE';
  const fmt = d => d.toLocaleDateString(lang,{day:'2-digit',month:'short',year:'numeric'}).replace(/\./g,'').replace(/\s+/g,'_');
  const safeName = employeeName.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_äöüÄÖÜß-]/g,'');
  doc.save(safeName+'_'+fmt(defPeriod.start)+'-'+fmt(defPeriod.end)+'.pdf');
}