#!/usr/bin/env node

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
      if (stripped.startsWith('> # end of Tbl')) {
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

function parseTable(block) {
  let tableId = null;
  const rows = [];
  let currentRow = null;
  let currentCell = null;

  for (const line of block.split(/\r?\n/)) {
    const stripped = line.trim();

    if (tableId === null) {
      const rawId = findTagValue(stripped, 'TblID');
      if (rawId && /^\d+$/.test(rawId)) {
        tableId = Number(rawId);
      }
    }

    if (/^<Row(?:\s|$)/.test(stripped)) {
      currentRow = { cells: [] };
      rows.push(currentRow);
      continue;
    }

    if (/^<Cell(?:\s|$)/.test(stripped)) {
      if (!currentRow) {
        continue;
      }
      currentCell = { textParts: [] };
      currentRow.cells.push(currentCell);
      continue;
    }

    if (stripped.startsWith('> # end of Cell')) {
      currentCell = null;
      continue;
    }

    const stringVal = stringFromLine(stripped);
    if (stringVal !== null && currentCell) {
      currentCell.textParts.push(stringVal);
    }
  }

  if (tableId === null) {
    return null;
  }

  return { tableId, rows };
}

function parseTables(mifText) {
  const tables = new Map();
  for (const block of extractTableBlocks(mifText)) {
    const table = parseTable(block);
    if (table) {
      tables.set(table.tableId, table);
    }
  }
  return tables;
}

function escapeXml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeCellText(textParts) {
  return textParts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ')
    .trim();
}

function tableToXml(table) {
  const rowsXml = table.rows
    .map((row) => {
      const cellsXml = row.cells
        .map((cell) => `<cell>${escapeXml(normalizeCellText(cell.textParts))}</cell>`)
        .join('');
      return `<row>${cellsXml}</row>`;
    })
    .join('');

  return `<table id="${table.tableId}">${rowsXml}</table>`;
}

function convertAnchorsToXml(mifText) {
  const tables = parseTables(mifText);
  const seen = new Set();
  const parts = ['<tables>'];

  for (const match of mifText.matchAll(ATBL_RE)) {
    const tableId = Number(match[1]);
    if (seen.has(tableId)) {
      continue;
    }
    seen.add(tableId);

    const table = tables.get(tableId);
    if (!table) {
      parts.push(`<missing-table id="${tableId}" />`);
      continue;
    }

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
  const files = fs
    .readdirSync(inputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mif'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

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

function parseArgs(argv) {
  const options = {
    inputFile: null,
    outputFile: null,
    inputDir: null,
    outputDir: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '-o' || token === '--output') {
      options.outputFile = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (token === '--input-dir' || token === '--input-folder') {
      options.inputDir = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (token === '--output-dir' || token === '--output-folder') {
      options.outputDir = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (!token.startsWith('-') && options.inputFile === null) {
      options.inputFile = token;
    }
  }

  return options;
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes('-h') || argv.includes('--help')) {
    console.error('Usage: node mif_to_xml.js <input.mif> [-o output.xml]');
    console.error('   or: node mif_to_xml.js --input-dir mif --output-dir xml');
    console.error('   or: node mif_to_xml.js (uses ./input and ./output by default)');
    return 1;
  }

  const options = parseArgs(argv);

  if (argv.length === 0) {
    options.inputDir = path.join(process.cwd(), 'input');
    options.outputDir = path.join(process.cwd(), 'output');
  }

  if (options.inputDir || options.outputDir) {
    if (!options.inputDir || !options.outputDir) {
      console.error('Error: both --input-dir and --output-dir are required together.');
      return 1;
    }

    const converted = convertMifDirectory(options.inputDir, options.outputDir);
    process.stdout.write(`Converted ${converted.length} MIF file(s) to XML in ${options.outputDir}\n`);
    return 0;
  }

  if (!options.inputFile) {
    console.error('Error: input file path is required.');
    return 1;
  }

  const xmlText = convertMifFile(options.inputFile);

  if (options.outputFile) {
    fs.writeFileSync(options.outputFile, xmlText, 'utf8');
  } else {
    process.stdout.write(xmlText);
  }

  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  convertAnchorsToXml,
  convertMifDirectory,
  convertMifFile,
  main,
  parseArgs,
  parseTable,
  parseTables,
  tableToXml,
};
