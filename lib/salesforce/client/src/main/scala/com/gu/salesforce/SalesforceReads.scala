package com.gu.salesforce

import play.api.libs.json.{Json, Reads}

object SalesforceReads {
  implicit val sfAuthConfigReads: Reads[SFAuthConfig] = Json.reads[SFAuthConfig]
  implicit val salesForceAuthReads: Reads[SalesforceAuth] = Json.reads[SalesforceAuth]
}
