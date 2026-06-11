import type { SourceAdapter } from '../types';
import { aliexpress } from './aliexpress';
import { amazon } from './amazon';

// Temu intentionally excluded: no RapidAPI subscription. The adapter stays in
// ./temu.ts — re-add it here if a subscription appears.
export const adapters: SourceAdapter[] = [aliexpress, amazon];
