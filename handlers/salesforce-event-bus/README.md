## Salesforce Event Bus

### Description

An Eventbridge Event Bus used to relay messages from Salesforce to AWS Services. This uses [Salesforce Event Relay](https://developer.salesforce.com/docs/platform/event-relay/overview) which streams events to AWS natively without the need to build custom middleware. Event Relay leverages the Eventbridge Partner APIs to connect securely without the need to share any credentials.

This should be used for event-driven, asynchronous integrations between Salesforce and AWS.

#### Dead Letter Queue

A generic dead letter queue `dead-letters-salesforce-event-bus-queue-<STAGE>` is implemented that can be used by all rules. This is only intended to be used by the rules should they fail to relay events to the intended target(s), it is separate from dead letter queues used by any targets.

When Eventbridge sends events to this DLQ the attributes will include the error code and message, which can be used to determine the cause of the failure.

<img width="739" alt="Screenshot 2025-06-23 at 17 28 27" src="https://github.com/user-attachments/assets/0dac6e6a-8fc1-4ccc-93da-8cd505cc0103" />

An alarm is activated when there is at least one item in the DLQ.

### Implementation Steps

#### Salesforce

All pre-requisite steps are described [here](https://help.salesforce.com/s/articleView?id=platform.ev_relay_create_prereqs.htm&type=5) - the Named Credential, Event Relay and Event Channel (`AWS_Platform_Event_Bus__chn`) have already been created and activated.

To add a new type of Event:

1. [Create a new Platform Event](https://help.salesforce.com/s/articleView?id=platform.ev_relay_define_pe.htm&type=5) (if required)
   a. Implement automation to publish a Platform Event when required
2. [Add the Platform Event](https://help.salesforce.com/s/articleView?id=platform.ev_relay_create_channel_member_pe.htm&type=5) to the existing `AWS_Platform_Event_Bus__chn` Channel

#### AWS Eventbridge

Create a new Eventbridge rule to forward the event to the relevant AWS service.

The rule _must_ include filtering to ensure that only relevant events are processed. This should at least specify the `detail-type` which corresponds to the name of the Platform Event in Salesforce, but could include additional information.

### Implemented Rules

#### Contact Update to SQS

This rule entirely replaces [salesforce-message-handler](https://github.com/guardian/salesforce-message-handler/tree/main) that previously used Salesforce's legacy workflow automation with outbound messages to sync data to other systems after Contact record updates (including Zuora and Identity).

The destination queue is `salesforce-outbound-messages-<STAGE>` which is consumed by membership-workflow. It receives a Salesforce Record Id from an updated Contact, queries the Contact in Salesforce for the latest data and updates other systems.
