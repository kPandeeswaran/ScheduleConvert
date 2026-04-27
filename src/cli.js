const fs = require('node:fs');
const path = require('node:path');
const { convertMifDirectory, convertMifFile } = require('./converter');

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
    console.error('   or: node mif_to_xml.js --input-dir input --output-dir output');
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

module.exports = {
  main,
  parseArgs,
};
