package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

object ZuoraDisableAutoPay {

  case class AccountUpdate(autoPay: Boolean)

  implicit val accountUpdateWrites = new Writes[AccountUpdate] {
    def writes(accountUpdate: AccountUpdate) = Json.obj(
      "autoPay" -> accountUpdate.autoPay
    )
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests)(accountId: String): ClientFailableOp[Unit] =
    requests.put(AccountUpdate(autoPay = false), s"accounts/$accountId"): ClientFailableOp[Unit]

}
