import { backendFetch } from "../backend-fetch";

export async function unlinkGoogleAccount(): Promise<void> {
  const path = `/api/users/me/google-tokens`;
  console.log(`[API Client] Unlinking Google Account via: DELETE ${path}`);

  const response = await backendFetch(path, {
    method: "DELETE",
  });

  console.log(`[API Client] DELETE ${path} status: ${response.status}`);

  if (response.status === 204) {
    console.log(`[API Client] Successfully unlinked Google Account.`);
    return;
  }

  let errorBody = `Failed to unlink Google Account: ${response.statusText}`;
  const contentType = response.headers.get("content-type");
  try {
    if (contentType && contentType.includes("application/json")) {
      const body = await response.json();
      errorBody = body.error || body.message || errorBody;
      console.error("[API Client] Error response body (JSON):", body);
    } else {
      const textBody = await response.text();
      if (textBody) {
        errorBody = textBody;
        console.error("[API Client] Error response body (non-JSON):", textBody);
      } else {
        console.log("[API Client] No error body returned.");
      }
    }
  } catch (e) {
    console.error("[API Client] Failed to parse/read error response body", e);
  }
  throw new Error(`${errorBody} (Status: ${response.status})`);
}
