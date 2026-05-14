type CsvCell = string | number | boolean | null | undefined;

export type CsvColumn<T> = {
  header: string;
  value: (item: T) => CsvCell;
};

function escapeCsvCell(value: CsvCell) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtmlCell(value: CsvCell) {
  const text = value == null ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  return [
    columns.map((column) => escapeCsvCell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(',')),
  ].join('\r\n');
}

function buildExcelHtml<T>(rows: T[], columns: CsvColumn<T>[]) {
  const headerCells = columns.map((column) => `<th>${escapeHtmlCell(column.header)}</th>`).join('');
  const bodyRows = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtmlCell(column.value(row))}</td>`).join('')}</tr>`)
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

export function createCsvFile<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const csv = buildCsv(rows, columns);
  return new File([`\uFEFF${csv}`], filename, { type: 'text/csv;charset=utf-8;' });
}

export function createExcelFile<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const html = buildExcelHtml(rows, columns);
  return new File([html], filename, { type: 'application/vnd.ms-excel;charset=utf-8;' });
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width <= maxWidth) {
      line = testLine;
      continue;
    }

    if (line) lines.push(line);

    if (context.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }

    let chunk = '';
    for (const char of word) {
      const testChunk = `${chunk}${char}`;
      if (context.measureText(testChunk).width <= maxWidth) {
        chunk = testChunk;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    line = chunk;
  }

  if (line) lines.push(line);
  return lines;
}

export function createTableImageFile<T>(filename: string, title: string, rows: T[], columns: CsvColumn<T>[]) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return Promise.reject(new Error('Unable to create share image.'));
  }

  const scale = 1;
  const tableColumns = columns;
  const paddingX = 28;
  const paddingY = 24;
  const titleHeight = 52;
  const headerHeight = 44;
  const cellPaddingX = 14;
  const cellPaddingY = 12;
  const lineHeight = 18;
  const minColumnWidth = 120;
  const maxColumnWidth = 260;

  context.font = '700 13px Arial, sans-serif';
  const columnWidths = tableColumns.map((column) => {
    const headerWidth = context.measureText(column.header).width + cellPaddingX * 2;
    return Math.min(maxColumnWidth, Math.max(minColumnWidth, headerWidth));
  });

  context.font = '400 13px Arial, sans-serif';
  rows.forEach((row) => {
    tableColumns.forEach((column, index) => {
      const value = column.value(row);
      const textWidth = context.measureText(value == null ? '' : String(value)).width + cellPaddingX * 2;
      columnWidths[index] = Math.min(maxColumnWidth, Math.max(columnWidths[index], textWidth));
    });
  });

  const wrappedRows = rows.map((row) =>
    tableColumns.map((column, index) => {
      const value = column.value(row);
      return wrapCanvasText(context, value == null ? '' : String(value), columnWidths[index] - cellPaddingX * 2);
    }),
  );
  const rowHeights = wrappedRows.map((cells) => Math.max(44, Math.max(...cells.map((lines) => lines.length * lineHeight + cellPaddingY * 2))));
  const width = paddingX * 2 + columnWidths.reduce((total, columnWidth) => total + columnWidth, 0);
  const height = paddingY * 2 + titleHeight + headerHeight + rowHeights.reduce((total, rowHeight) => total + rowHeight, 0);

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.scale(scale, scale);

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#0b2a59';
  context.fillRect(0, 0, width, paddingY + titleHeight);
  context.font = '700 24px Arial, sans-serif';
  context.fillStyle = '#ffffff';
  context.fillText(title, paddingX, paddingY + 32);

  context.font = '500 13px Arial, sans-serif';
  context.fillStyle = '#dbeafe';
  context.fillText(`${rows.length} asset${rows.length === 1 ? '' : 's'}`, paddingX, paddingY + 52);

  const tableTop = paddingY + titleHeight;
  context.fillStyle = '#113b73';
  context.fillRect(0, tableTop, width, headerHeight);

  context.font = '700 13px Arial, sans-serif';
  context.fillStyle = '#ffffff';
  let currentX = paddingX;
  tableColumns.forEach((column, index) => {
    context.fillText(column.header, currentX + cellPaddingX, tableTop + 28);
    currentX += columnWidths[index];
  });

  context.font = '400 13px Arial, sans-serif';
  let currentY = tableTop + headerHeight;
  wrappedRows.forEach((cells, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    const rowTop = currentY;
    context.fillStyle = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
    context.fillRect(0, rowTop, width, rowHeight);
    context.strokeStyle = '#e2e8f0';
    context.beginPath();
    context.moveTo(0, rowTop + rowHeight);
    context.lineTo(width, rowTop + rowHeight);
    context.stroke();

    let cellX = paddingX;
    cells.forEach((lines, columnIndex) => {
      context.fillStyle = '#0f172a';
      lines.forEach((line, lineIndex) => {
        context.fillText(line, cellX + cellPaddingX, rowTop + cellPaddingY + 13 + lineIndex * lineHeight);
      });
      cellX += columnWidths[columnIndex];
    });

    currentY += rowHeight;
  });

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to create share image.'));
        return;
      }

      resolve(new File([blob], filename, { type: 'image/png' }));
    }, 'image/png');
  });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');

  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const csv = buildCsv(rows, columns);

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
