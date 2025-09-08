import { PUBLIC_FUNCTIONS_URL } from "$env/static/public";

import { Market } from '$lib/classes/Market';

export async function fetchMarkets(): Promise<Market[]> {
    const response = await fetch(`${PUBLIC_FUNCTIONS_URL}getMarkets`);
    if (!response.ok) {
        throw new Error('Failed to fetch markets');
    }
    return response.json();
} 

export async function serverFetch(url: string): Promise<any> {
  return fetch(`${PUBLIC_FUNCTIONS_URL}/${url}`);
}