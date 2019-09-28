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

  /**
   * This will uniquely identify a "product rate plan" in Zuora. This can loosely be seen as the 'type' of a particular
   * subscription. Eg:
   * ------------------------------------------------------------
   * |Product Type             | Rate Plan Name                 |
   * |----------------------------------------------------------|
   * |Guardian Weekly          | GW Oct 18 - 1 Year - Domestic  |
   * |Newspaper - Voucher Book | Weekend                        |
   * |----------------------------------------------------------|
   *
   * @param productType    Identifies the group of products the rate plan is part of
   * @param ratePlanName   The name of the rateplan
   */
  case class ProductRatePlanKey(productType: ProductType, ratePlanName: ProductRatePlanName)
  object ProductRatePlanKey {
    def apply(product: Product): ProductRatePlanKey = {
      product match {
        case GuardianWeekly => ProductRatePlanKey(ProductType("Guardian Weekly"), ProductRatePlanName(""))
        case SundayVoucher => ProductRatePlanKey(ProductType("Newspaper Voucher"), ProductRatePlanName("Sunday"))
        case WeekendVoucher => ProductRatePlanKey(ProductType("Newspaper Voucher"), ProductRatePlanName("Weekend"))
        case SixdayVoucher => ProductRatePlanKey(ProductType("Newspaper Voucher"), ProductRatePlanName("Sixday"))
      }
    }
  }

  sealed trait Product
  case object GuardianWeekly extends Product
  case object SundayVoucher extends Product
  case object WeekendVoucher extends Product
  case object SixdayVoucher extends Product

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

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (ProductName, LocalDate) => ClientFailableOp[List[HolidayStopRequestsDetail]] =
      sfGet
        .setupRequestMultiArg(toRequest _)
        .parse[RecordsWrapperCaseClass[HolidayStopRequestsDetail]]
        .map(_.records)
        .runRequestMultiArg

    def toRequest(productNamePrefix: ProductName, date: LocalDate): GetRequestWithParams = {
      val soqlQuery = s"""
          | $SOQL_SELECT_CLAUSE
          | FROM $holidayStopRequestsDetailSfObjectRef
          | WHERE Product_Name__c LIKE '${productNamePrefix.value}%'
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

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (ProductRatePlanKey, LocalDate) => ClientFailableOp[List[HolidayStopRequestsDetail]] =
      sfGet
        .setupRequestMultiArg(toRequest _)
        .parse[RecordsWrapperCaseClass[HolidayStopRequestsDetail]]
        .map(_.records)
        .runRequestMultiArg

    def toRequest(productKey: ProductRatePlanKey, date: LocalDate): GetRequestWithParams = {
      val soqlQuery = s"""
                         | $SOQL_SELECT_CLAUSE
                         | FROM $holidayStopRequestsDetailSfObjectRef
                         | WHERE Product_Name__c LIKE '${productKey.productType.value}%'
                         | AND Holiday_Stop_Request__r.SF_Subscription__r.Rate_Plan_Name__c = '${productKey.ratePlanName.value}'
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
