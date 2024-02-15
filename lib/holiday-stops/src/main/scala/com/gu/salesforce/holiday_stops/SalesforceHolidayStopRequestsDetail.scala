package com.gu.salesforce.holiday_stops

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.salesforce.SalesforceConstants._
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import com.gu.zuora.subscription.{AffectedPublicationDate, CreditRequest, Price, RatePlanChargeCode, SubscriptionName}
import play.api.libs.json.{JsValue, Json}

object SalesforceHolidayStopRequestsDetail extends Logging {

  final val HolidayStopRequestsDetailSfObjectRef: String = "Holiday_Stop_Requests_Detail__c"
  val holidayStopRequestsDetailSfObjectsBaseUrl = sfObjectsBaseUrl + HolidayStopRequestsDetailSfObjectRef

  case class HolidayStopRequestsDetailId(value: String) extends AnyVal
  implicit val formatHolidayStopRequestsDetailId = Json.valueFormat[HolidayStopRequestsDetailId]

  case class HolidayStopRequestId(value: String) extends AnyVal
  implicit val formatHolidayStopRequestId = Json.valueFormat[HolidayStopRequestId]

  case class ProductName(value: String) extends AnyVal
  implicit val formatProductName = Json.valueFormat[ProductName]

  case class ProductRatePlanName(value: String) extends AnyVal

  case class HolidayStopRequestsDetailExpectedInvoiceDate(value: LocalDate) extends AnyVal
  implicit val formatHolidayStopRequestsDetailExpectedInvoiceDate =
    Json.valueFormat[HolidayStopRequestsDetailExpectedInvoiceDate]

  case class HolidayStopRequestsDetailActioned(
      Charge_Code__c: RatePlanChargeCode,
      Actual_Price__c: Price,
  )
  implicit val formatActioned = Json.format[HolidayStopRequestsDetailActioned]

  object ActionSalesforceHolidayStopRequestsDetail {

    def apply(
        sfPatch: HttpOp[RestRequestMaker.PatchRequest, Unit],
    )(detailSfId: HolidayStopRequestsDetailId): HolidayStopRequestsDetailActioned => ClientFailableOp[Unit] =
      sfPatch
        .setupRequest[HolidayStopRequestsDetailActioned] { actionedInfo =>
          PatchRequest(
            actionedInfo,
            RelativePath(s"$sfObjectsBaseUrl$HolidayStopRequestsDetailSfObjectRef/${detailSfId.value}"),
          )
        }
        .runRequest

  }

  case class HolidayStopRequestsDetail(
      Id: HolidayStopRequestsDetailId,
      Subscription_Name__c: SubscriptionName,
      Product_Name__c: ProductName,
      Stopped_Publication_Date__c: AffectedPublicationDate,
      Estimated_Price__c: Option[Price],
      Charge_Code__c: Option[RatePlanChargeCode],
      Is_Actioned__c: Boolean,
      Actual_Price__c: Option[Price],
      Expected_Invoice_Date__c: Option[HolidayStopRequestsDetailExpectedInvoiceDate],
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
      | Estimated_Price__c, Charge_Code__c, Is_Actioned__c, Actual_Price__c, Expected_Invoice_Date__c
      |""".stripMargin

  private def soqlFilterClause(stoppedPublicationDates: List[LocalDate]) =
    s"""Stopped_Publication_Date__c IN (${stoppedPublicationDates.map(SoqlDateFormat.format).mkString(", ")})
       | AND Subscription_Cancellation_Effective_Date__c = null
       | AND Is_Actioned__c = false
       | AND Is_Withdrawn__c = false
       |""".stripMargin

  val SOQL_ORDER_BY_CLAUSE = "ORDER BY Stopped_Publication_Date__c ASC"

  object FetchHolidayStopRequestsDetailsForProductType {

    def apply(
        sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue],
    ): (List[LocalDate], ZuoraProductType) => ClientFailableOp[List[HolidayStopRequestsDetail]] =
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
         | FROM $HolidayStopRequestsDetailSfObjectRef
         | WHERE Holiday_Stop_Request__r.SF_Subscription__r.Product_Type__c = '${productType.name}'
         | AND ${soqlFilterClause(dates)}
         | $SOQL_ORDER_BY_CLAUSE
         |""".stripMargin
    }
  }

  val SoqlDateFormat = DateTimeFormatter.ISO_LOCAL_DATE
}
