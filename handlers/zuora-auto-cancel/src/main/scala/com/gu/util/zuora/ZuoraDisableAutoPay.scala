package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

object ZuoraDisableAutoPay extends LazyLogging {

  case class AccountUpdate(autoPay: Boolean)

  implicit val accountUpdateWrites = new Writes[AccountUpdate] {
    def writes(accountUpdate: AccountUpdate) = Json.obj(
      "autoPay" -> accountUpdate.autoPay,
    )
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  private def toBodyAndPath(accountId: String) =
    (AccountUpdate(autoPay = false), s"accounts/$accountId")

  def apply(requests: Requests)(accountId: String): ClientFailableOp[Unit] = {
    val (body, path) = toBodyAndPath(accountId)
    requests.put(body, path): ClientFailableOp[Unit]
  }

  def dryRun(requests: Requests)(accountId: String): ClientFailableOp[Unit] = {
    val (body, path) = toBodyAndPath(accountId)
    requests.put(AccountUpdate(autoPay = false), s"accounts/$accountId"): ClientFailableOp[Unit]
    val msg = s"DryRun for ZuoraDisableAutoPay: body=$body, path=$path"
    logger.info(msg)
    ClientSuccess(())
  }

}
