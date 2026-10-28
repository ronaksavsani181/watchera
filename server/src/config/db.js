import mongoose from "mongoose";

const connectDB = async () => {
  // Support both MONGO_URI and DATABASE_URL / MONGODB_URI
  const rawUri =
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGODB_URI;

  if (!rawUri) {
    console.error("❌ CRITICAL: Database connection string is missing!");
    console.error("👉 Please set MONGO_URI or DATABASE_URL in your .env file or Render environment variables.");
    process.exit(1);
  }

  // Strip accidental wrapping quotes or extra whitespace
  const mongoUri = rawUri.trim().replace(/^["']|["']$/g, "").trim();

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
