// The module's HTTP routes: /api/qcc/* for the pages (public, anonymous), /api/admin/qcc/* for the admin.
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { actorOf } from "@aihot/backend/admin/auth";
import { sendJsonWithEtag, sendProblem } from "@aihot/api/http/respond";
import { adminHandler } from "@aihot/api/routes/admin-auth";
import { body, orNotFound, param } from "@aihot/api/routes/admin";
import { adminOverview, lookUpAll, testServers } from "../backend/admin.ts";
import { clearConfig, saveConfig } from "../backend/config.ts";
import { confirmEntity, confirmSuggested, resetEntity } from "../backend/entities.ts";
import { brokerPage, listBrokers } from "../backend/read.ts";
import { requestRefresh } from "../backend/refresh.ts";

/** The admin's mistakes answer 400 with their message (adminHandler). */
async function asInput<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { statusCode: 400 });
  }
}

function publicHandler(fn: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      return await fn(req, reply);
    } catch (error) {
      req.log.error({ err: error, path: req.url.split("?")[0] }, "qcc api error");
      return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: "temporarily unavailable", retryAfter: 10 });
    }
  };
}

export function registerQccRoutes(app: FastifyInstance) {
  app.get("/api/qcc/brokers", publicHandler(async (req, reply) =>
    sendJsonWithEtag(req, reply, await listBrokers(), { etagPrefix: "qcc-brokers", cacheControl: "public, max-age=60, s-maxage=60" })));

  app.get("/api/qcc/brokers/:slug", publicHandler(async (req, reply) => {
    const page = await brokerPage(param(req, "slug"));
    if (!page) return sendProblem(req, reply, { status: 404, code: "not_found", detail: "broker not found", cacheControl: "public, max-age=60" });
    // While the worker fetches, the page asks again every few seconds: nothing may keep the old answer.
    return sendJsonWithEtag(req, reply, page, { etagPrefix: "qcc-broker", cacheControl: page.refreshing ? "no-store" : "public, max-age=60, s-maxage=60" });
  }));

  app.get("/api/admin/qcc", adminHandler(async () => adminOverview()));
  app.put("/api/admin/qcc/config", adminHandler(async (req, _reply, admin) => {
    const b = body<{ json: string; reason: string }>(req);
    return { servers: await asInput(() => saveConfig(String(b.json ?? ""), String(b.reason ?? ""), actorOf(admin))) };
  }));
  app.delete("/api/admin/qcc/config", adminHandler(async (req, reply, admin) => {
    await asInput(() => clearConfig(String(body(req).reason ?? ""), actorOf(admin)));
    return reply.code(204).send();
  }));
  app.post("/api/admin/qcc/test", adminHandler(async () => ({ servers: await asInput(() => testServers()) })));
  app.post("/api/admin/qcc/lookup", adminHandler(async () => ({ queued: await lookUpAll() })));
  app.post("/api/admin/qcc/confirm-suggested", adminHandler(async (_req, _reply, admin) => {
    const slugs = await confirmSuggested(actorOf(admin));
    for (const slug of slugs) await requestRefresh(slug, { force: true });
    return { confirmed: slugs.length };
  }));
  app.post("/api/admin/qcc/brokers/:slug/confirm", adminHandler(async (req, reply, admin) => {
    const row = await asInput(() => confirmEntity(param(req, "slug"), String(body(req).creditCode ?? ""), actorOf(admin)));
    if (row) await requestRefresh(row.slug, { force: true });
    return orNotFound(req, reply, row ? { status: row.status, name: row.name } : null);
  }));
  app.post("/api/admin/qcc/brokers/:slug/refresh", adminHandler(async (req) => ({ queued: await requestRefresh(param(req, "slug"), { force: true }) })));
  app.post("/api/admin/qcc/brokers/:slug/reset", adminHandler(async (req, reply, admin) =>
    orNotFound(req, reply, (await resetEntity(param(req, "slug"), actorOf(admin))) ? { reset: true } : null)));
}
