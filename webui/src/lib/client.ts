import { Client } from "./api";
import { apiBaseURL } from "./base";
import { login, CSRF_TOKEN_KEY } from "./auth";
import { storage } from "./storage";

// Shared API client. Authentication is handled transparently: when the server
// reports no/bad auth, the client calls login(), which opens the login overlay.
export const client = new Client()
  .withOptions({ baseURL: apiBaseURL, csrfHeader: "x-mox-csrf", login })
  .withAuthToken(storage.get(CSRF_TOKEN_KEY) || "");
