package com.gu.salesforce.holiday_stops

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID

import ai.x.play.json.Jsonx
import com.gu.holiday_stops.ActionCalculator
import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.salesforce.SalesforceConstants._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact._
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json._

object SalesforceHolidayStopRequest extends Logging {

  val SALESFORCE_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")

  val holidayStopRequestSfObjectRef = "Holiday_Stop_Request__c"
  private val holidayStopRequestSfObjectsBaseUrl = sfObjectsBaseUrl + holidayStopRequestSfObjectRef
  private val holidayStopRequestCompositeTreeBaseUrl = compositeTreeBaseUrl + holidayStopRequestSfObjectRef

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
    Holiday_Stop_Request_Detail__r: Option[RecordsWrapperCaseClass[HolidayStopRequestsDetail]]
  )
  implicit val format = Json.format[HolidayStopRequest]

  implicit val formatIds = Json.format[RecordsWrapperCaseClass[HolidayStopRequest]]

  object LookupByDateAndProductNamePrefix {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (LocalDate, ProductName) => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet
        .setupRequestMultiArg(toRequest _)
        .parse[RecordsWrapperCaseClass[HolidayStopRequest]](Json.reads[RecordsWrapperCaseClass[HolidayStopRequest]])
        .map(_.records)
        .runRequestMultiArg

    def toRequest(date: LocalDate, productNamePrefix: ProductName) = {
      val sfDate = date.format(SALESFORCE_DATE_FORMATTER)
      val soqlQuery = getHolidayStopRequestPrefixSOQL(Some(productNamePrefix)) +
        s"AND Start_Date__c <= $sfDate " +
        s"AND End_Date__c >= $sfDate"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }

  }

  object LookupByDateRangeAndProductNamePrefix {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (HolidayStopRequestStartDate, HolidayStopRequestEndDate, ProductName) => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet
        .setupRequestMultiArg(toRequest _)
        .parse[RecordsWrapperCaseClass[HolidayStopRequest]](Json.reads[RecordsWrapperCaseClass[HolidayStopRequest]])
        .map(_.records)
        .runRequestMultiArg

    def toRequest(startDate: HolidayStopRequestStartDate, endDate: HolidayStopRequestEndDate, productNamePrefix: ProductName) = {
      val soqlQuery = s"""
        | ${getHolidayStopRequestPrefixSOQL(Some(productNamePrefix))}
        | AND Start_Date__c >= ${startDate.value.format(SALESFORCE_DATE_FORMATTER)}
        | AND End_Date__c <= ${endDate.value.format(SALESFORCE_DATE_FORMATTER)}
        | """.stripMargin
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }
  }

  object LookupByContactAndOptionalSubscriptionName {

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (Contact, Option[SubscriptionName]) => ClientFailableOp[List[HolidayStopRequest]] =
      sfGet.setupRequestMultiArg(toRequest _).parse[RecordsWrapperCaseClass[HolidayStopRequest]].map(_.records).runRequestMultiArg

    def toRequest(contact: Contact, optionalSubscriptionName: Option[SubscriptionName]) = {
      val soqlQuery = getHolidayStopRequestPrefixSOQL() +
        s"WHERE SF_Subscription__r.${contactToWhereClausePart(contact)}" +
        optionalSubscriptionName.map(subName => s" AND Subscription_Name__c = '${subName.value}'").getOrElse("")
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }

  }

  case class SubscriptionNameLookup(Name: SubscriptionName)
  implicit val formatSubNameLookup = Json.format[SubscriptionNameLookup]

  case class CompositeAttributes(
    `type`: String,
    referenceId: String
  )
  implicit val formatCompositeAttributes = Json.format[CompositeAttributes]

  case class CompositeTreeHolidayStopRequestsDetail(
    Stopped_Publication_Date__c: LocalDate,
    attributes: CompositeAttributes = CompositeAttributes(
      SalesforceHolidayStopRequestsDetail.holidayStopRequestsDetailSfObjectRef,
      UUID.randomUUID().toString
    )
  )
  implicit val formatCompositeTreeHolidayStopRequestsDetail = Json.format[CompositeTreeHolidayStopRequestsDetail]

  case class CompositeTreeHolidayStopRequest(
    Start_Date__c: HolidayStopRequestStartDate,
    End_Date__c: HolidayStopRequestEndDate,
    SF_Subscription__c: SFSubscriptionId, // TODO attempt to reinstate the __r with SubscriptionNameLookup approach (so it can be reused in back-fill without sep. lookup call first
    Holiday_Stop_Request_Detail__r: RecordsWrapperCaseClass[CompositeTreeHolidayStopRequestsDetail],
    attributes: CompositeAttributes = CompositeAttributes(holidayStopRequestSfObjectRef, holidayStopRequestSfObjectRef)
  )
  implicit val formatNewHolidayStopRequestsDetail = Json.format[RecordsWrapperCaseClass[CompositeTreeHolidayStopRequestsDetail]]
  implicit val formatCompositeTreeHolidayStopRequest = Json.format[CompositeTreeHolidayStopRequest]
  implicit val formatNewHolidayStopRequest = Json.format[RecordsWrapperCaseClass[CompositeTreeHolidayStopRequest]]

  object CreateHolidayStopRequestWithDetail {

    case class CreateHolidayStopRequestResultIdWrapper(
      id: HolidayStopRequestId,
      referenceId: String
    )
    implicit val formatCreateHolidayStopRequestResultIdWrapper = Json.format[CreateHolidayStopRequestResultIdWrapper]
    case class CreateHolidayStopRequestResult(results: List[CreateHolidayStopRequestResultIdWrapper])
    implicit val format = Json.format[CreateHolidayStopRequestResult]

    def apply(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]): RecordsWrapperCaseClass[CompositeTreeHolidayStopRequest] => ClientFailableOp[HolidayStopRequestId] =
      sfPost.setupRequest[RecordsWrapperCaseClass[CompositeTreeHolidayStopRequest]] { createHolidayStopRequestWithDetail =>
        PostRequest(createHolidayStopRequestWithDetail, RelativePath(holidayStopRequestCompositeTreeBaseUrl))
      }
        .parse[CreateHolidayStopRequestResult]
        .map(_.results.find(_.referenceId == holidayStopRequestSfObjectRef).map(_.id).get) //FIXME refactor this to map None to ClientFailure rather than nasty .get
        .runRequest

    def buildBody(start: LocalDate, end: LocalDate, subscription: MatchingSubscription) = RecordsWrapperCaseClass(List(
      CompositeTreeHolidayStopRequest(
        Start_Date__c = HolidayStopRequestStartDate(start),
        End_Date__c = HolidayStopRequestEndDate(end),
        SF_Subscription__c = subscription.Id,
        Holiday_Stop_Request_Detail__r = RecordsWrapperCaseClass(
          ActionCalculator.publicationDatesToBeStopped(
            start,
            end,
            subscription.Product_Name__c
          ).map(CompositeTreeHolidayStopRequestsDetail(_))
        )
      )
    ))

  }

  object DeleteHolidayStopRequest {

    def apply(sfDelete: HttpOp[RestRequestMaker.DeleteRequest, String]): HolidayStopRequestId => ClientFailableOp[String] =
      sfDelete.setupRequest[HolidayStopRequestId] { holidayStopRequestId =>
        DeleteRequest(RelativePath(s"$holidayStopRequestSfObjectsBaseUrl/${holidayStopRequestId.value}"))
      }.runRequest

  }

  //
  // TODO refactor these out by reworking back-fill to to use composite tree approach above (but also passing in the Charge_Code__c & Actual_Price__c for the inner records)
  //

  @Deprecated
  case class NewHolidayStopRequest(
    Start_Date__c: HolidayStopRequestStartDate,
    End_Date__c: HolidayStopRequestEndDate,
    SF_Subscription__r: SubscriptionNameLookup
  )
  implicit val formatNew = Json.format[NewHolidayStopRequest]

  @Deprecated
  object CreateHolidayStopRequest {

    case class CreateHolidayStopRequestResult(id: HolidayStopRequestId)
    implicit val reads = Json.reads[CreateHolidayStopRequestResult]

    def apply(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]): NewHolidayStopRequest => ClientFailableOp[HolidayStopRequestId] =
      sfPost.setupRequest[NewHolidayStopRequest] { newHolidayStopRequest =>
        PostRequest(newHolidayStopRequest, RelativePath(holidayStopRequestSfObjectsBaseUrl))
      }.parse[CreateHolidayStopRequestResult].map(_.id).runRequest

  }

}
