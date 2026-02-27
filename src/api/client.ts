import createClient from "openapi-fetch";

import { apiBaseUrl, getApiToken } from "../config/env";
import type { paths } from "./generated/schema";

export const apiClient = createClient<paths>({
  baseUrl: apiBaseUrl,
});

apiClient.use({
  async onRequest({ request }) {
    const token = getApiToken();

    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }

    if (!request.headers.has("Accept")) {
      request.headers.set("Accept", "application/json");
    }

    return request;
  },
});
