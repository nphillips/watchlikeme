// frontend/src/lib/api/collections.ts
import {
  Collection,
  AddItemRequestBody,
  PopulatedCollectionItem,
} from "../../interfaces/index";
import { backendFetch } from "../backend-fetch"; // Import the helper

// BACKEND_URL constant can be removed if backendFetch handles it
// const BACKEND_URL =
//   process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8888";

/**
 * Fetches the authenticated user's collections from the backend API.
 */
export async function getCollections(): Promise<Collection[]> {
  // Use backendFetch for consistency
  const response = await backendFetch("/api/collections", { method: "GET" });

  console.log(`[API Client] GET /api/collections status: ${response.status}`);

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
}

/**
 * Fetches items for a specific collection.
 * @param collectionSlug The slug of the collection.
 */
export async function getCollectionItems(
  collectionSlug: string
): Promise<PopulatedCollectionItem[]> {
  const path = `/api/collections/${collectionSlug}/items`;
  console.log(`[API Client] Fetching items from: ${path}`);

  const response = await backendFetch(path, { method: "GET" });

  console.log(`[API Client] GET ${path} status: ${response.status}`);

  if (!response.ok) {
    let errorBody = "Failed to fetch collection items";
    try {
      const body = await response.json();
      errorBody = body.error || body.message || errorBody;
      console.error("[API Client] Error response body:", body);
    } catch (e) {
      console.error("[API Client] Failed to parse error response body");
    }
    throw new Error(`${errorBody} (Status: ${response.status})`);
  }

  const items: PopulatedCollectionItem[] = await response.json();
  console.log(`[API Client] Successfully fetched ${items.length} items.`);
  return items;
}

/**
 * Adds an item (channel or video) to a specific collection.
 * @param collectionSlug The slug of the collection.
 * @param itemData The data for the item to add.
 */
export async function addCollectionItem(
  collectionSlug: string,
  itemData: AddItemRequestBody
): Promise<PopulatedCollectionItem> {
  // The backend returns the created/existing PopulatedCollectionItem
  const path = `/api/collections/${collectionSlug}/items`;
  console.log(`[API Client] Adding item to: ${path}`, itemData);

  const response = await backendFetch(path, {
    method: "POST",
    headers: {
      // backendFetch sets Content-Type: application/json by default
    },
    body: JSON.stringify(itemData),
  });

  console.log(`[API Client] POST ${path} status: ${response.status}`);

  if (!response.ok) {
    let errorBody = "Failed to add item to collection";
    try {
      const body = await response.json();
      errorBody = body.error || body.message || errorBody;
      console.error("[API Client] Error response body:", body);
    } catch (e) {
      console.error("[API Client] Failed to parse error response body");
    }
    throw new Error(`${errorBody} (Status: ${response.status})`);
  }

  const newItem: PopulatedCollectionItem = await response.json();
  console.log(`[API Client] Successfully added item:`, newItem);
  return newItem;
}
