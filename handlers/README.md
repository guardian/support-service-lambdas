# handlers

Handlers are the projects that actually produce a lambda jar that can be deployed separately.

They can depend on the lib/effects project and are basically wiring together all the dependencies.


### 3rd Party Service Environments
Many of these lambdas connect to 3rd party services such as Zuora, Salesforce etc. **There is a one-to-one relationship between AWS Stack/Stage and 3rd party environment** (see the config in the `gu-reader-revenue-private` S3 bucket).

| AWS Stack | Salesforce Environment | Zuora Environment |
| --- |------------------------|-------------------|
| CODE | CODE                   | CODE              |
| PROD | PROD                   | PROD              |

This is simpler than other backends in reader revenue (where the backend understands [`test-user`](https://github.com/guardian/support-frontend/wiki/Test-users) and routes to the correct 3rd party service accordingly). In this repo we delegate to the consumer which instance of the lambda call, take `manage-frontend` for example...

  | Stage of `manage-frontend` | normal mode                     | test user mode                 |
  |---------------------------------|--------------------------------| --- |
  | DEV (local machine) | CODE Lambda*<br>(CODE SF/Zuora) | CODE Lambda<br>(CODE SF/Zuora) |
  | CODE | CODE Lambda*<br>(CODE SF/Zuora) | CODE Lambda<br>(CODE SF/Zuora) |
  | PROD | PROD Lambda<br>(PROD SF/Zuora)  | CODE Lambda<br>(CODE SF/Zuora) |

**See [manage-frontend/wiki/Proxying-API-Gateway-Lambdas](https://github.com/guardian/manage-frontend/wiki/Proxying-API-Gateway-Lambdas) for more information.**

