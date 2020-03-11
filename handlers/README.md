# handlers

Handlers are the projects that actually produce a lambda jar that can be deployed separately.

They can depend on the lib/effects project and are basically wiring together all the dependencies.


### 3rd Party Service Environments
Many of these lambdas connect to 3rd party services such as Zuora, Salesforce etc. **There is a one-to-one relationship between AWS Stack/Stage and 3rd party environment** (see the config in the `gu-reader-revenue-private` S3 bucket).

| AWS Stack | Salesforce Environment | Zuora Environment |
| --- | --- | --- |
| DEV | DEV | DEV |
| CODE | UAT | UAT |
| PROD | PROD | PROD |

This is simpler than other backends in reader revenue (where the backend understands [`test-user`](https://github.com/guardian/support-frontend/wiki/Test-users) and routes to the correct 3rd party service accordingly). In this repo we delegate to the consumer which instance of the lambda call, take `manage-frontend` for example...

  | Stage of `manage-frontend` | normal mode | test user mode |
  | --- | --- | --- |
  | DEV (local machine) | DEV Lambda*<br>(DEV SF/Zuora) | CODE Lambda<br>(UAT SF/Zuora) |
  | CODE | DEV Lambda*<br>(DEV SF/Zuora) | CODE Lambda<br>(UAT SF/Zuora) |
  | PROD | PROD Lambda<br>(DEV SF/Zuora) | CODE Lambda<br>(UAT SF/Zuora) |

  \* Yes indeed there is a DEV Stack for some of these handlers, which is available in riff-raff as of [guardian/prism/pull/75](https://github.com/guardian/prism/pull/75)
  
**See [manage-frontend/wiki/Proxying-API-Gateway-Lambdas](https://github.com/guardian/manage-frontend/wiki/Proxying-API-Gateway-Lambdas) for more information.**

