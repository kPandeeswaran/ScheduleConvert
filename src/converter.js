const fs = require('node:fs');
const path = require('node:path');

const ATBL_RE = /<ATbl\s+(\d+)>/g;

function extractTableBlocks(mifText) {
  const blocks = [];
  let current = null;

  for (const line of mifText.split(/\r?\n/)) {
    const stripped = line.trim();
    if (/^<Tbl(?:\s|$)/.test(stripped)) {
      current = [line];
      continue;
    }

    if (current) {
      current.push(line);
      if (/^> # end of Tbl$/.test(stripped)) {
        blocks.push(current.join('\n'));
        current = null;
      }
    }
  }

  return blocks;
}

function findTagValue(line, tag) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = line.match(new RegExp(`<${escapedTag}\\s+(.+?)>`));
  return match ? match[1].trim() : null;
}

function stringFromLine(line) {
  const match = line.match(/<String\s+`(.*)'>/);
  return match ? match[1] : null;
}

function normalizeAlignment(value) {
  const map = { Left: 'left', Right: 'right', Center: 'center', LeftRight: 'left' };
  return map[value] || 'left';
}

function normalizeValign(value) {
  const map = { Top: 'top', Middle: 'center', Bottom: 'bottom' };
  return map[value] || 'top';
}

function parseTable(block) {
  let tableId = null;
  const rows = [];
  let currentRow = null;
  let currentCell = null;
  let paraTag = null;

  for (const line of block.split(/\r?\n/)) {
    const stripped = line.trim();

    if (tableId === null) {
      const rawId = findTagValue(stripped, 'TblID');
      if (rawId && /^\d+$/.test(rawId)) tableId = Number(rawId);
    }

    if (/^<Row(?:\s|$)/.test(stripped)) {
      currentRow = { cells: [] };
      rows.push(currentRow);
      continue;
    }
    if (/^<Cell(?:\s|$)/.test(stripped)) {
      if (!currentRow) continue;
      currentCell = { segments: [], align: 'left', valign: 'top', rowspan: null, colspan: null };
      currentRow.cells.push(currentCell);
      continue;
    }
    if (stripped.startsWith('> # end of Cell')) { currentCell = null; continue; }

    if (!currentCell) continue;

    const cellRows = findTagValue(stripped, 'CellRows');
    if (cellRows && /^\d+$/.test(cellRows) && Number(cellRows) > 1) currentCell.rowspan = Number(cellRows);
    const cellCols = findTagValue(stripped, 'CellColumns');
    if (cellCols && /^\d+$/.test(cellCols) && Number(cellCols) > 1) currentCell.colspan = Number(cellCols);

    const cellVal = findTagValue(stripped, 'PgfCellAlignment');
    if (cellVal) currentCell.valign = normalizeValign(cellVal);

    const alignVal = findTagValue(stripped, 'PgfAlignment');
    if (alignVal) currentCell.align = normalizeAlignment(alignVal);

    const pt = findTagValue(stripped, 'PgfTag');
    if (pt) paraTag = pt.replace(/^`|'+$/g, '');

    const stringVal = stringFromLine(stripped);
    if (stringVal !== null) {
      if (currentCell.segments.length && currentCell.segments[currentCell.segments.length - 1].type === 'text') {
        currentCell.segments[currentCell.segments.length - 1].value += stringVal;
      } else {
        currentCell.segments.push({ type: 'text', value: stringVal });
      }
    }

    if (/^<Char\s+SoftHyphen>/.test(stripped)) currentCell.segments.push({ type: 'text', value: '-' });
    if (/^<Char\s+HardReturn>/.test(stripped)) currentCell.segments.push({ type: 'br' });
  }

  if (tableId === null) return null;
  return { tableId, rows };
}

function parseTables(mifText) {
  const tables = new Map();
  for (const block of extractTableBlocks(mifText)) {
    const table = parseTable(block);
    if (table) tables.set(table.tableId, table);
  }
  return tables;
}

function escapeXml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function renderCellContent(cell) {
  const raw = cell.segments.map((seg) => (seg.type === 'br' ? '<br/>' : escapeXml(seg.value))).join('');
  const cleaned = raw.replace(/\s+/g, ' ').replace(/\s*<br\/>\s*/g, '<br/>').trim();
  return cleaned;
}

function tableToXml(table) {
  const rowsXml = table.rows.map((row) => {
    const cellsXml = row.cells.map((cell) => {
      const attrs = [`align="${cell.align}"`, `valign="${cell.valign}"`];
      if (cell.rowspan) attrs.push(`rowspan="${cell.rowspan}"`);
      if (cell.colspan) attrs.push(`colspan="${cell.colspan}"`);
      return `<cell ${attrs.join(' ')}>${renderCellContent(cell)}</cell>`;
    }).join('');
    return `<row>${cellsXml}</row>`;
  }).join('');

  return `<table id="${table.tableId}">${rowsXml}</table>`;
}

function convertAnchorsToXml(mifText) {
  const tables = parseTables(mifText);
  const anchorIds = [...mifText.matchAll(ATBL_RE)].map((match) => Number(match[1]));
  const parts = ['<tables>'];

  if (anchorIds.length === 0) {
    for (const tableId of [...tables.keys()].sort((a, b) => a - b)) parts.push(tableToXml(tables.get(tableId)));
    parts.push('</tables>');
    return parts.join('');
  }

  const seen = new Set();
  for (const tableId of anchorIds) {
    if (seen.has(tableId)) continue;
    seen.add(tableId);
    const table = tables.get(tableId);
    if (!table) { parts.push(`<missing-table id="${tableId}" />`); continue; }
    parts.push(tableToXml(table));
  }

  parts.push('</tables>');
  return parts.join('');
}

function convertMifFile(inputPath) {
  const mifText = fs.readFileSync(inputPath, 'utf8');
  return `${convertAnchorsToXml(mifText)}\n`;
}

function convertMifDirectory(inputDir, outputDir) {
  const files = fs.readdirSync(inputDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mif')).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
  fs.mkdirSync(outputDir, { recursive: true });
  const converted = [];
  for (const fileName of files) {
    const inputPath = path.join(inputDir, fileName);
    const baseName = fileName.replace(/\.mif$/i, '');
    const outputPath = path.join(outputDir, `${baseName}.xml`);
    fs.writeFileSync(outputPath, convertMifFile(inputPath), 'utf8');
    converted.push({ inputPath, outputPath });
  }
  return converted;
}

module.exports = { convertAnchorsToXml, convertMifDirectory, convertMifFile, parseTable, parseTables, tableToXml };
