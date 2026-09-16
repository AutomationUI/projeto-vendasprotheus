import { Router } from "express";
import { validate } from "../middleware/validator.js";
import {
  sendEmailSchema,
  sendWhatsAppSchema,
  testEmailSchema,
  testWhatsAppSchema,
} from "../schemas/messaging.schema.js";
import {
  handleSendEmail,
  handleSendWhatsApp,
  handleTestEmail,
  handleTestWhatsApp,
  handleGetDeliveryLog,
  handleGetDeliveryLogByQuote,
  handleGetSettings,
} from "../controllers/messaging.controller.js";

export const messagingRouter = Router();

messagingRouter.post("/send-email", validate(sendEmailSchema), handleSendEmail);
messagingRouter.post("/send-whatsapp", validate(sendWhatsAppSchema), handleSendWhatsApp);
messagingRouter.post("/test-email", validate(testEmailSchema), handleTestEmail);
messagingRouter.post("/test-whatsapp", validate(testWhatsAppSchema), handleTestWhatsApp);
messagingRouter.get("/delivery-log", handleGetDeliveryLog);
messagingRouter.get("/delivery-log/:quoteId", handleGetDeliveryLogByQuote);
messagingRouter.get("/settings", handleGetSettings);
