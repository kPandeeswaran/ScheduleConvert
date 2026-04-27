import unittest

from mif_to_xml import convert_anchors_to_xml


SAMPLE = """
<ATbl 16>
<Tbl 
 <TblID 16>
 <TblBody 
  <Row 
   <Cell 
    <CellContent 
     <Para 
      <ParaLine 
       <String `Sl. '>
      > # end of ParaLine
      <ParaLine 
       <String `No.'>
      > # end of ParaLine
     > # end of Para
    > # end of CellContent
   > # end of Cell
   <Cell 
    <CellContent 
     <Para 
      <ParaLine 
       <String `Header 2'>
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
       <String `1.'>
      > # end of ParaLine
     > # end of Para
    > # end of CellContent
   > # end of Cell
   <Cell 
    <CellContent 
     <Para 
      <ParaLine 
       <String `Value'>
      > # end of ParaLine
     > # end of Para
    > # end of CellContent
   > # end of Cell
  > # end of Row
 > # end of TblBody
> # end of Tbl
"""


class TestMifToXml(unittest.TestCase):
    def test_atbl_maps_to_tblid(self):
        xml = convert_anchors_to_xml(SAMPLE)
        self.assertIn('<table id="16">', xml)
        self.assertIn('<cell>Sl. No.</cell>', xml)
        self.assertIn('<cell>Value</cell>', xml)

    def test_missing_table(self):
        xml = convert_anchors_to_xml("<ATbl 99>")
        self.assertIn('<missing-table id="99" />', xml)


if __name__ == "__main__":
    unittest.main()
