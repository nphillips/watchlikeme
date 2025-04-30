export async function backendFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888";
  const url = `${backendUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    },
  };

  if (options.headers && "Content-Type" in options.headers) {
    const headers = options.headers as Record<string, string>;
    (fetchOptions.headers as Record<string, string>)["Content-Type"] =
      headers["Content-Type"];
  }

  return fetch(url, fetchOptions);
}
