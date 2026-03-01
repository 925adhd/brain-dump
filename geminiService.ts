
import { GoogleGenAI, Type } from "@google/genai";
import { Presentation } from "./types";

const presentationSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A punchy title for the presentation."
    },
    summary: {
      type: Type.STRING,
      description: "A professional subtitle or content-focused summary of the presentation. Avoid meta-commentary like 'I have organized your thoughts'."
    },
    visualTheme: {
      type: Type.STRING,
      description: "Identify the EXACT artistic medium and style for the WHOLE deck based on input (e.g., '2D animation in the style of Bob's Burgers', 'Disney Pixar 3D animation')."
    },
    genericStyleDescription: {
      type: Type.STRING,
      description: "A generic, IP-neutral description of the visual style (e.g., 'flat 2D animation with thick black outlines and muted colors', 'high-fidelity 3D character animation with soft lighting')."
    },
    originalThoughtCount: {
      type: Type.INTEGER,
    },
    slideCount: {
      type: Type.INTEGER,
    },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          visualContent: {
            type: Type.STRING,
            description: "Visual description for THIS slide. Be descriptive about characters, setting, and composition."
          },
          genericVisualContent: {
            type: Type.STRING,
            description: "An IP-neutral version of the visual description (e.g., 'A middle-aged man with a mustache' instead of 'Bob Belcher')."
          },
          spokenContent: {
            type: Type.STRING,
          },
          speakerNotes: {
            type: Type.STRING,
            description: "Verbatim word-for-word script."
          },
          recommendedAsVisualOnly: {
            type: Type.BOOLEAN,
          }
        },
        required: ["title", "bullets", "visualContent", "genericVisualContent", "spokenContent", "speakerNotes", "recommendedAsVisualOnly"]
      }
    }
  },
  required: ["title", "summary", "visualTheme", "genericStyleDescription", "originalThoughtCount", "slideCount", "slides"]
};

/**
 * Robustly extracts and cleans JSON from a string, handling markdown wrappers or conversational filler.
 */
function cleanJsonString(str: string): string {
  // Find the first '{' and the last '}' to isolate the JSON object
  const firstIndex = str.indexOf('{');
  const lastIndex = str.lastIndexOf('}');
  
  if (firstIndex !== -1 && lastIndex !== -1 && lastIndex > firstIndex) {
    return str.substring(firstIndex, lastIndex + 1);
  }
  
  return str.trim();
}

export async function processBrainDump(text: string): Promise<Presentation> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const systemInstruction = `
    You are an ADHD-friendly presentation coach. Turn the user's brain dump into a clean, logical 6-10 slide presentation.
    
    CREATIVE STYLE LOCKING:
    Based on the user's input, detect the intended creative medium. 
    If they mention a specific show (e.g. Bob's Burgers), an art style (e.g. Impressionist), or a mood (e.g. Cyberpunk), 
    explicitly set that as the 'visualTheme'. This theme is the MASTER STYLE for the entire presentation.
    
    Output strictly valid JSON. Do not include any text outside the JSON block.
  `;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: `Brain dump text follows: \n\n ${text}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: presentationSchema,
        temperature: 0.7,
      },
    });

    const cleanedText = cleanJsonString(result.text);
    const data = JSON.parse(cleanedText);
    return { ...data, id: crypto.randomUUID(), timestamp: Date.now() } as Presentation;
  } catch (error) {
    console.error("Gemini Structuring Failure:", error);
    throw new Error("I couldn't organize those thoughts into a presentation structure. Maybe try breaking it into smaller chunks?");
  }
}

export async function generateSlideImage(
  slideTitle: string, 
  visualDescription: string, 
  theme: string, 
  genericTheme: string,
  genericVisualDescription: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const attemptGeneration = async (promptText: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: promptText }] },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
      return "";
    } catch (error: any) {
      const errorMsg = error?.message || "";
      console.warn("Generation attempt failed:", errorMsg);
      return "";
    }
  };

  // Attempt 1: Original Prompt (The "Dream" version)
  console.log(`Attempt 1 (Original) for "${slideTitle}"...`);
  const prompt1 = `Style: ${theme}. Scene: ${visualDescription}. Requirements: Perfect match to style. NO TEXT. Cinematic.`;
  let result = await attemptGeneration(prompt1);
  if (result) return result;

  // Attempt 2: Generic Rework (Using the pre-generated generic descriptions)
  console.log(`Attempt 1 failed for "${slideTitle}". Trying Attempt 2 (Generic Fallback)...`);
  const prompt2 = `Style: ${genericTheme}. Scene: ${genericVisualDescription}. Requirements: Professional, clean, NO TEXT.`;
  result = await attemptGeneration(prompt2);
  if (result) return result;

  // Attempt 3: Aggressive De-branded Rework (Using Gemini to strip any remaining IP)
  console.log(`Attempt 2 failed for "${slideTitle}". Trying Attempt 3 (Aggressive De-brand)...`);
  try {
    const reworkResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The following image prompt failed due to safety/IP filters. 
      Please rewrite it to be COMPLETELY IP-Neutral. 
      - REMOVE ALL names of shows, characters, companies, or franchises.
      - Use ONLY generic artistic descriptions (e.g., 'cartoon man with mustache', 'fantasy wizard', 'sci-fi city').
      - Describe the style using purely technical terms (e.g., 'flat vector art', 'oil painting', '3D render').
      - Keep the core action: "${visualDescription}".
      - Vibe: "${genericTheme}".
      Output ONLY the new description.`,
    });
    
    const aggressiveDescription = reworkResponse.text || genericVisualDescription;
    const prompt3 = `Style and Scene: ${aggressiveDescription}. Requirements: High-quality, NO TEXT.`;
    result = await attemptGeneration(prompt3);
    if (result) return result;
  } catch (e) {
    console.error("Failed to aggressively de-brand prompt:", e);
  }

  // Attempt 4: Absolute Minimalist Fallback (Conceptual & Safe)
  console.log(`Attempt 3 failed. Using absolute fallback for "${slideTitle}"...`);
  const prompt4 = `A professional, high-quality, cinematic conceptual illustration of "${slideTitle}". Style: ${genericTheme}. NO TEXT, NO LABELS.`;
  return await attemptGeneration(prompt4);
}
