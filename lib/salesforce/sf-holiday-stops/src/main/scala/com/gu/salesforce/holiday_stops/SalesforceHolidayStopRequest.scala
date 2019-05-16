package com.gu.salesforce.holiday_stops

import ai.x.play.json.Jsonx
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import org.joda.time.LocalDate
import play.api.libs.json.{JsValue, Json}

object SalesforceHolidayStopRequest extends Logging {

  val SALESFORCE_DATE_FORMAT = "yyyy-MM-dd"

  private val sfApiBaseUrl = "/services/data/v29.0"
  //  private val mandateSfObjectsBaseUrl = sfApiBaseUrl + "/sobjects/Holiday_Stop_Request__c"
  private val soqlQueryBaseUrl = sfApiBaseUrl + "/query/?q="

  case class HolidayStopRequestId(value: String) extends AnyVal
  implicit val formaHolidayStopRequestId = Jsonx.formatInline[HolidayStopRequestId]

  case class HolidayStopRequestStartDate(value: String) extends AnyVal
  implicit val formatHolidayStopRequestStartDate = Jsonx.formatInline[HolidayStopRequestStartDate]

  case class HolidayStopRequestEndDate(value: String) extends AnyVal
  implicit val formatHolidayStopRequestEndDate = Jsonx.formatInline[HolidayStopRequestEndDate]

  case class HolidayStopRequestActionedCount(value: Int) extends AnyVal
  implicit val formatHolidayStopRequestActionedCount = Jsonx.formatInline[HolidayStopRequestActionedCount]

  case class HolidayStopRequestSubscriptionName(value: String) extends AnyVal
  implicit val formatHolidayStopRequestSubscriptionName = Jsonx.formatInline[HolidayStopRequestSubscriptionName]

  val HOLIDAY_STOP_REQUEST_SOQL_PREFIX =
    s"SELECT Id, Start_Date__c, End_Date__c, Actioned_Count__c, Subscription_Name__c " +
      s"FROM Holiday_Stop_Request__c "

  case class HolidayStopRequest(
    Id: HolidayStopRequestId,
    Start_Date__c: HolidayStopRequestStartDate,
    End_Date__c: HolidayStopRequestEndDate,
    Actioned_Count__c: HolidayStopRequestActionedCount,
    Subscription_Name__c: HolidayStopRequestSubscriptionName
  )
  implicit val reads = Json.reads[HolidayStopRequest]

  private case class HolidayStopRequestSearchQueryResponse(records: List[HolidayStopRequest])
  private implicit val readsIds = Json.reads[HolidayStopRequestSearchQueryResponse]

  object LookupByDate { //TODO perhaps also should filter on product type (would need another formula field

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequest, JsValue]): LocalDate => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet.setupRequest(toRequest).parse[HolidayStopRequestSearchQueryResponse].map(_.records).runRequest

    def toRequest(date: LocalDate) = {
      val dateInSalesForceFormat = date.toString(SALESFORCE_DATE_FORMAT)
      val soqlQuery = HOLIDAY_STOP_REQUEST_SOQL_PREFIX +
        s"WHERE Start_Date__c <= $dateInSalesForceFormat AND End_Date__c >= $dateInSalesForceFormat"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequest(RelativePath(s"$soqlQueryBaseUrl$soqlQuery"))
    }

  }

  object LookupByIdentityId {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequest, JsValue]): String => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet.setupRequest(toRequest).parse[HolidayStopRequestSearchQueryResponse].map(_.records).runRequest

    def toRequest(identityId: String) = {
      val soqlQuery = HOLIDAY_STOP_REQUEST_SOQL_PREFIX +
        s"WHERE IdentityID__c = $identityId"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequest(RelativePath(s"$soqlQueryBaseUrl$soqlQuery"))
    }

  }

}
