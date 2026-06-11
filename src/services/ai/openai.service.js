const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { v4: uuidv4 } = require("uuid");

let openaiClient;

const isOpenAIConfigured = () => Boolean(process.env.OPENAI_API_KEY);

const getClient = () => {
  if (!isOpenAIConfigured()) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
};

const createServiceError = (message, error) => {
  const serviceError = new Error(message);
  serviceError.name = "OpenAIError";
  serviceError.service = "openai";
  serviceError.statusCode = error?.status || 502;
  serviceError.details = {
    originalMessage: error?.message,
    code: error?.code,
  };
  return serviceError;
};

const buildPublicAudioUrl = (relativeAudioPath) => {
  const normalizedPath = relativeAudioPath.startsWith("/")
    ? relativeAudioPath
    : `/${relativeAudioPath}`;
  const baseUrl = process.env.SERVER_URL || process.env.PUBLIC_BASE_URL || "";

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl.replace(/\/+$/, "")}${normalizedPath}`;
};

const extractStructuredJson = (response) => {
  if (!response?.output_text) {
    return null;
  }

  return JSON.parse(response.output_text);
};

const createStructuredResponse = async ({
  model = process.env.OPENAI_MODEL || "gpt-4o",
  name,
  schema,
  instructions,
  input,
}) => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: instructions },
        {
          role: "user",
          content: typeof input === "string" ? input : JSON.stringify(input, null, 2),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema,
        },
      },
    });

    return extractStructuredJson(response);
  } catch (error) {
    throw createServiceError("Failed to create OpenAI structured response", error);
  }
};

const createTextResponse = async ({
  model = process.env.OPENAI_MODEL || "gpt-4o",
  instructions,
  input,
}) => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: instructions },
        {
          role: "user",
          content: typeof input === "string" ? input : JSON.stringify(input, null, 2),
        },
      ],
    });

    return response.output_text;
  } catch (error) {
    throw createServiceError("Failed to create OpenAI text response", error);
  }
};

const transcribeAudioFile = async ({
  filePath,
  prompt,
  model = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
}) => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model,
      prompt,
      response_format: "json",
    });

    return {
      transcript: transcription.text || "",
      confidence: 0.92,
      provider: "openai",
    };
  } catch (error) {
    throw createServiceError("Failed to transcribe audio file", error);
  }
};

const generateSpeechFile = async ({
  text,
  voice = process.env.OPENAI_TTS_VOICE || "coral",
  model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  instructions = "Speak clearly and professionally.",
}) => {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const voiceOutputDir = path.join(
      process.cwd(),
      process.env.VOICE_OUTPUT_DIR || "uploads/voice"
    );
    fs.mkdirSync(voiceOutputDir, { recursive: true });

    const response = await client.audio.speech.create({
      model,
      voice,
      input: text,
      instructions,
      response_format: "mp3",
    });

    const fileName = `${uuidv4()}.mp3`;
    const absolutePath = path.join(voiceOutputDir, fileName);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(absolutePath, buffer);
    const relativeAudioUrl = `/uploads/voice/${fileName}`;

    return {
      audioUrl: buildPublicAudioUrl(relativeAudioUrl),
      relativeAudioUrl,
      absolutePath,
      provider: "openai",
    };
  } catch (error) {
    throw createServiceError("Failed to generate speech audio", error);
  }
};

module.exports = {
  isOpenAIConfigured,
  createStructuredResponse,
  createTextResponse,
  transcribeAudioFile,
  generateSpeechFile,
};
