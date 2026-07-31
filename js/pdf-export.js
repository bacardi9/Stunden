function getPDFCompanyName() {
  return (
    localStorage.getItem('schuermann_company_name') ||
    'Meine Stunden Online'
  ).trim();
}

function getPDFEmployeeName() {
  return (
    localStorage.getItem('schuermann_current_user') ||
    auth.currentUser?.displayName ||
    'Mitarbeiter'
  ).trim();
}

function getDefaultPayrollPeriod() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let start;
  let end;

  if (today.getDate() >= 20) {
    start = new Date(
      today.getFullYear(),
      today.getMonth(),
      20,
      12
    );

    end = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      19,
      12
    );
  } else {
    start = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      20,
      12
    );

    end = new Date(
      today.getFullYear(),
      today.getMonth(),
      19,
      12
    );
  }

  return {
    startTimestamp: start.getTime(),
    endTimestamp: end.getTime(),
    startLabel: formatPDFDate(start),
    endLabel: formatPDFDate(end)
  };
}

function getSelectedPDFPeriod(useCustomPeriod) {
  if (!useCustomPeriod) {
    return getDefaultPayrollPeriod();
  }

  const startValue =
    document.getElementById('export-start-date')?.value.trim() || '';

  const endValue =
    document.getElementById('export-end-date')?.value.trim() || '';

  const startTimestamp = parseDMYLocal(startValue);
  const endTimestamp = parseDMYLocal(endValue);

  if (
    !Number.isFinite(startTimestamp) ||
    !Number.isFinite(endTimestamp)
  ) {
    throw new Error(
      'Bitte einen gültigen Exportzeitraum auswählen.'
    );
  }

  if (endTimestamp < startTimestamp) {
    throw new Error(
      'Das Enddatum darf nicht vor dem Startdatum liegen.'
    );
  }

  return {
    startTimestamp,
    endTimestamp,
    startLabel: startValue,
    endLabel: endValue
  };
}

function formatPDFDate(date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatPDFHours(value) {
  const hours = Number(value);
  return `${Number.isFinite(hours) ? hours.toFixed(2) : '0.00'} h`;
}

function getPDFRecordTimestamp(record) {
  const timestamp = Number(record?.dateTimestamp);

  if (Number.isFinite(timestamp)) {
    return timestamp;
  }

  return parseDMYLocal(record?.date || '');
}

function getPDFRecords(period) {
  return (globalLoggedSessionsDatabaseMock || [])
    .filter(record => {
      const timestamp = getPDFRecordTimestamp(record);

      return Number.isFinite(timestamp) &&
        timestamp >= period.startTimestamp &&
        timestamp <= period.endTimestamp;
    })
    .sort((left, right) => {
      return getPDFRecordTimestamp(left) -
        getPDFRecordTimestamp(right);
    });
}

function createPDFRows(records) {
  return records.map(record => {
    const isSchool =
      String(record.type || '').toUpperCase() === 'SCHOOL';

    const project =
      record.project ||
      record.projectName ||
      (isSchool ? 'Berufsschule' : '—');

    const start =
      record.startTime ||
      record.start ||
      '—';

    const end =
      record.endTime ||
      record.end ||
      '—';

    const breakMinutes = Number(
      record.breakMinutes ??
      record.breakDuration ??
      0
    ) || 0;

    const duration = Number(
      record.duration ??
      record.hours ??
      record.netHours ??
      0
    ) || 0;

    return [
      record.date || '—',
      isSchool ? 'Schultag' : project,
      isSchool ? '—' : start,
      isSchool ? '—' : end,
      isSchool ? '—' : `${breakMinutes} Min.`,
      isSchool ? 'Schule' : formatPDFHours(duration)
    ];
  });
}

function sanitizePDFFileName(value) {
  return String(value || 'Stundenzettel')
    .trim()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function addPDFHeader(
  documentInstance,
  companyName,
  employeeName,
  period
) {
  const pageWidth =
    documentInstance.internal.pageSize.getWidth();

  documentInstance.setFillColor(227, 6, 19);
  documentInstance.rect(0, 0, pageWidth, 4, 'F');

  documentInstance.setTextColor(15, 23, 42);
  documentInstance.setFont('helvetica', 'bold');
  documentInstance.setFontSize(18);
  documentInstance.text(companyName, 14, 18, {
    maxWidth: pageWidth - 28
  });

  documentInstance.setFontSize(13);
  documentInstance.text('STUNDENZETTEL', 14, 29);

  documentInstance.setFont('helvetica', 'normal');
  documentInstance.setFontSize(10);
  documentInstance.setTextColor(71, 85, 105);

  documentInstance.text(
    `Mitarbeiter: ${employeeName}`,
    14,
    38
  );

  documentInstance.text(
    `Zeitraum: ${period.startLabel} bis ${period.endLabel}`,
    14,
    45
  );

  documentInstance.text(
    `Erstellt am: ${formatPDFDate(new Date())}`,
    14,
    52
  );
}

function addPDFFooter(documentInstance, companyName) {
  const pageCount =
    documentInstance.internal.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    documentInstance.setPage(page);

    const pageWidth =
      documentInstance.internal.pageSize.getWidth();

    const pageHeight =
      documentInstance.internal.pageSize.getHeight();

    documentInstance.setDrawColor(226, 232, 240);
    documentInstance.line(
      14,
      pageHeight - 14,
      pageWidth - 14,
      pageHeight - 14
    );

    documentInstance.setFont('helvetica', 'normal');
    documentInstance.setFontSize(8);
    documentInstance.setTextColor(100, 116, 139);

    documentInstance.text(
      companyName,
      14,
      pageHeight - 8
    );

    documentInstance.text(
      `Seite ${page} von ${pageCount}`,
      pageWidth - 14,
      pageHeight - 8,
      {
        align: 'right'
      }
    );
  }
}

function buildTimesheetPDF(records, period) {
  if (!window.jspdf?.jsPDF) {
    throw new Error(
      'Die PDF-Bibliothek konnte nicht geladen werden.'
    );
  }

  const { jsPDF } = window.jspdf;
  const documentInstance = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const companyName = getPDFCompanyName();
  const employeeName = getPDFEmployeeName();
  const rows = createPDFRows(records);

  addPDFHeader(
    documentInstance,
    companyName,
    employeeName,
    period
  );

  documentInstance.autoTable({
    startY: 60,
    head: [[
      'Datum',
      'Baustelle / Typ',
      'Kommen',
      'Gehen',
      'Pause',
      'Netto'
    ]],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 63 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 22 },
      5: {
        cellWidth: 25,
        halign: 'right',
        fontStyle: 'bold'
      }
    },
    margin: {
      top: 18,
      right: 14,
      bottom: 20,
      left: 14
    },
    didDrawPage: data => {
      if (data.pageNumber > 1) {
        documentInstance.setFont('helvetica', 'bold');
        documentInstance.setFontSize(10);
        documentInstance.setTextColor(15, 23, 42);
        documentInstance.text(
          `${companyName} – Stundenzettel`,
          14,
          12
        );
      }
    }
  });

  const totalHours = records.reduce((sum, record) => {
    if (
      String(record.type || '').toUpperCase() === 'SCHOOL'
    ) {
      return sum;
    }

    const duration = Number(
      record.duration ??
      record.hours ??
      record.netHours ??
      0
    );

    return sum + (Number.isFinite(duration) ? duration : 0);
  }, 0);

  const schoolDays = records.filter(record => {
    return String(record.type || '').toUpperCase() === 'SCHOOL';
  }).length;

  let summaryY =
    (documentInstance.lastAutoTable?.finalY || 60) + 10;

  const pageHeight =
    documentInstance.internal.pageSize.getHeight();

  if (summaryY > pageHeight - 35) {
    documentInstance.addPage();
    summaryY = 24;
  }

  documentInstance.setFillColor(248, 250, 252);
  documentInstance.roundedRect(
    14,
    summaryY,
    182,
    18,
    2,
    2,
    'F'
  );

  documentInstance.setFont('helvetica', 'bold');
  documentInstance.setFontSize(10);
  documentInstance.setTextColor(15, 23, 42);

  documentInstance.text(
    `Einträge: ${records.length}`,
    19,
    summaryY + 11
  );

  documentInstance.text(
    `Schultage: ${schoolDays}`,
    76,
    summaryY + 11
  );

  documentInstance.setTextColor(227, 6, 19);
  documentInstance.text(
    `Gesamt: ${formatPDFHours(totalHours)}`,
    191,
    summaryY + 11,
    {
      align: 'right'
    }
  );

  addPDFFooter(documentInstance, companyName);

  return documentInstance;
}

function triggerPDFExportEngine(customPeriod) {
  try {
    const period = getSelectedPDFPeriod(Boolean(customPeriod));
    const records = getPDFRecords(period);

    if (!records.length) {
      showToast(
        'Im ausgewählten Zeitraum sind keine Einträge vorhanden.',
        'error'
      );
      return;
    }

    showToast('PDF wird erstellt ...', 'info');

    const documentInstance =
      buildTimesheetPDF(records, period);

    const fileName = [
      'Stundenzettel',
      sanitizePDFFileName(getPDFEmployeeName()),
      period.startLabel.replace(/\./g, '-'),
      period.endLabel.replace(/\./g, '-')
    ].join('_');

    documentInstance.save(`${fileName}.pdf`);

    showToast('PDF wurde heruntergeladen.', 'success');
  } catch (error) {
    console.error('PDF export failed:', error);

    showToast(
      error?.message || 'PDF konnte nicht erstellt werden.',
      'error'
    );
  }
}

function downloadPDFReport() {
  triggerPDFExportEngine(false);
}