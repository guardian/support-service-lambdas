export const buildScalarDocsHtml = (
	openApiUrl: string,
): string => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Update supporter plus amount API docs</title>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${openApiUrl}"
      data-configuration='{"theme":"default","layout":"modern"}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
