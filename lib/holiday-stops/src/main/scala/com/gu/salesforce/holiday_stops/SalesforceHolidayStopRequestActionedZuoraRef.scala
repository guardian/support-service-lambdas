package com.gu.salesforce.holiday_stops

import java.time.LocalDate

import ai.x.play.json.Jsonx
import com.gu.salesforce.SalesforceConstants._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequestId, ProductName, SubscriptionName}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json, Reads}

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

  case class HolidayStopRequestDetails(
    subscriptionName: SubscriptionName,
    chargeCode: HolidayStopRequestActionedZuoraChargeCode,
    stoppedPublicationDate: StoppedPublicationDate
  )
  implicit val reads: Reads[HolidayStopRequestDetails] = { json =>
    for {
      subscriptionName <- (json \ "Holiday_Stop_Request__r" \ "Subscription_Name__c").validate[SubscriptionName]
      chargeCode <- (json \ "Charge_Code__c").validate[HolidayStopRequestActionedZuoraChargeCode]
      stoppedPublicationDate <- (json \ "Stopped_Publication_Date__c").validate[StoppedPublicationDate]
    } yield HolidayStopRequestDetails(subscriptionName, chargeCode, stoppedPublicationDate)
  }

  private case class HolidayStopRequestActionedZuoraRefSearchQueryResponse(records: List[HolidayStopRequestDetails])
  private implicit val readsIds = Json.reads[HolidayStopRequestActionedZuoraRefSearchQueryResponse]

  object LookupByProductNamePrefixAndDateRange {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (ProductName, LocalDate, LocalDate) => ClientFailableOp[List[HolidayStopRequestDetails]] =
      sfGet.setupRequestMultiArg(toRequest _).parse[HolidayStopRequestActionedZuoraRefSearchQueryResponse].map(_.records).runRequestMultiArg

    def toRequest(productNamePrefix: ProductName, startThreshold: LocalDate, endThreshold: LocalDate): GetRequestWithParams = {
      val soqlQuery =
        s"""
          |select Holiday_Stop_Request__r.Subscription_Name__c, Charge_Code__c, Stopped_Publication_Date__c
          |from $holidayStopRequestActionedZuoraRefSfObjectRef
          |where Holiday_Stop_Request__r.Product_Name__c LIKE '${productNamePrefix.value}%'
          |and Stopped_Publication_Date__c >= ${startThreshold.toString}
          |and Stopped_Publication_Date__c <= ${endThreshold.toString}
        """.stripMargin
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }
  }
}
