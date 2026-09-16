// ─── Controller para Gerenciamento de Imagens e Sessões de Upload ───

import { Request, Response, NextFunction } from "express";
import { productImagesBackendService } from "../services/product-images.service.js";

export const productImagesController = {
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, ttlHours } = req.body;
      const session = await productImagesBackendService.createSession({
        userId: userId || "anonymous",
        ttlHours: ttlHours ? Number(ttlHours) : 24,
      });
      res.status(201).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  },

  async cancelSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const result = await productImagesBackendService.cancelSession(sessionId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async promoteImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, productId, userId, tempImages, primaryImageId, deletedPersistedImageIds, persistedImageOrders } = req.body;

      if (!sessionId || !productId) {
        return res.status(400).json({
          success: false,
          error: "Campos obrigatórios ausentes: 'sessionId' e 'productId'",
        });
      }

      const result = await productImagesBackendService.promoteImages({
        sessionId,
        productId,
        userId: userId || "anonymous",
        tempImages: tempImages || [],
        primaryImageId,
        deletedPersistedImageIds,
        persistedImageOrders,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async cleanupExpired(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productImagesBackendService.cleanupExpired();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async serveImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, imageId } = req.params;
      const imageFile = await productImagesBackendService.getImageFile(productId, imageId);

      // Determine explicit MIME type from extension or stored metadata
      let mimeType = imageFile.mimeType || "image/jpeg";
      const lowerImageId = imageId.toLowerCase();
      if (lowerImageId.endsWith(".png")) {
        mimeType = "image/png";
      } else if (lowerImageId.endsWith(".webp")) {
        mimeType = "image/webp";
      } else if (lowerImageId.endsWith(".gif")) {
        mimeType = "image/gif";
      } else if (lowerImageId.endsWith(".svg")) {
        mimeType = "image/svg+xml";
      } else if (lowerImageId.endsWith(".jpg") || lowerImageId.endsWith(".jpeg")) {
        mimeType = "image/jpeg";
      }

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(imageFile.data);
    } catch (err) {
      next(err);
    }
  },
};
