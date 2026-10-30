// Public videos from the official Azentio YouTube channel (youtube.com/@azentiosoftware).
// Embedded via youtube-nocookie; the publisher can unpublish any of them from /publisher.
export const AZENTIO_VIDEOS = [
  { id: "QW3TEZJYb0c", category: "Thought leadership", title: "The future of lending in the GCC: AI, open data, and Shariah-ready decisioning" },
  { id: "j7M-k4HnOJc", category: "Product walkthrough", title: "Azentio Loan Origination Product Walkthrough" },
  { id: "kn5CMp76wDw", category: "Customer story", title: "sahb Finance: Transforming digital lending with Azentio" },
  { id: "gag1aR5T13M", category: "Customer story", title: "Emirates Insurance: Digital transformation with Azentio" },
  { id: "YjE_gbVT3Xg", category: "Customer story", title: "Bank of Abyssinia: Transforming Islamic Banking with Azentio iMAL" },
  { id: "0GmZp-NHQ5E", category: "Customer story", title: "Gulf African Bank: Modernizing Islamic Finance with Azentio iMAL" },
  { id: "XDFmQDtIfmE", category: "Customer story", title: "Streamlining Manufacturing with Cloud ERP: Path to a Digital Transformation" },
] as const;

export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`;
export const videoIdFromUrl = (url: string | null) => url?.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
export const videoCategory = (id: string | null) => AZENTIO_VIDEOS.find((v) => v.id === id)?.category ?? "Video";
