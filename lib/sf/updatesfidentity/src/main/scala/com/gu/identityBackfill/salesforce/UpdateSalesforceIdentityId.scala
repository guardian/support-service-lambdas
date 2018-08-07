package com.gu.identityBackfill.salesforce

import com.gu.salesforce.AnyVals.SFContactId
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(IdentityID__c: String)
  implicit val writes = Json.writes[WireRequest]

  case class IdentityId(value: String)

  def apply(patch: PatchRequest => ClientFailableOp[Unit]): (SFContactId, Option[IdentityId]) => ClientFailableOp[Unit] =
    Function.untupled((toRequest _).tupled.andThen(patch))

  def set(patch: PatchRequest => ClientFailableOp[Unit]): (SFContactId, IdentityId) => ClientFailableOp[Unit] =
    Function.uncurried(Function.untupled((toRequest _).tupled.andThen(patch)).curried.andThen(_.compose[IdentityId](Some.apply)))

  def toRequest(sFContactId: SFContactId, identityId: Option[IdentityId]): PatchRequest = {
    val wireRequest = WireRequest(identityId.map(_.value).getOrElse(""))
    val relativePath = RelativePath(s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    PatchRequest(wireRequest, relativePath)
  }

}
