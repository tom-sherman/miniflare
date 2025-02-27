/**
 * @jest-environment node
 */
import { Miniflare } from "miniflare";
import StandardWebSocket from "ws";

test("atob, btoa, AbortSignal", async () => {
  // jest-environment-node doesn't include these in the global scope, even
  // though they should be
  expect(globalThis.atob).toBeUndefined();
  expect(globalThis.btoa).toBeUndefined();
  expect(globalThis.AbortSignal).toBeUndefined();

  // Check Miniflare includes them anyways
  const mf = new Miniflare({
    script: "//",
  });
  const { atob, btoa, AbortSignal } = await mf.getGlobalScope();
  expect(btoa("test")).toBe("dGVzdA==");
  expect(atob("dGVzdA==")).toBe("test");
  expect(AbortSignal.abort()).toBeInstanceOf(AbortSignal);
});

test("startServer", async () => {
  // Jest incorrectly resolves WebSocketServer from the ws package, check
  // Miniflare loads it correctly

  const mf = new Miniflare({
    port: 0,
    modules: true,
    script: `export default {
      fetch() {
        const [client, worker] = Object.values(new WebSocketPair());
        worker.accept();
        worker.send("test");
        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      }
    }`,
  });
  const server = await mf.startServer();
  const port = server.address().port;

  const ws = new StandardWebSocket(`ws://localhost:${port}`);
  const event = await new Promise((resolve) => {
    ws.addEventListener("message", resolve);
  });
  expect(event.data).toBe("test");
  ws.close();
  server.close();
});
