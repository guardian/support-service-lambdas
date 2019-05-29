package com.gu.salesforce.holiday_stops

import ai.x.play.json.Jsonx
import com.gu.salesforce.SalesforceConstants._
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import org.joda.time.LocalDate
import org.joda.time.format.DateTimeFormat
import play.api.libs.json.{Format, JsResult, JsString, JsValue, Json}

object SalesforceHolidayStopRequest extends Logging {

  val SALESFORCE_DATE_FORMAT = "yyyy-MM-dd"

  private val holidayStopRequestSfObjectRef = "Holiday_Stop_Request__c"
  private val holidayStopRequestSfObjectsBaseUrl = sfObjectsBaseUrl + holidayStopRequestSfObjectRef

  implicit val formatLocalDateAsSalesforceDate: Format[LocalDate] = new Format[LocalDate] {
    override def reads(jsValue: JsValue): JsResult[LocalDate] =
      jsValue.validate[String].map(sfDate => LocalDate.parse(sfDate, DateTimeFormat.forPattern(SALESFORCE_DATE_FORMAT)))

    override def writes(date: LocalDate): JsValue = JsString(date.toString(SALESFORCE_DATE_FORMAT))
  }

  case class HolidayStopRequestId(value: String) extends AnyVal
  implicit val formatHolidayStopRequestId = Jsonx.formatInline[HolidayStopRequestId]

  case class HolidayStopRequestStartDate(value: LocalDate) extends AnyVal
  implicit val formatHolidayStopRequestStartDate = Jsonx.formatInline[HolidayStopRequestStartDate]

  case class HolidayStopRequestEndDate(value: LocalDate) extends AnyVal
  implicit val formatHolidayStopRequestEndDate = Jsonx.formatInline[HolidayStopRequestEndDate]

  case class HolidayStopRequestActionedCount(value: Int) extends AnyVal
  implicit val formatHolidayStopRequestActionedCount = Jsonx.formatInline[HolidayStopRequestActionedCount]

  case class SubscriptionName(value: String) extends AnyVal
  implicit val formatSubscriptionName = Jsonx.formatInline[SubscriptionName]

  case class ProductName(value: String) extends AnyVal
  implicit val formatProductName = Jsonx.formatInline[ProductName]

  def getHolidayStopRequestPrefixSOQL(productNamePrefix: ProductName) =
    s"SELECT Id, Start_Date__c, End_Date__c, Actioned_Count__c, Subscription_Name__c, Product_Name__c " +
      s"FROM $holidayStopRequestSfObjectRef " +
      s"WHERE Product_Name__c LIKE '${productNamePrefix.value}%' "

  case class HolidayStopRequest(
    Id: HolidayStopRequestId,
    Start_Date__c: HolidayStopRequestStartDate,
    End_Date__c: HolidayStopRequestEndDate,
    Actioned_Count__c: HolidayStopRequestActionedCount,
    Subscription_Name__c: SubscriptionName,
    Product_Name__c: ProductName
  )
  implicit val reads = Json.reads[HolidayStopRequest]
  implicit val writes = Json.writes[HolidayStopRequest]

  private case class HolidayStopRequestSearchQueryResponse(records: List[HolidayStopRequest])
  private implicit val readsIds = Json.reads[HolidayStopRequestSearchQueryResponse]

  object LookupByDateAndProductNamePrefix {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (LocalDate, ProductName) => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet.setupRequestMultiArg(toRequest _).parse[HolidayStopRequestSearchQueryResponse].map(_.records).runRequestMultiArg

    def toRequest(date: LocalDate, productNamePrefix: ProductName) = {
      val sfDate = date.toString(SALESFORCE_DATE_FORMAT)
      val soqlQuery = getHolidayStopRequestPrefixSOQL(productNamePrefix) +
        s"AND Start_Date__c <= $sfDate " +
        s"AND End_Date__c >= $sfDate"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }

  }

  object LookupByIdentityIdAndProductNamePrefix {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (String, ProductName) => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet.setupRequestMultiArg(toRequest _).parse[HolidayStopRequestSearchQueryResponse].map(_.records).runRequestMultiArg

    def toRequest(identityId: String, productNamePrefix: ProductName) = {
      val soqlQuery = getHolidayStopRequestPrefixSOQL(productNamePrefix) +
        s"AND IdentityID__c = '$identityId'"
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
