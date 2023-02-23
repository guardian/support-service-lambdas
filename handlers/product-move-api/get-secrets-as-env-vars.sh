# Zuora secrets
aws secretsmanager get-secret-value --secret-id arn:aws:secretsmanager:eu-west-1:865473395570:secret:DEV/Zuora/User/ZuoraApiUser-kxm7mq | jq -c '[.SecretString | fromjson]' | \
jq -M -r '.[] | .baseUrl, .username, .password' | \
while read -r baseUrl; read -r username; read -r password; do
  echo "baseUrl = $baseUrl"
  export zuoraBaseUrl="$baseUrl"
  export zuoraUsername="$username"
  export zuoraPassword="$password"
done