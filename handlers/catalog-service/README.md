# catalog-service
This lambda reads the product catalog from Zuora on a schedule and writes it into an S3 bucket.

This means that applications can use the product catalog without requiring API credentials for Zuora. 