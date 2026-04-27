# ScheduleConvert

Converts FrameMaker MIF table references to XML using Node.js.

## Structure

- `input/` → place one or more `.mif` files here.
- `output/` → generated `.xml` files are written here.
- `mif_to_xml.js` → CLI entry point.
- `src/converter.js` → conversion logic.
- `src/cli.js` → command-line argument handling.

## Usage

### Default mode (input to output)

```bash
node mif_to_xml.js
```

This reads every `.mif` file from `./input` and writes matching `.xml` files to `./output`.

### Convert one file

```bash
node mif_to_xml.js input/file.mif -o output/file.xml
```

### Convert custom folders

```bash
node mif_to_xml.js --input-dir ./input --output-dir ./output
```

Aliases: `--input-folder` and `--output-folder`.
