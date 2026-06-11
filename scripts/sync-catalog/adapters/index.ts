import type { SourceAdapter } from '../types';
import { aliexpress } from './aliexpress';
import { amazon } from './amazon';
import { temu } from './temu';

export const adapters: SourceAdapter[] = [aliexpress, amazon, temu];
