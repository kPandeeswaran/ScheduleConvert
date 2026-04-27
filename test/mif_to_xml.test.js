const test = require('node:test');
const assert = require('node:assert/strict');

const { convertAnchorsToXml } = require('../mif_to_xml');

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
