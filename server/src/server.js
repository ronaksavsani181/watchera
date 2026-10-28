import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

// Import the database connection
import connectDB from "./config/db.js"; 

// Route Imports
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// Load environment variables (supports current directory, server directory, and repo root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();

/* ==============================
   CORS CONFIGURATION
============================== */
const rawOrigins =
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  "https://watchera-store.vercel.app,http://localhost:4200";

const allowedOrigins = rawOrigins
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, postman, server-to-server, Render health checks)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes("*");
    const isVercel = /^https:\/\/.*\.vercel\.app$/.test(origin);
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (isExplicitlyAllowed || isVercel || isLocalhost) {
      return callback(null, true);
    }

    console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ==============================
   BODY PARSING & LOGGING
============================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

/* ==============================
   HEALTH CHECK ROUTE (Render & Monitoring)
============================== */
const healthHandler = (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    message: "Watchera API Running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
};

app.get("/", healthHandler);
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

/* ==============================
   ROUTES
============================== */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin", adminRoutes);

/* ==============================
   404 & ERROR HANDLING MIDDLEWARE
============================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

/* ==============================
   SERVER SETUP
============================== */
const PORT = Number(process.env.PORT || 5000);
const HOST = "0.0.0.0";
const MAX_PORT_ATTEMPTS = 10;

const listenWithFallback = (startPort, maxAttempts = MAX_PORT_ATTEMPTS) =>
  new Promise((resolve, reject) => {
    let attempts = 0;

    const tryListen = (port) => {
      const server = app.listen(port, HOST, () => resolve({ server, port }));

      server.once("error", (error) => {
        attempts += 1;

        // Only fallback port in development mode so Render doesn't fail port checks
        if (process.env.NODE_ENV !== "production" && error.code === "EADDRINUSE" && attempts < maxAttempts) {
          console.warn(`Port ${port} is in use. Trying ${port + 1}...`);
          setTimeout(() => tryListen(port + 1), 100);
          return;
        }

        reject(error);
      });
    };

    tryListen(startPort);
  });

const startServer = async () => {
  try {
    // 1. Connect to MongoDB using the config/db.js file
    await connectDB();

    // 2. Start Express Server
    const { server, port } = await listenWithFallback(PORT);
    console.log(`🚀 Watchera Server running on http://${HOST}:${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗 Allowed Client Origins: ${allowedOrigins.join(", ")}`);

    // 3. Check Razorpay configs
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      console.log("💳 Razorpay configured successfully");
    } else {
      console.warn("⚠️ Razorpay keys are missing (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env)");
    }

    // 4. Check JWT Secret
    if (!process.env.JWT_SECRET) {
      if (process.env.NODE_ENV === "production") {
        console.error("❌ CRITICAL: JWT_SECRET is not set in production environment variables!");
      } else {
        console.warn("⚠️ JWT_SECRET is missing. Using development fallback secret.");
      }
    }

    // Graceful Shutdown for Render & Containers
    const shutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log("✅ HTTP server closed.");
        process.exit(0);
      });
      setTimeout(() => {
        console.error("⚠️ Forcefully terminating server after timeout.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("❌ Error starting server:", error.message);
    process.exit(1);
  }
};

startServer();
