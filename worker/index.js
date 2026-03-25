addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Example simple Worker response. Replace with proxy or business logic as needed.
  if (new URL(request.url).pathname === "/api/ping") {
    return new Response(JSON.stringify({ success: true, message: "Hello from EduAlign Worker" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Example of proxying to your backend service if you have one deployed separately.
  const backendUrl = new URL(request.url);
  backendUrl.host = BACKEND_URL.replace(/^https?:\/\//, "");
  backendUrl.protocol = BACKEND_URL.startsWith("https") ? "https:" : "http:";

  const proxyRequest = new Request(backendUrl.toString(), request);
  return fetch(proxyRequest);
}
