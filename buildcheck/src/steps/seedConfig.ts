import type { SeedGenerator } from '../../data/types';
import type { Template } from '../dynamic/templater';

export type SeedConfig<T> = SeedGenerator<T> & {
	templates: Array<Template<T>>;
};

