// ─── API Barrel Export ────────────────────────────────────

export { API_CONFIG, getApiUrl } from "./config";
export { http, ApiError } from "./http-client";
export { authService } from "./auth-service";
export { ordersService } from "./orders-service";
export { quotesService } from "./quotes-service";
export { customersService } from "./customers-service";
export { productsService } from "./products-service";
export { messagingService } from "./messaging-service";
export { approvalsService } from "./approvals-service";

export type { LoginRequest, LoginResponse, Verify2FARequest, Verify2FAResponse } from "./auth-service";
export type { OrderFilters, PaginatedResponse } from "./orders-service";
export type { QuoteFilters } from "./quotes-service";
export type { CustomerFilters } from "./customers-service";
export type { ProductFilters } from "./products-service";
export type { ApprovalFilters } from "./approvals-service";
export type { SendEmailRequest, SendWhatsAppRequest, SendResult, MessagingSettings, DeliveryLogEntry } from "./messaging-service";
