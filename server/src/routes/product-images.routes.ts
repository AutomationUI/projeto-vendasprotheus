// ─── Product Images Express Router ───

import { Router } from "express";
import { productImagesController } from "../controllers/product-images.controller.js";

export const productImagesRouter = Router();

// Criar sessão de upload temporário (Stage 1)
productImagesRouter.post("/sessions", productImagesController.createSession);

// Cancelar sessão de upload temporário
productImagesRouter.delete("/sessions/:sessionId", productImagesController.cancelSession);

// Promover imagens temporárias para definitivas (Stage 2 - Salvar Produto)
productImagesRouter.post("/promote", productImagesController.promoteImages);

// Servir arquivo de imagem com Content-Type apropriado
productImagesRouter.get("/serve/:productId/:imageId", productImagesController.serveImage);

// Rotina de limpeza de sessões expiradas
productImagesRouter.post("/cleanup-expired", productImagesController.cleanupExpired);
