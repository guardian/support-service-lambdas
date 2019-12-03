package com.gu.salesforce

// the WireResponse model is the same as the domain model, so keep a friendly name
case class SalesforceAuth(access_token: String, instance_url: String)
