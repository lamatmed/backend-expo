import express from "express";
import path from "path";
import { clerkMiddleware } from "@clerk/express";
import { serve } from "inngest/express";
import cors from "cors";

import { functions, inngest } from "./config/inngest.js";
import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";

import adminRoutes from "./routes/admin.route.js";
import userRoutes from "./routes/user.route.js";
import orderRoutes from "./routes/order.route.js";
import reviewRoutes from "./routes/review.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import paymentRoutes from "./routes/payment.route.js";

const app = express();
const __dirname = path.resolve();

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Configuration CORS
app.use(cors({
  origin: ENV.CLIENT_URL || "https://e-commerce-admin-six-vert.vercel.app",
  credentials: true
}));

// Middleware pour parser le JSON
app.use(express.json());

// Middleware Clerk
app.use(clerkMiddleware());

// Routes API
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);

// Route de santé
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK",
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// Route racine
app.get("/", (req, res) => {
  res.json({
    status: "Backend is running 🚀",
    environment: ENV.NODE_ENV,
    clientUrl: ENV.CLIENT_URL
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message
  });
});

// Route 404 pour API
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Démarrage du serveur
const startServer = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected successfully");
    
    app.listen(ENV.PORT || 3000, () => {
      console.log(`Server running on port ${ENV.PORT || 3000}`);
      console.log(`CORS enabled for: ${ENV.CLIENT_URL}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Export pour Vercel (si nécessaire)
export default app;