package com.gu.salesforce

import ai.x.play.json.Jsonx
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object SalesforceGenericIdLookup {

  type TSalesforceGenericIdLookup = (SfObjectType, FieldName, LookupValue) => ClientFailableOp[ResponseWithId]

  case class SfObjectType(value: String) extends AnyVal
  implicit val formatSfObjectType = Jsonx.formatInline[SfObjectType]

  case class FieldName(value: String) extends AnyVal
  implicit val formatFieldName = Jsonx.formatInline[FieldName]

  case class LookupValue(value: String) extends AnyVal
  implicit val formatLookupValue = Jsonx.formatInline[LookupValue]

  case class ResponseWithId(Id: String) //TODO genericise so Id is a single value class
  implicit val reads = Json.reads[ResponseWithId]

  def apply(sfRequests: Requests)(
    sfObjectType: SfObjectType,
    fieldName: FieldName,
    lookupValue: LookupValue
  ): ClientFailableOp[ResponseWithId] =
    sfRequests.get[ResponseWithId](s"/services/data/v29.0/sobjects/${sfObjectType.value}/${fieldName.value}/${lookupValue.value}")

}
