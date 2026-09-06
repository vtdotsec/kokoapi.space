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
