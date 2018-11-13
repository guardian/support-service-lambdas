package com.gu.sf_gocardless_sync

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.sf_gocardless_sync.SyncSharedObjects.{GoCardlessMandateUpdateID, Reference}
import com.gu.sf_gocardless_sync.gocardless.GoCardlessDDMandateUpdate.GetEventsSince.{GoCardlessMandateUpdate, MandateUpdateWithMandateDetail}
import com.gu.sf_gocardless_sync.gocardless.{GoCardlessClient, GoCardlessConfig, GoCardlessDDMandateUpdate}
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.Create.WireNewMandate
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.GetPaymentMethodsEtc.SfPaymentMethodDetail
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.LookupAll.{MandateLookupDetail, SfMandateMap}
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.MandateWithSfId
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.Update.WirePatchMandate
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandateUpdate.Create.WireNewMandateUpdate
import com.gu.sf_gocardless_sync.salesforce.SalesforceSharedObjects.{MandateSfId, MandateUpdateSfId, UpdateHappenedAt}
import com.gu.sf_gocardless_sync.salesforce.{SalesforceDDMandate, SalesforceDDMandateUpdate}
import com.gu.util.Logging
import com.gu.util.config.LoadConfigModule
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError}
import com.gu.util.resthttp.{HttpOp, JsonHttp, RestRequestMaker}

import scala.annotation.tailrec

object Handler extends Logging {

  type WiredClient = HttpOp[JsonHttp.StringHttpRequest, RestRequestMaker.BodyAsString]

  case class SfClient(client: WiredClient) extends AnyVal
  case class GcClient(client: WiredClient) extends AnyVal

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    for {
      goCardlessConfig <- LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)[GoCardlessConfig]
      goCardlessClient = GoCardlessClient(RawEffects.response, goCardlessConfig)
      sfClient <- prepareSfClient
      lastUpdateProcessedOption <- SalesforceDDMandateUpdate.GetGoCardlessIdOfLastProcessed(sfClient.wrapWith(JsonHttp.get))().toDisjunction
      startingEventID <- GoCardlessDDMandateUpdate.GetEventsSince.GetAlternateStartEvent(goCardlessClient.wrapWith(JsonHttp.get))(lastUpdateProcessedOption).toDisjunction
      updatesSinceLastProcessed <- GoCardlessDDMandateUpdate.GetEventsSince(goCardlessClient.wrapWith(JsonHttp.get), goCardlessConfig.batchSize)(startingEventID).toDisjunction
    } yield if (updatesSinceLastProcessed.nonEmpty) processUpdateEvents(GcClient(goCardlessClient), SfClient(sfClient), updatesSinceLastProcessed)
    else logger.info("No mandate events to process")

  def prepareSfClient = for {
    sfConfig <- LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)[SFAuthConfig]
    sfClient <- SalesforceClient(RawEffects.response, sfConfig).value.toDisjunction
  } yield sfClient

  def toSfMandateUpdate(gcMandateUpdate: GoCardlessMandateUpdate, mandateSfId: MandateSfId) = WireNewMandateUpdate(
    GoCardless_Mandate_Update_ID__c = GoCardlessMandateUpdateID(gcMandateUpdate.id.value),
    DD_Mandate__c = mandateSfId,
    Update_Happened_At__c = UpdateHappenedAt(gcMandateUpdate.created_at),
    Status__c = gcMandateUpdate.action,
    Cause__c = gcMandateUpdate.details.cause,
    Description__c = gcMandateUpdate.details.description,
    Reason_Code__c = gcMandateUpdate.details.reason_code
  )

  def processUpdateEvents(
    goCardless: GcClient,
    sf: SfClient,
    updatesSinceLastProcessed: List[MandateUpdateWithMandateDetail]
  ) = {
    val mandateIds = updatesSinceLastProcessed.map(gcMandateUpdate => gcMandateUpdate.mandate.id)
    val mandateReferences = updatesSinceLastProcessed.map(gcMandateUpdate => gcMandateUpdate.mandate.reference)
    for {
      existingSfMandates <- SalesforceDDMandate.LookupAll(sf.client.wrapWith(JsonHttp.get))(mandateIds).toDisjunction
      fetchPaymentMethodsEtcOp = SalesforceDDMandate.GetPaymentMethodsEtc(sf.client.wrapWith(JsonHttp.get))
      relatedPaymentMethodAndBillingAccountIDs <- fetchPaymentMethodsEtcOp(mandateReferences).toDisjunction
    } yield recursivelyProcessMandateUpdates(
      existingSfMandates,
      updatesSinceLastProcessed.reverse,
      processEachMandate(goCardless, sf, relatedPaymentMethodAndBillingAccountIDs)
    )
  }

  @tailrec def recursivelyProcessMandateUpdates(
    sfMandateMap: SfMandateMap,
    mandateUpdateEvents: List[MandateUpdateWithMandateDetail],
    processEachMandateOp: (SfMandateMap, MandateUpdateWithMandateDetail) => ClientFailableOp[SfMandateMap]
  ): ClientFailableOp[Unit] = mandateUpdateEvents match {
    case Nil => ClientSuccess(())
    case head :: tail => {
      processEachMandateOp(sfMandateMap, head) match {
        case err: ClientFailure => err // stops processing events on any ClientFailure
        case ClientSuccess(latestSfMandateMap) =>
          recursivelyProcessMandateUpdates(latestSfMandateMap, tail, processEachMandateOp)
      }
    }
  }

  def processEachMandate(
    goCardless: GcClient,
    sf: SfClient,
    relatedPaymentMethodEtc: Map[Reference, SfPaymentMethodDetail]
  )(
    sfMandateMap: SfMandateMap,
    gcMandateUpdateDetail: MandateUpdateWithMandateDetail
  ): ClientFailableOp[SfMandateMap] = for {
    sfMandate <- getOrCreateMandateInSf(goCardless, sf, sfMandateMap, gcMandateUpdateDetail, relatedPaymentMethodEtc)
    newMandateUpdateOp = SalesforceDDMandateUpdate.Create(sf.client.wrapWith(JsonHttp.post))
    newMandateWithUpdateId <- newMandateUpdateOp(toSfMandateUpdate(gcMandateUpdateDetail.event, sfMandate.Id))
    patchMandateOp <- patchLastMandateUpdateOnMandate(
      sf,
      newMandateWithUpdateId.id,
      sfMandate.Id,
      relatedPaymentMethodEtc.get(gcMandateUpdateDetail.mandate.reference)
    )
    _ = patchMandateIfNecessary(gcMandateUpdateDetail, sfMandate, patchMandateOp)
  } yield sfMandateMap + (gcMandateUpdateDetail.mandate.id -> MandateLookupDetail(
    Id = sfMandate.Id,
    GoCardless_Mandate_ID__c = gcMandateUpdateDetail.mandate.id,
    Last_Mandate_Update__c = newMandateWithUpdateId.id,
    Status_Changed_At__c = UpdateHappenedAt(gcMandateUpdateDetail.event.created_at)
  ))

  def getOrCreateMandateInSf(
    goCardless: GcClient,
    sf: SfClient,
    sfMandateMap: SfMandateMap,
    gcMandateUpdateDetail: MandateUpdateWithMandateDetail,
    relatedPaymentMethodAndBillingAccountIDs: Map[Reference, SfPaymentMethodDetail]
  ) = sfMandateMap.get(gcMandateUpdateDetail.event.links.mandate) match {
    case None => createMandateInSf(
      goCardless,
      sf,
      sfMandateMap
    )(
      gcMandateUpdateDetail,
      relatedPaymentMethodAndBillingAccountIDs.get(gcMandateUpdateDetail.mandate.reference)
    )
    case Some(existingSfMandate) => ClientSuccess(existingSfMandate)
  }

  def createMandateInSf(
    goCardless: GcClient,
    sf: SfClient,
    existingSfMandates: SfMandateMap
  )(
    gcMandateUpdateWithDetail: MandateUpdateWithMandateDetail,
    sfPaymentMethodDetailOption: Option[SfPaymentMethodDetail]
  ): ClientFailableOp[SalesforceDDMandate.MandateWithSfId] = {
    val getBankDetailOp = GoCardlessDDMandateUpdate.GetBankDetail(goCardless.client.wrapWith(JsonHttp.get))
    for {
      bankDetail <- getBankDetailOp(gcMandateUpdateWithDetail.mandate.links.customer_bank_account)
      newSfMandate <- SalesforceDDMandate.Create(sf.client.wrapWith(JsonHttp.post))(WireNewMandate(
        GoCardless_Mandate_ID__c = gcMandateUpdateWithDetail.mandate.id,
        Reference__c = gcMandateUpdateWithDetail.mandate.reference,
        Mandate_Created_At__c = gcMandateUpdateWithDetail.mandate.created_at,
        Payment_Method__c = sfPaymentMethodDetailOption.map(_.Id),
        Billing_Account__c = sfPaymentMethodDetailOption.map(_.Zuora__BillingAccount__c),
        Bank_Name__c = bankDetail.bank_name,
        Account_Number_Ending__c = bankDetail.account_number_ending
      ))
    } yield newSfMandate
  }

  def patchMandateIfNecessary(
    gcMandateUpdateDetail: MandateUpdateWithMandateDetail,
    sfMandate: SalesforceDDMandate.WithMandateSfId,
    patchMandateOp: Unit
  ) = {
    sfMandate match {
      // if mandate already existed in SF then only patch the 'Last Update' if it's more recent
      case MandateLookupDetail(_, _, _, lastUpdated) if lastUpdated.value < gcMandateUpdateDetail.event.created_at =>
        patchMandateOp
      // if mandate had to be created in SF then always patch the 'Last Update'
      case MandateWithSfId(_) =>
        patchMandateOp
      case other =>
        () => GenericError(s"\n\njust created an out of order event \n\t${gcMandateUpdateDetail.event}\n\t$other\n\n")
    }
  }

  def patchLastMandateUpdateOnMandate(
    sf: SfClient,
    newMandateUpdateId: MandateUpdateSfId,
    mandateSfId: MandateSfId,
    sfPaymentMethodDetailOption: Option[SfPaymentMethodDetail]
  )(): ClientFailableOp[Unit] =
    SalesforceDDMandate.Update(sf.client.wrapWith(JsonHttp.patch))(mandateSfId)(WirePatchMandate(
      Last_Mandate_Update__c = newMandateUpdateId,
      Payment_Method__c = sfPaymentMethodDetailOption.map(_.Id),
      Billing_Account__c = sfPaymentMethodDetailOption.map(_.Zuora__BillingAccount__c)
    ))

}
