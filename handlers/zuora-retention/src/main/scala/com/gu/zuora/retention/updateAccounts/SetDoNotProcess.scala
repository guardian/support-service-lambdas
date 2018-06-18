package com.gu.zuora.retention.updateAccounts

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.{JsSuccess, Json, Reads}

object SetDoNotProcess {

  case class UpdateRequestBody(ProcessingAdvice__c: String = "DoNotProcess")

  implicit val updateRequestBodyWrites = Json.writes[UpdateRequestBody]
  implicit val unitReads: Reads[Unit] = Reads(_ => JsSuccess(()))

  def apply(zuoraRequests: Requests)(accountId: String) = {
    println(s"updating account $accountId with DoNotProcess")
    zuoraRequests.put(UpdateRequestBody(), s"accounts/${accountId}")
  }

}

