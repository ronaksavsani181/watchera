import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const getJwtSecret = () => {
  return process.env.JWT_SECRET || (process.env.NODE_ENV !== "production" ? "watchera_dev_secret_key_change_in_production" : "");
};

const generateToken = (user) => {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error("JWT_SECRET is missing in environment variables");
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role || "user"
    }, 
    secret,
    { expiresIn: "7d" }
  );
};

export default generateToken;