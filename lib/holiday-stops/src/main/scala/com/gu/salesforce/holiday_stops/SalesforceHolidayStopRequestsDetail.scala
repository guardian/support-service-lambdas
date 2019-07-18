package com.gu.salesforce.holiday_stops

import java.time.LocalDate

import ai.x.play.json.Jsonx
import com.gu.salesforce.SalesforceConstants._
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}

object SalesforceHolidayStopRequestsDetail extends Logging {

  private val holidayStopRequestsDetailSfObjectRef = "Holiday_Stop_Requests_Detail__c"

  case class HolidayStopRequestsDetailId(value: String) extends AnyVal
  implicit val formatHolidayStopRequestsDetailId = Jsonx.formatInline[HolidayStopRequestsDetailId]

  case class HolidayStopRequestId(value: String) extends AnyVal
  implicit val formatHolidayStopRequestId = Jsonx.formatInline[HolidayStopRequestId]

  case class SubscriptionName(value: String) extends AnyVal
  implicit val formatSubscriptionName = Jsonx.formatInline[SubscriptionName]

  case class ProductName(value: String) extends AnyVal
  implicit val formatProductName = Jsonx.formatInline[ProductName]

  case class HolidayStopRequestsDetailChargeCode(value: String) extends AnyVal
  implicit val formatHolidayStopRequestsDetailChargeCode = Jsonx.formatInline[HolidayStopRequestsDetailChargeCode]

  case class HolidayStopRequestsDetailChargePrice(value: Double) extends AnyVal
  implicit val formatHolidayStopRequestsDetailChargePrice = Jsonx.formatInline[HolidayStopRequestsDetailChargePrice]

  case class StoppedPublicationDate(value: LocalDate) extends AnyVal
  implicit val formatStoppedPublicationDate = Jsonx.formatInline[StoppedPublicationDate]

  case class HolidayStopRequestsDetailPending(
    Holiday_Stop_Request__c: HolidayStopRequestId,
    Stopped_Publication_Date__c: StoppedPublicationDate,
    Estimated_Price__c: Option[HolidayStopRequestsDetailChargePrice] = None
  )
  implicit val writesPending = Json.writes[HolidayStopRequestsDetailPending]

  object CreatePendingSalesforceHolidayStopRequestsDetail {

    def apply(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]): HolidayStopRequestsDetailPending => ClientFailableOp[JsValue] =
      sfPost.setupRequest[HolidayStopRequestsDetailPending] { newDetail =>
        PostRequest(newDetail, RelativePath(sfObjectsBaseUrl + holidayStopRequestsDetailSfObjectRef))
      }.parse[JsValue].runRequest

  }

  case class HolidayStopRequestsDetailActioned(
    Charge_Code__c: HolidayStopRequestsDetailChargeCode,
    Actual_Price__c: HolidayStopRequestsDetailChargePrice
  )
  implicit val writesActioned = Json.writes[HolidayStopRequestsDetailActioned]

  object ActionSalesforceHolidayStopRequestsDetail {

    def apply(sfPatch: HttpOp[RestRequestMaker.PatchRequest, JsValue])(detailSfId: HolidayStopRequestsDetailId): HolidayStopRequestsDetailActioned => ClientFailableOp[JsValue] =
      sfPatch.setupRequest[HolidayStopRequestsDetailActioned] { actionedInfo =>
        PatchRequest(actionedInfo, RelativePath(s"$sfObjectsBaseUrl$holidayStopRequestsDetailSfObjectRef/${detailSfId.value}"))
      }.parse[JsValue].runRequest

  }
  //
  //  case class HolidayStopRequestDetails(
  //    request: HolidayStopRequest,
  //    zuoraRefs: Option[Seq[ZuoraRef]]
  //  )
  //  implicit val readsDetails: Reads[HolidayStopRequestDetails] = { json =>
  //    for {
  //      request <- json.validate[HolidayStopRequest]
  //      zuoraRefs <- (json \ "Holiday_Stop_Requests_Detail__r" \ "records").validateOpt[Seq[ZuoraRef]]
  //    } yield HolidayStopRequestDetails(request, zuoraRefs)
  //  }
  //
  //  case class ZuoraRef(
  //    chargeCode: HolidayStopRequestsDetailChargeCode,
  //    stoppedPublicationDate: StoppedPublicationDate
  //  )
  //  implicit val readsZuoraRef: Reads[ZuoraRef] = { json =>
  //    for {
  //      chargeCode <- (json \ "Charge_Code__c").validate[HolidayStopRequestsDetailChargeCode]
  //      stoppedPublicationDate <- (json \ "Stopped_Publication_Date__c").validate[StoppedPublicationDate]
  //    } yield ZuoraRef(chargeCode, stoppedPublicationDate)
  //  }

  //  private case class HolidayStopRequestActionedZuoraRefSearchQueryResponse(records: List[HolidayStopRequestDetails])
  //  private implicit val readsIds = Json.reads[HolidayStopRequestActionedZuoraRefSearchQueryResponse]

  case class HolidayStopRequestsDetail(
    Id: HolidayStopRequestsDetailId,
    Subscription_Name__c: SubscriptionName,
    Product_Name__c: ProductName,
    Stopped_Publication_Date__c: StoppedPublicationDate,
    Estimated_Price__c: Option[HolidayStopRequestsDetailChargePrice],
    Charge_Code__c: Option[HolidayStopRequestsDetailChargeCode],
    Actual_Price__c: Option[HolidayStopRequestsDetailChargePrice]
  )
  implicit val formattHolidayStopRequestsDetail = Json.format[HolidayStopRequestsDetail]

  case class HolidayStopRequestsDetailSearchQueryResponse(records: List[HolidayStopRequestsDetail])
  implicit val readsIds = Json.reads[HolidayStopRequestsDetailSearchQueryResponse]

  val SOQL_SELECT_CLAUSE = """
                            | SELECT Id, Subscription_Name__c, Product_Name__c,
                            | Stopped_Publication_Date__c, Estimated_Price__c, Charge_Code__c,
                            | Actual_Price__c
                            | """.stripMargin

  val SOQL_ORDER_BY_CLAUSE = "ORDER BY Stopped_Publication_Date__c ASC"

  object LookupPendingByProductNamePrefixAndDate {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (ProductName, LocalDate) => ClientFailableOp[List[HolidayStopRequestsDetail]] =
      sfGet.setupRequestMultiArg(toRequest _).parse[HolidayStopRequestsDetailSearchQueryResponse].map(_.records).runRequestMultiArg

    def toRequest(productNamePrefix: ProductName, date: LocalDate): GetRequestWithParams = {
      val soqlQuery = s"""
          | $SOQL_SELECT_CLAUSE
          | FROM $holidayStopRequestsDetailSfObjectRef
          | WHERE Product_Name__c LIKE '${productNamePrefix.value}%'
          | AND Stopped_Publication_Date__c = ${date.toString}
          | AND Is_Actioned__c = false
          | """.stripMargin
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }
  }

  //  object LookupByProductNamePrefixAndDateRange {
  //
  //    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (ProductName, LocalDate, LocalDate) => ClientFailableOp[List[HolidayStopRequestDetails]] =
  //      sfGet.setupRequestMultiArg(toRequest _).parse[HolidayStopRequestActionedZuoraRefSearchQueryResponse].map(_.records).runRequestMultiArg
  //
  //    def toRequest(productNamePrefix: ProductName, startThreshold: LocalDate, endThreshold: LocalDate): GetRequestWithParams = {
  //      val soqlQuery = s"""
  //        |SELECT h.Id, h.Start_Date__c, h.End_Date__c, h.Actioned_Count__c, h.Subscription_Name__c,
  //        |  h.Product_Name__c, (
  //        |    SELECT a.Charge_Code__c, a.Stopped_Publication_Date__c
  //        |    FROM Holiday_Stop_Request_Actioned_Zuora_Refs__r a
  //        |    WHERE a.Stopped_Publication_Date__c >= ${startThreshold.toString}
  //        |    AND a.Stopped_Publication_Date__c <= ${endThreshold.toString}
  //        |  )
  //        |FROM ${SalesforceHolidayStopRequest.holidayStopRequestSfObjectRef} h
  //        |WHERE h.Product_Name__c LIKE '${productNamePrefix.value}%'
  //        |""".stripMargin
  //      logger.info(s"using SF query : $soqlQuery")
  //      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
  //    }
  //  }
}
