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

// 1. Middleware CORS
app.use(cors({ 
  origin: ENV.CLIENT_URL || "*", 
  credentials: true 
}));

// 2. Middleware JSON AVEC vérification intelligente
app.use((req, res, next) => {
  // Ne parser JSON que pour les méthodes qui peuvent avoir un body
  const methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (methodsWithBody.includes(req.method) && 
      req.headers['content-type'] === 'application/json') {
    
    // Vérifier si le body est vide
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    
    req.on('end', () => {
      if (data && data.trim() !== '') {
        try {
          req.body = JSON.parse(data);
          next();
        } catch (error) {
          console.error('JSON parsing error:', error.message);
          return res.status(400).json({ 
            error: 'Invalid JSON format',
            message: 'Please provide valid JSON'
          });
        }
      } else {
        // Body vide mais c'est OK
        req.body = {};
        next();
      }
    });
  } else {
    // Pour GET, HEAD, OPTIONS - pas de body parsing
    next();
  }
});

// 3. Clerk middleware
app.use(clerkMiddleware());
// Route test ADMIN simple
app.get("/api/admin/simple-test", (req, res) => {
  console.log("Route /api/admin/simple-test appelée");
  res.json({ 
    success: true,
    message: "Route admin fonctionne",
    data: [
      { id: 1, name: "Test Product 1", price: 99.99 },
      { id: 2, name: "Test Product 2", price: 149.99 }
    ]
  });
});
// 4. Routes
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);

// 5. Routes Payment avec gestion spéciale pour webhook
const handlePaymentRoutes = (req, res, next) => {
  if (req.originalUrl === "/api/payment/webhook" && req.method === "POST") {
    // Pour le webhook Stripe seulement
    return express.raw({ type: "application/json" })(req, res, next);
  }
  next();
};

app.use("/api/payment", handlePaymentRoutes, paymentRoutes);

// 6. Routes de santé
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>API E-Commerce</title>
  </head>
  <body>
    <h1>API E-Commerce</h1>
    <p>Server is running on port ${ENV.PORT}</p>
    <p><a href="/api/health">Health Check</a></p>
    <p><a href="/api/admin/products">Admin Products</a></p>
  </body>
  </html>
  `);
});

// 7. Middleware de logging (optionnel mais utile)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// 8. Gestion d'erreurs améliorée
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body',
      details: 'Ensure you are sending valid JSON or no body for GET requests'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 9. Route 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

const startServer = async () => {
  try {
    await connectDB();
    console.log(`✅ Connected to MONGODB`);
    
    app.listen(ENV.PORT, () => {
      console.log(`🚀 Server is up and running on port ${ENV.PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${ENV.PORT}/api/health`);
      console.log(`🛍️  Admin products: http://localhost:${ENV.PORT}/api/admin/products`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();