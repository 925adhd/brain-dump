import { GoogleGenAI, Type } from "@google/genai";

const presentationSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A punchy title for the presentation." },
    summary: { type: Type.STRING, description: "A professional subtitle or content-focused summary. Avoid meta-commentary like 'I have organized your thoughts'." },
    visualTheme: { type: Type.STRING, description: "Identify the EXACT artistic medium and style for the WHOLE deck based on input." },
    genericStyleDescription: { type: Type.STRING, description: "A generic, IP-neutral description of the visual style." },
    originalThoughtCount: { type: Type.INTEGER },
    slideCount: { type: Type.INTEGER },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
          visualContent: { type: Type.STRING, description: "Visual description for THIS slide." },
          genericVisualContent: { type: Type.STRING, description: "An IP-neutral version of the visual description." },
          spokenContent: { type: Type.STRING },
          speakerNotes: { type: Type.STRING, description: "Verbatim word-for-word script." },
          recommendedAsVisualOnly: { type: Type.BOOLEAN }
        },
        required: ["title", "bullets", "visualContent", "genericVisualContent", "spokenContent", "speakerNotes", "recommendedAsVisualOnly"]
      }
    }
  },
  required: ["title", "summary", "visualTheme", "genericStyleDescription", "originalThoughtCount", "slideCount", "slides"]
};

function cleanJsonString(str: string): string {
  const firstIndex = str.indexOf('{');
  const lastIndex = str.lastIndexOf('}');
  if (firstIndex !== -1 && lastIndex !== -1 && lastIndex > firstIndex) {
    return str.substring(firstIndex, lastIndex + 1);
  }
  return str.trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Brain dump text follows: \n\n ${text}`,
      config: {
        systemInstruction: `You are an ADHD-friendly presentation coach. Turn the user's brain dump into a clean, logical 6-10 slide presentation.

CREATIVE STYLE LOCKING:
Based on the user's input, detect the intended creative medium. If they mention a specific show, art style, or mood, explicitly set that as the 'visualTheme'. This theme is the MASTER STYLE for the entire presentation.

Output strictly valid JSON. Do not include any text outside the JSON block.`,
        responseMimeType: "application/json",
        responseSchema: presentationSchema,
        temperature: 0.7,
      },
    });

    const cleanedText = cleanJsonString(result.text);
    const data = JSON.parse(cleanedText);
    return res.status(200).json({ ...data, id: crypto.randomUUID(), timestamp: Date.now() });
  } catch (error: any) {
    console.error("Process error:", error);
    return res.status(500).json({ error: "Couldn't organize those thoughts into a presentation structure. Try breaking it into smaller chunks?" });
  }
}
