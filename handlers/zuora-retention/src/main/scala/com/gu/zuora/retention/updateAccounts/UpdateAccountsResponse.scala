package com.gu.zuora.retention.updateAccounts

import play.api.libs.json.Json

case class UpdateAccountsResponse(done: Boolean, skipTo: Option[Int], uri: String)

object UpdateAccountsResponse {
  implicit val writes = Json.writes[UpdateAccountsResponse]
}
