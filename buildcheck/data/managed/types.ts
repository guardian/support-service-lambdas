import type { FileTemplate } from '../types';

/*

There are various committed ts files under `data/managed/..../templates/`

They have a default export, it must return the correct type.

The script src/dynamic/generate-template-list.sh generates an index of the above
files and writes it to _generated_tsIndex.ts in each folder.

In order to get compile time safety, the generated file expects the correct
type to be exported from this file as `TemplateEntry`.

 */
export type { FileTemplate as TemplateEntry };
