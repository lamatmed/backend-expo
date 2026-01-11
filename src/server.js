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

// ========== CORS ==========
app.use(cors({
  origin: [
    'https://e-commerce-admin-six-vert.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

// ========== RÉÉCRITURE D'URL TRANSPARENTE ==========
// Cette fonction réécrit l'URL sans redirection
const rewriteAdminUrls = (req, res, next) => {
  // Si la requête commence par /admin/ mais pas par /api/admin/
  if (req.path.startsWith('/admin/') && !req.path.startsWith('/api/admin/')) {
    // Sauvegarder l'URL originale
    const originalUrl = req.originalUrl;
    const originalPath = req.path;
    
    // Construire la nouvelle URL
    const newPath = `/api${originalPath}`;
    
    console.log(`🔄 Réécriture transparente: ${req.method} ${originalUrl} -> ${newPath}`);
    
    // Modifier la requête pour Express
    req.url = newPath;
    req.originalRewrite = originalUrl;
    
    // Appeler next() immédiatement pour traiter la nouvelle URL
    return app._router.handle(req, res, next);
  }
  
  next();
};

// Appliquer le middleware de réécriture
app.use(rewriteAdminUrls);

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(clerkMiddleware());

// ========== STRIPE WEBHOOK ==========
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

// ========== ROUTES API ==========
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);

// ========== ROUTES DIRECTES (optionnel) ==========
// Si tu veux que /admin/* fonctionne SANS redirection
app.use("/admin", adminRoutes); // Cette ligne rend /admin/products accessible directement

// ========== HEALTH CHECK ==========
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    message: "Success",
    timestamp: new Date().toISOString(),
    routes: {
      direct_api: "/api/admin/*",
      direct_admin: "/admin/*",
      test_urls: {
        with_api: "https://backend-expo.vercel.app/api/admin/products",
        without_api: "https://backend-expo.vercel.app/admin/products"
      }
    }
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to E-commerce API",
    note: "Frontend can use either:",
    options: [
      "OPTION 1: /api/admin/products (recommended)",
      "OPTION 2: /admin/products (works directly)"
    ],
    test: "Try both URLs in your browser!"
  });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not Found",
    requested: req.originalUrl,
    available_routes: [
      "GET /api/health",
      "GET /api/admin/products",
      "GET /admin/products",
      "GET /api/products",
      "POST /api/admin/products"
    ]
  });
});

// ========== START SERVER ==========
const startServer = async () => {
  await connectDB();
  const port = process.env.PORT || ENV.PORT || 5000;
  app.listen(port, () => {
    console.log(`
=======================================
🚀 SERVER STARTED ON PORT ${port}
=======================================
✅ BOTH URLs WILL WORK:
   1. https://backend-expo.vercel.app/api/admin/products
   2. https://backend-expo.vercel.app/admin/products
   
✅ CORS ENABLED FOR:
   • https://e-commerce-admin-six-vert.vercel.app
   • http://localhost:3000
   
=======================================
🔗 TEST LINKS:
   • Health: https://backend-expo.vercel.app/api/health
   • Admin Products (API): https://backend-expo.vercel.app/api/admin/products
   • Admin Products (Direct): https://backend-expo.vercel.app/admin/products
=======================================
    `);
  });
};

startServer();

export default app;