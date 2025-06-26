# mParticle API

## Overview

This project implements an AWS Lambda function (written in TypeScript) that integrates with the [mParticle Data Subject Request (DSR) API](https://docs.mparticle.com/developers/apis/dsr-api/v3/). It is designed to help The Guardian comply with privacy regulations (such as GDPR and CCPA) by automating the submission, tracking, and processing of data subject requests (DSRs) to mParticle.

## Key Features

- **Submit Data Subject Requests (DSR):**  
  Accepts requests for access, portability, or erasure and submits them to mParticle in OpenDSR format.

- **Track DSR Status:**  
  Provides endpoints to query the status of existing DSRs by request ID.

- **Process Status Callbacks:**  
  Receives and processes status callbacks from mParticle, updating internal state and emitting events as required.

- **Event Forwarding Control:**  
  Sets user attributes in mParticle to remove users from audiences or event forwarding during the erasure waiting period.

- **Strong Input Validation:**  
  Uses [Zod](https://zod.dev/) schemas to validate all incoming requests and path parameters.

- **Test Coverage:**  
  Includes comprehensive unit tests for all endpoints and logic.

## API Endpoints

- `POST /data-subject-requests`  
  Submit a new DSR (access, portability, or erasure).

- `GET /data-subject-requests/{requestId}`  
  Query the status of a DSR by its request ID.

- `POST /data-subject-requests/{requestId}/callback`  
  Endpoint for mParticle to send status updates for a DSR.

- `POST /events`  
  Forward custom event batches to mParticle.

## Development

- **Install dependencies:**  
  Run `pnpm install` from the root of the repo.

- **Build:**  
  `pnpm --filter mparticle-api build`

- **Run locally:**  
  Use `npm run run-local -- --file=path/to/request.json` to invoke the lambda locally with a test event.

- **Unit tests:**  
  Run `pnpm --filter mparticle-api test` to execute all tests for this lambda.

- **Environment variables:**  
  The lambda expects mParticle API credentials and other secrets to be provided via AWS Secrets Manager in deployed environments, or via a `.env` file for local development.

## Testing

- Unit and integration tests are provided in the `test/` directory.
- You can mock mParticle API responses using Jest and `global.fetch` in your tests.
- Example payloads for local testing can be found in the `runs/` directory.

## Logging & Error Handling

- All errors are logged with context using the standard logging approach for this repo.
- Input validation errors return 400 responses; upstream/API errors return appropriate 4xx/5xx responses.

## Future Improvements

- Further automate downstream erasure (e.g., BigQuery integration).
- Enhance callback/event processing and auditing.
- Add more monitoring and alerting for failed DSRs and callbacks.

## References

- [mParticle DSR API Documentation](https://docs.mparticle.com/developers/apis/dsr-api/v3/)
- [support-service-lambdas Monorepo README](../../README.md)