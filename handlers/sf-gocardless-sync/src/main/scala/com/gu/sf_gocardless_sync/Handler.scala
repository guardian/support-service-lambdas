package com.gu.sf_gocardless_sync

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.SalesforceReads._
import com.gu.sf_gocardless_sync.SyncSharedObjects.{Description, GoCardlessMandateEventID, Reference}
import com.gu.sf_gocardless_sync.gocardless.GoCardlessDDMandateEvent.GetEventsSince._
import com.gu.sf_gocardless_sync.gocardless.{GoCardlessClient, GoCardlessConfig, GoCardlessDDMandateEvent}
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.Create.WireNewMandate
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.GetPaymentMethodsEtc.SfPaymentMethodDetail
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.LookupAll.{MandateLookupDetail, SfMandateMap}
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.MandateWithSfId
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.Update.WirePatchMandate
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandateEvent.Create.WireNewMandateEvent
import com.gu.sf_gocardless_sync.salesforce.SalesforceSharedObjects.{EventHappenedAt, MandateEventSfId, MandateSfId}
import com.gu.sf_gocardless_sync.salesforce.{SalesforceDDMandate, SalesforceDDMandateEvent}
import com.gu.util.Logging
import com.gu.util.config.LoadConfigModule
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError}
import com.gu.util.resthttp.{HttpOp, JsonHttp, RestRequestMaker}
import play.api.libs.json.JsValue

import scala.annotation.tailrec

object Handler extends Logging {

  type WiredClient = HttpOp[JsonHttp.StringHttpRequest, RestRequestMaker.BodyAsString]

  case class SfClient(client: WiredClient) extends AnyVal
  case class GcGet(get: HttpOp[RestRequestMaker.GetRequest, JsValue]) extends AnyVal

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = for {
    goCardlessConfig <- LoadConfigModule(RawEffects.stage, GetFromS3.fetchString).load[GoCardlessConfig]
    goCardlessClient = GoCardlessClient(RawEffects.response, goCardlessConfig)
    sfClient <- prepareSfClient
    sfGet = sfClient.wrapWith(JsonHttp.get)
    gcGet = goCardlessClient.wrapWith(JsonHttp.get)
    lastEventProcessedOption <- SalesforceDDMandateEvent.GetGoCardlessIdOfLastProcessed(sfGet)().toDisjunction
    getStartingEventIdOp = GoCardlessDDMandateEvent.GetEventsSince.GetAlternateStartEvent(gcGet) _
    startingEventID <- getStartingEventIdOp(lastEventProcessedOption).toDisjunction
    getNextBatchOfMandateEventsOp = GoCardlessDDMandateEvent.GetEventsSince(gcGet, goCardlessConfig.batchSize)
    eventsSinceLastProcessed <- getNextBatchOfMandateEventsOp(startingEventID).toDisjunction
  } yield
    if (eventsSinceLastProcessed.nonEmpty)
      processMandateEvents(GcGet(gcGet), SfClient(sfClient), eventsSinceLastProcessed)
    else
      logger.info("No mandate events to process")

  def prepareSfClient = for {
    sfConfig <- LoadConfigModule(RawEffects.stage, GetFromS3.fetchString).load[SFAuthConfig]
    sfClient <- SalesforceClient(RawEffects.response, sfConfig).value.toDisjunction
  } yield sfClient

  def toSfMandateEvent(gcMandateEvent: GoCardlessMandateEvent, mandateSfId: MandateSfId) = WireNewMandateEvent(
    GoCardless_Mandate_Event_ID__c = GoCardlessMandateEventID(gcMandateEvent.id.value),
    DD_Mandate__c = mandateSfId,
    Event_Happened_At__c = EventHappenedAt(gcMandateEvent.created_at),
    Status__c = gcMandateEvent.action,
    Cause__c = gcMandateEvent.details.cause,
    Description__c = Description(gcMandateEvent.details.description.value.take(255)), // SF field limit
    Reason_Code__c = gcMandateEvent.details.reason_code,
  )

  def processMandateEvents(
      goCardless: GcGet,
      sf: SfClient,
      eventsSinceLastProcessed: List[MandateEventWithMandateDetail],
  ) = {
    val mandateIds = eventsSinceLastProcessed.map(gcMandateEvent => gcMandateEvent.mandate.id)
    val mandateReferences = eventsSinceLastProcessed.map(gcMandateEvent => gcMandateEvent.mandate.reference)
    for {
      existingSfMandates <- SalesforceDDMandate.LookupAll(sf.client.wrapWith(JsonHttp.get))(mandateIds).toDisjunction
      fetchPaymentMethodsEtcOp = SalesforceDDMandate.GetPaymentMethodsEtc(sf.client.wrapWith(JsonHttp.get))
      relatedPaymentMethodAndBillingAccountIDs <- fetchPaymentMethodsEtcOp(mandateReferences).toDisjunction
    } yield recursivelyProcessMandateEvents(
      existingSfMandates,
      eventsSinceLastProcessed.reverse,
      processEachMandate(goCardless, sf, relatedPaymentMethodAndBillingAccountIDs),
    )
  }

  @tailrec def recursivelyProcessMandateEvents(
      sfMandateMap: SfMandateMap,
      mandateEvents: List[MandateEventWithMandateDetail],
      processEachMandateOp: (SfMandateMap, MandateEventWithMandateDetail) => ClientFailableOp[SfMandateMap],
  ): ClientFailableOp[Unit] = mandateEvents match {
    case Nil => ClientSuccess(())
    case head :: tail =>
      processEachMandateOp(sfMandateMap, head) match {
        case err: ClientFailure => err // stops processing events on any ClientFailure
        case ClientSuccess(latestSfMandateMap) =>
          recursivelyProcessMandateEvents(latestSfMandateMap, tail, processEachMandateOp)
      }
  }

  def processEachMandate(
      goCardless: GcGet,
      sf: SfClient,
      relatedPaymentMethodEtc: Map[Reference, SfPaymentMethodDetail],
  )(
      sfMandateMap: SfMandateMap,
      gcMandateEventDetail: MandateEventWithMandateDetail,
  ): ClientFailableOp[SfMandateMap] = for {
    sfMandate <- getOrCreateMandateInSf(goCardless, sf, sfMandateMap, gcMandateEventDetail, relatedPaymentMethodEtc)
    newMandateEventOp = SalesforceDDMandateEvent.Create(sf.client.wrapWith(JsonHttp.post))
    newMandateWithEventId <- newMandateEventOp(toSfMandateEvent(gcMandateEventDetail.event, sfMandate.Id))
    patchMandateOp <- patchLastStatusEventOnMandate(
      sf,
      newMandateWithEventId.id,
      sfMandate.Id,
      relatedPaymentMethodEtc.get(gcMandateEventDetail.mandate.reference),
    )
    _ = patchMandateIfNecessary(gcMandateEventDetail, sfMandate, patchMandateOp)
  } yield sfMandateMap + (gcMandateEventDetail.mandate.id -> MandateLookupDetail(
    Id = sfMandate.Id,
    GoCardless_Mandate_ID__c = gcMandateEventDetail.mandate.id,
    Last_Mandate_Event__c = newMandateWithEventId.id,
    Status_Changed_At__c = EventHappenedAt(gcMandateEventDetail.event.created_at),
  ))

  def getOrCreateMandateInSf(
      goCardless: GcGet,
      sf: SfClient,
      sfMandateMap: SfMandateMap,
      gcMandateEventDetail: MandateEventWithMandateDetail,
      relatedPaymentMethodAndBillingAccountIDs: Map[Reference, SfPaymentMethodDetail],
  ) = sfMandateMap.get(gcMandateEventDetail.event.links.mandate) match {
    case None =>
      createMandateInSf(
        goCardless,
        sf,
        sfMandateMap,
      )(
        gcMandateEventDetail,
        relatedPaymentMethodAndBillingAccountIDs.get(gcMandateEventDetail.mandate.reference),
      )
    case Some(existingSfMandate) => ClientSuccess(existingSfMandate)
  }

  def createMandateInSf(
      goCardless: GcGet,
      sf: SfClient,
      existingSfMandates: SfMandateMap,
  )(
      gcMandateEventWithDetail: MandateEventWithMandateDetail,
      sfPaymentMethodDetailOption: Option[SfPaymentMethodDetail],
  ): ClientFailableOp[SalesforceDDMandate.MandateWithSfId] = {
    val getBankDetailOp = GoCardlessDDMandateEvent.GetBankDetail(goCardless.get)
    for {
      bankDetail <- getBankDetailOp(gcMandateEventWithDetail.mandate.links.customer_bank_account)
      newSfMandate <- SalesforceDDMandate.Create(sf.client.wrapWith(JsonHttp.post))(
        WireNewMandate(
          GoCardless_Mandate_ID__c = gcMandateEventWithDetail.mandate.id,
          Reference__c = gcMandateEventWithDetail.mandate.reference,
          Mandate_Created_At__c = gcMandateEventWithDetail.mandate.created_at,
          Payment_Method__c = sfPaymentMethodDetailOption.map(_.Id),
          Billing_Account__c = sfPaymentMethodDetailOption.map(_.Zuora__BillingAccount__c),
          Bank_Name__c = bankDetail.bank_name,
          Account_Number_Ending__c = bankDetail.account_number_ending,
        ),
      )
    } yield newSfMandate
  }

  def patchMandateIfNecessary(
      gcMandateEventDetail: MandateEventWithMandateDetail,
      sfMandate: SalesforceDDMandate.WithMandateSfId,
      patchMandateOp: Unit,
  ) = {
    sfMandate match {
      // if mandate already existed in SF then only patch the 'Last Event' if it's more recent
      case MandateLookupDetail(_, _, _, lastUpdated) if lastUpdated.value < gcMandateEventDetail.event.created_at =>
        patchMandateOp
      // if mandate had to be created in SF then always patch the 'Last Event'
      case MandateWithSfId(_) =>
        patchMandateOp
      case other =>
        () => GenericError(s"\n\njust created an out of order event \n\t${gcMandateEventDetail.event}\n\t$other\n\n")
    }
  }

  def patchLastStatusEventOnMandate(
      sf: SfClient,
      newMandateEventId: MandateEventSfId,
      mandateSfId: MandateSfId,
      sfPaymentMethodDetailOption: Option[SfPaymentMethodDetail],
  ): ClientFailableOp[Unit] =
    SalesforceDDMandate.Update(sf.client.wrapWith(JsonHttp.patch))(mandateSfId)(
      WirePatchMandate(
        Last_Mandate_Event__c = newMandateEventId,
        Payment_Method__c = sfPaymentMethodDetailOption.map(_.Id),
        Billing_Account__c = sfPaymentMethodDetailOption.map(_.Zuora__BillingAccount__c),
      ),
    )

}
