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

// special handling: Stripe webhook needs raw body BEFORE any body parsing middleware
// apply raw body parser conditionally only to webhook endpoint
app.use(
  "/api/payment",
  (req, res, next) => {
    if (req.originalUrl === "/api/payment/webhook") {
      express.raw({ type: "application/json" })(req, res, next);
    } else {
      express.json()(req, res, next); // parse json for non-webhook routes
    }
  },
  paymentRoutes
);

app.use(express.json());
app.use(clerkMiddleware()); // adds auth object under the req => req.auth
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true })); // credentials: true allows the browser to send the cookies to the server with the request

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
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>API E-Commerce</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f2f5; }
      .container { max-width: 800px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
      .endpoint { background: #f8f9fa; margin: 10px 0; padding: 15px; border-left: 4px solid #4CAF50; border-radius: 5px; }
      .method { font-weight: bold; color: white; padding: 3px 8px; border-radius: 3px; margin-right: 10px; }
      .GET { background: #2196F3; }
      .POST { background: #4CAF50; }
      .PUT { background: #FF9800; }
      .DELETE { background: #f44336; }
      .status { background: #4CAF50; color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin: 10px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🛒 API E-Commerce</h1>
      <div class="status">✅ Serveur actif - Port ${ENV.PORT}</div>
      
      <h3>Endpoints disponibles :</h3>
      <div class="endpoint"><span class="method GET">GET</span> /api/health - Vérifier l'état</div>
      <div class="endpoint"><span class="method GET">GET</span> /api/products - Produits</div>
      <div class="endpoint"><span class="method POST">POST</span> /api/auth/login - Connexion</div>
      <div class="endpoint"><span class="method GET">GET</span> /api/cart - Panier</div>
      <div class="endpoint"><span class="method POST">POST</span> /api/orders - Commandes</div>
      
      <p><strong>Client :</strong> ${ENV.CLIENT_URL || 'Non défini'}</p>
      <p><strong>Environnement :</strong> ${process.env.NODE_ENV || 'development'}</p>
    </div>
  </body>
  </html>
  `);
});


const startServer = async () => {
  await connectDB();
  app.listen(ENV.PORT, () => {
    console.log("Server is up and running");
  });
};

startServer();
