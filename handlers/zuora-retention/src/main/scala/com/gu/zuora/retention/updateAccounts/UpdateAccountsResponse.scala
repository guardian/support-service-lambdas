package com.gu.zuora.retention.updateAccounts

import play.api.libs.json.Json

case class UpdateAccountsResponse(done: Boolean, nextIndex: Option[Int], uri: String)

object UpdateAccountsResponse {
  implicit val writes = Json.writes[UpdateAccountsResponse]
}
