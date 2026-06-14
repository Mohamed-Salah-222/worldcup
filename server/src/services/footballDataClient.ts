import axios from "axios";

const client = axios.create({
  baseURL: "https://api.football-data.org/v4",
  headers: {
    "X-Unfold-Goals": "true",
    "X-Unfold-Lineups": "true",
  },
  validateStatus: () => true,
});

client.interceptors.request.use((config) => {
  const token = process.env.FOOTBALL_DATA_TOKEN;

  if (token) {
    config.headers.set("X-Auth-Token", token);
  }

  return config;
});

client.interceptors.response.use((response) => {
  const available = response.headers["x-requests-available"] ?? "unknown";
  const reset = response.headers["x-requestcounter-reset"] ?? "unknown";
  const url = response.config.url ?? "";

  console.log(
    `[football-data] GET ${url} -> ${response.status}, requests-available: ${available}, reset: ${reset}s`,
  );

  return response;
});

export async function fetchAllWorldCupMatches(): Promise<any> {
  const response = await client.get("/competitions/WC/matches");

  if (response.status === 429) {
    throw new Error("Rate limited by football-data.org; try again in a minute.");
  }

  if (response.status === 403) {
    throw new Error("Football-data.org token invalid or WC not in your plan.");
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Football-data.org request failed with status ${response.status}.`);
  }

  return response.data;
}
