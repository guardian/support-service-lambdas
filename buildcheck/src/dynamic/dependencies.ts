import { getPnpmCatalog } from '../util/dependencyMapper';
import { rawCatalogList } from './generated/generatedDepsList';

/**
 * catalog is populated from the pnpm workspace catalog when you run `pnpm generate`
 */
export const pnpmCatalog = getPnpmCatalog(rawCatalogList);
