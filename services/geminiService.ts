
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ExtractionResponse } from "../types";

export const extractNumbersFromImage = async (base64Image: string): Promise<ExtractionResponse> => {
  // Check if API key exists in environment
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
    throw new Error("API Key missing! Please go to AI Studio 'API keys' tab and create a key first.");
  }

  // Initialize with the provided key
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
            text: "Identify and extract all phone numbers from the provided image. For each number, determine the country based on its formatting and international calling code. Output the results strictly in JSON format as follows: { \"numbers\": [ { \"number\": \"string\", \"country\": \"string\" } ] }",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
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
    const parsed = JSON.parse(textOutput.trim());
    
    if (!parsed.numbers) return { numbers: [], summary: "" };
    return parsed as ExtractionResponse;
    
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    
    const message = error.message || "";
    
    if (message.includes("401") || message.includes("API_KEY_INVALID") || message.includes("not found")) {
      throw new Error("Invalid API Key. Please generate a new key in AI Studio 'API keys' tab.");
    }
    if (message.includes("403")) {
      throw new Error("Permission denied. Check if your API key has access to Gemini Flash.");
    }
    if (message.includes("429")) {
      throw new Error("Rate limit reached. Please wait a few seconds.");
    }
    
    throw new Error("Could not process image. Ensure it's clear and contains numbers.");
  }
};
