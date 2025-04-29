import {
  Collection,
  AddItemRequestBody,
  PopulatedCollectionItem,
  CollectionWithItems,
  UserCollectionsResponse,
} from "../../interfaces/index";
import { backendFetch } from "../backend-fetch";

export async function getCollections(): Promise<UserCollectionsResponse> {
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

  const data: UserCollectionsResponse = await response.json();
  console.log(
    `[API Client] Fetched ${data.ownedCollections.length} owned, ${data.sharedCollections.length} shared collections.`,
  );
  return data;
}

export async function getCollectionItems(
  collectionSlug: string,
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
    `[API Client] Successfully fetched collection ${data.collection.name} with ${data.items.length} items.`,
  );
  return data;
}

export async function addCollectionItem(
  collectionSlug: string,
  itemData: AddItemRequestBody,
): Promise<PopulatedCollectionItem> {
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
      if (contentType && contentType.includes("application/json")) {
        const body = await response.json();
        errorBody = body.error || body.message || errorBody;
        console.error("[API Client] Error response body (JSON):", body);
      } else {
        const textBody = await response.text();
        if (textBody) {
          errorBody = textBody;
          console.error(
            "[API Client] Error response body (non-JSON):",
            textBody,
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

  const newItem: PopulatedCollectionItem = await response.json();
  console.log(`[API Client] Successfully added item:`, newItem);
  return newItem;
}

export async function removeCollectionItem(
  collectionSlug: string,
  collectionItemId: string,
): Promise<void> {
  const path = `/api/collections/${collectionSlug}/items/${collectionItemId}`;
  console.log(`[API Client] Removing item via: DELETE ${path}`);

  const response = await backendFetch(path, {
    method: "DELETE",
  });

  console.log(`[API Client] DELETE ${path} status: ${response.status}`);

  if (response.status === 204) {
    console.log(`[API Client] Successfully removed item ${collectionItemId}.`);
    return;
  }

  let errorBody = `Failed to remove item: ${response.statusText}`;
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

export async function updateCollectionDetails(
  collectionSlug: string,
  updates: { note?: string | null; isPublic?: boolean },
): Promise<Collection> {
  const path = `/api/collections/${collectionSlug}`;
  console.log(`[API Client] Updating details for: ${path} via PUT`, updates);

  const body: { note?: string | null; isPublic?: boolean } = {};
  if (updates.note !== undefined) {
    body.note = updates.note;
  }
  if (updates.isPublic !== undefined) {
    body.isPublic = updates.isPublic;
  }

  if (Object.keys(body).length === 0) {
    console.warn(
      "[API Client] updateCollectionDetails called with no fields to update.",
    );
  }

  const response = await backendFetch(path, {
    method: "PUT",
    headers: {},
    body: JSON.stringify(body),
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
    updatedCollection,
  );
  return updatedCollection;
}

export async function likeCollection(collectionSlug: string): Promise<void> {
  const path = `/api/collections/${collectionSlug}/like`;
  console.log(`[API Client] Liking collection via: POST ${path}`);

  const response = await backendFetch(path, {
    method: "POST",
  });

  console.log(`[API Client] POST ${path} status: ${response.status}`);

  if (response.ok || response.status === 409) {
    console.log(
      `[API Client] Like operation successful (or already liked) for ${collectionSlug}.`,
    );
    return;
  }

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

export async function unlikeCollection(collectionSlug: string): Promise<void> {
  const path = `/api/collections/${collectionSlug}/like`;
  console.log(`[API Client] Unliking collection via: DELETE ${path}`);

  const response = await backendFetch(path, {
    method: "DELETE",
  });

  console.log(`[API Client] DELETE ${path} status: ${response.status}`);

  if (response.status === 204 || response.status === 404) {
    console.log(
      `[API Client] Unlike operation successful (or like not found) for ${collectionSlug}.`,
    );
    return;
  }

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

export async function grantCollectionAccess(
  collectionSlug: string,
  targetUsername: string,
): Promise<void> {
  const path = `/api/collections/${collectionSlug}/grantAccess`;
  console.log(`[API Client] Granting access for ${targetUsername} to ${path}`);

  const response = await backendFetch(path, {
    method: "POST",
    body: JSON.stringify({ targetUsername }),
  });

  console.log(`[API Client] POST ${path} status: ${response.status}`);

  if (response.ok || response.status === 409) {
    console.log(
      `[API Client] Access grant successful (or already existed) for ${targetUsername} on ${collectionSlug}.`,
    );
    return;
  }

  let errorBody = `Failed to grant access: ${response.statusText}`;
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
