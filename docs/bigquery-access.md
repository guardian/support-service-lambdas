# Reaching BigQuery from a lambda

Several lambdas in this repo query the Fivetran mirror of Zuora in BigQuery:
`discount-expiry-notifier`, `negative-invoices-processor` and
`scrub-non-tokenised-payment-methods`.

They authenticate by **workload identity federation**, not by a key file. GCP is
configured to trust the lambda's AWS IAM role directly and hands back a
short-lived token, so there is no credential to store or rotate.

## The role name is part of the contract

The **name of the IAM role is sent in the authentication request**, and GCP
rejects it past a certain length. That is why these stacks set `roleName`
explicitly with a shortened name instead of letting CDK generate one, and why
the name must not be changed casually: **renaming the role breaks the lambda's
access to BigQuery until the GCP side is updated to match.**

## Where the other half lives

The GCP side is defined in the **`gcp-iac-terraform`** repo: a workload identity
pool and provider, and a service account the AWS role is allowed to impersonate.
Both the pool/provider names and the service account name have their own length
limits there.

If a lambda suddenly cannot reach BigQuery, or a role has to be renamed, check
that repo first and speak to the **Data Technology** team, who own it.
