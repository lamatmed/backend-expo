import dotenv from "dotenv";

dotenv.config({ quiet: true });

const requiredEnvVars = [
  "DB_URL",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.warn(`
  ################################################################################
  ⚠️  MISSING ENVIRONMENT VARIABLES
  The following required environment variables are missing:
  ${missingEnvVars.join("\n  ")}

  Some features (Database, Auth, Payment) may not work correctly.
  Please check your .env file or backend/src/config/env.js.
  ################################################################################
  `);
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_URL: process.env.DB_URL,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  CLIENT_URL: process.env.CLIENT_URL,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};
