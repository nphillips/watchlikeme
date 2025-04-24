// frontend/src/lib/api/collections.ts
import { Collection } from "../../interfaces/index"; // Use relative path to the new interfaces file

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8888";

/**
 * Fetches the authenticated user's collections from the backend API.
 */
export async function getCollections(): Promise<Collection[]> {
  const url = `${BACKEND_URL}/api/collections`;
  console.log(`[API Client] Fetching collections from: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Sends cookies (like JWT)
    });

    console.log(`[API Client] Response status: ${response.status}`);

    if (!response.ok) {
      let errorBody = "Failed to fetch collections";
      try {
        const body = await response.json();
        errorBody = body.error || body.message || errorBody;
        console.error("[API Client] Error response body:", body);
      } catch (e) {
        console.error("[API Client] Failed to parse error response body");
      }
      throw new Error(`${errorBody} (Status: ${response.status})`);
    }

    const collections: Collection[] = await response.json();
    console.log(
      `[API Client] Successfully fetched ${collections.length} collections.`
    );
    return collections;
  } catch (error) {
    console.error("[API Client] Error fetching collections:", error);
    throw error;
  }
}
