package com.gu.zuora.retention.updateAccounts

import com.gu.util.Logging
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object SetDoNotProcess extends Logging {

  case class UpdateRequestBody(ProcessingAdvice__c: String = "DoNotProcess")

  object UpdateRequestBody {
    implicit val updateRequestBodyWrites = Json.writes[UpdateRequestBody]
  }

  def apply(put: (UpdateRequestBody, String) => ClientFailableOp[Unit])(accountId: AccountId) = {
    logger.info(s"updating account $accountId with DoNotProcess")
    put(UpdateRequestBody(), s"accounts/${accountId.value}")
  }

}
