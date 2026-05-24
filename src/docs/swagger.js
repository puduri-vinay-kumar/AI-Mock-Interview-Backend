const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "AI Powered Mock Interview Platform API",
      version: "1.0.0",
      description:
        "Backend API documentation for the AI Powered Mock Interview Platform, including authentication, interview orchestration, resume analysis, voice endpoints, coding evaluation, and reports.",
    },
    servers: [
      {
        url: serverUrl,
        description: "Current backend server",
      },
    ],
    tags: [
      { name: "Health", description: "Service health and readiness endpoints" },
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Users", description: "User profile and history endpoints" },
      { name: "Interviews", description: "Interview lifecycle and adaptive session endpoints" },
      { name: "Reports", description: "Interview reporting endpoints" },
      { name: "Uploads", description: "Resume upload and parsing endpoints" },
      { name: "Voice", description: "Speech generation and transcription endpoints" },
      { name: "Coding", description: "Coding and Verilog evaluation endpoints" },
      { name: "System", description: "Operational readiness endpoints" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation completed successfully" },
            data: { type: "object", additionalProperties: true },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation failed" },
            error: {
              oneOf: [{ type: "object", additionalProperties: true }, { type: "array", items: { type: "object" } }],
            },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "John Doe" },
            email: { type: "string", format: "email", example: "john@example.com" },
            password: { type: "string", format: "password", example: "Password123" },
            role: { type: "string", enum: ["candidate", "admin"], example: "candidate" },
            avatar: { type: "string", example: "" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "john@example.com" },
            password: { type: "string", format: "password", example: "Password123" },
          },
        },
        UpdateProfileRequest: {
          type: "object",
          properties: {
            name: { type: "string", example: "Updated User" },
            avatar: { type: "string", example: "https://example.com/avatar.png" },
            password: { type: "string", format: "password", example: "NewPassword123" },
          },
        },
        InterviewCreateRequest: {
          type: "object",
          required: ["role", "experienceLevel", "interviewType", "duration"],
          properties: {
            role: { type: "string", example: "Backend Developer" },
            experienceLevel: { type: "string", enum: ["fresher", "junior", "mid", "senior"] },
            interviewType: { type: "string", enum: ["technical", "hr", "behavioral", "coding", "mixed"] },
            duration: { type: "integer", example: 30 },
            resumeId: { type: "string", example: "6650f0fd0f5f55b6f20b3a11" },
            previousScore: { type: "number", example: 62 },
          },
        },
        InterviewAnswerRequest: {
          type: "object",
          required: ["answer"],
          properties: {
            answer: { type: "string", example: "GET retrieves data while POST sends data to create resources." },
            transcript: { type: "string", example: "GET retrieves data while POST sends data." },
            durationSeconds: { type: "number", example: 45 },
          },
        },
        InterviewStatusUpdateRequest: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["scheduled", "in-progress", "completed", "cancelled"] },
            answers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  questionId: { type: "string" },
                  question: { type: "string" },
                  answer: { type: "string" },
                },
              },
            },
            liveTranscript: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  speaker: { type: "string", enum: ["ai", "user", "system"] },
                  text: { type: "string" },
                },
              },
            },
          },
        },
        TranscriptAppendRequest: {
          type: "object",
          required: ["entries"],
          properties: {
            entries: {
              type: "array",
              items: {
                type: "object",
                required: ["speaker", "text"],
                properties: {
                  speaker: { type: "string", enum: ["ai", "user", "system"] },
                  text: { type: "string", example: "Candidate explains their answer." },
                },
              },
            },
          },
        },
        CodingEvaluateRequest: {
          type: "object",
          required: ["language", "code"],
          properties: {
            language: { type: "string", enum: ["javascript", "python", "cpp", "java"] },
            code: { type: "string", example: "function solve(a, b) { return a + b; }" },
            testCases: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  input: { type: "string", example: "1 2" },
                  expected: { type: "string", example: "3" },
                },
              },
            },
          },
        },
        VerilogEvaluateRequest: {
          type: "object",
          required: ["code"],
          properties: {
            code: { type: "string", example: "module top_module(input a, output b); assign b = a; endmodule" },
            moduleName: { type: "string", example: "top_module" },
          },
        },
        VoiceSpeakRequest: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string", example: "Welcome to your mock interview session." },
            voice: { type: "string", example: "Kore" },
            instructions: { type: "string", example: "Speak clearly and professionally." },
          },
        },
        VoiceSessionRequest: {
          type: "object",
          properties: {
            transcriptChunk: { type: "string", example: "I have completed my answer." },
            aiSpeaking: { type: "boolean", example: false },
            userSpeaking: { type: "boolean", example: true },
          },
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: "Basic service health check",
          responses: {
            200: {
              description: "Service is running",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessResponse" },
                },
              },
            },
          },
        },
      },
      "/api/system/readiness": {
        get: {
          tags: ["System"],
          summary: "Get backend readiness information",
          responses: {
            200: {
              description: "Readiness information returned",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessResponse" },
                },
              },
            },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "User registered successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessResponse" },
                },
              },
            },
            400: { description: "Validation error" },
            409: { description: "User already exists" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login an existing user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessResponse" },
                },
              },
            },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get authenticated user",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Current user returned" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/users/profile": {
        get: {
          tags: ["Users"],
          summary: "Get current user profile",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Profile returned" },
          },
        },
        put: {
          tags: ["Users"],
          summary: "Update current user profile",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
              },
            },
          },
          responses: {
            200: { description: "Profile updated" },
          },
        },
      },
      "/api/users/history": {
        get: {
          tags: ["Users"],
          summary: "Get user interview history with reports",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "History returned" },
          },
        },
      },
      "/api/interviews/create": {
        post: {
          tags: ["Interviews"],
          summary: "Create a new interview session",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InterviewCreateRequest" },
              },
            },
          },
          responses: {
            201: { description: "Interview created" },
          },
        },
      },
      "/api/interviews/history": {
        get: {
          tags: ["Interviews"],
          summary: "Get interview history for the current user",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Interview history returned" },
          },
        },
      },
      "/api/interviews/{id}": {
        get: {
          tags: ["Interviews"],
          summary: "Get a single interview by id",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Interview returned" },
            404: { description: "Interview not found" },
          },
        },
      },
      "/api/interviews/{id}/status": {
        put: {
          tags: ["Interviews"],
          summary: "Update interview status and progress",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InterviewStatusUpdateRequest" },
              },
            },
          },
          responses: {
            200: { description: "Interview status updated" },
          },
        },
      },
      "/api/interviews/{id}/answer": {
        post: {
          tags: ["Interviews"],
          summary: "Submit an interview answer",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InterviewAnswerRequest" },
              },
            },
          },
          responses: {
            200: { description: "Answer accepted and evaluated" },
          },
        },
      },
      "/api/interviews/{id}/transcript": {
        post: {
          tags: ["Interviews"],
          summary: "Append live transcript entries to an interview",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TranscriptAppendRequest" },
              },
            },
          },
          responses: {
            200: { description: "Transcript updated" },
          },
        },
      },
      "/api/interviews/{id}/complete": {
        post: {
          tags: ["Interviews"],
          summary: "Complete an interview and generate its report",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Interview completed and report generated" },
          },
        },
      },
      "/api/reports/{id}": {
        get: {
          tags: ["Reports"],
          summary: "Get a report by report id or interview id",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Report returned" },
          },
        },
      },
      "/api/reports/user/{userId}": {
        get: {
          tags: ["Reports"],
          summary: "Get all reports for a user",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "User reports returned" },
          },
        },
      },
      "/api/upload/resume": {
        post: {
          tags: ["Uploads"],
          summary: "Upload and analyze a resume",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["resume"],
                  properties: {
                    resume: {
                      type: "string",
                      format: "binary",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Resume uploaded and analyzed" },
          },
        },
      },
      "/api/voice/transcribe": {
        post: {
          tags: ["Voice"],
          summary: "Upload audio and transcribe it",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["audio"],
                  properties: {
                    audio: { type: "string", format: "binary" },
                    prompt: { type: "string", example: "Generate a transcript of the speech." },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Audio transcribed successfully" },
          },
        },
      },
      "/api/voice/speak": {
        post: {
          tags: ["Voice"],
          summary: "Generate speech audio from text",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VoiceSpeakRequest" },
              },
            },
          },
          responses: {
            200: { description: "Speech generated successfully" },
          },
        },
      },
      "/api/voice/session": {
        post: {
          tags: ["Voice"],
          summary: "Simulate or inspect voice session state",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VoiceSessionRequest" },
              },
            },
          },
          responses: {
            200: { description: "Voice session state returned" },
          },
        },
      },
      "/api/coding/evaluate": {
        post: {
          tags: ["Coding"],
          summary: "Evaluate general-purpose code",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CodingEvaluateRequest" },
              },
            },
          },
          responses: {
            200: { description: "Code evaluated successfully" },
          },
        },
      },
      "/api/coding/verilog/evaluate": {
        post: {
          tags: ["Coding"],
          summary: "Evaluate Verilog code",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerilogEvaluateRequest" },
              },
            },
          },
          responses: {
            200: { description: "Verilog evaluated successfully" },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
