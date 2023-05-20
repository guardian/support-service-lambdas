# catalog-service
This lambda reads the product catalog from Zuora on a schedule and writes it into an S3 bucket.

This means that applications can use the product catalog without requiring API credentials for Zuora.

## Handling Multiple Environments 

The PROD stack fetches the catalog from both Zuora environments (CODE and PROD). 
The CODE stack fetches the catalog from Zuora CODE only, and cannot access the PROD Zuora credentials or environment.

Each stack contains a lambda per Zuora environment to simplify monitoring and prevent any instability of Zuora's sandbox from affecting the PROD service.

The PROD and CODE stacks upload files to different S3 locations so that applications (and developers running locally) always download a catalog which has been uploaded by a PROD function.
Consequently, developers can test in CODE without worrying about their changes affecting other developers or applications. 