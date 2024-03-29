# Private config is now provided to the lambdas via environment variables from secrets manager, this means
# that to run code which relies on that config locally we need to retrieve the values into local environment variables.
# This script will do that and also output a string representation which can be used to make the values available in
# Intellij test configurations

# Zuora secrets
aws secretsmanager get-secret-value --secret-id arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/Zuora/User/ZuoraApiUser | jq -c '[.SecretString | fromjson]' | \
jq -M -r '.[] | .baseUrl, .username, .password' | \
while read -r baseUrl; read -r username; read -r password; do
  export zuoraBaseUrl="$baseUrl"
  export zuoraUsername="$username"
  export zuoraPassword="$password"

  # Add this into the environment variables setting in the Intellij default run configuration to enable integration tests to access the variables
  #  https://stackoverflow.com/questions/32760584/in-intellij-how-do-i-set-default-environment-variables-for-new-test-configurati
  echo "zuoraBaseUrl=$baseUrl;zuoraUsername=$username;zuoraPassword=$password"
done

# Invoicing api
aws secretsmanager get-secret-value --secret-id arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/InvoicingApi | jq -c '[.SecretString | fromjson]' | \
jq -M -r '.[] | .InvoicingApiKey, .InvoicingApiUrl' | \
while read -r invoicingApiKey; read -r invoicingApiUrl; do
  export invoicingApiKey="$invoicingApiKey"
  export invoicingApiUrl="$invoicingApiUrl"

  # Add this into the environment variables setting in the Intellij default run configuration to enable integration tests to access the variables
  #  https://stackoverflow.com/questions/32760584/in-intellij-how-do-i-set-default-environment-variables-for-new-test-configurati
  echo "invoicingApiUrl=$invoicingApiUrl;invoicingApiKey=$invoicingApiKey"
done

# Salesforce
aws secretsmanager get-secret-value --secret-id arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/Salesforce/User/SupportServiceLambdas | jq -c '[.SecretString | fromjson]' | \
jq -M -r '.[] | .url, .client_id, .client_secret, .username, .password, .token' | \
while read -r url; read -r client_id; read -r client_secret; read -r username; read -r password; read -r token; do
  export salesforceUrl="$url"
  export salesforceClientId="$client_id"
  export salesforceClientSecret="$client_secret"
  export salesforceUsername="$username"
  export salesforcePassword="$password"
  export salesforceToken="$token"

  # Add this into the environment variables setting in the Intellij default run configuration to enable integration tests to access the variables
  #  https://stackoverflow.com/questions/32760584/in-intellij-how-do-i-set-default-environment-variables-for-new-test-configurati
  echo "salesforceUrl=$url;salesforceClientId=$client_id;salesforceClientSecret=$client_secret;salesforceUsername=$username;salesforcePassword=$password;salesforceToken=$token"
done