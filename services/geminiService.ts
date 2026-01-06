
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { User, Message, AI_AGENT_ID } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models for specific task optimized for speed and capability
const FAST_MODEL = 'gemini-3-flash-preview'; // Used for quickest responses
const CAPABLE_MODEL = 'gemini-3-pro-preview'; // Used for complex tasks/search

// NOTE: triggerRegistration is disabled in stream mode to comply with the googleSearch "only" rule.
// Also updated parameters to ensure Type.OBJECT is not empty as per guidelines.
const triggerRegistrationFunctionDeclaration: FunctionDeclaration = {
  name: 'triggerRegistration',
  parameters: {
    type: Type.OBJECT,
    description: 'Triggers the user registration interface. Call this when a guest user clearly expresses a desire to create an account, sign up, or register.',
    properties: {
      intent: {
        type: Type.STRING,
        description: 'The user intent (e.g., signup, register).'
      }
    },
    required: ['intent']
  },
};

const decryptMessage = (content: string) => {
    try {
        const decoded = atob(content);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    } catch (e) { return content; }
};

export const getAiAgentResponseStream = async (
  history: Message[], 
  currentUser: User,
  onChunk: (text: string) => void
): Promise<{ fullText: string, functionCalls?: any[], groundingChunks?: any[] }> => {
  try {
    const formattedHistory = history.map(m => ({
      role: m.senderId === currentUser.id ? 'user' : 'model',
      parts: [{ text: decryptMessage(m.content) }]
    }));

    const isGuest = currentUser.id === 'guest';
    const userName = isGuest ? "Guest User" : currentUser.name;

    const systemInstruction = `You are the GlassKom Assistant. 
    Capabilities: 
    - Real-time information via Google Search.
    - Image generation (describe what you want to create).
    - Map info via Google Maps.
    
    User Context: Current user is ${userName}.
    Style: Professional, lightning-fast, and helpful. Always provide grounding URLs if search is used.`;

    // FIX: Only googleSearch tool is permitted when using it. Removed functionDeclarations.
    const responseStream = await ai.models.generateContentStream({
      model: CAPABLE_MODEL,
      contents: formattedHistory,
      config: {
        systemInstruction,
        // Set thinking budget to 0 for lightning fast "quickest" response time
        thinkingConfig: { thinkingBudget: 0 }, 
        tools: [{ googleSearch: {} }],
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    let fullText = "";
    let functionCalls: any[] = [];
    let groundingChunks: any[] = [];

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
      
      // Extraction of grounding metadata
      const candidates = (chunk as any).candidates;
      if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
        groundingChunks = [...groundingChunks, ...candidates[0].groundingMetadata.groundingChunks];
      }
    }

    return { fullText, functionCalls, groundingChunks };
  } catch (error) {
    console.error("AI Streaming Error:", error);
    const fallback = "I'm having trouble connecting to my neural core. Please try again.";
    onChunk(fallback);
    return { fullText: fallback };
  }
};

export const getAiAgentResponse = async (history: Message[], currentUser: User): Promise<{ text: string, functionCalls?: any[] }> => {
  const result = await getAiAgentResponseStream(history, currentUser, () => {});
  return { text: result.fullText, functionCalls: result.functionCalls };
};

export const getAiToolAnalysis = async (history: Message[], toolResults: any, currentUser: User): Promise<string> => {
  try {
    const formattedHistory = history.map(m => ({
      role: m.senderId === currentUser.id ? 'user' : 'model',
      parts: [{ text: decryptMessage(m.content) }]
    }));

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: [...formattedHistory, { role: 'user', parts: [{ text: `Explain these results: ${JSON.stringify(toolResults)}` }] }],
      config: {
        systemInstruction: "You are the GlassKom AI. Be professional and clear.",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "Task complete.";
  } catch (error) {
    return "I couldn't process the latest data stream.";
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
          { text: "Transcribe this." }
        ]
      }
    });
    return response.text?.trim() || "";
  } catch (error) { return ""; }
};

export const enhancePostContent = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({ 
      model: FAST_MODEL, 
      contents: `Rewrite this post for maximum engagement: "${text}". Only return rewritten text.` 
    });
    return response.text?.trim() || text;
  } catch (error) { return text; }
};

export const generateImageCaption = async (base64Image: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Short engaging caption." }
        ]
      }
    });
    return response.text?.trim() || "";
  } catch (error) { return ""; }
};
