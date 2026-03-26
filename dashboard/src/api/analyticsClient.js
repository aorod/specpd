const ORG = "vector-brasil";
const PROJECT = "Roadmap%202025";
const VIEW_ID = "12f1d99e-3e2e-4807-a4e5-48102a5aa7b0";
const TOKEN = import.meta.env.VITE_ADO_TOKEN;

const BASE_URL = `https://analytics.dev.azure.com/${ORG}/${PROJECT}/_odata/v4.0`;

const encodedToken = btoa(`:${TOKEN}`);

const headers = {
  Authorization: `Basic ${encodedToken}`,
  "Content-Type": "application/json",
};

export async function fetchAnalytics(endpoint = "") {
  const url = endpoint
    ? `${BASE_URL}/${endpoint}`
    : `${BASE_URL}/WorkItems?$apply=filter(AnalyticsViewId eq '${VIEW_ID}')`;

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const data = await response.json();
  return data.value;
}