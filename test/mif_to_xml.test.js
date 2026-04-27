const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { convertAnchorsToXml, convertMifDirectory, main, parseArgs } = require('../mif_to_xml');

const SAMPLE = `
<ATbl 16>
<Tbl 
 <TblID 16>
 <TblBody 
  <Row 
   <Cell 
    <CellContent 
     <Para 
      <ParaLine 
       <String \`Sl. '>
      > # end of ParaLine
      <ParaLine 
       <String \`No.'>
      > # end of ParaLine
     > # end of Para
    > # end of CellContent
   > # end of Cell
   <Cell 
    <CellContent 
     <Para 
      <ParaLine 
       <String \`Header 2'>
      > # end of ParaLine
     > # end of Para
    > # end of CellContent
   > # end of Cell
  > # end of Row
  <Row 
   <Cell 
    <CellContent 
     <Para 
      <ParaLine 
       <String \`1.'>
      > # end of ParaLine
     > # end of Para
    > # end of CellContent
   > # end of Cell
   <Cell 
    <CellContent 
     <Para 
      <ParaLine 
       <String \`Value'>
      > # end of ParaLine
     > # end of Para
    > # end of CellContent
   > # end of Cell
  > # end of Row
 > # end of TblBody
> # end of Tbl
`;

test('ATbl maps to matching TblID block', () => {
  const xml = convertAnchorsToXml(SAMPLE);
  assert.ok(xml.includes('<table id="16">'));
  assert.ok(xml.includes('<cell>Sl. No.</cell>'));
  assert.ok(xml.includes('<cell>Value</cell>'));
});

test('missing table emits missing-table XML tag', () => {
  const xml = convertAnchorsToXml('<ATbl 99>');
  assert.ok(xml.includes('<missing-table id="99" />'));
});

test('directory mode converts all .mif files into separate xml files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mif-dir-test-'));
  const inputDir = path.join(tempRoot, 'mif');
  const outputDir = path.join(tempRoot, 'xml');

  fs.mkdirSync(inputDir, { recursive: true });
  fs.writeFileSync(path.join(inputDir, 'a.mif'), SAMPLE, 'utf8');
  fs.writeFileSync(path.join(inputDir, 'b.MIF'), '<ATbl 99>', 'utf8');
  fs.writeFileSync(path.join(inputDir, 'ignore.txt'), 'not mif', 'utf8');

  const converted = convertMifDirectory(inputDir, outputDir);

  assert.equal(converted.length, 2);

  const aXml = fs.readFileSync(path.join(outputDir, 'a.xml'), 'utf8');
  const bXml = fs.readFileSync(path.join(outputDir, 'b.xml'), 'utf8');

  assert.ok(aXml.includes('<table id="16">'));
  assert.ok(bXml.includes('<missing-table id="99" />'));
});

test('parseArgs accepts folder aliases', () => {
  const parsed = parseArgs(['--input-folder', 'in', '--output-folder', 'out']);
  assert.equal(parsed.inputDir, 'in');
  assert.equal(parsed.outputDir, 'out');
});

test('no-arg mode converts from ./input to ./output', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mif-default-dir-test-'));
  const inputDir = path.join(tempRoot, 'input');
  const outputDir = path.join(tempRoot, 'output');
  fs.mkdirSync(inputDir, { recursive: true });
  fs.writeFileSync(path.join(inputDir, 'from-default.mif'), SAMPLE, 'utf8');

  const originalCwd = process.cwd();
  process.chdir(tempRoot);
  try {
    const exitCode = main([]);
    assert.equal(exitCode, 0);
  } finally {
    process.chdir(originalCwd);
  }

  const generatedXml = fs.readFileSync(path.join(outputDir, 'from-default.xml'), 'utf8');
  assert.ok(generatedXml.includes('<table id="16">'));
});
