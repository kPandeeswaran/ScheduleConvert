#!/usr/bin/env node

const { main, parseArgs } = require('./src/cli');
const {
  convertAnchorsToXml,
  convertMifDirectory,
  convertMifFile,
  parseTable,
  parseTables,
  tableToXml,
} = require('./src/converter');

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
