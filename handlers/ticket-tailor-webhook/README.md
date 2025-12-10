# Ticket Tailor Webhook Handler

## Overview

This Lambda receives webhook events from Ticket Tailor when order-related events occur. It creates guest identity accounts if necessary so that we can keep track of the users.

## How to Test

### Local Testing
TODO create some runManual scripts to test locally and in CODE.

### Integration Testing
To test the full integration:
1. (optional) Check the test webhook in dev Ticket Tailor
   1. pointing to https://ticket-tailor-webhook-code.support.guardianapis.com/
   1. has the correct signing secret, currently stored in /CODE/TicketTailor/Webhook-validation
1. Go to CODE Ticket Tailor https://www.tickettailor.com/events/guardianlivecode
1. sign up for an event with a new or existing email address e.g. test.user+12345@thegulocal.com
1. Check CloudWatch logs for execution details https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fticket-tailor-webhook-CODE

## External Documentation

- [Ticket Tailor Webhook Documentation](https://developers.tickettailor.com/docs/webhook/introduction)
