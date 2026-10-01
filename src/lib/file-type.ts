export type FileKind = "PDF" | "Word" | "Excel" | "CSV" | "PowerPoint" | "Image" | "ZIP" | "Text" | "Other"

const BY_EXT: Record<string, FileKind> = {
  pdf: "PDF",
  doc: "Word", docx: "Word", odt: "Word", rtf: "Word",
  xls: "Excel", xlsx: "Excel", xlsm: "Excel", ods: "Excel",
  csv: "CSV",
  ppt: "PowerPoint", pptx: "PowerPoint", odp: "PowerPoint",
  png: "Image", jpg: "Image", jpeg: "Image", gif: "Image", webp: "Image", bmp: "Image", svg: "Image", heic: "Image", tif: "Image", tiff: "Image",
  zip: "ZIP", rar: "ZIP", "7z": "ZIP", gz: "ZIP", tar: "ZIP",
  txt: "Text", md: "Text", log: "Text",
}

export const FILE_KINDS: FileKind[] = ["PDF", "Word", "Excel", "CSV", "PowerPoint", "Image", "ZIP", "Text", "Other"]

export function fileExtension(name: string) {
  const i = name.lastIndexOf(".")
  return i > 0 ? name.slice(i + 1).toLowerCase() : ""
}

export function fileKind(name: string): FileKind {
  return BY_EXT[fileExtension(name)] ?? "Other"
}
