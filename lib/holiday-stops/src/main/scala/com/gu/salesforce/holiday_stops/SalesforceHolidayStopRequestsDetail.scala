package com.gu.salesforce.holiday_stops

import java.time.LocalDate

import ai.x.play.json.Jsonx
import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.salesforce.SalesforceConstants._
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}
import enumeratum._

object SalesforceHolidayStopRequestsDetail extends Logging {

  val holidayStopRequestsDetailSfObjectRef = "Holiday_Stop_Requests_Detail__c"

  case class HolidayStopRequestsDetailId(value: String) extends AnyVal
  implicit val formatHolidayStopRequestsDetailId = Jsonx.formatInline[HolidayStopRequestsDetailId]

  case class HolidayStopRequestId(value: String) extends AnyVal
  implicit val formatHolidayStopRequestId = Jsonx.formatInline[HolidayStopRequestId]

  case class SubscriptionName(value: String) extends AnyVal
  implicit val formatSubscriptionName = Jsonx.formatInline[SubscriptionName]

  case class ProductName(value: String) extends AnyVal
  implicit val formatProductName = Jsonx.formatInline[ProductName]

  case class ProductRatePlanName(value: String) extends AnyVal
  case class ProductType(value: String) extends AnyVal

  sealed abstract class Product(override val entryName: String) extends EnumEntry
  object Product extends Enum[Product] {
    val values = findValues

    case object GuardianWeekly extends Product("Guardian Weekly")
    case object SaturdayVoucher extends Product("Saturday")
    case object SundayVoucher extends Product("Sunday")
    case object WeekendVoucher extends Product("Weekend")
    case object SixdayVoucher extends Product("Sixday")
    case object EverydayVoucher extends Product("Everyday")
    case object EverydayPlusVoucher extends Product("Everyday+")
    case object SixdayPlusVoucher extends Product("Sixday+")
    case object WeekendPlusVoucher extends Product("Weekend+")
    case object SundayPlusVoucher extends Product("Sunday+")
    case object SaturdayPlusVoucher extends Product("Saturday+")
  }

  case class HolidayStopRequestsDetailChargeCode(value: String) extends AnyVal
  implicit val formatHolidayStopRequestsDetailChargeCode = Jsonx.formatInline[HolidayStopRequestsDetailChargeCode]

  case class HolidayStopRequestsDetailChargePrice(value: Double) extends AnyVal
  implicit val formatHolidayStopRequestsDetailChargePrice = Jsonx.formatInline[HolidayStopRequestsDetailChargePrice]

  case class StoppedPublicationDate(value: LocalDate) extends AnyVal {
    def getDayOfWeek: String = value.getDayOfWeek.toString.toLowerCase.capitalize
  }
  implicit val formatStoppedPublicationDate = Jsonx.formatInline[StoppedPublicationDate]

  case class HolidayStopRequestsDetailActioned(
    Charge_Code__c: HolidayStopRequestsDetailChargeCode,
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
    Stopped_Publication_Date__c: StoppedPublicationDate,
    Estimated_Price__c: Option[HolidayStopRequestsDetailChargePrice],
    Charge_Code__c: Option[HolidayStopRequestsDetailChargeCode],
    Actual_Price__c: Option[HolidayStopRequestsDetailChargePrice]
  )
  implicit val formatHolidayStopRequestsDetail = Json.format[HolidayStopRequestsDetail]

  implicit val formatIds = Json.format[RecordsWrapperCaseClass[HolidayStopRequestsDetail]]

  val SOQL_SELECT_CLAUSE = """
      | SELECT Id, Subscription_Name__c, Product_Name__c, Stopped_Publication_Date__c,
      | Estimated_Price__c, Charge_Code__c, Actual_Price__c
      |""".stripMargin

  val SOQL_ORDER_BY_CLAUSE = "ORDER BY Stopped_Publication_Date__c ASC"

  object LookupPendingByProductNamePrefixAndDate {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (Product, LocalDate) => ClientFailableOp[List[HolidayStopRequestsDetail]] =
      sfGet
        .setupRequestMultiArg(toRequest _)
        .parse[RecordsWrapperCaseClass[HolidayStopRequestsDetail]]
        .map(_.records)
        .runRequestMultiArg

    def toRequest(product: Product, date: LocalDate): GetRequestWithParams = {
      val soqlQuery = s"""
          | $SOQL_SELECT_CLAUSE
          | FROM $holidayStopRequestsDetailSfObjectRef
          | WHERE Product_Name__c LIKE '${product.entryName}%'
          | AND Stopped_Publication_Date__c = ${date.toString}
          | AND (
          |   Subscription_Cancellation_Effective_Date__c = null
          |   OR Subscription_Cancellation_Effective_Date__c > ${date.toString}
          | )
          | AND Is_Actioned__c = false
          | $SOQL_ORDER_BY_CLAUSE
          |""".stripMargin
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }
  }

  object FetchVoucherHolidayStopRequestsDetails {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (Product, LocalDate) => ClientFailableOp[List[HolidayStopRequestsDetail]] =
      sfGet
        .setupRequestMultiArg(toRequest _)
        .parse[RecordsWrapperCaseClass[HolidayStopRequestsDetail]]
        .map(_.records)
        .runRequestMultiArg

    def toRequest(product: Product, date: LocalDate): GetRequestWithParams = {
      val soqlQuery = s"""
                         | $SOQL_SELECT_CLAUSE
                         | FROM $holidayStopRequestsDetailSfObjectRef
                         | WHERE Product_Name__c LIKE 'Newspaper Voucher%'
                         | AND Holiday_Stop_Request__r.SF_Subscription__r.Rate_Plan_Name__c = '${product.entryName}'
                         | AND Stopped_Publication_Date__c = ${date.toString}
                         | AND (
                         |   Subscription_Cancellation_Effective_Date__c = null
                         |   OR Subscription_Cancellation_Effective_Date__c > ${date.toString}
                         | )
                         | AND Is_Actioned__c = false
                         | $SOQL_ORDER_BY_CLAUSE
                         |""".stripMargin
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }
  }
}
