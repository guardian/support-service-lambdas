---
# This template creates an Open API specification for the new lambda if the user has requested one

to: <% if (includeOpenApiDoc == 'Y') { %>handlers/<%=lambdaName%>/openapi.yaml<% } %>
sh: <% if (includeOpenApiDoc == 'Y') { %>git add handlers/<%=lambdaName%>/openapi.yaml<% } %>
---
openapi: 3.0.3
info:
  title: <%=lambdaName%> API
  description: A test API.
  version: 1.0.0

servers:
  - url: https://<%=lambdaName%>-code.support.guardianapis.com
    description: CODE
  - url: https://<%=lambdaName%>.support.guardianapis.com
    description: PROD

security:
  - apiKey: []

paths:
  /hello:
    post:
      operationId: hello
      summary: Hello endpoint
      description: A simple endpoint that returns a greeting.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/HelloRequest'
            example:
              name: World
      responses:
        '200':
          description: Successful greeting response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HelloResponse'
              example:
                message: Hello World!
        '400':
          description: Invalid request body
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                message: Invalid request body
        '500':
          description: Unexpected server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                message: Internal server error

components:
  securitySchemes:
    apiKey:
      type: apiKey
      in: header
      name: x-api-key
      description: API key for authenticating requests.

  schemas:
    HelloRequest:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          description: The name to greet
          example: World

    HelloResponse:
      type: object
      required:
        - message
      properties:
        message:
          type: string
          description: The greeting message
          example: Hello World!

    ErrorResponse:
      type: object
      required:
        - message
      properties:
        message:
          type: string
          description: Human-readable error message

