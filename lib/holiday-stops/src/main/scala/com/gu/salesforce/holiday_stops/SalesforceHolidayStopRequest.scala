package com.gu.salesforce.holiday_stops

import cats.implicits._
import com.gu.salesforce.SalesforceConstants._
import com.gu.salesforce.SalesforceQueryConstants.contactToWhereClausePart
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.CreateHolidayStopRequestWithDetail.{CreateHolidayStopRequestResult, format}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.WithdrawHolidayStopRequest.WithdrawnTimePatch
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact._
import com.gu.salesforce.{Contact, RecordsWrapperCaseClass}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import com.gu.zuora.subscription._
import play.api.libs.json._

import java.time.format.DateTimeFormatter
import java.time.{LocalDate, ZonedDateTime}
import java.util.UUID

object SalesforceHolidayStopRequest extends Logging {

  val SALESFORCE_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")
  val SALESFORCE_DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXXX")

  val holidayStopRequestSfObjectRef = "Holiday_Stop_Request__c"
  private val holidayStopRequestSfObjectsBaseUrl = sfObjectsBaseUrl + holidayStopRequestSfObjectRef
  private val holidayStopRequestCompositeTreeBaseUrl = compositeTreeBaseUrl + holidayStopRequestSfObjectRef

  implicit val formatLocalDateAsSalesforceDate: Format[LocalDate] = new Format[LocalDate] {
    override def reads(jsValue: JsValue): JsResult[LocalDate] =
      jsValue.validate[String].map(sfDate => LocalDate.parse(sfDate, SALESFORCE_DATE_FORMATTER))

    override def writes(date: LocalDate): JsValue = JsString(date.format(SALESFORCE_DATE_FORMATTER))
  }

  implicit val formatZonedDateTimeAsSalesforceDateTime: Format[ZonedDateTime] = new Format[ZonedDateTime] {
    override def reads(jsValue: JsValue): JsResult[ZonedDateTime] =
      jsValue.validate[String].map(sfDate => ZonedDateTime.parse(sfDate, SALESFORCE_DATE_TIME_FORMATTER))

    override def writes(dateTime: ZonedDateTime): JsValue = JsString(dateTime.format(SALESFORCE_DATE_TIME_FORMATTER))
  }

  case class HolidayStopRequestStartDate(value: LocalDate) extends AnyVal
  implicit val formatHolidayStopRequestStartDate = Json.valueFormat[HolidayStopRequestStartDate]

  case class HolidayStopRequestEndDate(value: LocalDate) extends AnyVal
  implicit val formatHolidayStopRequestEndDate = Json.valueFormat[HolidayStopRequestEndDate]

  case class HolidayStopRequestActionedCount(value: Int) extends AnyVal
  implicit val formatHolidayStopRequestActionedCount = Json.valueFormat[HolidayStopRequestActionedCount]

  case class HolidayStopRequestWithdrawnTime(value: ZonedDateTime) extends AnyVal
  implicit val formatHolidayStopRequestWithdrawnTime = Json.valueFormat[HolidayStopRequestWithdrawnTime]

  case class HolidayStopRequestIsWithdrawn(value: Boolean) extends AnyVal
  implicit val formatHolidayStopRequestIsWithdrawn = Json.valueFormat[HolidayStopRequestIsWithdrawn]

  case class BulkSuspensionReason(value: String) extends AnyVal
  implicit val formatBulkSuspensionReason = Json.valueFormat[BulkSuspensionReason]

  def getHolidayStopRequestPrefixSOQL(productNamePrefixOption: Option[ProductName] = None) = s"""
      | SELECT Id, Start_Date__c, End_Date__c, Subscription_Name__c, Product_Name__c,
      | Actioned_Count__c, Pending_Count__c, Total_Issues_Publications_Impacted_Count__c,
      | Withdrawn_Time__c, Is_Withdrawn__c, Bulk_Suspension_Reason__c, (
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
      Holiday_Stop_Request_Detail__r: Option[RecordsWrapperCaseClass[HolidayStopRequestsDetail]],
      Withdrawn_Time__c: Option[HolidayStopRequestWithdrawnTime],
      Is_Withdrawn__c: HolidayStopRequestIsWithdrawn,
      Bulk_Suspension_Reason__c: Option[BulkSuspensionReason],
  )
  implicit val format = Json.format[HolidayStopRequest]

  implicit val formatIds = Json.format[RecordsWrapperCaseClass[HolidayStopRequest]]

  class LookupByContactAndOptionalSubscriptionName(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]) {

    import LookupByContactAndOptionalSubscriptionName._

    def run(
      contact: Contact,
      optionalSubscriptionName: Option[SubscriptionName],
      optionalHistoricalCutOff: Option[LocalDate],
    ): ClientFailableOp[List[HolidayStopRequest]] =
      sfGet
        .parse[RecordsWrapperCaseClass[HolidayStopRequest]]
        .map(_.records)
        .runRequest(toRequest(contact, optionalSubscriptionName, optionalHistoricalCutOff))

  }

  object LookupByContactAndOptionalSubscriptionName {

    def getSOQL(
        contact: Contact,
        optionalSubscriptionName: Option[SubscriptionName],
        optionalHistoricalCutOff: Option[LocalDate],
    ) =
      getHolidayStopRequestPrefixSOQL() +
        s"WHERE SF_Subscription__r.${contactToWhereClausePart(contact)}" +
        optionalHistoricalCutOff
          .map(_.format(SALESFORCE_DATE_FORMATTER))
          .map(historicalCutOff =>
            s" AND (Max_Expected_Invoice_Date__c > $historicalCutOff OR (Max_Expected_Invoice_Date__c = NULL AND End_Date__c > $historicalCutOff))",
          )
          .getOrElse("") +
        optionalSubscriptionName.map(subName => s" AND Subscription_Name__c = '${subName.value}'").getOrElse("")

    def toRequest(
        contact: Contact,
        optionalSubscriptionName: Option[SubscriptionName],
        optionalHistoricalCutOff: Option[LocalDate],
    ) = {

      val soqlQuery = getSOQL(contact, optionalSubscriptionName, optionalHistoricalCutOff)
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }

  }

  case class SubscriptionNameLookup(Name: SubscriptionName)
  implicit val formatSubNameLookup = Json.format[SubscriptionNameLookup]

  case class CompositeAttributes(
      `type`: String,
      referenceId: String,
  )
  implicit val formatCompositeAttributes = Json.format[CompositeAttributes]

  case class CompositeTreeHolidayStopRequestsDetail(
      Stopped_Publication_Date__c: LocalDate,
      Estimated_Price__c: Price,
      Expected_Invoice_Date__c: HolidayStopRequestsDetailExpectedInvoiceDate,
      attributes: CompositeAttributes = CompositeAttributes(
        HolidayStopRequestsDetailSfObjectRef,
        UUID.randomUUID().toString,
      ),
  )
  implicit val formatCompositeTreeHolidayStopRequestsDetail = Json.format[CompositeTreeHolidayStopRequestsDetail]

  case class CompositeTreeHolidayStopRequest(
      Start_Date__c: HolidayStopRequestStartDate,
      End_Date__c: HolidayStopRequestEndDate,
      SF_Subscription__c: SFSubscriptionId, // TODO attempt to reinstate the __r with SubscriptionNameLookup approach (so it can be reused in back-fill without sep. lookup call first
      Bulk_Suspension_Reason__c: Option[BulkSuspensionReason],
      Holiday_Stop_Request_Detail__r: RecordsWrapperCaseClass[CompositeTreeHolidayStopRequestsDetail],
      attributes: CompositeAttributes =
        CompositeAttributes(holidayStopRequestSfObjectRef, holidayStopRequestSfObjectRef),
  )
  implicit val formatNewHolidayStopRequestsDetail =
    Json.format[RecordsWrapperCaseClass[CompositeTreeHolidayStopRequestsDetail]]
  implicit val formatCompositeTreeHolidayStopRequest = Json.format[CompositeTreeHolidayStopRequest]
  implicit val formatNewHolidayStopRequest = Json.format[RecordsWrapperCaseClass[CompositeTreeHolidayStopRequest]]

  class CreateHolidayStopRequestWithDetail(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]) {

    def run(request: RecordsWrapperCaseClass[CompositeTreeHolidayStopRequest]): ClientFailableOp[HolidayStopRequestId] =
      sfPost
        .setupRequest[RecordsWrapperCaseClass[CompositeTreeHolidayStopRequest]] { createHolidayStopRequestWithDetail =>
          PostRequest(createHolidayStopRequestWithDetail, RelativePath(holidayStopRequestCompositeTreeBaseUrl))
        }
        .parse[CreateHolidayStopRequestResult]
        .map(
          _.results.find(_.referenceId == holidayStopRequestSfObjectRef).map(_.id).get,
        ) // FIXME refactor this to map None to ClientFailure rather than nasty .get
        .runRequest(request)

  }

  object CreateHolidayStopRequestWithDetail {

    case class CreateHolidayStopRequestResultIdWrapper(
        id: HolidayStopRequestId,
        referenceId: String,
    )
    implicit val formatCreateHolidayStopRequestResultIdWrapper = Json.format[CreateHolidayStopRequestResultIdWrapper]
    case class CreateHolidayStopRequestResult(results: List[CreateHolidayStopRequestResultIdWrapper])
    implicit val format: OFormat[CreateHolidayStopRequestResult] = Json.format[CreateHolidayStopRequestResult]

    def buildBody(
        startDate: LocalDate,
        endDate: LocalDate,
        issuesData: List[IssueData],
        sfSubscription: MatchingSubscription,
        bulkSuspensionReason: Option[BulkSuspensionReason],
    ) = {
      RecordsWrapperCaseClass(
        List(
          CompositeTreeHolidayStopRequest(
            Start_Date__c = HolidayStopRequestStartDate(startDate),
            End_Date__c = HolidayStopRequestEndDate(endDate),
            SF_Subscription__c = sfSubscription.Id,
            Bulk_Suspension_Reason__c = bulkSuspensionReason,
            Holiday_Stop_Request_Detail__r = RecordsWrapperCaseClass(
              issuesData.map { issuesData =>
                CompositeTreeHolidayStopRequestsDetail(
                  issuesData.issueDate,
                  Estimated_Price__c = Price(issuesData.credit),
                  Expected_Invoice_Date__c =
                    HolidayStopRequestsDetailExpectedInvoiceDate(issuesData.nextBillingPeriodStartDate),
                )
              },
            ),
          ),
        ),
      )
    }
  }

  case class CompositePart(
      method: String,
      url: String,
      referenceId: String,
      body: JsValue,
  )
  implicit val writesCompositePart = Json.writes[CompositePart]

  case class CompositeRequest(
      allOrNone: Boolean,
      compositeRequest: List[CompositePart],
  )
  implicit val writesCompositeRequest = Json.writes[CompositeRequest]

  case class CompositeResponsePart(
      httpStatusCode: Int,
      body: Option[JsValue],
  )
  implicit val readsCompositeResponsePart = Json.reads[CompositeResponsePart]
  case class CompositeResponse(
      compositeResponse: List[CompositeResponsePart],
  )
  implicit val readsCompositeResponse = Json.reads[CompositeResponse]

  lazy val successStatusCodes = 200 to 299

  private def safeSalesforceCompositeRequestSetupRequest(requestBody: CompositeRequest): PostRequest =
    PostRequest(requestBody, RelativePath(compositeBaseUrl))

  class AmendHolidayStopRequest(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]) {

    def doRequest(req: CompositeRequest): ClientFailableOp[CompositeResponse] =
      sfPost
        .parse[CompositeResponse]
        .setupRequest(safeSalesforceCompositeRequestSetupRequest)
        .runRequest(req)

  }

  object AmendHolidayStopRequest {

    case class AmendHolidayStopRequestItselfBody(
        Start_Date__c: HolidayStopRequestStartDate,
        End_Date__c: HolidayStopRequestEndDate,
    )

    case class AddHolidayStopRequestDetailBody(
        Holiday_Stop_Request__c: HolidayStopRequestId,
        Stopped_Publication_Date__c: LocalDate,
        Estimated_Price__c: Price,
        Expected_Invoice_Date__c: HolidayStopRequestsDetailExpectedInvoiceDate,
    )

    def buildBody(
        holidayStopRequestId: HolidayStopRequestId,
        startDate: LocalDate,
        endDate: LocalDate,
        issuesData: List[IssueData],
        existingPublicationsThatWereToBeStopped: List[HolidayStopRequestsDetail],
    ): Either[String, CompositeRequest] = {

      val masterRecordToBePatched = CompositePart(
        method = "PATCH",
        url = s"$holidayStopRequestSfObjectsBaseUrl/${holidayStopRequestId.value}",
        referenceId = holidayStopRequestSfObjectRef, // constant since only one of these in the request
        body = Json.toJson(
          AmendHolidayStopRequestItselfBody(
            Start_Date__c = HolidayStopRequestStartDate(startDate),
            End_Date__c = HolidayStopRequestEndDate(endDate),
          ),
        )(Json.writes[AmendHolidayStopRequestItselfBody]),
      )

      val detailRecordsToBeAdded = issuesData
        .filterNot(issueData =>
          existingPublicationsThatWereToBeStopped.exists(_.Stopped_Publication_Date__c.value == issueData.issueDate),
        )
        .map { issueData =>
          CompositePart(
            method = "POST",
            url = s"$sfObjectsBaseUrl$HolidayStopRequestsDetailSfObjectRef",
            referenceId = s"CREATE_DETAIL_${generateId()}",
            body = Json.toJson(
              AddHolidayStopRequestDetailBody(
                Holiday_Stop_Request__c = holidayStopRequestId,
                Stopped_Publication_Date__c = issueData.issueDate,
                Estimated_Price__c = Price(issueData.credit),
                Expected_Invoice_Date__c =
                  HolidayStopRequestsDetailExpectedInvoiceDate(issueData.nextBillingPeriodStartDate),
              ),
            )(Json.writes[AddHolidayStopRequestDetailBody]),
          )
        }

      for {
        detailRecordsToBeDeleted <- existingPublicationsThatWereToBeStopped
          .filterNot(holidayStopRequestDetail =>
            issuesData.map(_.issueDate).contains(holidayStopRequestDetail.Stopped_Publication_Date__c.value),
          )
          .traverse(holidayStopRequestDetail => {
            if (holidayStopRequestDetail.Is_Actioned__c)
              Left("actioned publications cannot be deleted")
            else
              Right(
                CompositePart(
                  method = "DELETE",
                  url = s"$sfObjectsBaseUrl$HolidayStopRequestsDetailSfObjectRef/${holidayStopRequestDetail.Id.value}",
                  referenceId = s"DELETE_DETAIL_${generateId()}",
                  body = JsNull,
                ),
              )
          })
      } yield CompositeRequest(
        allOrNone = true,
        compositeRequest = masterRecordToBePatched :: detailRecordsToBeAdded ++ detailRecordsToBeDeleted,
      )
    }

  }

  class CancelHolidayStopRequestDetail(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]) {

    def doRequest(req: CompositeRequest): ClientFailableOp[CompositeResponse] =
      sfPost
        .parse[CompositeResponse]
        .setupRequest(safeSalesforceCompositeRequestSetupRequest)
        .runRequest(req)

  }
  object CancelHolidayStopRequestDetail {
    implicit val cancelHolidayStopRequestDetailBodyReads = Json.writes[CancelHolidayStopRequestDetailBody]
    final case class CancelHolidayStopRequestDetailBody(
        Actual_Price__c: Option[Price],
        Charge_Code__c: Option[RatePlanChargeCode],
    )

    def buildBody(
        holidayStopRequestsDetails: List[HolidayStopRequestsDetail],
        idGenerator: => String,
    ): CompositeRequest = {
      val requestDetailParts = holidayStopRequestsDetails
        .map { requestDetail =>
          CompositePart(
            method = "PATCH",
            url = s"$holidayStopRequestsDetailSfObjectsBaseUrl/${requestDetail.Id.value}",
            referenceId = s"CANCEL_DETAIL_${idGenerator.replace("-", "")}",
            body = Json.toJson(
              CancelHolidayStopRequestDetailBody(requestDetail.Actual_Price__c, requestDetail.Charge_Code__c),
            ),
          )
        }
      CompositeRequest(
        allOrNone = true,
        requestDetailParts,
      )
    }
  }

  object WithdrawHolidayStopRequest {
    case class WithdrawnTimePatch(Withdrawn_Time__c: ZonedDateTime)

    implicit val writes = Json.writes[WithdrawnTimePatch]
  }

  class WithdrawHolidayStopRequest(sfPatch: HttpOp[RestRequestMaker.PatchRequest, Unit]) {
    def run(withdrawlTime: ZonedDateTime, holidayStopRequestId: HolidayStopRequestId): ClientFailableOp[Unit] =
      sfPatch.runRequest(
        PatchRequest(
          WithdrawnTimePatch(withdrawlTime),
          RelativePath(s"$holidayStopRequestSfObjectsBaseUrl/${holidayStopRequestId.value}"),
        )
      )
  }

  private def generateId() = UUID.randomUUID().toString.replace("-", "")
}
