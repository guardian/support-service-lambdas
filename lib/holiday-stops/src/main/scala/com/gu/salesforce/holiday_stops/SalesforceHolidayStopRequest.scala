package com.gu.salesforce.holiday_stops

import ai.x.play.json.Jsonx
import com.gu.salesforce.SalesforceConstants._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestId, HolidayStopRequestsDetailSearchQueryResponse, ProductName, SubscriptionName}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import play.api.libs.json._

object SalesforceHolidayStopRequest extends Logging {

  val SALESFORCE_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")

  val holidayStopRequestSfObjectRef = "Holiday_Stop_Request__c"
  private val holidayStopRequestSfObjectsBaseUrl = sfObjectsBaseUrl + holidayStopRequestSfObjectRef

  implicit val formatLocalDateAsSalesforceDate: Format[LocalDate] = new Format[LocalDate] {
    override def reads(jsValue: JsValue): JsResult[LocalDate] =
      jsValue.validate[String].map(sfDate => LocalDate.parse(sfDate, SALESFORCE_DATE_FORMATTER))

    override def writes(date: LocalDate): JsValue = JsString(date.format(SALESFORCE_DATE_FORMATTER))
  }

  case class HolidayStopRequestStartDate(value: LocalDate) extends AnyVal
  implicit val formatHolidayStopRequestStartDate = Jsonx.formatInline[HolidayStopRequestStartDate]

  case class HolidayStopRequestEndDate(value: LocalDate) extends AnyVal
  implicit val formatHolidayStopRequestEndDate = Jsonx.formatInline[HolidayStopRequestEndDate]

  case class HolidayStopRequestActionedCount(value: Int) extends AnyVal
  implicit val formatHolidayStopRequestActionedCount = Jsonx.formatInline[HolidayStopRequestActionedCount]

  def getHolidayStopRequestPrefixSOQL(productNamePrefixOption: Option[ProductName] = None) = s"""
      | SELECT Id, Start_Date__c, End_Date__c, Subscription_Name__c, Product_Name__c,
      | Actioned_Count__c, Pending_Count__c, Total_Issues_Publications_Impacted_Count__c, (
      |   ${SalesforceHolidayStopRequestsDetail.SOQL_SELECT_CLAUSE}
      |   FROM Holiday_Stop_Request_Detail__r
      |   ${SalesforceHolidayStopRequestsDetail.SOQL_ORDER_BY_CLAUSE}
      | )
      | FROM $holidayStopRequestSfObjectRef
      | ${productNamePrefixOption.map(pn => s"WHERE Product_Name__c LIKE '${pn.value}%'").getOrElse("")}
      |""".stripMargin

  case class HolidayStopRequest(
    Id: HolidayStopRequestId,
    Start_Date__c: HolidayStopRequestStartDate,
    End_Date__c: HolidayStopRequestEndDate,
    Actioned_Count__c: HolidayStopRequestActionedCount,
    Pending_Count__c: Int,
    Total_Issues_Publications_Impacted_Count__c: Int,
    Subscription_Name__c: SubscriptionName,
    Product_Name__c: ProductName,
    Holiday_Stop_Request_Detail__r: Option[HolidayStopRequestsDetailSearchQueryResponse]
  )
  implicit val reads = Json.reads[HolidayStopRequest]

  private case class HolidayStopRequestSearchQueryResponse(records: List[HolidayStopRequest])
  private implicit val readsIds = Json.reads[HolidayStopRequestSearchQueryResponse]

  object LookupByDateAndProductNamePrefix {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (LocalDate, ProductName) => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet.setupRequestMultiArg(toRequest _).parse[HolidayStopRequestSearchQueryResponse].map(_.records).runRequestMultiArg

    def toRequest(date: LocalDate, productNamePrefix: ProductName) = {
      val sfDate = date.format(SALESFORCE_DATE_FORMATTER)
      val soqlQuery = getHolidayStopRequestPrefixSOQL(Some(productNamePrefix)) +
        s"AND Start_Date__c <= $sfDate " +
        s"AND End_Date__c >= $sfDate"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }

  }

  object LookupByProductNamePrefix {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): ProductName => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet.setupRequest(toRequest).parse[HolidayStopRequestSearchQueryResponse].map(_.records).runRequest

    def toRequest(productNamePrefix: ProductName) = {
      val soqlQuery = getHolidayStopRequestPrefixSOQL(Some(productNamePrefix))
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }
  }

  object LookupByIdentityIdAndOptionalSubscriptionName {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (String, Option[SubscriptionName]) => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet.setupRequestMultiArg(toRequest _).parse[HolidayStopRequestSearchQueryResponse].map(_.records).runRequestMultiArg

    def toRequest(identityId: String, optionalSubscriptionName: Option[SubscriptionName]) = {
      val soqlQuery = getHolidayStopRequestPrefixSOQL() +
        s"WHERE IdentityID__c = '$identityId'" +
        optionalSubscriptionName.map(subName => s" AND Subscription_Name__c = '${subName.value}'").getOrElse("")
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }

  }

  case class SubscriptionNameLookup(Name: SubscriptionName)
  implicit val writesSubNameLookup = Json.writes[SubscriptionNameLookup]

  case class NewHolidayStopRequest(
    Start_Date__c: HolidayStopRequestStartDate,
    End_Date__c: HolidayStopRequestEndDate,
    SF_Subscription__r: SubscriptionNameLookup
  )
  implicit val writesNew = Json.writes[NewHolidayStopRequest]

  object CreateHolidayStopRequest {

    case class CreateHolidayStopRequestResult(id: HolidayStopRequestId)
    implicit val reads = Json.reads[CreateHolidayStopRequestResult]

    def apply(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]): NewHolidayStopRequest => ClientFailableOp[HolidayStopRequestId] =
      sfPost.setupRequest[NewHolidayStopRequest] { newHolidayStopRequest =>
        PostRequest(newHolidayStopRequest, RelativePath(holidayStopRequestSfObjectsBaseUrl))
      }.parse[CreateHolidayStopRequestResult].map(_.id).runRequest

  }

  object DeleteHolidayStopRequest {

    def apply(sfDelete: HttpOp[RestRequestMaker.DeleteRequest, String]): HolidayStopRequestId => ClientFailableOp[String] =
      sfDelete.setupRequest[HolidayStopRequestId] { holidayStopRequestId =>
        DeleteRequest(RelativePath(s"$holidayStopRequestSfObjectsBaseUrl/${holidayStopRequestId.value}"))
      }.runRequest

  }

}
