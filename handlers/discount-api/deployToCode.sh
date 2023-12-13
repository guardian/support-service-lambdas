pnpm package

s3Bucket="membership-dist"
s3Path="support/CODE/discount-api/discount-api.zip"

aws s3 cp ./target/discount-api.zip s3://$s3Bucket/$s3Path --profile membership --region eu-west-1
aws lambda update-function-code --function-name discount-api-CODE --s3-bucket $s3Bucket --s3-key $s3Path --profile membership --region eu-west-1