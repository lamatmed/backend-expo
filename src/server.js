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

// Middleware de base
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      if (buf && buf.length > 0) {
        JSON.parse(buf.toString());
      }
    } catch (e) {
      console.log('JSON parsing check failed, might be webhook or empty body');
    }
  }
}));
app.use(clerkMiddleware());

// Routes standard
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);

// Route spéciale pour Stripe Webhook (SÉPARÉE)
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // Ici, req.body est un Buffer (raw)
    // Trouvez le router payment et appelez-le manuellement
    // Ou déplacez la logique webhook ici
    const stripeController = require("./controllers/payment.controller.js");
    stripeController.handleWebhook(req, res, next);
  }
);

// Routes payment normales
app.use("/api/payment", paymentRoutes);

// Routes santé
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Success" });
});

app.get("/", (req, res) => {
  res.send("API is running");
});

// Gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'Invalid JSON',
      message: 'The request body contains invalid JSON'
    });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  await connectDB();
  app.listen(ENV.PORT, () => {
    console.log(`✅ Connected to MONGODB`);
    console.log("Server is up and running");
  });
};

startServer();