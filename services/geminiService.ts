
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ExtractionResponse } from "../types";

export const extractNumbersFromImage = async (base64Image: string): Promise<ExtractionResponse> => {
  const apiKey = process.env.API_KEY;
  
  // Explicitly check for empty or missing key
  if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
    throw new Error("SETUP_REQUIRED: API Key is missing. Please create a key in AI Studio 'API keys' tab.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || 'image/png';
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Extract all phone numbers from the image and identify their country. Output JSON: { \"numbers\": [ { \"number\": \"string\", \"country\": \"string\" } ] }",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            numbers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.STRING },
                  country: { type: Type.STRING }
                },
                required: ['number', 'country']
              }
            }
          },
          required: ['numbers']
        }
      }
    });

    const textOutput = response.text || '{"numbers":[]}';
    return JSON.parse(textOutput.trim()) as ExtractionResponse;
    
  } catch (error: any) {
    console.error("Gemini Error:", error);
    const msg = error.message || "";
    
    if (msg.includes("401") || msg.includes("API_KEY_INVALID")) {
      throw new Error("INVALID_KEY: Your API key is invalid. Please generate a new one.");
    }
    if (msg.includes("429")) {
      throw new Error("RATE_LIMIT: Too many requests. Wait a moment.");
    }
    if (msg.includes("model not found") || msg.includes("404")) {
      // Fallback or specific model error
      throw new Error("MODEL_ERROR: The AI model is currently unavailable in your region.");
    }
    
    throw new Error("Analysis failed. Make sure the image is clear and try again.");
  }
};
