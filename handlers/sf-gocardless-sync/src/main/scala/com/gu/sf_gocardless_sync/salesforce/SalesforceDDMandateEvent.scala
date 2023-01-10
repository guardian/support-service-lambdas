package com.gu.sf_gocardless_sync.salesforce

import com.gu.salesforce.SalesforceConstants._
import com.gu.sf_gocardless_sync.SyncSharedObjects.{Cause, Description, GoCardlessMandateEventID, ReasonCode, Status}
import com.gu.sf_gocardless_sync.salesforce.SalesforceSharedObjects.{EventHappenedAt, MandateEventSfId, MandateSfId}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}

object SalesforceDDMandateEvent extends Logging {

  private val mandateSfObjectsBaseUrl = sfObjectsBaseUrl + "DD_Mandate_Event__c"

  object Create {

    case class WireNewMandateEvent(
        GoCardless_Mandate_Event_ID__c: GoCardlessMandateEventID,
        DD_Mandate__c: MandateSfId,
        Event_Happened_At__c: EventHappenedAt,
        Status__c: Status,
        Cause__c: Cause,
        Description__c: Description,
        Reason_Code__c: Option[ReasonCode],
    )
    implicit val writesWireNewMandateEvent = Json.writes[WireNewMandateEvent]

    case class MandateEventWithSfId(id: MandateEventSfId)
    implicit val mandateWithSfIdReads = Json.reads[MandateEventWithSfId]

    def apply(
        sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue],
    ): WireNewMandateEvent => ClientFailableOp[MandateEventWithSfId] =
      sfPost
        .setupRequest[WireNewMandateEvent] { newMandateEvent =>
          PostRequest(newMandateEvent, RelativePath(mandateSfObjectsBaseUrl))
        }
        .parse[MandateEventWithSfId]
        .runRequest

  }

  object GetGoCardlessIdOfLastProcessed {

    case class WithGoCardlessId(GoCardless_Mandate_Event_ID__c: GoCardlessMandateEventID)
    implicit val reads = Json.reads[WithGoCardlessId]

    private case class MandateEventsQueryResponse(records: List[WithGoCardlessId])
    private implicit val readsEvents = Json.reads[MandateEventsQueryResponse]

    def apply(
        sfGet: HttpOp[RestRequestMaker.GetRequest, JsValue],
    ): () => ClientFailableOp[Option[GoCardlessMandateEventID]] = () =>
      sfGet.parse[MandateEventsQueryResponse].map(toResponse).runRequest(createRequest())

    def createRequest() = {
      val soqlQuery = s"SELECT GoCardless_Mandate_Event_ID__c " +
        s"FROM DD_Mandate_Event__c " +
        s"WHERE Event_Happened_At__c != null " +
        s"ORDER BY Name DESC " +
        s"LIMIT 1"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequest(RelativePath(s"$soqlQueryBaseUrl?q=$soqlQuery"))
    }

    def toResponse(mandateEventsQueryResponse: MandateEventsQueryResponse): Option[GoCardlessMandateEventID] = {
      mandateEventsQueryResponse.records.headOption.map(withGoCardlessId =>
        withGoCardlessId.GoCardless_Mandate_Event_ID__c,
      )
    }

  }

}
