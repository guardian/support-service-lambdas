package com.gu.sf_gocardless_sync.gocardless

import com.gu.sf_gocardless_sync.SyncSharedObjects.{
  BankAccountNumberEnding,
  BankName,
  Cause,
  Description,
  GoCardlessMandateID,
  GoCardlessMandateEventID,
  MandateCreatedAt,
  ReasonCode,
  Reference,
  Status,
}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}

object GoCardlessDDMandateEvent extends Logging {

  case class GoCardlessCustomerBankAccountID(value: String) extends AnyVal
  implicit val formatCustomerBankAccountID = Json.valueFormat[GoCardlessCustomerBankAccountID]

  case class GoCardlessMandateLinks(customer_bank_account: GoCardlessCustomerBankAccountID)
  implicit val linksReads = Json.reads[GoCardlessMandateLinks]

  case class GoCardlessMandateDetail(
      id: GoCardlessMandateID,
      created_at: MandateCreatedAt,
      reference: Reference,
      links: GoCardlessMandateLinks,
  )
  implicit val detailsReads = Json.reads[GoCardlessMandateDetail]

  object GetEventsSince {

    // this endpoint not only hands back events but also includes the basic mandate detail that we need
    // getting the mandate detail is much more efficient in GoCardless API calls, but makes the logic more complicated
    private val gcEventsBaseUrl = "/events?resource_type=mandates&include=mandate"

    case class GoCardlessEventLinks(mandate: GoCardlessMandateID)
    implicit val linksReads = Json.reads[GoCardlessEventLinks]

    case class GoCardlessEventDetails(
        cause: Cause,
        description: Description,
        reason_code: Option[ReasonCode],
    )
    implicit val detailsReads = Json.reads[GoCardlessEventDetails]

    case class GoCardlessMandateEvent(
        id: GoCardlessMandateEventID,
        created_at: String,
        action: Status,
        links: GoCardlessEventLinks,
        details: GoCardlessEventDetails,
    )
    implicit val reads = Json.reads[GoCardlessMandateEvent]

    case class GoCardlessLinkedMandates(
        mandates: List[GoCardlessMandateDetail],
    )
    implicit val readsLinked = Json.reads[GoCardlessLinkedMandates]

    private case class MandateEventsResponse(
        events: List[GoCardlessMandateEvent],
        linked: GoCardlessLinkedMandates,
    )
    private implicit val readsEvents = Json.reads[MandateEventsResponse]

    case class MandateEventWithMandateDetail(
        event: GoCardlessMandateEvent,
        mandate: GoCardlessMandateDetail,
    )

    def apply(
        gcGet: HttpOp[RestRequestMaker.GetRequest, JsValue],
        batchSize: Int,
    ): GoCardlessMandateEventID => ClientFailableOp[List[MandateEventWithMandateDetail]] =
      gcGet.setupRequest(toRequest(batchSize)).parse[MandateEventsResponse].map(toResponse).runRequest

    def toRequest(batchSize: Int)(lastProcessedEventID: GoCardlessMandateEventID) =
      RestRequestMaker.GetRequest(
        RelativePath(
          s"$gcEventsBaseUrl&limit=${Math.min(batchSize, 200)}&before=${lastProcessedEventID.value}",
        ),
      )

    def toResponse(mandateEventsResponse: MandateEventsResponse) = {
      val mandatesMap = mandateEventsResponse.linked.mandates.map(mandate => mandate.id -> mandate).toMap
      mandateEventsResponse.events.map(event => MandateEventWithMandateDetail(event, mandatesMap(event.links.mandate)))
    }

    object GetAlternateStartEvent {

      def apply(
          gcGet: HttpOp[RestRequestMaker.GetRequest, JsValue],
      )(
          defaultEventID: Option[GoCardlessMandateEventID],
      ): ClientFailableOp[GoCardlessMandateEventID] = defaultEventID match {
        case Some(lastEventProcessed) => ClientSuccess(lastEventProcessed)
        case None => gcGet.parse[MandateEventsResponse].map(toResponse).runRequest(createRequest())
      }

      def createRequest() =
        RestRequestMaker.GetRequest(
          RelativePath(
            s"$gcEventsBaseUrl&limit=1&created_at[lte]=2015-08-25T13:13:56.000Z", // TODO make this timestamp configurable
          ),
        )

      def toResponse(mandateEventsResponse: MandateEventsResponse) = {
        mandateEventsResponse.events.head.id
      }
    }

  }

  object GetBankDetail {

    type GetBankDetailOp = GoCardlessCustomerBankAccountID => ClientFailableOp[GoCardlessCustomerBankDetail]

    private val gcCustomerBankAccountsBaseUrl = "/customer_bank_accounts"

    case class GoCardlessCustomerBankDetail(
        account_number_ending: BankAccountNumberEnding,
        bank_name: BankName,
    )
    implicit val detailsReads = Json.reads[GoCardlessCustomerBankDetail]

    private case class GoCardlessCustomerBankDetailResponse(customer_bank_accounts: GoCardlessCustomerBankDetail)
    private implicit val responseReads = Json.reads[GoCardlessCustomerBankDetailResponse]

    def apply(gcGet: HttpOp[RestRequestMaker.GetRequest, JsValue]): GetBankDetailOp =
      gcGet
        .setupRequest[GoCardlessCustomerBankAccountID] { goCardlessCustomerBankAccountID =>
          RestRequestMaker.GetRequest(
            RelativePath(
              s"$gcCustomerBankAccountsBaseUrl/${goCardlessCustomerBankAccountID.value}",
            ),
          )
        }
        .parse[GoCardlessCustomerBankDetailResponse]
        .map(_.customer_bank_accounts)
        .runRequest

  }

}
