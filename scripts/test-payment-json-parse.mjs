#!/usr/bin/env node
/**
 * Ensures stripe-checkout accepts Vercel-style req.body (object) and stream bodies.
 * Run: npm run test:payment-parse
 */
import { EventEmitter } from "node:events";
import { parseJsonBody } from "../api/stripe-checkout.js";

function streamReq(obj) {
  const e = new EventEmitter();
  e.body = undefined;
  queueMicrotask(() => {
    e.emit("data", Buffer.from(JSON.stringify(obj)));
    e.emit("end");
  });
  return e;
}

const fromObject = await parseJsonBody({
  body: { negotiationId: "NEG-ABC123", email: "a@b.co", consent: true },
});
if (fromObject.negotiationId !== "NEG-ABC123") {
  console.error("FAIL: parseJsonBody(req.body object)");
  process.exit(1);
}

const fromStream = await parseJsonBody(streamReq({ foo: 1 }));
if (fromStream.foo !== 1) {
  console.error("FAIL: parseJsonBody(stream)");
  process.exit(1);
}

console.log("OK: payment JSON body parsing (Vercel + stream)");
