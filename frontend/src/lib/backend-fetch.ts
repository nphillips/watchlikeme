// Function to read a cookie (implement or import a suitable one)
// This is a basic example, consider using a library like 'js-cookie'
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null; // Check if running in browser
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export async function backendFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888";
  const url = `${backendUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  // Try reading the non-HttpOnly cookie
  const token = getCookie("auth_token");

  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include", // Keep this for potential cookie use or other credentials
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      // Add Authorization header if token exists
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  if (options.headers && "Content-Type" in options.headers) {
    const headers = options.headers as Record<string, string>;
    (fetchOptions.headers as Record<string, string>)["Content-Type"] =
      headers["Content-Type"];
  }

  console.log(
    `[backendFetch] Fetching ${url} with headers:`,
    fetchOptions.headers,
  ); // Log headers

  return fetch(url, fetchOptions);
}
