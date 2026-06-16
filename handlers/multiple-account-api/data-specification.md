# Overview

This document describes the technical implementation of the new ‘multiple accounts’ feature we are aiming to build as a benefit of the Digital Plus product. This feature allows the purchaser of a Digital Plus subscription to share the digital benefits of that subscription (app access, ad-free etc.) with up to three other Guardian users.

This document describes how we are going to provide those digital benefits.

# Terminology

We have two distinct types of users:

- Primary \- the person who takes out a digital plus subscription  
- Secondary \- a friend or family member who is granted digital access by the primary user

And two related types of subscriptions: 

- Primary subscription \- the subscription held by the Primary user, this is represented both in Zuora and in the SupporterProductData Dynamo table  
- Secondary subscription \- the subscription held by the secondary user, this exists only in the SupporterProductData Dynamo table

# Assumptions

- Digital benefits will be granted via the user-benefits API, we will not back port this functionality to the members data API  
- Live app should have migrated away from using members data api to user benefits api  
- Editions app to have migrated as well  
- While the primary user will have a standard subscription in Zuora, the secondary user will not \- we will insert items into the `SupporterProductData` Dynamo DB table which powers the user-benefits API to represent these secondary users  
- We will create a new Dynamo DB table to store details of secondary users created by the primary user  
- A secondary users identity account is created (if one doesn’t already exist) at the point of primary users inputting their email and sending the initial invite email   
- Reminder emails are not for Phase 1 (system triggers \- we should be able to instead do Braze comms based on segments / time driven ) \- need confirmation this is ok   
  - **Can the  data points be created with the CRM team use to automate the email sent**   
- Old app version \- We force upgrade users rather than building these changes to be backward supported   
  - comms out to users to upgrade to new version of the Live app   
  - **Make CX / TP aware** 

# Entity Relationship Diagram

Source of this diagram: [Miro](https://miro.com/app/board/uXjVG0f3zdk=/)  
![][image1]

# Dynamo Table Specs

In the tables below **PK** means Partition Key, **SK** means Sort Key and **GSI** means Global Secondary Index. See [the Dynamo documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey) for more information

## Invitation Table (New)

| Field Name | DynamoDB Type | Description |
| ----- | ----- | ----- |
| subscriptionName | S | PK \- The Zuora subscription number of the Digital Plus subscription |
| invitationCode | S | SK, GSI \- Unique id to send in email url link (use something human friendly from eg. nanoid, not a UUID) |
| primaryIdentityId | S | The identity id of the primary user |
| secondaryIdentityId | S | Email address of the secondary user |
| invitedDate | S | Date when the invitation was sent |
| expiryDate | N | Unix timestamp, serves as a Dynamo TTL |

## Secondary User Table (New)

| Field Name | DynamoDB Type | Description |
| ----- | ----- | ----- |
| subscriptionName | S | PK \- The Zuora subscription number of the Digital Plus subscription |
| secondaryIdentityId | S | SK, GSI |
| primaryIdentityId | S | The identity id of the primary user |
| acceptedDate | S | Date when the invitation was accepted |
| ~~expiryDate~~ | ~~N~~ | ~~Unix timestamp, serves as a Dynamo TTL~~ |

## SupporterProductData Table (Existing)

| Field Name | DynamoDB Type | Notes |
| ----- | ----- | ----- |
| identityId | S | PK \- Identity id of the supporter |
| subscriptionName | S | SK \- Subscription ID |
| contractEffectiveDate | S | ISO format |
| expiryDate | N | Unix timestamp, serves as a Dynamo TTL |
| productRatePlanId | S | Zuora product rate plan identifier |
| productRatePlanName | S | Human-readable name of the subscription plan |
| termEndDate | S | ISO format |
| primarySubscriptionName | S | \[NEW\] GSI \- Set for secondary subscriptions only |

# User Management Scenarios

## Primary user adds new invitation

- A check is carried out on the secondaryUserEmail to see if an identity account already exists:   
  - if there is an existing account we retrieve the identityId  
  - if not then a guest user is created  
- Record is added to the Invitation table. Fields which are set are:  
- subscriptionName \- the Zuora subscription name held by the primary user  
- invitationCode \- generated on creation  
- secondaryIdentityId \- retrieved in the step above  
- primaryIdentityId \- the currently logged in user  
- InvitedDate \- now  
- expiryDate \- now \+ 1 month (after this point the invitation has expired and is deleted)

Authentication for this endpoint is handled by MMA & withMMAIdentityCheck in support-service-lambdas

## Secondary user accepts invitation via email

- Invitation record is found by the invitationCode  
- Record is added to the Secondary Users table. Fields which are set are:  
  - subscriptionName \- name of the primary subscription, taken from the invitation record  
  - secondaryIdentityId \- identity id of the signed in (secondary) user   
  - primaryIdentityId \- identity id of the primary user, taken from the invitation record  
  - acceptedDate \- now  
  - ~~expiryDate~~  
- Secondary subscription record is added to the SupporterProductData table. Fields which are set are:  
  - identityId \- identity id of the secondary user  
  - subscriptionName \- constructed from `{primarySubscriptionName}-{identityId}`  
  - primarySubscriptionName \- The Zuora subscription number of the primary subscription (taken from invite record)  
  - productRatePlanId \- Product rate plan ID from the primary subscription  
  - productRatePlanName \- Digital Plus secondary user  
  - contractEffectiveDate \- now  
  - same termEndDate as the primary subscription (+ 1 week so they aren’t deleted in case of system issues?)  
  - expiryDate \- This is set automatically by the ProcessSupporterRatePlanItemLambda to termEndDate \+ 1 day  
- Invitation record is deleted


Authentication for this endpoint is handled via an Okta token and the IdentityApiGatewayAuthenticator class in support-service-lamdas

## Secondary user declines invitation

- Invitation record is found by the invitationCode  
- Invitation record is deleted

## Invitation expires

- Dynamo will automatically delete the record based on the TTL

## Primary user cancels invitation

- Invitation record is found by the invitationCode  
- Invitation record is deleted

## Primary user removes secondary user

- Secondary user table record is found by the subscriptionName and secondaryUserId  
- Secondary user table record is deleted  
- SupporterProductData table secondary subscription record found using secondaryUserId and subscriptionName synthesised out of the subscriptionName and secondaryUserId (see user accepts invite scenario)  
- SupporterProductData table secondary subscription record is deleted

## Primary user’s subscription reaches end of term and renews

- Primary record in SupporterProductData will be updated by the supporter-product-data step function (TTL & term end date)  
- The supporter-product-data step function will find any secondary subscription records of the updated primary record by querying the primarySubscriptionName field   
- All secondary records will have their TTL & term end date set to the same values as the primary record (+ 1 week to cover for glitches)

## Primary user cancels subscription

Cancellations in the SupporterProductData store are handled in exactly the same way as renewals \- the Zuora extract contains an update row for the cancelled subscription, but in this case it has a term end date which is the cancellation date. This is then used to update the term end date and TTL of the existing record and the record will be automatically deleted shortly after the TTL expires. 

So for secondary records the steps are:

- Primary record in SupporterProductData will be updated by the supporter-product-data step function (TTL & term end date)  
- The supporter-product-data step function will find any secondary records of the updated primary record and update their TTL & term end date  
- Dynamo will delete both the primary and secondary records shortly after their TTLs expires

# In-Life Scenarios

## Secondary user visits the website whilst signed in \- they should not see adverts

- Website queries user-benefits API with the user’s identity id  
- User-benefits API queries SupporterProductData with the identity id and finds the secondary record which is a Digital Plus subscription  
- User-benefits API returns a response indicating that the user has Digital Plus benefits

## Primary user can see a full list of invites and secondary users

This will probably be wrapped up in an API for use by MMA

- Invitation records are found using the subscriptionName field and the primary users active subscription number in MMA  
- Secondary user records are found using the subscriptionName field and primary users active subscription number in MMA  
- The lists are returned to MMA

## Secondary user visits MMA \- they should see their subscription

The SupporterProductData table can be queried by identityId to return secondary subscriptions alongside regular subscriptions.   
How this is made available to MMA and how we distinguish between the different subscription types will need to be worked out.

# Integration with Salesforce

There are a number of customer service scenarios which will require integration work in Salesforce:

## Primary user calls CSR 

**CSR should be able to:**  
Phase 1

- See list of invites associated with a subscription  
- See list of secondary users associated with a subscription

Phase 2

- Cancel an invite  
- Remove a secondary user  
- Send an new invite

## Secondary user calls CSR

**CSR should be able to:** 

- see that the user has a secondary subscription

## Implementation method

This will work in the same way that IAPs are surfaced in Salesforce currently \-  no IAP data is  stored in Salesforce, but we use mobile-purchases-api to find them on-demand when a customer has a customer service query. Similarly for multiple accounts information we will get it on demand when a customer appears in Salesforce due a customer service query.

In practice, that would mean some new API endpoint that we can call to retrieve multiple accounts data based on Identity ID. The endpoints could probably just include:

Find all invites sent by an Identity ID (e.g. search for all invites sent by me)  
View invites sent to an Identity ID (e.g. search for invites sent to me)

Note: Salesforce will not have an Okta token so authentication will need to be managed another way

# Backend processes

- We will need the full set of invitations to be synchronised to BigQuery for onward modelling and ingestion into mParticle.

# Outstanding Questions

- If the primary user’s subscription expires what do we want to show in MMA (to primary and secondary user)?   
  - Data privacy and UX input needed   
- What are the consent requirements?  
  - Data privacy input needed   
- How do we handle subject access requests for the secondary user information?  
  - Isn’t it same as what we do for an Identity account ?  
  - We will need to update the new DB requirement to the current SAR and deletion requests  
- How do we make this information available through mParticle?  
  - Bigquery into mParticle (backend process above should be able to cover this ?) \- Data engineering team [Alex Amoui](mailto:alexander.amoui@guardian.co.uk)  
- How does this interact with the Identity keep alive system?   
  - If a user rejected by secondary or removed by the primary user , we have no basis to hold their data \- we should be cleaning the data soon   
  - Invited and accepted, but not consume data \- wouldn’t we follow the same rule as what is done for other similar scenarios \- Is a deviation needed ? **Check with Identity and stakeholders** 

**Need confirmation**

- Secondary user rejects invitation \- what do we show on MMA for the Primary user ( need to understand the UX / UI stance on this ) \- Needed to understand for devs to implement   
- 


# [Breakdown of work](https://app.asana.com/1/1210045093164357/project/1213124578809504/board/1213135754058558) 

- Build the databases \- portfolio  
- Build an API fulfil all the scenarios specified above \- portfolio  
- User benefits api changes \- to understand the secondary user \- Portfolio  
- All the frontend ( **dependent** on UX/ UI designs being ready )- portfolio / lifecycle   
  Support frontend ( landing page / checkout / thankyou page) \- primary user 

  Onboarding flow \- Secondary   
  Onboarding flow \- primary   
  MMA \- secondary   
  MMA \- primary  
- CSR facing UI change \- primary / secondary user details \- platform   
- Emails   
  - Acquisition / Invite email in braze \- triggered emails ( campaigns / canvas created ) \- Portfolio / stakeholder  
  - Cancellation email \- Lifecycle ?  
- Identity team   
  - Do we need any specific changes   
  - **Need the designs** so they can see the changes and advise   
- Data analytics engineering teams work   
  - Tracking changes what are needed   
  - Bigquery changes (ensuring the new database data is captured and sent to mParticle)  
-  App \- No extra changes needed (all apps to work as expected if using user benefits api)  
  - What do we do about users that are on old app version ?   
    - We force upgrade \- comms out to users to upgrade to new version 

    

    

# References

[Design Explorations Figma](https://www.figma.com/design/PO6qmKhqrvdqp8m6tsFrVx/Multiple-account?node-id=233-14786&p=f&t=tAM88O5dzXsfzcuA-0)   
[Supporter Revenue - Multiple Accounts feature for 2026 - Kick off](https://docs.google.com/presentation/d/16RtFa8Cd8esU-ndir4SMgnU453Q_tvm2y-tNMl0vB20/edit?slide=id.g3b86f90ef05_3_0#slide=id.g3b86f90ef05_3_0)  
[SR Multiple Accounts Initiative](https://docs.google.com/document/d/1vxUOIgcV3vSX1LubcpSSz6iri7UNaH_bxWIeYvLDsSg/edit?tab=t.0#heading=h.ask7426i7ms0)  
[Family & Friends Access - Strawperson Invitation, acceptance and fulfilment process flow - 4 December 2025](https://docs.google.com/drawings/d/19Dhx7784mf9YrqYweO9TQOJ4tyKSrY9oyMAYkPByD0s/edit)  
[Competitor UX analysis](https://www.figma.com/design/PO6qmKhqrvdqp8m6tsFrVx/Multiple-account?node-id=2-47&p=f&t=z75V24kpsUmlfVTM-0)  
[Supporter Product Data](https://docs.google.com/presentation/d/1WNN-JRgHiE7Hap_zPs81UmUal2Jl7ssjCFGv5xgR2XE/edit?slide=id.p#slide=id.p) \- Architecture overview

[image1]: <data:image/png;base64,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>