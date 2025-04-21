import { createRequestHandler } from "@remix-run/express";
import express from "express";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { shopifyApp } from "./shopify.server.js"; // если ты используешь Remix-шаблон от Shopify

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// gzip
app.use(compression());

// логгирование
app.use(morgan("tiny"));

// serve static files
app.use("/build", express.static("public/build"));
app.use(express.static("public"));

// Shopify middleware (если есть)
app.use(shopifyApp); // ❗️убери если ты не используешь Remix-шаблон Shopify App

// remix handler
app.all(
  "*",
  createRequestHandler({
    build: await import("./build/server/index.js"),
    mode: process.env.NODE_ENV,
  })
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server is listening on http://localhost:${port}`);
});