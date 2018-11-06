package com.gu.sf_gocardless_sync

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.sf_gocardless_sync.SyncSharedObjects.{GoCardlessMandateID, GoCardlessMandateUpdateID, Reference}
import com.gu.sf_gocardless_sync.gocardless.GoCardlessDDMandateUpdate.GetEventsSince.{GoCardlessMandateUpdate, MandateUpdateWithMandateDetail}
import com.gu.sf_gocardless_sync.gocardless.{GoCardlessClient, GoCardlessConfig, GoCardlessDDMandateUpdate}
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.Create.WireNewMandate
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.GetAllPaymentMethodWithBillingAccountGivenGoCardlessReference.SfPaymentMethodDetail
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.LookupAll.MandateLookupDetail
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.{BillingAccountSfId, MandateWithSfId, PaymentMethodSfId}
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandate.Update.WirePatchMandate
import com.gu.sf_gocardless_sync.salesforce.SalesforceDDMandateUpdate.Create.WireNewMandateUpdate
import com.gu.sf_gocardless_sync.salesforce.SalesforceSharedObjects.{MandateSfId, MandateUpdateSfId, UpdateHappenedAt}
import com.gu.sf_gocardless_sync.salesforce.{SalesforceDDMandate, SalesforceDDMandateUpdate}
import com.gu.util.Logging
import com.gu.util.config.LoadConfigModule
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.resthttp.{HttpOp, JsonHttp, RestRequestMaker}

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
    Update_Happened_At__c = UpdateHappenedAt(gcMandateUpdate.created_at), //TODO might need some datetime conversion here
    Status__c = gcMandateUpdate.action,
    Cause__c = gcMandateUpdate.details.cause,
    Description__c = gcMandateUpdate.details.description,
    Reason_Code__c = gcMandateUpdate.details.reason_code
  )

  def processUpdateEvents(
    goCardless: GcClient,
    sf: SfClient,
    updatesSinceLastProcessed: List[MandateUpdateWithMandateDetail] // try changing type to NonEmptyList
  ) = for {
    existingSfMandates <- SalesforceDDMandate.LookupAll(sf.client.wrapWith(JsonHttp.get))(updatesSinceLastProcessed.map(gcMandateUpdate => gcMandateUpdate.mandate.id)).toDisjunction
    fetchRelatedPaymentMethodAndBillingAccountIDs = SalesforceDDMandate.GetAllPaymentMethodWithBillingAccountGivenGoCardlessReference(sf.client.wrapWith(JsonHttp.get))
    relatedPaymentMethodAndBillingAccountIDs <- fetchRelatedPaymentMethodAndBillingAccountIDs(updatesSinceLastProcessed.map(gcMandateUpdate => gcMandateUpdate.mandate.reference)).toDisjunction
  } yield updatesSinceLastProcessed.reverse.foreach(
    forEachMandateUpdate(goCardless, sf, existingSfMandates, relatedPaymentMethodAndBillingAccountIDs)
  )

  def forEachMandateUpdate(
    goCardless: GcClient,
    sf: SfClient,
    existingSfMandates: Map[GoCardlessMandateID, MandateLookupDetail],
    relatedPaymentMethodAndBillingAccountIDs: Map[Reference, SfPaymentMethodDetail]
  )(
    gcMandateUpdateWithDetail: MandateUpdateWithMandateDetail
  ) = for {
    sfMandate <- existingSfMandates.get(gcMandateUpdateWithDetail.event.links.mandate) match {
      case None => createMandateInSf(goCardless, sf)(gcMandateUpdateWithDetail, relatedPaymentMethodAndBillingAccountIDs.get(gcMandateUpdateWithDetail.mandate.reference))
      case Some(existingSfMandate) => ClientSuccess(existingSfMandate)
    }
    newMandateUpdateOp = SalesforceDDMandateUpdate.Create(sf.client.wrapWith(JsonHttp.post))
    newMandateWithUpdateId <- newMandateUpdateOp(toSfMandateUpdate(gcMandateUpdateWithDetail.event, sfMandate.Id))
    patchMandateOp <- patchLastMandateUpdateOnMandate(
      sf,
      newMandateWithUpdateId.id,
      sfMandate.Id,
      relatedPaymentMethodAndBillingAccountIDs.get(gcMandateUpdateWithDetail.mandate.reference)
    )
  } yield sfMandate match {
    // if mandate had to be created in SF then always patch the 'Last Update'
    case MandateWithSfId(_) => patchMandateOp
    // if mandate already existed in SF then only patch the 'Last Update' if it's more recent
    case MandateLookupDetail(_, _, _, lastUpdated) if lastUpdated.value < gcMandateUpdateWithDetail.event.created_at => //TODO might need proper datetime comparison
      patchMandateOp
    // otherwise
    case other => System.err.println(s"\n\njust added an out of order event \n\t${gcMandateUpdateWithDetail.event}\n\t$other\n\n")
  }

  def createMandateInSf(
    goCardless: GcClient,
    sf: SfClient
  )(
    gcMandateUpdateWithDetail: MandateUpdateWithMandateDetail,
    sfPaymentMethodDetailOption: Option[SfPaymentMethodDetail]
  ): ClientFailableOp[MandateWithSfId] = for {
    bankDetail <- GoCardlessDDMandateUpdate.GetBankDetail(goCardless.client.wrapWith(JsonHttp.get))(gcMandateUpdateWithDetail.mandate.links.customer_bank_account)
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
