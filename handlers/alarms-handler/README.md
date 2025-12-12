# Alarms Handler

## How to make a new alarm mapping ?

First you need to create a webhook for the channel that you want the alarms to go to. It is likely that a webhook has already been created and already put in parameter store in the membership account. For instance, if you want the alarms to go to the Value Alarms channel, then it's already set up.

The important thing is that the name of the Parameter Store key follows a strong convention. 

For instance for the Value Alarms channel, there is a team `VALUE` defined in the alarmMappings.ts file. The parameter store key must then be 

```
/PROD/support/alarms-handler/webhookUrls/VALUE
```
That key contains the webhook for the Value Alarms channel.

And then put the name of the app `consent-autolapse` in the list of apps for that team.

The PROD alarms should go to the channel you want and note that the CODE alarms will go to the SR/SRE channel.

## Landscape Diagram

![landscape diagram](./docs/landscape-diagram.png 'Landscape Diagram')

## Context Diagram

![landscape diagram](./docs/container-diagram.png 'Container Diagram')
