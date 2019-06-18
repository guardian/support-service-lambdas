package com.gu.salesforce.holiday_stops

import java.time.LocalDate

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

  case class HolidayStopRequestActionedZuoraChargeCode(value: String) extends AnyVal
  implicit val formatHolidayStopRequestActionedZuoraChargeCode = Jsonx.formatInline[HolidayStopRequestActionedZuoraChargeCode]

  case class HolidayStopRequestActionedZuoraChargePrice(value: Double) extends AnyVal
  implicit val formatHolidayStopRequestActionedZuoraChargePrice = Jsonx.formatInline[HolidayStopRequestActionedZuoraChargePrice]

  case class StoppedPublicationDate(value: LocalDate) extends AnyVal
  implicit val formatStoppedPublicationDate = Jsonx.formatInline[StoppedPublicationDate]

  case class HolidayStopRequestActionedZuoraRef(
    Holiday_Stop_Request__c: HolidayStopRequestId,
    Charge_Code__c: HolidayStopRequestActionedZuoraChargeCode,
    Price__c: HolidayStopRequestActionedZuoraChargePrice,
    Stopped_Publication_Date__c: StoppedPublicationDate
  )
  implicit val writes = Json.writes[HolidayStopRequestActionedZuoraRef]

  object CreateHolidayStopRequestActionedZuoraRef {

    def apply(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]): HolidayStopRequestActionedZuoraRef => ClientFailableOp[JsValue] =
      sfPost.setupRequest[HolidayStopRequestActionedZuoraRef] { newActionedZuoraRef =>
        PostRequest(newActionedZuoraRef, RelativePath(sfObjectsBaseUrl + holidayStopRequestActionedZuoraRefSfObjectRef))
      }.parse[JsValue].runRequest

  }

}
