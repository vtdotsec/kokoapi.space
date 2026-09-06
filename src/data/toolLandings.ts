// Content for the focused SEO landing pages under /pdf/, /convert/, /qr/, etc.
// Each entry reuses the existing single-page app for its toolkit by embedding
// it pre-selected (?tool=<name>&embed=1). Add a new object here (plus an entry
// in the matching src/pages/<tool>/[tool].astro getStaticPaths when a new
// toolkit folder is wired up) to ship another landing page.

export interface LandingStep {
  title: string;
  text: string;
}

export interface LandingFaq {
  q: string;
  a: string;
}

export interface ToolLandingEntry {
  slug: string;
  /** Parent toolkit path, e.g. /pdf/ */
  parentPath: string;
  parentLabel: string;
  /** Short breadcrumb label for this page */
  crumb: string;
  /** The existing tool app, pre-selected and stripped of chrome */
  iframeSrc: string;
  widgetTitle: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  note: string;
  howtoHeading: string;
  steps: LandingStep[];
  faqs: LandingFaq[];
  featureList: string[];
  related: { label: string; href: string }[];
}

const SITE = "https://kokoapi.space";

export const TOOL_LANDINGS: ToolLandingEntry[] = [
  {
    slug: "merge-pdf",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Merge PDF",
    iframeSrc: "/pdf/?tool=merge&embed=1",
    widgetTitle: "Merge PDF files online — free, in your browser",
    title: "Merge PDF — Combine PDF Files Online Free, No Upload",
    description:
      "Combine two or more PDF files into one document for free. Merging happens locally in your browser, so your files are never uploaded to a server.",
    h1: "Merge PDF files, privately and free",
    lead: "Join several PDF documents into a single file in any order — directly in your browser. Your documents stay on your device and nothing is uploaded.",
    note: "100% local processing: the merge runs with client-side libraries and the result is downloaded by your browser. No accounts, no cookies, no telemetry.",
    howtoHeading: "How to merge PDF files",
    steps: [
      {
        title: "Choose the PDFs",
        text: "Pick two or more PDF files, or drop them onto the box. Your browser reads the files locally, so there is no waiting for an upload.",
      },
      {
        title: "Check the order",
        text: "Each document is added in the order shown. Use the arrows next to a file to change where it goes in the merged result.",
      },
      {
        title: "Merge and download",
        text: "Press “Merge and download”. The combined PDF is assembled locally and saved by your browser — your original files are never modified.",
      },
    ],
    faqs: [
      {
        q: "Are my PDFs uploaded to a server?",
        a: "No. The files are read and merged inside your browser with client-side libraries. Nothing is sent over the network, so there is no upload limit and nothing is stored afterwards.",
      },
      {
        q: "Can I merge more than two PDFs?",
        a: "Yes. You can add any number of documents; the merged file follows the order shown in the list.",
      },
      {
        q: "Do the pages keep their formatting?",
        a: "Yes. Merging copies the original pages into a new PDF without re-rendering them, so text, links and layout are preserved.",
      },
      {
        q: "What about password-protected PDFs?",
        a: "A protected file must be decrypted first. The PDF toolkit can unlock a file when you already know its password, and the result is then ready to merge.",
      },
    ],
    featureList: [
      "Combine any number of PDF files",
      "Reorder documents before merging",
      "Processed locally in the browser, never uploaded",
      "Free, no sign-up",
    ],
    related: [
      { label: "Compress PDF", href: "/pdf/compress-pdf/" },
      { label: "All PDF tools", href: "/pdf/" },
      { label: "File converter", href: "/convert/" },
    ],
  },
  {
    slug: "compress-pdf",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Compress PDF",
    iframeSrc: "/pdf/?tool=compress&embed=1",
    widgetTitle: "Compress PDF files online — free, in your browser",
    title: "Compress PDF — Reduce PDF File Size Online Free, No Upload",
    description:
      "Make a PDF smaller for free. Compression runs locally in your browser with quality and resolution controls, and your file is never uploaded.",
    h1: "Compress PDF files online",
    lead: "Shrink a large PDF — scans, photos and image-heavy documents — by re-rendering its pages as optimized images. Everything happens in your browser.",
    note: "100% local processing: the compressed PDF is generated on your device and downloaded by your browser. No accounts, no cookies, no telemetry.",
    howtoHeading: "How to compress a PDF",
    steps: [
      {
        title: "Choose the PDF",
        text: "Pick the file you want to shrink, or drop it onto the box. It is read locally, so even very large documents are handled by your own device.",
      },
      {
        title: "Set quality and resolution",
        text: "Drag the quality slider down for a smaller file, and pick a resolution: Screen (1×) for the web, High (1.5×) or Print (2×) when you need sharper output.",
      },
      {
        title: "Compress and download",
        text: "Press “Compress and download”. Each page is re-rendered as an optimized image in a new PDF that your browser saves for you.",
      },
    ],
    faqs: [
      {
        q: "Will the text stay selectable after compression?",
        a: "No — compression re-renders every page as an image, so text becomes part of the picture. This works best for scans and image-heavy documents rather than text you still need to select or search.",
      },
      {
        q: "What quality should I pick?",
        a: "Lower quality means a smaller file. Start with the middle value and lower it until the result looks acceptable — for a PDF meant to be read on screen, Screen resolution is usually enough.",
      },
      {
        q: "Is my PDF uploaded to a server?",
        a: "No. The file never leaves your device; the compressed copy is generated locally by your browser.",
      },
      {
        q: "Does compression modify my original file?",
        a: "No. A new, smaller PDF is produced and downloaded; the file you chose stays untouched.",
      },
    ],
    featureList: [
      "Reduce PDF file size in the browser",
      "Quality and resolution controls",
      "Processed locally, never uploaded",
      "Free, no sign-up",
    ],
    related: [
      { label: "Merge PDF", href: "/pdf/merge-pdf/" },
      { label: "All PDF tools", href: "/pdf/" },
      { label: "Image tools", href: "/image/" },
    ],
  },
  {
    slug: "split-pdf",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Split PDF",
    iframeSrc: "/pdf/?tool=split&embed=1",
    widgetTitle: "Split a PDF into page ranges or single pages",
    title: "Split PDF — Extract Pages Online Free, No Upload",
    description: "Split a PDF by page range or export every page as its own file, for free and in your browser. Your documents are never uploaded.",
    h1: "Split a PDF into pages or ranges",
    lead: "Extract a few pages into a new PDF or turn every page into its own file — all locally in your browser.",
    note: "100% local processing: the PDF is read and split on your device; nothing is uploaded.",
    howtoHeading: "How to split a PDF",
    steps: [
      { title: "Choose the PDF", text: "Pick the file or drop it onto the box." },
      { title: "Select the pages", text: "Enter the range to keep (for example 1, 3-5) or export every page as separate files in a ZIP." },
      { title: "Split and download", text: "Press the button and the result is saved by your browser." },
    ],
    faqs: [
      { q: "Are my documents uploaded?", a: "No. Splitting happens locally in your browser with client-side libraries." },
      { q: "Can I keep only a few pages?", a: "Yes — type the pages or ranges you need and the tool exports exactly those pages." },
    ],
    featureList: ["Split by page range", "Export each page separately as a ZIP", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Merge PDF", href: "/pdf/merge-pdf/" },
      { label: "Reorder PDF", href: "/pdf/reorder-pdf/" },
      { label: "All PDF tools", href: "/pdf/" },
    ],
  },
  {
    slug: "reorder-pdf",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Reorder PDF",
    iframeSrc: "/pdf/?tool=reorder&embed=1",
    widgetTitle: "Reorder pages of a PDF by dragging",
    title: "Reorder PDF Pages Online Free — Drag to Arrange, No Upload",
    description: "Reorder the pages of a PDF by dragging thumbnails, for free and in your browser. Files are processed locally and never uploaded.",
    h1: "Reorder pages in a PDF",
    lead: "Drag page thumbnails into the order you want and download a new PDF — the original stays untouched on your device.",
    note: "100% local processing: pages are rearranged in your browser; nothing is uploaded.",
    howtoHeading: "How to reorder a PDF",
    steps: [
      { title: "Choose the PDF", text: "Pick the file or drop it onto the box to see page thumbnails." },
      { title: "Drag the pages", text: "Drag cards to change the order; the preview follows your arrangement." },
      { title: "Download", text: "Press the button and the reordered PDF is saved by your browser." },
    ],
    faqs: [
      { q: "Is my PDF uploaded?", a: "No. Reordering runs locally in your browser." },
      { q: "Does the original change?", a: "No. A new PDF in the order you arranged is downloaded; the original file is never modified." },
    ],
    featureList: ["Drag-and-drop page order", "Visual thumbnails", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Split PDF", href: "/pdf/split-pdf/" },
      { label: "Rotate pages", href: "/pdf/rotate-pdf/" },
      { label: "All PDF tools", href: "/pdf/" },
    ],
  },
  {
    slug: "rotate-pdf",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Rotate PDF",
    iframeSrc: "/pdf/?tool=organize&embed=1",
    widgetTitle: "Rotate or delete pages of a PDF",
    title: "Rotate or Delete PDF Pages Online Free, No Upload",
    description: "Rotate a scanned or photographed PDF into the right orientation and delete unwanted pages — for free, in your browser.",
    h1: "Rotate or delete PDF pages",
    lead: "Fix the orientation of scanned pages and remove the ones you do not need. Everything happens locally in your browser.",
    note: "100% local processing: no upload — the corrected PDF is produced on your device.",
    howtoHeading: "How to rotate or delete pages",
    steps: [
      { title: "Choose the PDF", text: "Pick the file or drop it onto the box; page thumbnails appear." },
      { title: "Rotate or remove", text: "Use the arrows to turn a page and the cross to delete it. Rotation is relative to the original orientation." },
      { title: "Download", text: "Press the button and the edited PDF is saved by your browser." },
    ],
    faqs: [
      { q: "Is my PDF uploaded anywhere?", a: "No. Pages are rotated and removed locally in your browser." },
      { q: "Is the original file modified?", a: "No. A new PDF is downloaded; your original stays untouched." },
    ],
    featureList: ["Rotate pages in 90° steps", "Delete unwanted pages", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Reorder PDF", href: "/pdf/reorder-pdf/" },
      { label: "Add page numbers", href: "/pdf/add-page-numbers/" },
      { label: "All PDF tools", href: "/pdf/" },
    ],
  },
  {
    slug: "add-page-numbers",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Add Page Numbers",
    iframeSrc: "/pdf/?tool=pagenum&embed=1",
    widgetTitle: "Add page numbers to a PDF",
    title: "Add Page Numbers to PDF Online Free — Custom Template, No Upload",
    description: "Number the pages of a PDF with your own template (for example “Page {n} of {total}”), for free and in your browser.",
    h1: "Add page numbers to a PDF",
    lead: "Stamp every page with a number or a template such as “Page 3 of 12”, positioned where you want. All processing is local.",
    note: "100% local processing: numbers are drawn in your browser; nothing is uploaded.",
    howtoHeading: "How to add page numbers",
    steps: [
      { title: "Choose the PDF", text: "Pick the file or drop it onto the box." },
      { title: "Set the template", text: "Edit the template and choose position (top or bottom) and alignment." },
      { title: "Download", text: "Press the button and the numbered PDF is saved by your browser." },
    ],
    faqs: [
      { q: "Can I customize the number format?", a: "Yes — the template accepts placeholders like {n} and {total}, so “Page {n} of {total}” works." },
      { q: "Are my files uploaded?", a: "No. Page numbering runs entirely in your browser." },
    ],
    featureList: ["Custom number template", "Top or bottom, left/center/right", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Watermark PDF", href: "/pdf/pdf-watermark/" },
      { label: "Rotate pages", href: "/pdf/rotate-pdf/" },
      { label: "All PDF tools", href: "/pdf/" },
    ],
  },
  {
    slug: "pdf-watermark",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Watermark PDF",
    iframeSrc: "/pdf/?tool=watermark&embed=1",
    widgetTitle: "Add a text watermark to a PDF",
    title: "Add Watermark to PDF Online Free — Text Mark, No Upload",
    description: "Stamp a confidential or draft mark onto every PDF page — for free, in your browser, with size, opacity, rotation and color controls.",
    h1: "Watermark a PDF with text",
    lead: "Mark a document as confidential or add your brand text across every page. The watermark is drawn locally; nothing is uploaded.",
    note: "100% local processing: the watermarked PDF is built in your browser.",
    howtoHeading: "How to watermark a PDF",
    steps: [
      { title: "Choose the PDF", text: "Pick the file or drop it onto the box." },
      { title: "Set the text and style", text: "Type the mark and adjust font size, opacity, rotation and color." },
      { title: "Download", text: "Press the button and the watermarked PDF is saved by your browser." },
    ],
    faqs: [
      { q: "Is my document uploaded?", a: "No. The watermark is applied locally in your browser." },
      { q: "Can I watermark every page?", a: "Yes — the text mark is stamped across the whole document by default." },
    ],
    featureList: ["Text watermark on every page", "Size, opacity, rotation and color", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Add page numbers", href: "/pdf/add-page-numbers/" },
      { label: "Unlock PDF", href: "/pdf/unlock-pdf/" },
      { label: "All PDF tools", href: "/pdf/" },
    ],
  },
  {
    slug: "unlock-pdf",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Unlock PDF",
    iframeSrc: "/pdf/?tool=unlock&embed=1",
    widgetTitle: "Unlock a password-protected PDF with the password you know",
    title: "Unlock PDF Online Free — Remove a Password You Know, No Upload",
    description: "Unlock a password-protected PDF when you already know the password, for free and in your browser. The file never leaves your device.",
    h1: "Unlock a password-protected PDF",
    lead: "Remove the open password from a PDF you have the password for. Decryption runs locally in your browser — nothing is uploaded.",
    note: "100% local processing: the file is decrypted on your device. This only works with the correct password.",
    howtoHeading: "How to unlock a PDF",
    steps: [
      { title: "Choose the PDF", text: "Pick the protected file or drop it onto the box." },
      { title: "Enter the password", text: "Type the password required by the document." },
      { title: "Download", text: "Press the button and the unlocked PDF is saved by your browser." },
    ],
    faqs: [
      { q: "Can you remove a password I don't know?", a: "No. Unlock works only when you already know the password — the file is decrypted locally and there is no server that could try passwords." },
      { q: "Does unlocking change the text?", a: "The unlocked PDF is rebuilt from rendered pages, so its text becomes non-selectable." },
    ],
    featureList: ["Removes an open password you know", "Local decryption, no upload", "Free, no sign-up"],
    related: [
      { label: "Extract text", href: "/pdf/extract-text/" },
      { label: "Watermark PDF", href: "/pdf/pdf-watermark/" },
      { label: "All PDF tools", href: "/pdf/" },
    ],
  },
  {
    slug: "extract-text",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Extract Text",
    iframeSrc: "/pdf/?tool=extract&embed=1",
    widgetTitle: "Extract text from a PDF",
    title: "Extract Text from PDF Online Free — Copy or Download TXT",
    description: "Pull the selectable text out of a PDF and copy it or save it as a TXT file — for free, in your browser, with no uploads.",
    h1: "Extract text from a PDF",
    lead: "Copy the text layer of a PDF or download it as a .txt file. Extraction runs locally in your browser.",
    note: "100% local processing: text is extracted on your device; the document is never uploaded.",
    howtoHeading: "How to extract text from a PDF",
    steps: [
      { title: "Choose the PDF", text: "Pick the file or drop it onto the box." },
      { title: "Extract", text: "Press the button to read the text layer of the pages." },
      { title: "Copy or download", text: "Copy the result to the clipboard or download it as a .txt file." },
    ],
    faqs: [
      { q: "My PDF has no extractable text — why?", a: "Scanned documents are images without a text layer; run OCR first or use the PDF-to-images tool to see the pages." },
      { q: "Is my document uploaded?", a: "No. Extraction happens locally in your browser." },
    ],
    featureList: ["Copy or download as TXT", "Runs fully in the browser", "Free, no sign-up"],
    related: [
      { label: "PDF to images", href: "/pdf/pdf-to-images/" },
      { label: "Split PDF", href: "/pdf/split-pdf/" },
      { label: "All PDF tools", href: "/pdf/" },
    ],
  },
  {
    slug: "images-to-pdf",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "Images to PDF",
    iframeSrc: "/pdf/?tool=imgs2pdf&embed=1",
    widgetTitle: "Turn images into a PDF",
    title: "Convert Images to PDF Online Free — JPG, PNG, WebP, No Upload",
    description: "Combine JPG, PNG and WebP images into a single PDF, for free and in your browser. Images are processed locally and never uploaded.",
    h1: "Convert images into a PDF",
    lead: "Turn a set of photos or scans into one PDF, in the order you choose. Everything happens locally in your browser.",
    note: "100% local processing: the PDF is built on your device; nothing is uploaded.",
    howtoHeading: "How to make a PDF from images",
    steps: [
      { title: "Choose the images", text: "Pick one or more JPG, PNG or WebP files." },
      { title: "Order them", text: "Reorder the files so the PDF follows the sequence you want." },
      { title: "Create the PDF", text: "Choose a page size and press the button; the PDF is saved by your browser." },
    ],
    faqs: [
      { q: "Are my images uploaded?", a: "No. The PDF is assembled locally in your browser." },
      { q: "Which formats are supported?", a: "JPG, PNG and WebP. Each image becomes one page, fitted on the page size you pick." },
    ],
    featureList: ["JPG, PNG and WebP input", "Reorder before export", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "PDF to images", href: "/pdf/pdf-to-images/" },
      { label: "Merge PDF", href: "/pdf/merge-pdf/" },
      { label: "All PDF tools", href: "/pdf/" },
    ],
  },
  {
    slug: "pdf-to-images",
    parentPath: "/pdf/",
    parentLabel: "PDF tools",
    crumb: "PDF to Images",
    iframeSrc: "/pdf/?tool=pdf2img&embed=1",
    widgetTitle: "Turn PDF pages into PNG or JPEG images",
    title: "Convert PDF to Images Online Free — Pages to PNG/JPEG, No Upload",
    description: "Turn every PDF page into a PNG or JPEG image, for free and in your browser. Files are processed locally and never uploaded.",
    h1: "Convert PDF pages into images",
    lead: "Export a PDF as PNG or JPEG images — one per page, downloaded individually or in a ZIP. All processing happens locally.",
    note: "100% local processing: pages are rendered in your browser; the PDF never leaves your device.",
    howtoHeading: "How to convert a PDF to images",
    steps: [
      { title: "Choose the PDF", text: "Pick the file or drop it onto the box." },
      { title: "Pick format and size", text: "Choose PNG or JPEG, adjust quality for JPEG and pick ZIP or individual downloads." },
      { title: "Download", text: "Press the button and the images are saved by your browser." },
    ],
    faqs: [
      { q: "Is my PDF uploaded?", a: "No. Pages are rendered to images locally in your browser." },
      { q: "Can I get one file per page?", a: "Yes — download each page separately or get all pages in a single ZIP." },
    ],
    featureList: ["PNG or JPEG output", "Single files or ZIP", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Images to PDF", href: "/pdf/images-to-pdf/" },
      { label: "Extract text", href: "/pdf/extract-text/" },
      { label: "All PDF tools", href: "/pdf/" },
    ],
  },
  {
    slug: "convert",
    parentPath: "/image/",
    parentLabel: "Image tools",
    crumb: "Convert Image",
    iframeSrc: "/image/?tool=convert&embed=1",
    widgetTitle: "Convert images between PNG, JPEG, WebP and AVIF in your browser",
    title: "Convert Image to PNG, JPEG, WebP or AVIF Online Free — No Upload",
    description: "Change an image between PNG, JPEG, WebP and AVIF formats for free. Conversion runs in your browser with a quality slider — no uploads.",
    h1: "Convert images between formats online",
    lead: "Switch a photo between PNG, JPEG, WebP and AVIF without installing anything. The file is opened and re-encoded on your device and never uploaded.",
    note: "100% local processing: the converted image is produced by your browser. No accounts, no cookies, no telemetry.",
    howtoHeading: "How to convert an image",
    steps: [
      { title: "Choose the image", text: "Pick the file, or drop it onto the box. It is decoded locally by your browser." },
      { title: "Pick the format and quality", text: "Select PNG (lossless), JPEG, WebP or AVIF and adjust the quality slider for lossy formats." },
      { title: "Convert and download", text: "Press the button and the converted image is saved by your browser." },
    ],
    faqs: [
      { q: "Is my image uploaded to a server?", a: "No. Images are decoded and re-encoded in your browser with the Canvas API; nothing is sent over the network." },
      { q: "Which format should I use?", a: "PNG for lossless graphics, JPEG or WebP for photos, AVIF for the smallest files where browser support allows it." },
      { q: "Does converting remove metadata?", a: "Yes — every re-encode drops EXIF and GPS data, which is usually what you want when sharing." },
    ],
    featureList: ["PNG, JPEG, WebP and AVIF output", "Quality slider for lossy formats", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Compress image", href: "/image/compress/" },
      { label: "Crop image", href: "/image/crop/" },
      { label: "All image tools", href: "/image/" },
    ],
  },
  {
    slug: "compress",
    parentPath: "/image/",
    parentLabel: "Image tools",
    crumb: "Compress Image",
    iframeSrc: "/image/?tool=resize&embed=1",
    widgetTitle: "Compress and resize an image in your browser",
    title: "Compress Image — Reduce File Size Online Free, No Upload",
    description: "Make an image smaller for the web for free: lower quality and/or a smaller longest side. Compression runs locally in your browser.",
    h1: "Compress and resize images online",
    lead: "Shrink a photo for e-mail or the web by lowering the quality, capping the pixel size, or both. All processing stays on your device.",
    note: "100% local processing: the smaller image is generated by your browser. Nothing is uploaded.",
    howtoHeading: "How to compress an image",
    steps: [
      { title: "Choose the image", text: "Pick a file or drop one onto the box." },
      { title: "Set quality and size", text: "Drag the quality slider down and, when needed, cap the longest side in pixels." },
      { title: "Download the result", text: "Press the button and the compressed image is saved by your browser." },
    ],
    faqs: [
      { q: "Why does my image still look good at low quality?", a: "Photos tolerate JPEG and WebP compression well; lower the quality until you see artefacts, then step back up one notch." },
      { q: "Is the original file changed?", a: "No. A new, smaller copy is produced and downloaded; your original stays untouched." },
      { q: "Is my photo uploaded anywhere?", a: "No. Compression runs entirely in your browser." },
    ],
    featureList: ["Quality slider and size cap", "PNG, JPEG and WebP aware", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Convert image", href: "/image/convert-image/" },
      { label: "Remove EXIF", href: "/image/remove-exif/" },
      { label: "All image tools", href: "/image/" },
    ],
  },
  {
    slug: "crop",
    parentPath: "/image/",
    parentLabel: "Image tools",
    crumb: "Crop Image",
    iframeSrc: "/image/?tool=crop&embed=1",
    widgetTitle: "Crop an image by dragging a selection",
    title: "Crop Image Online Free — Drag to Select, No Upload",
    description: "Crop a photo or screenshot online for free: drag a selection on the preview and download the cropped PNG. Processing is local in your browser.",
    h1: "Crop images online",
    lead: "Remove unwanted edges by dragging a selection directly on the image. The crop is computed on your device, so nothing is uploaded.",
    note: "100% local processing: the image is never uploaded; the cropped result is downloaded by your browser.",
    howtoHeading: "How to crop an image",
    steps: [
      { title: "Choose the image", text: "Pick a file or drop one onto the box — a preview appears." },
      { title: "Drag the selection", text: "Drag across the preview to mark the area to keep; coordinates are in source pixels." },
      { title: "Crop and download", text: "Press the crop button and the PNG is saved by your browser." },
    ],
    faqs: [
      { q: "Can I crop to a specific size?", a: "The selection is free-form; the tool exports exactly the rectangle you drew, in source pixels." },
      { q: "Is my image uploaded?", a: "No. The preview and the crop run locally in your browser." },
      { q: "Does cropping keep the rest of the photo?", a: "No — only the selected rectangle is exported, so the file also gets smaller." },
    ],
    featureList: ["Visual drag-to-select crop", "Source-pixel accuracy", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Watermark image", href: "/image/watermark/" },
      { label: "Compress image", href: "/image/compress/" },
      { label: "All image tools", href: "/image/" },
    ],
  },
  {
    slug: "remove-exif",
    parentPath: "/image/",
    parentLabel: "Image tools",
    crumb: "Remove EXIF",
    iframeSrc: "/image/?tool=strip&embed=1",
    widgetTitle: "Remove EXIF and GPS metadata from images in your browser",
    title: "Remove EXIF and GPS Data from Photos Online Free — No Upload",
    description: "Strip EXIF, GPS and other metadata from photos for free, right in your browser. Your images are never uploaded to a server.",
    h1: "Remove EXIF and GPS metadata from photos",
    lead: "Clean the hidden data cameras embed in photos — location, device, date — before sharing. Images are re-encoded locally and never leave your device.",
    note: "100% local processing: files are read and rewritten in your browser; nothing is uploaded.",
    howtoHeading: "How to remove metadata from photos",
    steps: [
      { title: "Choose the photos", text: "Pick one or more images; they are read locally." },
      { title: "Strip the metadata", text: "Press the button — each photo is re-encoded without its EXIF and GPS blocks." },
      { title: "Download the copies", text: "The cleaned files are downloaded by your browser." },
    ],
    faqs: [
      { q: "What metadata gets removed?", a: "Everything the browser strips during re-encode: EXIF, GPS, camera make and model and other embedded blocks." },
      { q: "Will the photo quality change?", a: "The pixels are re-encoded, so a JPEG may shift very slightly. Keep the quality high to minimize it." },
      { q: "Are my photos uploaded anywhere?", a: "No — all processing happens locally in your browser." },
    ],
    featureList: ["Removes EXIF, GPS and camera data", "Works on multiple images at once", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Compress image", href: "/image/compress/" },
      { label: "Convert image", href: "/image/convert-image/" },
      { label: "All image tools", href: "/image/" },
    ],
  },
  {
    slug: "watermark",
    parentPath: "/image/",
    parentLabel: "Image tools",
    crumb: "Watermark",
    iframeSrc: "/image/?tool=wmark&embed=1",
    widgetTitle: "Add a text or logo watermark to an image",
    title: "Add Watermark to Image Online Free — Text or Logo, No Upload",
    description: "Add a text or logo watermark to photos online for free. The image is watermarked locally in your browser and never uploaded.",
    h1: "Watermark images with text or a logo",
    lead: "Protect your photos before sharing: stamp a text caption or a logo onto the picture. Everything runs in your browser.",
    note: "100% local processing: no upload — the watermarked image is generated on your device.",
    howtoHeading: "How to watermark an image",
    steps: [
      { title: "Choose the image", text: "Pick a photo or drop one onto the box." },
      { title: "Add text or a logo", text: "Type a caption, or choose a small logo image, and position it on the preview." },
      { title: "Download", text: "Press the button and the watermarked image is saved by your browser." },
    ],
    faqs: [
      { q: "Is my image uploaded to a server?", a: "No. The watermark is composited locally in your browser." },
      { q: "Can I use my own logo?", a: "Yes — upload a small image and it is placed on top of the photo." },
      { q: "Does the original change?", a: "No. A new watermarked copy is produced and downloaded." },
    ],
    featureList: ["Text or logo watermark", "Position and opacity controls", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Crop image", href: "/image/crop/" },
      { label: "Photo filters", href: "/image/filters/" },
      { label: "All image tools", href: "/image/" },
    ],
  },
  {
    slug: "filters",
    parentPath: "/image/",
    parentLabel: "Image tools",
    crumb: "Photo Filters",
    iframeSrc: "/image/?tool=filters&embed=1",
    widgetTitle: "Adjust brightness, contrast and saturation of a photo",
    title: "Apply Photo Filters Online Free — Brightness, Contrast, Saturation",
    description: "Adjust brightness, contrast and saturation of a photo online for free. Filters are applied locally in your browser with instant preview.",
    h1: "Adjust photo brightness, contrast and saturation",
    lead: "Tune a photo with simple sliders — brightness, contrast and saturation — and see the result instantly. No uploads: everything happens on your device.",
    note: "100% local processing: filters are applied in your browser and the result is downloaded from there.",
    howtoHeading: "How to apply filters to a photo",
    steps: [
      { title: "Choose the photo", text: "Pick an image or drop one onto the box." },
      { title: "Move the sliders", text: "Adjust brightness, contrast and saturation until the preview looks right." },
      { title: "Download", text: "Press the button and the adjusted photo is saved by your browser." },
    ],
    faqs: [
      { q: "Is my photo uploaded?", a: "No. Filters are applied locally in your browser with the Canvas API." },
      { q: "Which adjustments are available?", a: "Brightness, contrast and saturation — enough for most quick fixes without destructive edits." },
      { q: "Does the original change?", a: "No. A new adjusted copy is downloaded; your original is untouched." },
    ],
    featureList: ["Brightness, contrast and saturation", "Instant preview", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Crop image", href: "/image/crop/" },
      { label: "Watermark image", href: "/image/watermark/" },
      { label: "All image tools", href: "/image/" },
    ],
  },
  {
    slug: "batch",
    parentPath: "/image/",
    parentLabel: "Image tools",
    crumb: "Batch Convert",
    iframeSrc: "/image/?tool=batch&embed=1",
    widgetTitle: "Convert many images at once in your browser",
    title: "Batch Convert Images Online Free — Multiple Files to PNG, JPEG or WebP",
    description: "Convert several images at once to PNG, JPEG or WebP online for free. Batch conversion runs locally in your browser and downloads a ZIP.",
    h1: "Convert multiple images at once",
    lead: "Turn a folder of images into one format in a single pass. Files are processed locally and come back as a ZIP — nothing is uploaded.",
    note: "100% local processing: batch conversion runs in your browser and the ZIP is built on your device.",
    howtoHeading: "How to batch convert images",
    steps: [
      { title: "Choose the images", text: "Pick several files or drop a folder; each is read locally." },
      { title: "Pick the output", text: "Choose PNG, JPEG or WebP and, for lossy formats, the quality and an optional size cap." },
      { title: "Download the ZIP", text: "Press the button and a ZIP with the converted files is saved by your browser." },
    ],
    faqs: [
      { q: "How many images can I convert?", a: "As many as your browser can hold at once — the work happens locally, so there is no server limit." },
      { q: "Are my images uploaded?", a: "No. Every file is converted in your browser and the ZIP is assembled on your device." },
      { q: "What about metadata?", a: "Re-encoding drops EXIF and GPS data, matching the Strip Metadata behaviour of the other tools." },
    ],
    featureList: ["Multiple files in one pass", "PNG, JPEG and WebP output in a ZIP", "Processed locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "Convert image", href: "/image/convert-image/" },
      { label: "Compress image", href: "/image/compress/" },
      { label: "All image tools", href: "/image/" },
    ],
  },
  {
    slug: "qrcode",
    parentPath: "/image/",
    parentLabel: "Image tools",
    crumb: "QR code",
    iframeSrc: "/image/?tool=qrcode&embed=1",
    widgetTitle: "Generate a QR code for a URL, Wi-Fi, vCard, e-mail, SMS or phone number",
    title: "QR Code Generator Online Free — URL, Wi-Fi, vCard, No Upload",
    description: "Generate QR codes for URLs, text, Wi-Fi networks, vCards, e-mail, SMS and phone numbers — for free, in your browser, with no uploads.",
    h1: "Generate QR codes for free",
    lead: "Turn a URL, Wi-Fi login, contact card, e-mail, SMS or phone number into a QR code you can download as a PNG. The code is drawn on your device.",
    note: "100% local generation: nothing you type is sent anywhere — the QR code is drawn in your browser.",
    howtoHeading: "How to generate a QR code",
    steps: [
      { title: "Pick the content type", text: "Choose URL, text, Wi-Fi, vCard, e-mail, SMS or phone." },
      { title: "Fill in the details", text: "Enter the link or data; the code updates live as you type." },
      { title: "Download the PNG", text: "Pick a size and download the code — it is drawn locally in your browser." },
    ],
    faqs: [
      { q: "Is my data sent to a server?", a: "No. The QR code is rendered locally in your browser; nothing you type is transmitted." },
      { q: "Can I make a QR code for a Wi-Fi network?", a: "Yes — choose Wi-Fi and enter the network name, password and security type; phones recognize the standard WIFI: format." },
      { q: "What format do I get?", a: "A PNG at the size you choose (160–640 px) that you can print or embed anywhere." },
    ],
    featureList: ["URL, text, Wi-Fi, vCard, e-mail, SMS and phone", "Live preview at any size", "Drawn locally, never uploaded", "Free, no sign-up"],
    related: [
      { label: "All image tools", href: "/image/" },
      { label: "Convert image", href: "/image/convert-image/" },
      { label: "Secret Sender", href: "/secret/" },
    ],
  },
];

/** Schema.org graph (WebApplication + FAQPage + BreadcrumbList) for a landing page. */
export function toolLandingJsonLd(entry: ToolLandingEntry): Record<string, unknown> {
  const url = `${SITE}/${entry.parentPath.replace(/^\//, "")}${entry.slug}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: entry.title,
        description: entry.description,
        url,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "All",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: entry.featureList,
      },
      {
        "@type": "FAQPage",
        mainEntity: entry.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: entry.parentLabel, item: SITE + entry.parentPath },
          { "@type": "ListItem", position: 3, name: entry.crumb, item: url },
        ],
      },
    ],
  };
}
