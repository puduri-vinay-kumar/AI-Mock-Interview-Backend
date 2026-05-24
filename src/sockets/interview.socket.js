const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Interview = require("../models/Interview");
const Report = require("../models/Report");
const {
  processRealtimeAnswer,
  finalizeInterviewSession,
} = require("../services/interview/interviewSessionManager");

let ioInstance;

const verifySocketToken = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      const error = new Error("Authentication token is required for socket connection");
      error.data = { code: "SOCKET_UNAUTHORIZED" };
      return next(error);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id };
    return next();
  } catch (error) {
    const authError = new Error("Invalid socket token");
    authError.data = { code: "SOCKET_UNAUTHORIZED" };
    return next(authError);
  }
};

const initializeInterviewSocket = (server) => {
  if (ioInstance) {
    return ioInstance;
  }

  const io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.use(verifySocketToken);

  io.on("connection", (socket) => {
    socket.on("join-interview", async ({ interviewId }) => {
      try {
        const interview = await Interview.findOne({
          _id: interviewId,
          userId: socket.user.id,
        });

        if (!interview) {
          return socket.emit("session-error", {
            message: "Interview session not found",
          });
        }

        socket.join(interview.sessionId);
        socket.emit("ai-question", {
          interviewId,
          question:
            interview.questions[interview.sessionState?.currentQuestionIndex || 0] ||
            interview.questions[0] ||
            null,
          sessionState: interview.sessionState,
        });
      } catch (error) {
        socket.emit("session-error", {
          message: "Failed to join interview session",
        });
      }
    });

    socket.on("user-answer", async ({ interviewId, answer, transcript }) => {
      try {
        const interview = await Interview.findOne({
          _id: interviewId,
          userId: socket.user.id,
        });

        if (!interview) {
          return socket.emit("session-error", {
            message: "Interview not found",
          });
        }

        const currentQuestion =
          interview.questions[interview.sessionState?.currentQuestionIndex || 0];

        const update = await processRealtimeAnswer({
          interview,
          answerPayload: {
            questionId: currentQuestion?.questionId,
            question: currentQuestion?.question,
            answer,
            transcript: transcript || answer,
          },
          transcriptEntry: transcript
            ? {
                speaker: "user",
                text: transcript,
                confidence: 0.85,
                timestamp: new Date(),
              }
            : null,
        });

        interview.status = update.status;
        interview.answers = update.answers;
        interview.scores = update.scores;
        interview.feedback = update.feedback;
        interview.questions = update.questions;
        interview.currentDifficulty = update.currentDifficulty;
        interview.sessionState = {
          ...update.sessionState,
          mode: "socket",
        };
        interview.liveTranscript = update.liveTranscript;
        interview.adaptiveHistory = update.adaptiveHistory;
        await interview.save();

        socket.emit("live-feedback", {
          latestEvaluation: update.answers[update.answers.length - 1]?.evaluation || null,
          scores: update.scores,
          feedback: update.feedback,
        });

        if (update.status === "completed") {
          const reportPayload = await finalizeInterviewSession(interview);
          const report = await Report.findOneAndUpdate(
            { interviewId: interview._id },
            reportPayload,
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );

          socket.emit("session-ended", {
            interviewId,
            report,
          });
        } else {
          socket.emit("ai-question", {
            interviewId,
            question: update.nextQuestion,
            sessionState: update.sessionState,
          });
        }
      } catch (error) {
        socket.emit("session-error", {
          message: error.message || "Unable to process answer",
        });
      }
    });

    socket.on("disconnect", () => {
      socket.emit?.("session-ended", {
        disconnected: true,
      });
    });
  });

  ioInstance = io;
  return ioInstance;
};

module.exports = {
  initializeInterviewSocket,
};
