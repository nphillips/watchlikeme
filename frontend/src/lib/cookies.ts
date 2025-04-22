/**
 * Gets a cookie value by name
 * @param name The name of the cookie
 * @returns The cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

/**
 * Checks if a cookie exists
 * @param name The name of the cookie
 * @returns true if the cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

/**
 * Removes a cookie
 * @param name The name of the cookie
 * @param path The path of the cookie
 */
export function removeCookie(name: string, path = "/") {
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0`;
}
