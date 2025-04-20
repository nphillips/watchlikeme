/**
 * Helper function to make authenticated requests to the backend API
 */
export async function backendFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8888";
  const url = `${backendUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  // Clone the options to avoid mutating the original
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include", // Always send cookies
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    },
  };

  // If Content-Type was already set, use that value
  if (options.headers && "Content-Type" in options.headers) {
    const headers = options.headers as Record<string, string>;
    (fetchOptions.headers as Record<string, string>)["Content-Type"] =
      headers["Content-Type"];
  }

  return fetch(url, fetchOptions);
}
