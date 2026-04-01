/**
 * 使用 XMLHttpRequest 发起请求并返回 Web Fetch 兼容的 Response。
 * Tauri macOS 正式包内 WebView 的 fetch 可能异常时，用 XHR 兜底（见 appHttpFetch）。
 */
export async function xhrFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestUrl =
    typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers);
  const body = init?.body;

  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, requestUrl, true);
    xhr.responseType = "text";

    headers.forEach((value, key) => xhr.setRequestHeader(key, value));

    xhr.onerror = () => reject(new Error("XHR_NETWORK_ERROR"));
    xhr.ontimeout = () => reject(new Error("XHR_TIMEOUT"));

    xhr.onload = () => {
      const rawHeaders = xhr.getAllResponseHeaders();
      const responseHeaders = new Headers();

      rawHeaders
        .trim()
        .split(/[\r\n]+/)
        .forEach((line) => {
          if (!line) return;
          const index = line.indexOf(":");
          if (index <= 0) return;
          const key = line.slice(0, index).trim();
          const value = line.slice(index + 1).trim();
          responseHeaders.append(key, value);
        });

      resolve(
        new Response(xhr.responseText ?? "", {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: responseHeaders,
        }),
      );
    };

    if (body == null) return xhr.send();
    if (typeof body === "string" || body instanceof Blob || body instanceof ArrayBuffer || body instanceof FormData) {
      return xhr.send(body);
    }
    xhr.send(String(body));
  });
}
