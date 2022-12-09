package com.gu.salesforce

import ai.x.play.json.Jsonx
import com.gu.salesforce.SalesforceConstants._
import com.gu.util.resthttp.HttpOp._
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}

object SalesforceGenericIdLookup {

  type TSalesforceGenericIdLookup = (SfObjectType, FieldName, LookupValue) => ClientFailableOp[ResponseWithId]

  case class SfObjectType(value: String) extends AnyVal
  implicit val formatSfObjectType = Jsonx.formatInline[SfObjectType]

  case class FieldName(value: String) extends AnyVal
  implicit val formatFieldName = Jsonx.formatInline[FieldName]

  case class LookupValue(value: String) extends AnyVal
  implicit val formatLookupValue = Jsonx.formatInline[LookupValue]

  case class ResponseWithId(Id: String)
  implicit val reads = Json.reads[ResponseWithId]

  def apply(
      get: HttpOp[RestRequestMaker.GetRequest, JsValue],
  ): (SfObjectType, FieldName, LookupValue) => ClientFailableOp[ResponseWithId] =
    get.setupRequestMultiArg(toRequest _).parse[ResponseWithId].runRequestMultiArg

  def toRequest(
      sfObjectType: SfObjectType,
      fieldName: FieldName,
      lookupValue: LookupValue,
  ): GetRequest =
    RestRequestMaker.GetRequest(
      RelativePath(s"${sfObjectsBaseUrl}${sfObjectType.value}/${fieldName.value}/${lookupValue.value}"),
    )

}
