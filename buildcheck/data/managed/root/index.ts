/*

There are various committed ts files under `data/managed/module/templates/`

They have a default export, if it's a function, it must take the correct type as
its parameter.

The script src/dynamic/generate-template-list.sh generates an index of the above
files and writes it to _generated_tsIndex.ts in this folder.

In order to get compile time safety, the generated file expects the correct
type to be exported from this file as `TemplateParams`.

*/
export type { BuildDefinition as TemplateParams } from '../../build';
