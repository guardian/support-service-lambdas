package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.validation.GetContacts.{AccountId, IdentityId}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsSuccess, Json, Reads}

object SetOrClearZuoraIdentityId {

  case class WireRequest(IdentityId__c: String)
  implicit val writes = Json.writes[WireRequest]

  def reqFromIdentityId(id: Option[IdentityId]): WireRequest = {
    WireRequest(id.map(_.value).getOrElse(""))
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests)(setOrClearIdentityId: Option[IdentityId])(accountId: AccountId): ClientFailableOp[Unit] =
    requests.put[WireRequest, Unit](reqFromIdentityId(setOrClearIdentityId), s"accounts/${accountId.value}")

}
