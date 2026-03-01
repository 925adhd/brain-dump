import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slideTitle, visualDescription, theme, genericTheme, genericVisualDescription } = req.body;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const attemptGeneration = async (promptText: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: { parts: [{ text: promptText }] },
        config: { responseModalities: ['IMAGE', 'TEXT'], imageConfig: { aspectRatio: "16:9" } } as any
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) return `data:image/png;base64,${(part as any).inlineData.data}`;
      }
      return "";
    } catch {
      return "";
    }
  };

  try {
    let result = await attemptGeneration(`Style: ${theme}. Scene: ${visualDescription}. Requirements: Perfect match to style. NO TEXT. Cinematic.`);
    if (result) return res.status(200).json({ imageUrl: result });

    result = await attemptGeneration(`Style: ${genericTheme}. Scene: ${genericVisualDescription}. Requirements: Professional, clean, NO TEXT.`);
    if (result) return res.status(200).json({ imageUrl: result });

    try {
      const reworkResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Rewrite this image prompt to be completely IP-neutral. Remove all show/character names. Use only generic artistic descriptions. Keep the core action: "${visualDescription}". Style vibe: "${genericTheme}". Output ONLY the new description.`,
      });
      const aggressiveDescription = reworkResponse.text || genericVisualDescription;
      result = await attemptGeneration(`Style and Scene: ${aggressiveDescription}. Requirements: High-quality, NO TEXT.`);
      if (result) return res.status(200).json({ imageUrl: result });
    } catch {}

    result = await attemptGeneration(`A professional, cinematic conceptual illustration of "${slideTitle}". Style: ${genericTheme}. NO TEXT, NO LABELS.`);
    return res.status(200).json({ imageUrl: result });
  } catch (error: any) {
    return res.status(500).json({ imageUrl: "", error: error.message });
  }
}
