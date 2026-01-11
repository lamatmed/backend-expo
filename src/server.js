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

// ========== CONFIGURATION CORS POUR VERCEL ==========
// Liste des origines autorisées
const allowedOrigins = [
  'https://e-commerce-admin-six-vert.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  ENV.CLIENT_URL // Garde ta variable existante
].filter(Boolean); // Retire les valeurs undefined

// Configuration CORS avancée
const corsOptions = {
  origin: function (origin, callback) {
    // En développement ou pour les requêtes sans origine (curl, Postman)
    if (!origin || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Vérifier si l'origine est autorisée
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    } else {
      console.warn(`⚠️  CORS bloqué pour l'origine: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-clerk-auth-reason',
    'x-clerk-auth-message'
  ]
};

// Appliquer CORS
app.use(cors(corsOptions));

// Gérer les requêtes OPTIONS (pré-flight)
app.options('*', cors(corsOptions));

// ========== RÉÉCRITURE D'URL POUR /admin/* ==========
app.use((req, res, next) => {
  // Réécrire /admin/* en /api/admin/* sans redirection
  if (req.path.startsWith('/admin') && !req.path.startsWith('/api/admin')) {
    const originalUrl = req.originalUrl;
    req.url = `/api${req.path}`;
    console.log(`🔀 URL réécrite: ${originalUrl} -> ${req.url}`);
  }
  next();
});

// ========== MIDDLEWARE ==========
// Gestion spéciale pour Stripe webhook
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

// ========== ROUTES API ==========
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);

// ========== ROUTES DE COMPATIBILITÉ (pour ancien frontend) ==========
// Les routes /admin/* pointent vers les mêmes contrôleurs que /api/admin/*
app.use("/admin", adminRoutes);

// ========== HEALTH CHECK ==========
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    message: "Success",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins: allowedOrigins,
      clientUrl: ENV.CLIENT_URL
    }
  });
});

// Route racine
app.get("/", (req, res) => {
  res.json({
    name: "E-commerce Backend API",
    status: "online",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      admin: "/api/admin/* (ou /admin/*)",
      products: "/api/products/*",
      users: "/api/users/*",
      orders: "/api/orders/*",
      cart: "/api/cart/*"
    }
  });
});

// ========== GESTION STATIQUE POUR PRODUCTION ==========
// NOTE: Sur Vercel, si tu as un frontend séparé, retire ce bloc
// Si ton frontend est dans le même repo, garde-le mais adapte les chemins
if (ENV.NODE_ENV === "production") {
  // Pour Vercel, les fichiers statiques sont généralement dans 'public' ou à la racine
  // Ajuste selon ta structure
  const staticPath = path.join(__dirname, 'public');
  
  app.use(express.static(staticPath));
  
  app.get("*", (req, res) => {
    // Ne pas intercepter les routes API
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    
    // Servir le frontend React/Vue/Angular
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

// ========== GESTION DES ERREURS 404 ==========
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    requested: `${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "/api/health",
      "/api/admin/*",
      "/api/products/*",
      "/api/users/*",
      "/api/orders/*",
      "/api/cart/*"
    ]
  });
});

// ========== GESTION DES ERREURS GLOBALES ==========
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  
  // Erreur CORS
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: "CORS Error",
      message: err.message,
      allowedOrigins: allowedOrigins
    });
  }
  
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
});

// ========== CONNEXION DB ET DÉMARRAGE ==========
const startServer = async () => {
  try {
    await connectDB();
    
    // Vercel fournit le port via process.env.PORT
    const port = process.env.PORT || ENV.PORT || 5000;
    
    app.listen(port, () => {
      console.log(`
🚀 Server running on port ${port}
📡 Environment: ${process.env.NODE_ENV || 'development'}
🌐 CORS enabled for:`);
      allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
      console.log(`🔗 Health check: http://localhost:${port}/api/health`);
    });
    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// ========== LOGIQUE CONDITIONNELLE POUR VERCEL ==========
// Sur Vercel, on exporte l'app sans la démarrer
// En local, on démarre le serveur normalement

// Vérifier si on est sur Vercel
const isVercel = process.env.VERCEL === '1';

// Vérifier si c'est le module principal
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (!isVercel && isMainModule) {
  // Démarrer en local
  startServer();
} else if (isVercel) {
  console.log("🔄 Running in Vercel environment");
  // Sur Vercel, l'app est exportée et sera exécutée par Vercel
}

// Export pour Vercel Serverless Functions
export default app;