package com.gu.sf_gocardless_sync.salesforce

import com.gu.salesforce.SalesforceConstants._
import com.gu.sf_gocardless_sync.SyncSharedObjects.{
  BankAccountNumberEnding,
  BankName,
  GoCardlessMandateID,
  MandateCreatedAt,
  Reference,
}
import com.gu.sf_gocardless_sync.salesforce.SalesforceSharedObjects.{EventHappenedAt, MandateEventSfId, MandateSfId}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}

object SalesforceDDMandate extends Logging {

  private val mandateSfObjectsBaseUrl = sfObjectsBaseUrl + "DD_Mandate__c"

  case class BillingAccountSfId(value: String) extends AnyVal
  implicit val formatBillingAccountSfId = Json.valueFormat[BillingAccountSfId]

  case class PaymentMethodSfId(value: String) extends AnyVal
  implicit val formatPaymentMethodSfId = Json.valueFormat[PaymentMethodSfId]

  sealed trait WithMandateSfId {
    def Id: MandateSfId
  }
  case class MandateWithSfId(Id: MandateSfId) extends WithMandateSfId

  object Create {

    case class WireNewMandate(
        GoCardless_Mandate_ID__c: GoCardlessMandateID,
        Reference__c: Reference,
        Mandate_Created_At__c: MandateCreatedAt,
        Billing_Account__c: Option[BillingAccountSfId],
        Payment_Method__c: Option[PaymentMethodSfId],
        Bank_Name__c: BankName,
        Account_Number_Ending__c: BankAccountNumberEnding,
    )
    implicit val writesWireNewMandate = Json.writes[WireNewMandate]

    case class MandateWithSfLowercaseId(id: MandateSfId)
    implicit val mandateSfLowercaseIdReads = Json.reads[MandateWithSfLowercaseId]

    def apply(
        sfPost: HttpOp[RestRequestMaker.PostRequest, JsValue],
    ): WireNewMandate => ClientFailableOp[MandateWithSfId] =
      sfPost
        .setupRequest[WireNewMandate] { newMandateEvent =>
          PostRequest(newMandateEvent, RelativePath(mandateSfObjectsBaseUrl))
        }
        .parse[MandateWithSfLowercaseId]
        .map(withLowercaseId => MandateWithSfId(withLowercaseId.id))
        .runRequest

  }

  object Update {

    case class WirePatchMandate(
        Last_Mandate_Event__c: MandateEventSfId,
        Billing_Account__c: Option[BillingAccountSfId],
        Payment_Method__c: Option[PaymentMethodSfId],
    )
    implicit val writesWirePatchMandate = Json.writes[WirePatchMandate]

    def apply(
        sfPatch: HttpOp[RestRequestMaker.PatchRequest, Unit],
    )(mandateSfId: MandateSfId): WirePatchMandate => ClientFailableOp[Unit] =
      sfPatch
        .setupRequest[WirePatchMandate] { newMandateEvent =>
          PatchRequest(newMandateEvent, RelativePath(s"$mandateSfObjectsBaseUrl/${mandateSfId.value}"))
        }
        .runRequest

  }

  object LookupAll {

    case class MandateLookupDetail(
        Id: MandateSfId,
        GoCardless_Mandate_ID__c: GoCardlessMandateID,
        Last_Mandate_Event__c: MandateEventSfId,
        Status_Changed_At__c: EventHappenedAt,
    ) extends WithMandateSfId
    implicit val reads = Json.reads[MandateLookupDetail]

    private case class MandateSearchQueryResponse(records: List[MandateLookupDetail])
    private implicit val readsIds = Json.reads[MandateSearchQueryResponse]

    type SfMandateMap = Map[GoCardlessMandateID, MandateLookupDetail];

    def apply(
        sfGet: HttpOp[RestRequestMaker.GetRequest, JsValue],
    ): List[GoCardlessMandateID] => ClientFailableOp[SfMandateMap] =
      sfGet.setupRequest(toRequest).parse[MandateSearchQueryResponse].map(toResponse).runRequest

    def toRequest(mandateIDs: List[GoCardlessMandateID]) = {
      val soqlQuery = s"SELECT Id, GoCardless_Mandate_ID__c, Last_Mandate_Event__c, Status_Changed_At__c " +
        s"FROM DD_Mandate__c " +
        s"WHERE GoCardless_Mandate_ID__c IN (${mandateIDs.map(mandateID => s"'${mandateID.value}'").mkString(", ")})"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequest(RelativePath(s"$soqlQueryBaseUrl?q=$soqlQuery"))
    }

    def toResponse(mandateSearchQueryResponse: MandateSearchQueryResponse): SfMandateMap =
      mandateSearchQueryResponse.records
        .map(mandateLookupDetail => mandateLookupDetail.GoCardless_Mandate_ID__c -> mandateLookupDetail)
        .toMap

  }

  object GetPaymentMethodsEtc {

    case class SfPaymentMethodDetail(
        Zuora__MandateID__c: Reference,
        Id: PaymentMethodSfId,
        Zuora__BillingAccount__c: BillingAccountSfId,
        Zuora__BankTransferAccountNumber__c: String, // TODO use this to check against the one from GoCardless
    )
    implicit val reads = Json.reads[SfPaymentMethodDetail]

    private case class ReferenceSearchQueryResponse(records: List[SfPaymentMethodDetail])
    private implicit val readsIds = Json.reads[ReferenceSearchQueryResponse]

    def apply(
        sfGet: HttpOp[RestRequestMaker.GetRequest, JsValue],
    ): List[Reference] => ClientFailableOp[Map[Reference, SfPaymentMethodDetail]] =
      sfGet.setupRequest(toRequest).parse[ReferenceSearchQueryResponse].map(toResponse).runRequest

    def toRequest(references: List[Reference]) = {
      val soqlQuery =
        s"SELECT Id, Zuora__MandateID__c, Zuora__BillingAccount__c, Zuora__BankTransferAccountNumber__c " +
          s"FROM Zuora__PaymentMethod__c " +
          s"WHERE Zuora__MandateID__c IN (${references.map(ref => s"'${ref.value}'").mkString(", ")})"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequest(RelativePath(s"$soqlQueryBaseUrl?q=$soqlQuery"))
    }

    def toResponse(referenceSearchQueryResponse: ReferenceSearchQueryResponse): Map[Reference, SfPaymentMethodDetail] =
      referenceSearchQueryResponse.records
        .map(paymentMethodDetail => paymentMethodDetail.Zuora__MandateID__c -> paymentMethodDetail)
        .toMap

  }

}
