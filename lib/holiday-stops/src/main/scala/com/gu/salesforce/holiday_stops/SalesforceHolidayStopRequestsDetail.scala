package com.gu.salesforce.holiday_stops

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import ai.x.play.json.Jsonx
import com.gu.holiday_stops.CreditRequest
import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.salesforce.SalesforceConstants._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetailChargePrice, RatePlanChargeCode, AffectedPublicationDate, SubscriptionName}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import play.api.libs.json.{JsValue, Json}

object SalesforceHolidayStopRequestsDetail extends Logging {

  val holidayStopRequestsDetailSfObjectRef = "Holiday_Stop_Requests_Detail__c"
  val holidayStopRequestsDetailSfObjectsBaseUrl = sfObjectsBaseUrl + holidayStopRequestsDetailSfObjectRef

  case class HolidayStopRequestsDetailId(value: String) extends AnyVal
  implicit val formatHolidayStopRequestsDetailId = Jsonx.formatInline[HolidayStopRequestsDetailId]

  case class HolidayStopRequestId(value: String) extends AnyVal
  implicit val formatHolidayStopRequestId = Jsonx.formatInline[HolidayStopRequestId]

  case class SubscriptionName(value: String) extends AnyVal
  implicit val formatSubscriptionName = Jsonx.formatInline[SubscriptionName]

  case class ProductName(value: String) extends AnyVal
  implicit val formatProductName = Jsonx.formatInline[ProductName]

  case class ProductRatePlanName(value: String) extends AnyVal

  case class RatePlanChargeCode(value: String) extends AnyVal
  implicit val formatSubscriptionCreditRatePlanChargeCode = Jsonx.formatInline[RatePlanChargeCode]

  case class HolidayStopRequestsDetailChargePrice(value: Double) extends AnyVal
  implicit val formatHolidayStopRequestsDetailChargePrice = Jsonx.formatInline[HolidayStopRequestsDetailChargePrice]

  case class HolidayStopRequestsDetailExpectedInvoiceDate(value: LocalDate) extends AnyVal
  implicit val formatHolidayStopRequestsDetailExpectedInvoiceDate = Jsonx.formatInline[HolidayStopRequestsDetailExpectedInvoiceDate]

  case class AffectedPublicationDate(value: LocalDate) extends AnyVal {
    def getDayOfWeek: String = value.getDayOfWeek.toString.toLowerCase.capitalize
  }
  implicit val formatAffectedPublicationDate = Jsonx.formatInline[AffectedPublicationDate]

  case class HolidayStopRequestsDetailActioned(
    Charge_Code__c: RatePlanChargeCode,
    Actual_Price__c: HolidayStopRequestsDetailChargePrice
  )
  implicit val formatActioned = Json.format[HolidayStopRequestsDetailActioned]

  object ActionSalesforceHolidayStopRequestsDetail {

    def apply(sfPatch: HttpOp[RestRequestMaker.PatchRequest, Unit])(detailSfId: HolidayStopRequestsDetailId): HolidayStopRequestsDetailActioned => ClientFailableOp[Unit] =
      sfPatch.setupRequest[HolidayStopRequestsDetailActioned] { actionedInfo =>
        PatchRequest(actionedInfo, RelativePath(s"$sfObjectsBaseUrl$holidayStopRequestsDetailSfObjectRef/${detailSfId.value}"))
      }.runRequest

  }

  case class HolidayStopRequestsDetail(
    Id: HolidayStopRequestsDetailId,
    Subscription_Name__c: SubscriptionName,
    Product_Name__c: ProductName,
    Stopped_Publication_Date__c: AffectedPublicationDate,
    Estimated_Price__c: Option[HolidayStopRequestsDetailChargePrice],
    Charge_Code__c: Option[RatePlanChargeCode],
    Actual_Price__c: Option[HolidayStopRequestsDetailChargePrice],
    Expected_Invoice_Date__c: Option[HolidayStopRequestsDetailExpectedInvoiceDate]
  ) extends CreditRequest {
    val subscriptionName: SubscriptionName = Subscription_Name__c
    val publicationDate: AffectedPublicationDate = Stopped_Publication_Date__c
    val chargeCode: Option[RatePlanChargeCode] = Charge_Code__c
    def productRatePlanChargeName: String = "Holiday Credit"
  }

  implicit val formatHolidayStopRequestsDetail = Json.format[HolidayStopRequestsDetail]

  implicit val formatIds = Json.format[RecordsWrapperCaseClass[HolidayStopRequestsDetail]]

  val SOQL_SELECT_CLAUSE = """
      | SELECT Id, Subscription_Name__c, Product_Name__c, Stopped_Publication_Date__c,
      | Estimated_Price__c, Charge_Code__c, Actual_Price__c, Expected_Invoice_Date__c
      |""".stripMargin

  private def soqlFilterClause(stoppedPublicationDates: List[LocalDate]) =
    s"""Stopped_Publication_Date__c IN (${stoppedPublicationDates.map(SoqlDateFormat.format).mkString(", ")})
       | AND Subscription_Cancellation_Effective_Date__c = null
       | AND Is_Actioned__c = false
       | AND Is_Withdrawn__c = false
       |""".stripMargin

  val SOQL_ORDER_BY_CLAUSE = "ORDER BY Stopped_Publication_Date__c ASC"

  object FetchHolidayStopRequestsDetailsForProductType {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (List[LocalDate], ZuoraProductType) => ClientFailableOp[List[HolidayStopRequestsDetail]] =
      sfGet
        .setupRequestMultiArg(toRequest _)
        .parse[RecordsWrapperCaseClass[HolidayStopRequestsDetail]]
        .map(_.records)
        .runRequestMultiArg

    def toRequest(dates: List[LocalDate], productType: ZuoraProductType): GetRequestWithParams = {
      val soqlQuery = createSoql(dates, productType)
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }

    def createSoql(dates: List[LocalDate], productType: ZuoraProductType) = {
      s"""
         | $SOQL_SELECT_CLAUSE
         | FROM $holidayStopRequestsDetailSfObjectRef
         | WHERE Holiday_Stop_Request__r.SF_Subscription__r.Product_Type__c = '${productType.name}'
         | AND ${soqlFilterClause(dates)}
         | $SOQL_ORDER_BY_CLAUSE
         |""".stripMargin
    }
  }

  val SoqlDateFormat = DateTimeFormatter.ISO_LOCAL_DATE
}
