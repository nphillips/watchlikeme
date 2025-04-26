// frontend/src/lib/api/collections.ts
import {
  Collection,
  AddItemRequestBody,
  PopulatedCollectionItem,
  CollectionWithItems,
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
 * Fetches items and details for a specific collection.
 * @param collectionSlug The slug of the collection.
 */
export async function getCollectionItems(
  collectionSlug: string
): Promise<CollectionWithItems> {
  const path = `/api/collections/${collectionSlug}/items`;
  console.log(`[API Client] Fetching collection details & items from: ${path}`);

  const response = await backendFetch(path, { method: "GET" });

  console.log(`[API Client] GET ${path} status: ${response.status}`);

  if (!response.ok) {
    let errorBody = "Failed to fetch collection data";
    try {
      const body = await response.json();
      errorBody = body.error || body.message || errorBody;
      console.error("[API Client] Error response body:", body);
    } catch (e) {
      console.error("[API Client] Failed to parse error response body");
    }
    // Handle specific errors like 404 Not Found / 403 Forbidden
    if (response.status === 404) {
      errorBody = "Collection not found or not accessible.";
    }
    if (response.status === 403) {
      errorBody = "You do not have permission to view this private collection.";
    }
    throw new Error(`${errorBody} (Status: ${response.status})`);
  }

  const data: CollectionWithItems = await response.json();
  console.log(
    `[API Client] Successfully fetched collection ${data.collection.name} with ${data.items.length} items.`
  );
  return data;
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
    headers: {},
    body: JSON.stringify(itemData),
  });

  console.log(`[API Client] POST ${path} status: ${response.status}`);

  if (!response.ok) {
    let errorBody = `Failed to add item: ${response.statusText}`;
    const contentType = response.headers.get("content-type");
    try {
      // Only parse JSON if the content type indicates it
      if (contentType && contentType.includes("application/json")) {
        const body = await response.json();
        errorBody = body.error || body.message || errorBody;
        console.error("[API Client] Error response body (JSON):", body);
      } else {
        // Otherwise, try to get text, but don't fail if body is empty
        const textBody = await response.text();
        if (textBody) {
          errorBody = textBody;
          console.error(
            "[API Client] Error response body (non-JSON):",
            textBody
          );
        } else {
          console.log("[API Client] No error body returned.");
        }
      }
    } catch (e) {
      console.error("[API Client] Failed to parse/read error response body", e);
    }
    throw new Error(`${errorBody} (Status: ${response.status})`);
  }

  // Success case - assumes 201 returns the created item as JSON
  const newItem: PopulatedCollectionItem = await response.json();
  console.log(`[API Client] Successfully added item:`, newItem);
  return newItem;
}

/**
 * Removes an item from a specific collection.
 * @param collectionSlug The slug of the collection.
 * @param collectionItemId The ID of the CollectionItem record to remove.
 */
export async function removeCollectionItem(
  collectionSlug: string,
  collectionItemId: string
): Promise<void> {
  // DELETE requests often don't return a body on success (204)
  const path = `/api/collections/${collectionSlug}/items/${collectionItemId}`;
  console.log(`[API Client] Removing item via: DELETE ${path}`);

  const response = await backendFetch(path, {
    method: "DELETE",
    // No body needed for DELETE
  });

  console.log(`[API Client] DELETE ${path} status: ${response.status}`);

  // Check for 204 No Content or other success statuses if applicable
  if (response.status === 204) {
    console.log(`[API Client] Successfully removed item ${collectionItemId}.`);
    return; // Success
  }

  // Handle errors
  let errorBody = `Failed to remove item: ${response.statusText}`;
  const contentType = response.headers.get("content-type");
  try {
    // Only parse JSON if the content type indicates it
    if (contentType && contentType.includes("application/json")) {
      const body = await response.json();
      errorBody = body.error || body.message || errorBody;
      console.error("[API Client] Error response body (JSON):", body);
    } else {
      // Otherwise, try to get text, but don't fail if body is empty
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

/**
 * Updates details for a specific collection (note and/or isPublic status).
 * @param collectionSlug The slug of the collection.
 * @param updates An object containing the fields to update (e.g., { note: string | null, isPublic: boolean }).
 */
export async function updateCollectionDetails(
  collectionSlug: string,
  updates: { note?: string | null; isPublic?: boolean } // Accept object with optional fields
): Promise<Collection> {
  const path = `/api/collections/${collectionSlug}`;
  console.log(`[API Client] Updating details for: ${path} via PUT`, updates);

  // Ensure we only send fields that are actually provided
  const body: { note?: string | null; isPublic?: boolean } = {};
  if (updates.note !== undefined) {
    body.note = updates.note;
  }
  if (updates.isPublic !== undefined) {
    body.isPublic = updates.isPublic;
  }

  if (Object.keys(body).length === 0) {
    console.warn(
      "[API Client] updateCollectionDetails called with no fields to update."
    );
    // Optionally throw an error or return early depending on desired behavior
    // For now, let's proceed, backend will validate if needed.
  }

  const response = await backendFetch(path, {
    method: "PUT",
    headers: {},
    body: JSON.stringify(body), // Send only the provided updates
  });

  console.log(`[API Client] PUT ${path} status: ${response.status}`);

  if (!response.ok) {
    let errorBody = `Failed to update collection details: ${response.statusText}`;
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
        } else {
          console.log("[API Client] No error body returned.");
        }
      }
    } catch (e) {
      console.error("[API Client] Failed to parse/read error response body", e);
    }
    throw new Error(`${errorBody} (Status: ${response.status})`);
  }

  const updatedCollection: Collection = await response.json();
  console.log(
    `[API Client] Successfully updated collection details:`,
    updatedCollection
  );
  return updatedCollection;
}

/**
 * Likes a specific collection for the authenticated user.
 * @param collectionSlug The slug of the collection to like.
 */
export async function likeCollection(collectionSlug: string): Promise<void> {
  // POST returns 201, but we might not need the like object
  const path = `/api/collections/${collectionSlug}/like`;
  console.log(`[API Client] Liking collection via: POST ${path}`);

  const response = await backendFetch(path, {
    method: "POST",
    // No body needed for liking
  });

  console.log(`[API Client] POST ${path} status: ${response.status}`);

  // Check for 201 Created or potentially 409 Conflict (already liked)
  if (response.ok || response.status === 409) {
    console.log(
      `[API Client] Like operation successful (or already liked) for ${collectionSlug}.`
    );
    return; // Treat "already liked" as success from UI perspective
  }

  // Handle other errors
  let errorBody = `Failed to like collection: ${response.statusText}`;
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
      }
    }
  } catch (e) {
    /* Ignore parsing error */
  }
  throw new Error(`${errorBody} (Status: ${response.status})`);
}

/**
 * Unlikes a specific collection for the authenticated user.
 * @param collectionSlug The slug of the collection to unlike.
 */
export async function unlikeCollection(collectionSlug: string): Promise<void> {
  const path = `/api/collections/${collectionSlug}/like`;
  console.log(`[API Client] Unliking collection via: DELETE ${path}`);

  const response = await backendFetch(path, {
    method: "DELETE",
  });

  console.log(`[API Client] DELETE ${path} status: ${response.status}`);

  // Check for 204 No Content or 404 Not Found (already unliked)
  if (response.status === 204 || response.status === 404) {
    console.log(
      `[API Client] Unlike operation successful (or like not found) for ${collectionSlug}.`
    );
    return; // Treat "like not found" as success from UI perspective
  }

  // Handle other errors
  let errorBody = `Failed to unlike collection: ${response.statusText}`;
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
      }
    }
  } catch (e) {
    /* Ignore parsing error */
  }
  throw new Error(`${errorBody} (Status: ${response.status})`);
}
