export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the login page URL.
 * Previously this generated a Manus OAuth URL; now it simply returns /login.
 */
export const getLoginUrl = (_returnPath?: string) => {
  return "/login";
};
