# mParticle API

## Background
This project provides a TypeScript AWS Lambda for integrating with the [mParticle Data Subject Request (DSR) API](https://docs.mparticle.com/developers/apis/dsr-api/v3/). It enables the submission and tracking of data subject requests (such as access or erasure requests) in compliance with privacy regulations.

The lambda is designed to be robust, maintainable, and easy to contribute to, following the conventions used across the support-service-lambdas monorepo.

## Features

- Submit Data Subject Requests (DSR) to mParticle in OpenDSR format.
- Query the status of existing DSRs.
- (Planned) Receive and process status callbacks from mParticle.
- Written in TypeScript for maintainability and ease of contribution.

## Development

This project uses TypeScript. See the [root README](../../README.md#getting-started---typescript) for more information on TypeScript conventions in this repo.

To work with this project:

- Ensure [pnpm](https://pnpm.io/) is installed.
- Run `pnpm install` from the root of the repo to install dependencies.
- Run the unit tests with `pnpm test` (all tests in the monorepo) or `pnpm --filter mparticle-api test` (just the tests in this project).

## Testing

Integration with the mParticle API can be tested by invoking the lambda with appropriate payloads. Ensure you have valid credentials and configuration for the mParticle API.

## Future Improvements

- Implement an endpoint to receive and process status callbacks from mParticle.
- Integrate with downstream systems (e.g., BigQuery erasure app) as required by privacy workflows.