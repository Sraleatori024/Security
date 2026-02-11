
import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, AppState } from "../types";

export const getGeminiInsights = async (state: AppState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analise os seguintes registros de presença e rondas de segurança:
    Postos: ${JSON.stringify(state.posts.map(p => p.name))}
    Funcionários: ${JSON.stringify(state.employees.map(e => e.name))}
    Registros Recentes: ${JSON.stringify(state.attendanceRecords.slice(-10))}
    
    Por favor, forneça um breve resumo (em português) sobre:
    1. Taxa de ocupação dos postos.
    2. Eventuais substituições detectadas.
    3. Frequência das rondas.
    
    Formate como um resumo executivo para o administrador.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Não foi possível gerar insights no momento.";
  }
};
