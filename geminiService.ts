import { Presentation } from "./types";

export async function processBrainDump(text: string): Promise<Presentation> {
  const response = await fetch('/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Couldn't organize those thoughts into a presentation. Try breaking it into smaller chunks?");
  }

  return response.json();
}

export async function generateSlideImage(
  slideTitle: string,
  visualDescription: string,
  theme: string,
  genericTheme: string,
  genericVisualDescription: string
): Promise<string> {
  const response = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slideTitle, visualDescription, theme, genericTheme, genericVisualDescription }),
  });

  if (!response.ok) return "";
  const data = await response.json();
  return data.imageUrl || "";
}
