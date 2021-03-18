package com.gu.soft_opt_in_consent_setter
import com.gu.soft_opt_in_consent_setter.models.{
  SoftOptInConfig,
  SoftOptInError
}
import io.circe._
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax.EncoderOps

object Main extends App {

  case class EnhancedCancelledSub(
      identityId: String,
      cancelledSub: SFSubscription.Record,
      associatedActiveNonGiftSubs: Seq[AssociatedSFSubscription.Record],
      identityUpdateNeeded: Boolean
  )
  val SFConnector = new SalesforceConnector()
  for {
    config <- SoftOptInConfig.optConfig
    sfAuthDetails <- decode[SFConnector.SfAuthDetails](SFConnector.auth(config))

    allSubsToProcessFromSf <- SFConnector.getSfSubs(
      sfAuthDetails
    )
  } yield {
    val sfRecords = allSubsToProcessFromSf.records

    val acqSubUpdatesToWriteBackToSf = processAcqSubs(
      sfRecords.filter(
        _.Soft_Opt_in_Status__c.equals("Ready to process acquisition")
      )
    )
    println("acqSubUpdatesToWriteBackToSf:" + acqSubUpdatesToWriteBackToSf)

    updateSubsInSf(
      sfAuthDetails,
      SFConnector
        .BodyForWriteBackToSf(false, acqSubUpdatesToWriteBackToSf)
        .asJson
        .spaces2
    )

    val cancellationSubs =
      sfRecords.filter(
        _.Soft_Opt_in_Status__c.equals("Ready to process cancellation")
      )

    val cancSubUpdatesToWriteBackToSf =
      processCancSubs(sfAuthDetails, cancellationSubs)
    println("cancSubUpdatesToWriteBackToSf:" + cancSubUpdatesToWriteBackToSf)

    cancSubUpdatesToWriteBackToSf map (
      subList => { // What happens when it throws?
        updateSubsInSf(
          sfAuthDetails,
          SFConnector.BodyForWriteBackToSf(false, subList).asJson.spaces2
        )

      }
    )

  }

  def getEnhancedCancSubs(
      cancSubs: Seq[SFSubscription.Record],
      associatedSubs: Seq[AssociatedSFSubscription.Record]
  ): Seq[EnhancedCancelledSub] = {

    cancSubs.map(a => {

      val associatedActiveNonGiftSubs =
        associatedSubs
          .filter(
            _.IdentityID__c.equals(a.Buyer__r.IdentityID__c)
          )

      EnhancedCancelledSub(
        identityId = a.Buyer__r.IdentityID__c,
        cancelledSub = a,
        associatedActiveNonGiftSubs = associatedActiveNonGiftSubs,
        identityUpdateNeeded = !consentOverlapExists(
          a,
          associatedActiveNonGiftSubs
        )
      )
    })

  }

  def consentOverlapExists(
      sub: SFSubscription.Record,
      AssociatedActiveNonGiftSubs: Seq[AssociatedSFSubscription.Record]
  ): Boolean = {
    false
  }

  def processAcqSubs(
      acqSubs: Seq[SFSubscription.Record]
  ): Seq[SFSubscription.UpdateRecord] = {

    // TODO: Get these from env variables
    val IDAPIConnector = new IdentityConnector("someHost.com", "some token")

    acqSubs.map(sub => {

      buildSfResponse(
        sub,
        "Acquisition",
        for {
          consents <-
            SoftOptInConfig.consentsCalculatorV2.getAcqConsents(sub.Product__c)
          consentsBody =
            ConsentsCalculator.buildConsentsBody(consents, state = true)
          result <- IDAPIConnector.sendConsentsReq(sub.Id, consentsBody)
        } yield result
      )
    })
  }

  def processCancSubs(
      sfAuthDetails: SFConnector.SfAuthDetails,
      cancSubs: Seq[SFSubscription.Record]
  ): Either[Throwable, Seq[SFSubscription.UpdateRecord]] = {
    val identityIds = getIdentityIdsFromSubs(cancSubs)
    println("identityIds:" + identityIds)

    for {
      subsToCheckConsentOverlapAgainst <-
        getSfSubsOverlapCheck(sfAuthDetails, identityIds)
    } yield {
      val sfSubsAssociatedWithIdentityIdsOnCancSubs =
        subsToCheckConsentOverlapAgainst.records

      val enhancedCancelledSubs =
        getEnhancedCancSubs(cancSubs, sfSubsAssociatedWithIdentityIdsOnCancSubs)

      val updatedConsentSubs = processIdentityConsentUpdates(
        enhancedCancelledSubs
          .filter(_.identityUpdateNeeded.equals(true))
          .map(enhancedSub => enhancedSub.cancelledSub),
        "Cancellation"
      )

      val cancSubsWhereIdentityUpdateIsNOTNeeded =
        enhancedCancelledSubs
          .filter(_.identityUpdateNeeded.equals(false))
          .map(enhancedSub => enhancedSub.cancelledSub)
          .map(sub => successfulUpdateToIdentityConsents(sub, "Cancellation"))

      val cancSubsToUpdateInSf =
        (updatedConsentSubs ++ cancSubsWhereIdentityUpdateIsNOTNeeded)
          .map(sub =>
            SFSubscription.UpdateRecord(
              sub.Id,
              sub.Soft_Opt_in_Last_Stage_Processed__c,
              sub.Soft_Opt_in_Number_of_Attempts__c
            )
          )
      cancSubsToUpdateInSf
    }

  }

  def buildSfResponse(
      sub: SFSubscription.Record,
      stage: String,
      result: Either[SoftOptInError, Unit]
  ): SFSubscription.UpdateRecord = {
    result match {
      case Right(_) => successfulUpdateToIdentityConsents(sub, stage)
      case Left(failure) => {
        // TODO: Log error
        println(failure)
        failedUpdateToIdentityConsents(sub)
      }
    }
  }

  def processIdentityConsentUpdates(
      subs: Seq[SFSubscription.Record],
      softOptInStage: String
  ): Seq[SFSubscription.UpdateRecord] = {
    subs.map(sub => {

      setConsentsInIdentityForSub(sub.Id, Set()) match {
        case true  => successfulUpdateToIdentityConsents(sub, softOptInStage)
        case false => failedUpdateToIdentityConsents(sub)
      }

    })
  }

  def successfulUpdateToIdentityConsents(
      sub: SFSubscription.Record,
      softOptInStage: String
  ): SFSubscription.UpdateRecord = {
    println("I succeeded!")

    SFSubscription.UpdateRecord(
      Id = sub.Id,
      Soft_Opt_in_Number_of_Attempts__c = 0,
      Soft_Opt_in_Last_Stage_Processed__c = Some(softOptInStage)
    )
  }

  def failedUpdateToIdentityConsents(
      sub: SFSubscription.Record
  ): SFSubscription.UpdateRecord = {
    println("I failed!")

    SFSubscription.UpdateRecord(
      Id = sub.Id,
      Soft_Opt_in_Number_of_Attempts__c =
        sub.Soft_Opt_in_Number_of_Attempts__c + 1,
      Soft_Opt_in_Last_Stage_Processed__c =
        sub.Soft_Opt_in_Last_Stage_Processed__c
    )

  }

  def getIdentityIdsFromSubs(subs: Seq[SFSubscription.Record]): Seq[String] = {
    subs.map(sub => sub.Buyer__r.IdentityID__c)
  }

  //Mapping needed here
  def getIdentityConsentsSpecificToProduct(productName: String): Seq[String] = {
    val identityConsents: Seq[String] = Seq("consent1", "consent2")
    identityConsents
  }

  //Callout to Identity here
  def setConsentsInIdentityForSub(
      identityId: String,
      consents: Set[String]
  ): Boolean = {
    true
  }

  def updateSubsInSf(
      sfAuthDetails: SFConnector.SfAuthDetails,
      updateJsonBody: String
  ): Unit = {
    println("updateJsonBody:" + updateJsonBody)
    SFConnector.doSfCompositeRequest(sfAuthDetails, updateJsonBody, "PATCH")

  }

  def getSfSubsOverlapCheck(
      sfAuthentication: SFConnector.SfAuthDetails,
      IdentityIds: Seq[String]
  ): Either[Error, AssociatedSFSubscription.RootInterface] = {

    decode[AssociatedSFSubscription.RootInterface](
      SFConnector.doSfGetWithQuery(
        sfAuthentication,
        SFConnector.getSubsOverlapCheckQuery(IdentityIds)
      )
    )
  }
}
