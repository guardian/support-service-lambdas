package com.gu.sf_gocardless_sync.gocardless

import ai.x.play.json.Jsonx
import com.gu.sf_gocardless_sync.SyncSharedObjects.{BankAccountNumberEnding, BankName, Cause, Description, GoCardlessMandateID, GoCardlessMandateUpdateID, MandateCreatedAt, ReasonCode, Reference, Status}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}

object GoCardlessDDMandateUpdate extends Logging {

  case class GoCardlessCustomerBankAccountID(value: String) extends AnyVal
  implicit val formatCustomerBankAccountID = Jsonx.formatInline[GoCardlessCustomerBankAccountID]

  case class GoCardlessMandateLinks(customer_bank_account: GoCardlessCustomerBankAccountID)
  implicit val linksReads = Json.reads[GoCardlessMandateLinks]

  case class GoCardlessMandateDetail(
    id: GoCardlessMandateID,
    created_at: MandateCreatedAt,
    reference: Reference,
    links: GoCardlessMandateLinks
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
      reason_code: Option[ReasonCode]
    )
    implicit val detailsReads = Json.reads[GoCardlessEventDetails]

    case class GoCardlessMandateUpdate(
      id: GoCardlessMandateUpdateID,
      created_at: String,
      action: Status,
      links: GoCardlessEventLinks,
      details: GoCardlessEventDetails
    )
    implicit val reads = Json.reads[GoCardlessMandateUpdate]

    case class GoCardlessLinkedMandates(
      mandates: List[GoCardlessMandateDetail]
    )
    implicit val readsLinked = Json.reads[GoCardlessLinkedMandates]

    private case class MandateUpdateEventsResponse(
      events: List[GoCardlessMandateUpdate],
      linked: GoCardlessLinkedMandates
    )
    private implicit val readsUpdates = Json.reads[MandateUpdateEventsResponse]

    case class MandateUpdateWithMandateDetail(
      event: GoCardlessMandateUpdate,
      mandate: GoCardlessMandateDetail
    )

    def apply(gcGet: HttpOp[RestRequestMaker.GetRequest, JsValue], batchSize: Int): GoCardlessMandateUpdateID => ClientFailableOp[List[MandateUpdateWithMandateDetail]] =
      gcGet.setupRequest(toRequest(batchSize)).parse[MandateUpdateEventsResponse].map(toResponse).runRequest

    def toRequest(batchSize: Int)(lastProcessedEventID: GoCardlessMandateUpdateID) =
      RestRequestMaker.GetRequest(RelativePath(
        s"$gcEventsBaseUrl&limit=${Math.min(batchSize, 200)}&before=${lastProcessedEventID.value}"
      ))

    def toResponse(mandateUpdateEventsResponse: MandateUpdateEventsResponse) = {
      val mandatesMap = mandateUpdateEventsResponse.linked.mandates.map(mandate => mandate.id -> mandate).toMap
      mandateUpdateEventsResponse.events.map(event => MandateUpdateWithMandateDetail(event, mandatesMap(event.links.mandate)))
    }

    object GetAlternateStartEvent {

      def apply(
        gcGet: HttpOp[RestRequestMaker.GetRequest, JsValue]
      )(
        defaultUpdateID: Option[GoCardlessMandateUpdateID]
      ): ClientFailableOp[GoCardlessMandateUpdateID] = defaultUpdateID match {
        case Some(lastUpdateProcessed) => ClientSuccess(lastUpdateProcessed)
        case None => gcGet.parse[MandateUpdateEventsResponse].map(toResponse).runRequest(createRequest())
      }

      def createRequest() =
        RestRequestMaker.GetRequest(RelativePath(
          s"$gcEventsBaseUrl&limit=1&created_at[lte]=2015-01-01T00:00:00.000Z"
        ))

      def toResponse(mandateUpdateEventsResponse: MandateUpdateEventsResponse) = {
        mandateUpdateEventsResponse.events.head.id
      }
    }

  }

  object GetBankDetail {

    type GetBankDetailOp = GoCardlessCustomerBankAccountID => ClientFailableOp[GoCardlessCustomerBankDetail]

    private val gcCustomerBankAccountsBaseUrl = "/customer_bank_accounts"

    case class GoCardlessCustomerBankDetail(
      account_number_ending: BankAccountNumberEnding,
      bank_name: BankName
    )
    implicit val detailsReads = Json.reads[GoCardlessCustomerBankDetail]

    private case class GoCardlessCustomerBankDetailResponse(customer_bank_accounts: GoCardlessCustomerBankDetail)
    private implicit val responseReads = Json.reads[GoCardlessCustomerBankDetailResponse]

    def apply(gcGet: HttpOp[RestRequestMaker.GetRequest, JsValue]): GetBankDetailOp =
      gcGet.setupRequest[GoCardlessCustomerBankAccountID] { goCardlessCustomerBankAccountID =>
        RestRequestMaker.GetRequest(RelativePath(
          s"$gcCustomerBankAccountsBaseUrl/${goCardlessCustomerBankAccountID.value}"
        ))
      }.parse[GoCardlessCustomerBankDetailResponse].map(_.customer_bank_accounts).runRequest

  }

}
