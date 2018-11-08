package com.gu.sf_gocardless_sync.salesforce

import com.gu.sf_gocardless_sync.SyncSharedObjects.{Cause, Description, GoCardlessMandateUpdateID, ReasonCode, Status}
import com.gu.sf_gocardless_sync.salesforce.SalesforceSharedObjects.{MandateSfId, MandateUpdateSfId, UpdateHappenedAt}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}

object SalesforceDDMandateUpdate extends Logging {

  private val sfApiBaseUrl = "/services/data/v29.0"
  private val mandateSfObjectsBaseUrl = sfApiBaseUrl + "/sobjects/DD_Mandate_Update__c"
  private val soqlQueryBaseUrl = sfApiBaseUrl + "/query/?q="

  object Create {

    case class WireNewMandateUpdate(
      GoCardless_Mandate_Update_ID__c: GoCardlessMandateUpdateID,
      DD_Mandate__c: MandateSfId,
      Update_Happened_At__c: UpdateHappenedAt,
      Status__c: Status,
      Cause__c: Cause,
      Description__c: Description,
      Reason_Code__c: Option[ReasonCode]
    )
    implicit val writesWireNewMandateUpdate = Json.writes[WireNewMandateUpdate]

    case class MandateUpdateWithSfId(id: MandateUpdateSfId)
    implicit val mandateWithSfIdReads = Json.reads[MandateUpdateWithSfId]

    def apply(sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue]): WireNewMandateUpdate => ClientFailableOp[MandateUpdateWithSfId] =
      sfPost.setupRequest[WireNewMandateUpdate] { newMandateUpdate =>
        PostRequest(newMandateUpdate, RelativePath(mandateSfObjectsBaseUrl))
      }.parse[MandateUpdateWithSfId].runRequest

  }

  object GetGoCardlessIdOfLastProcessed {

    case class WithGoCardlessId(GoCardless_Mandate_Update_ID__c: GoCardlessMandateUpdateID)
    implicit val reads = Json.reads[WithGoCardlessId]

    private case class MandateUpdatesQueryResponse(records: List[WithGoCardlessId])
    private implicit val readsUpdates = Json.reads[MandateUpdatesQueryResponse]

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequest, JsValue]): () => ClientFailableOp[Option[GoCardlessMandateUpdateID]] = () =>
      sfGet.parse[MandateUpdatesQueryResponse].map(toResponse).runRequest(createRequest())

    def createRequest() = {
      val soqlQuery = s"SELECT GoCardless_Mandate_Update_ID__c " +
        s"FROM DD_Mandate_Update__c " +
        s"WHERE Update_Happened_At__c != null " +
        s"ORDER BY Update_Happened_At__c DESC, LastModifiedDate DESC " +
        s"LIMIT 1"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequest(RelativePath(s"$soqlQueryBaseUrl$soqlQuery"))
    }

    def toResponse(mandateUpdatesQueryResponse: MandateUpdatesQueryResponse): Option[GoCardlessMandateUpdateID] = {
      mandateUpdatesQueryResponse.records.headOption.map(withGoCardlessId => withGoCardlessId.GoCardless_Mandate_Update_ID__c)
    }

  }

}
