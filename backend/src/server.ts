import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS
app.use(
  cors({
    origin: "*", // For development; configure properly for production
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parser
app.use(express.json());

// Routes
app.use("/auth", authRoutes);

// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Ouroboros Auth Backend running on http://localhost:${PORT}`);
});
