#!/bin/bash

# This is a handy script to test an alarm in PROD
# Just run it with arguments value/growth/etc or all

set -e

# from alarm mappings file - SRE is not possible to test as it's only for unallocated alarms
TEAM_KEYS=("growth" "value" "portfolio" "platform" "email")
TEAM_EXAMPLE_APPS=("support-reminders" "apps-metering-events" "workers" "stripe-disputes" "alarms-handler")

if [[ $# -lt 1 ]]; then
  echo "Usage: $(basename "$0") <team_key|all>"
  echo "team_key options: ${TEAM_KEYS[*]}"
  exit 1
fi

INPUT_KEY=$1

APPS=()
if [[ "$INPUT_KEY" == "all" ]]; then
  for ((i=0; i<${#TEAM_KEYS[@]}; i++)); do
    APPS+=("${TEAM_EXAMPLE_APPS[$i]}")
  done
else
  FOUND=0
  for ((i=0; i<${#TEAM_KEYS[@]}; i++)); do
    if [[ "${TEAM_KEYS[$i]}" == "$INPUT_KEY" ]]; then
      APPS+=("${TEAM_EXAMPLE_APPS[$i]}")
      FOUND=1
      break
    fi
  done
  if [[ $FOUND -eq 0 ]]; then
    echo "Unknown team key: $INPUT_KEY"
    echo "Valid keys: ${TEAM_KEYS[*]}, or all"
    exit 1
  fi
fi

echo "Apps to process: ${APPS[*]}"
for APP_TAG_VALUE in "${APPS[@]}"; do
  echo "Finding CloudWatch alarms with tag 'App=$APP_TAG_VALUE'..."

  ALARM_ARN=$(aws resourcegroupstaggingapi get-resources \
    --profile membership \
    --tag-filters Key=App,Values="$APP_TAG_VALUE" Key=Stage,Values=PROD \
    --resource-type-filters cloudwatch:alarm \
    --query 'ResourceTagMappingList[*].ResourceARN' \
    --output text --max-items 1 | head -1)

  echo "Setting alarm state to ALARM for the following alarms:"

  ALARM_NAME=$(echo "$ALARM_ARN" | awk -F: '{print $NF}')
  echo ""
  echo "Processing alarm: $ALARM_NAME"
  echo "  arn is: $ALARM_ARN"
  echo ""

  aws cloudwatch set-alarm-state \
    --profile membership \
    --alarm-name "$ALARM_NAME" \
    --state-value ALARM \
    --state-reason "*** IGNORE: ALARM TRIGGERED FOR TESTING BY $0 (alarm) **"

  aws cloudwatch set-alarm-state \
    --profile membership \
    --alarm-name "$ALARM_NAME" \
    --state-value OK \
    --state-reason "ALARM TRIGGERED FOR TESTING BY $0 (reset)"

done

echo "Done."