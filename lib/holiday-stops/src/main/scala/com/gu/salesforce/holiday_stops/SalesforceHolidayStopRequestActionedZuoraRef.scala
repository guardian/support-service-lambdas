package com.gu.salesforce.holiday_stops

import ai.x.play.json.Jsonx
import com.gu.salesforce.SalesforceConstants._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequestId
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}

object SalesforceHolidayStopRequestActionedZuoraRef extends Logging {

  private val holidayStopRequestActionedZuoraRefSfObjectRef = "Holiday_Stop_Request_Actioned_Zuora_Ref__c"

  case class HolidayStopRequestActionedZuoraAmendmentCode(value: String) extends AnyVal
  implicit val formatHolidayStopRequestActionedZuoraAmendmentCode = Jsonx.formatInline[HolidayStopRequestActionedZuoraAmendmentCode]

  case class HolidayStopRequestActionedZuoraAmendmentPrice(value: Double) extends AnyVal
  implicit val formatHolidayStopRequestActionedZuoraAmendmentPrice = Jsonx.formatInline[HolidayStopRequestActionedZuoraAmendmentPrice]

  case class HolidayStopRequestActionedZuoraRef(
    Holiday_Stop_Request__c: HolidayStopRequestId,
    Amendment_Code__c: HolidayStopRequestActionedZuoraAmendmentCode,
    Price__c: HolidayStopRequestActionedZuoraAmendmentPrice
  )
  implicit val writes = Json.writes[HolidayStopRequestActionedZuoraRef]

  object CreateHolidayStopRequestActionedZuoraRef {

    def apply(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]): HolidayStopRequestActionedZuoraRef => ClientFailableOp[JsValue] =
      sfPost.setupRequest[HolidayStopRequestActionedZuoraRef] { newActionedZuoraRef =>
        PostRequest(newActionedZuoraRef, RelativePath(sfObjectsBaseUrl + holidayStopRequestActionedZuoraRefSfObjectRef))
      }.parse[JsValue].runRequest

  }

}
