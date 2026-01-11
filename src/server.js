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

// Configuration CORS avec CLIENT_URL
const allowedOrigins = [
  ENV.CLIENT_URL, // https://e-commerce-admin-six-vert.vercel.app
  'http://localhost:5173', // pour le développement local
  'http://localhost:3000',
];

// Configuration CORS
app.use(cors({
  origin: function (origin, callback) {
    // Permettre les requêtes sans origine (comme les apps mobiles, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Vérifier si l'origine est dans la liste autorisée
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS bloqué pour l'origine: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Gestion des requêtes OPTIONS (preflight)
app.options('*', cors());

// special handling: Stripe webhook needs raw body BEFORE any body parsing middleware
app.use(
  "/api/payment",
  (req, res, next) => {
    if (req.originalUrl === "/api/payment/webhook") {
      express.raw({ type: "application/json" })(req, res, next);
    } else {
      express.json()(req, res, next);
    }
  },
  paymentRoutes
);

app.use(express.json());
app.use(clerkMiddleware());

// Routes API
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Success" });
});

app.get("/", (req, res) => {
  res.json({
    status: "Backend is running 🚀",
    clientUrl: ENV.CLIENT_URL,
    corsEnabled: true
  });
});

// Middleware de logging pour déboguer CORS
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Gestion des erreurs CORS
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    console.log(`CORS Error: ${req.headers.origin} not allowed`);
    return res.status(403).json({ 
      error: 'CORS error', 
      message: 'Origin not allowed',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  next(err);
});

// Gestion des routes API non trouvées
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

const startServer = async () => {
  await connectDB();
  app.listen(ENV.PORT, () => {
    console.log("Server is up and running");
    console.log(`CORS configured for: ${ENV.CLIENT_URL}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  });
};

startServer();