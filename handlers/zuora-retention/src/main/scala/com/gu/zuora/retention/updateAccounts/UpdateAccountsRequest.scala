package com.gu.zuora.retention.updateAccounts

import play.api.libs.json.Json

case class UpdateAccountsRequest(uri: String, skipTo: Int)

object UpdateAccountsRequest {
  implicit val reads = Json.reads[UpdateAccountsRequest]
}

