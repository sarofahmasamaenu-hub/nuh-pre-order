/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, CatalogueItem } from '../types';

/**
 * Compacts a catalogue item specifically for localStorage caching.
 * Reduces large base64 image strings so that catalogue never exhausts the 5MB quota.
 */
export function compactCatalogueForCache(items: CatalogueItem[]): CatalogueItem[] {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (!item) return item;
    let img = item.image || '';
    if (img.startsWith('data:') && img.length > 25000) {
      img = img.slice(0, 100) + '...[CACHED_ON_CLOUD]';
    }
    return {
      ...item,
      image: img
    };
  });
}

/**
 * Compacts an order object specifically for localStorage caching.
 * Reduces or omits huge base64 payloads so that 100+ orders fit within 5MB quota.
 */
export function compactOrderForCache(order: Order): Order {
  if (!order) return order;

  // Helper to trim large base64 image strings (> 15KB) for local cache only
  // (The full resolution image remains safe in Firestore and active React state)
  const trimLargeBase64 = (str?: string): string => {
    if (!str) return '';
    if (str.startsWith('data:') && str.length > 25000) {
      // Keep a lightweight placeholder flag or truncated marker for cache
      return str.slice(0, 100) + '...[CACHED_ON_CLOUD]';
    }
    return str;
  };

  return {
    ...order,
    customImage: trimLargeBase64(order.customImage),
    customImage2: trimLargeBase64(order.customImage2),
    customerPhotoFront: trimLargeBase64(order.customerPhotoFront),
    customerPhotoSide: trimLargeBase64(order.customerPhotoSide),
    customerPhotoBack: trimLargeBase64(order.customerPhotoBack),
    customerPhotoExtra1: trimLargeBase64(order.customerPhotoExtra1),
    customerPhotoExtra2: trimLargeBase64(order.customerPhotoExtra2),
    pickupSignature: trimLargeBase64(order.pickupSignature),
  };
}

/**
 * Compacts a list of orders for localStorage
 */
export function compactOrdersListForCache(orders: Order[]): Order[] {
  if (!Array.isArray(orders)) return [];
  return orders.map(compactOrderForCache);
}

/**
 * Clears all Nunuh-related localStorage caches safely without touching other apps
 */
export function clearAllNunuhCaches(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('nunuh_') || key.includes('nunuh'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  } catch (e) {
    console.warn('[SafeStorage] Error clearing nunuh caches:', e);
  }
}

/**
 * Safely writes a value to localStorage without throwing QuotaExceededError or crashing React.
 */
export function safeSetLocalStorage(key: string, value: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    let toStore = value;
    if (key === 'nunuh_catalogue' && Array.isArray(value)) {
      toStore = compactCatalogueForCache(value);
    } else if (key === 'nunuh_orders' && Array.isArray(value)) {
      toStore = compactOrdersListForCache(value);
    }
    const stringValue = typeof toStore === 'string' ? toStore : JSON.stringify(toStore);
    localStorage.setItem(key, stringValue);
    return true;
  } catch (error: any) {
    console.warn(`[SafeStorage] Quota exceeded or error setting key "${key}":`, error?.message || error);

    // If setting failed due to quota, try deep cleaning non-essential caches
    try {
      localStorage.removeItem('nunuh_last_draft_order');
      localStorage.removeItem('nunuh_reviews');
      
      if (key === 'nunuh_orders') {
        let ordersArray: Order[] = [];
        if (typeof value === 'string') {
          try { ordersArray = JSON.parse(value); } catch (e) {}
        } else if (Array.isArray(value)) {
          ordersArray = value;
        }
        if (ordersArray.length > 0) {
          const compacted = compactOrdersListForCache(ordersArray);
          localStorage.setItem('nunuh_orders', JSON.stringify(compacted));
          return true;
        }
      } else if (key === 'nunuh_catalogue') {
        let catArray: CatalogueItem[] = [];
        if (typeof value === 'string') {
          try { catArray = JSON.parse(value); } catch (e) {}
        } else if (Array.isArray(value)) {
          catArray = value;
        }
        if (catArray.length > 0) {
          const compacted = compactCatalogueForCache(catArray);
          localStorage.setItem('nunuh_catalogue', JSON.stringify(compacted));
          return true;
        }
      }
    } catch (finalError) {
      console.warn(`[SafeStorage] Could not persist key "${key}" to localStorage. Operating in-memory.`, finalError);
    }
    return false;
  }
}

/**
 * Safely gets a value from localStorage
 */
export function safeGetLocalStorage(key: string, defaultValue: string | null = null): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }
  try {
    const item = localStorage.getItem(key);
    return item !== null ? item : defaultValue;
  } catch (e) {
    console.warn(`[SafeStorage] Error getting key "${key}":`, e);
    return defaultValue;
  }
}

/**
 * Safely removes a value from localStorage
 */
export function safeRemoveLocalStorage(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[SafeStorage] Error removing key "${key}":`, e);
  }
}
