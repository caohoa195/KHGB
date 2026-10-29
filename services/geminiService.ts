import { LessonMetadata, GeneratedContent, CustomGeneratedPlan, CustomTemplateConfig, AiConfig } from "../types";
import { generateLessonPlanDirectOllama, generatePlanFromCustomTemplateDirectOllama } from "./ollamaService";

export const generateLessonPlan = async (
  metadata: LessonMetadata,
  sourceMaterial: string,
  aiConfig?: AiConfig
): Promise<GeneratedContent> => {
  // Direct client-side Ollama mode
  if (aiConfig?.provider === 'ollama' && aiConfig.ollama.connectionMode === 'direct') {
    return await generateLessonPlanDirectOllama(metadata, sourceMaterial, aiConfig.ollama);
  }

  // Server proxy mode (or default Gemini)
  const response = await fetch("/api/generate-lesson-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metadata,
      sourceMaterial,
      aiConfig,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || "Có lỗi xảy ra khi tạo bài giảng.");
  }

  return data.data as GeneratedContent;
};

export const generatePlanFromCustomTemplate = async (
  templateText: string,
  sourceMaterial: string,
  metadata?: LessonMetadata,
  customConfig?: Partial<CustomTemplateConfig>,
  aiConfig?: AiConfig
): Promise<CustomGeneratedPlan> => {
  // Direct client-side Ollama mode
  if (aiConfig?.provider === 'ollama' && aiConfig.ollama.connectionMode === 'direct') {
    return await generatePlanFromCustomTemplateDirectOllama(templateText, sourceMaterial, metadata, aiConfig.ollama);
  }

  // Server proxy mode (or default Gemini)
  const response = await fetch("/api/generate-from-template", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      templateText,
      sourceMaterial,
      metadata,
      customConfig,
      aiConfig,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || "Có lỗi xảy ra khi tạo kế hoạch theo mẫu.");
  }

  return data.data as CustomGeneratedPlan;
};
