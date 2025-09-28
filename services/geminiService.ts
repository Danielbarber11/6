
import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  getChatStream: (history: { role: "user" | "model"; parts: { text: string }[] }[]) => {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history,
    });
    return chat;
  },

  generateImage: async (prompt: string) => {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });
    return response.generatedImages[0].image.imageBytes;
  },
  
  editImage: async (prompt: string, imageBase64: string, mimeType: string) => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
            // FIX: Use Modality enum instead of string literals.
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
              return part.inlineData.data;
          }
      }
      throw new Error('No image was generated in the response.');
  },

  generateVideo: async (prompt: string, image?: { imageBytes: string; mimeType: string }) => {
    return ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        image: image,
        config: {
            numberOfVideos: 1,
        }
    });
  },

  getVideoOperationStatus: async (operation: any) => {
    return ai.operations.getVideosOperation({ operation: operation });
  },
  
  connectLive: (callbacks: any) => {
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config: {
        // FIX: Use Modality enum instead of string literal.
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'You are Aiven, a friendly and helpful AI assistant speaking Hebrew.',
      },
    });
  }
};