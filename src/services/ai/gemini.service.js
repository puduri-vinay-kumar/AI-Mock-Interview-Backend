const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { v4: uuidv4 } = require("uuid");

let geminiClient;

const isGeminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const getClient = () => {
  if (!isGeminiConfigured()) {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return geminiClient;
};

const createServiceError = (message, error) => {
  const serviceError = new Error(message);
  serviceError.name = "GeminiError";
  serviceError.service = "gemini";
  serviceError.statusCode = error?.status || 502;
  serviceError.details = {
    originalMessage: error?.message,
    code: error?.code,
  };
  return serviceError;
};

const createStructuredResponse = async ({
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
  schema,
  instructions,
  input,
}) => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${instructions}\n\nInput:\n${
                typeof input === "string" ? input : JSON.stringify(input, null, 2)
              }`,
            },
          ],
        },
      ],
      config: {
        responseFormat: {
          text: {
            mimeType: "application/json",
          },
        },
        responseSchema: schema,
      },
    });

    return response?.text ? JSON.parse(response.text) : null;
  } catch (error) {
    throw createServiceError("Failed to create Gemini structured response", error);
  }
};

const createTextResponse = async ({
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
  instructions,
  input,
}) => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${instructions}\n\nInput:\n${
                typeof input === "string" ? input : JSON.stringify(input, null, 2)
              }`,
            },
          ],
        },
      ],
    });

    return response?.text || null;
  } catch (error) {
    throw createServiceError("Failed to create Gemini text response", error);
  }
};

const audioTranscriptionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    segments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          timestamp: { type: "string" },
          content: { type: "string" },
          language: { type: "string" },
          language_code: { type: "string" },
          translation: { type: "string" },
          emotion: {
            type: "string",
            enum: ["happy", "sad", "angry", "neutral"],
          },
        },
        required: ["timestamp", "content", "language", "language_code", "emotion"],
      },
    },
  },
  required: ["summary", "segments"],
};

const transcribeAudioFile = async ({
  filePath,
  prompt,
  mimeType = "audio/mpeg",
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
}) => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const uploadedFile = await client.files.upload({
      file: filePath,
      config: { mimeType },
    });

    const response = await client.models.generateContent({
      model,
      contents: {
        parts: [
          {
            fileData: {
              fileUri: uploadedFile.uri,
              mimeType: uploadedFile.mimeType || mimeType,
            },
          },
          {
            text:
              prompt ||
              "Generate a clear transcript of the speech with timestamps and concise summary.",
          },
        ],
      },
      config: {
        responseFormat: {
          text: {
            mimeType: "application/json",
          },
        },
        responseSchema: audioTranscriptionSchema,
      },
    });

    const parsed = response?.text ? JSON.parse(response.text) : null;
    const transcript = parsed?.segments?.map((segment) => segment.content).join(" ") || "";

    return {
      transcript,
      confidence: 0.89,
      provider: "gemini",
      summary: parsed?.summary || "",
      segments: parsed?.segments || [],
    };
  } catch (error) {
    throw createServiceError("Failed to transcribe audio file with Gemini", error);
  }
};

const pcmToWavBuffer = (pcmBuffer, sampleRate = 24000, channels = 1, bitDepth = 16) => {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
};

const generateSpeechFile = async ({
  text,
  voice = process.env.GEMINI_TTS_VOICE || "Kore",
  model = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview",
}) => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const response = await client.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
    });

    const base64Data =
      response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    if (!base64Data) {
      return null;
    }

    const voiceOutputDir = path.join(
      process.cwd(),
      process.env.VOICE_OUTPUT_DIR || "uploads/voice"
    );
    fs.mkdirSync(voiceOutputDir, { recursive: true });

    const pcmBuffer = Buffer.from(base64Data, "base64");
    const wavBuffer = pcmToWavBuffer(pcmBuffer);
    const fileName = `${uuidv4()}.wav`;
    const absolutePath = path.join(voiceOutputDir, fileName);
    await fs.promises.writeFile(absolutePath, wavBuffer);

    return {
      audioUrl: `/uploads/voice/${fileName}`,
      absolutePath,
      provider: "gemini",
    };
  } catch (error) {
    throw createServiceError("Failed to generate Gemini speech audio", error);
  }
};

module.exports = {
  isGeminiConfigured,
  createStructuredResponse,
  createTextResponse,
  transcribeAudioFile,
  generateSpeechFile,
};
