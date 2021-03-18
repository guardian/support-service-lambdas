package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models._
import io.circe._
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax.EncoderOps
import scalaj.http.{Http, HttpOptions}

// TODO Move all Comnfig code to its own file with class + companion object
// TODO Move all SF code to it own file with class
// TODO: Read Identity config from env variables
// TODO: Do functional testing
// TODO: Introduce error handling
// TODO: Add unit testing

object Main extends App {

  case class SfAuthDetails(access_token: String, instance_url: String)

  case class BodyForWriteBackToSf(records: Seq[SFSubscription.UpdateRecord]) {
    def allOrNone = false
  }

  case class EnhancedCancelledSub(identityId: String, cancelledSub: SFSubscription.Record, associatedActiveNonGiftSubs: Seq[AssociatedSFSubscription.Record])

  for {
    config <- SoftOptInConfig.get
    sfAuthDetails <- decode[SfAuthDetails](auth(config.sfConfig))
    allSubsToProcessFromSf <- getSfSubs(sfAuthDetails)
  } yield {
    val sfRecords = allSubsToProcessFromSf.records
    println("sfRecords:" + sfRecords)

    val identityConnector = new IdentityConnector(config.identityConfig)

    val acqSubUpdatesToWriteBackToSf = processAcqSubs(
      identityConnector,
      sfRecords.filter(_.Soft_Opt_in_Status__c.equals("Ready to process acquisition"))
    )
    updateSubsInSf(sfAuthDetails, BodyForWriteBackToSf(acqSubUpdatesToWriteBackToSf).asJson.spaces2)

    val cancSubUpdatesToWriteBackToSf = processCancSubs(
      identityConnector,
      sfAuthDetails,
      sfRecords.filter(_.Soft_Opt_in_Status__c.equals("Ready to process cancellation"))
    )

    updateSubsInSf(sfAuthDetails, BodyForWriteBackToSf(cancSubUpdatesToWriteBackToSf).asJson.spaces2)
  }

  def processAcqSubs(identityConnector: IdentityConnector, acqSubs: Seq[SFSubscription.Record]): Seq[SFSubscription.UpdateRecord] = {

    acqSubs.map(sub => {
      buildSfResponse(sub, "Acquisition",
        for {
          consents <- ConsentsCalculator.getAcqConsents(sub.Product__c)
          consentsBody = ConsentsCalculator.buildConsentsBody(consents, state = true)
          _ <- identityConnector.sendConsentsReq(sub.Buyer__r.IdentityID__c, consentsBody)
        } yield ()
      )
    })
  }

  def processCancSubs(identityConnector: IdentityConnector, sfAuthDetails: SfAuthDetails, cancSubs: Seq[SFSubscription.Record]): Seq[SFSubscription.UpdateRecord] = {

    getActiveSubs(sfAuthDetails, cancSubs.map(sub => sub.Buyer__r.IdentityID__c)) match {
      case Right(activeSubs) =>
        getEnhancedCancSubs(cancSubs, activeSubs.records)
          .map(sub => {
            buildSfResponse(sub.cancelledSub, "Cancellation",
              for {
                consents <- ConsentsCalculator.getCancConsents(sub.cancelledSub.Product__c, sub.associatedActiveNonGiftSubs.map(_.Product__c).toSet)
                _ <- sendCancConsentsIfPresent(identityConnector, sub.identityId, consents)
              } yield ()
            )
          })
      case Left(_) =>
        // TODO: Log Error
        cancSubs.map(failureSFResponse)
    }
  }

  def sendCancConsentsIfPresent(identityConnector: IdentityConnector, identityId: String, consents: Set[String]): Either[SoftOptInError, Unit] = {
    if (consents.isEmpty) {
      val consentsBody = ConsentsCalculator.buildConsentsBody(consents, state = false)
      identityConnector.sendConsentsReq(identityId, consentsBody)
    } else {
      Right(())
    }
  }

  def buildSfResponse(sub: SFSubscription.Record, stage: String, result: Either[SoftOptInError, Unit]): SFSubscription.UpdateRecord = {
    result match {
      case Right(_) => successfulSFResponse(sub, stage)
      case Left(failure) =>
        // TODO: Log error
        println(failure)
        failureSFResponse(sub)
    }
  }

  def successfulSFResponse(sub: SFSubscription.Record, softOptInStage: String): SFSubscription.UpdateRecord = {
    println("I succeeded!")

    SFSubscription.UpdateRecord(
      Id = sub.Id,
      Soft_Opt_in_Number_of_Attempts__c = 0,
      Soft_Opt_in_Last_Stage_Processed__c = Some(softOptInStage)
    )
  }

  def failureSFResponse(sub: SFSubscription.Record): SFSubscription.UpdateRecord = {
    println("I failed!")

    SFSubscription.UpdateRecord(
      Id = sub.Id,
      Soft_Opt_in_Number_of_Attempts__c =
        sub.Soft_Opt_in_Number_of_Attempts__c + 1,
      Soft_Opt_in_Last_Stage_Processed__c =
        sub.Soft_Opt_in_Last_Stage_Processed__c
    )

  }

  def getSfSubs(sfAuthentication: SfAuthDetails): Either[Error, SFSubscription.RootInterface] = {
    decode[SFSubscription.RootInterface](
      doSfGetWithQuery(sfAuthentication, getAllSubsQuery())
    )
  }

  def getActiveSubs(sfAuthentication: SfAuthDetails, IdentityIds: Seq[String]): Either[Error, AssociatedSFSubscription.RootInterface] = {
    decode[AssociatedSFSubscription.RootInterface](
      doSfGetWithQuery(sfAuthentication, getSubsOverlapCheckQuery(IdentityIds))
    )
  }

  def getEnhancedCancSubs(cancSubs: Seq[SFSubscription.Record], associatedSubs: Seq[AssociatedSFSubscription.Record]): Seq[EnhancedCancelledSub] = {
    cancSubs.map(a => {
      val associatedActiveNonGiftSubs = associatedSubs.filter(_.IdentityID__c.equals(a.Buyer__r.IdentityID__c))

      EnhancedCancelledSub(
        identityId = a.Buyer__r.IdentityID__c,
        cancelledSub = a,
        associatedActiveNonGiftSubs = associatedActiveNonGiftSubs
      )
    })
  }

  def getSubsOverlapCheckQuery(IdentityIds: Seq[String]): String = {
    val identityId = "softOptInTest-863"
    val query =
      s"""
         |SELECT
         |	buyer__r.identityId__c,
         |	Product__c
         |FROM
         |	SF_Subscription__c
         |WHERE
         |	SF_Status__c in ('Active', 'Voucher Pending', 'Cancellation Pending') AND
         |	Soft_Opt_in_Eligible__c = true AND
         |	buyer__r.identityId__c in  ('$identityId')
         |GROUP BY
         |	buyer__r.identityId__c, product__c
  """.stripMargin
    query
  }

  def getAllSubsQuery(): String = {
    val limit = 2
    val sfSubName = "A-S00161734"
    val query =
      s"""
         |SELECT
         |	Id,
         |	Name,
         |	Product__c,
         |	SF_Status__c,
         |	Soft_Opt_in_Status__c,
         |	Soft_Opt_in_Last_Stage_Processed__c,
         |	Soft_Opt_in_Number_of_Attempts__c,
         |	Buyer__r.IdentityID__c
         |FROM
         |	SF_Subscription__c
         |WHERE
         |	Soft_Opt_in_Status__c in ('Ready to process acquisition','Ready to process cancellation') AND
         |	name in ('$sfSubName')
         |LIMIT
         |	$limit
  """.stripMargin //, 'A-S00135386'
    query
  }

  def doSfGetWithQuery(sfAuthDetails: SfAuthDetails, query: String): String = {
    // TODO: Wrap this in a try
    val response =
      Http(s"${sfAuthDetails.instance_url}/services/data/v20.0/query/")
        .param("q", query)
        .option(HttpOptions.readTimeout(30000))
        .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .method("GET")
        .asString
        .body

    println("response:" + response)
    response
  }

  def auth(sfConfig: SalesforceConfig): String = {
    Http(s"${System.getenv("authUrl")}/services/oauth2/token")
      .postForm(
        Seq(
          "grant_type" -> "password",
          "client_id" -> sfConfig.sfClientId,
          "client_secret" -> sfConfig.sfClientSecret,
          "username" -> sfConfig.sfUsername,
          "password" -> s"${sfConfig.sfPassword}${sfConfig.sfToken}"
        )
      )
      .asString
      .body

  }

  def updateSubsInSf(sfAuthDetails: SfAuthDetails, updateJsonBody: String): Unit = {
    println("updateJsonBody:" + updateJsonBody)
    doSfCompositeRequest(sfAuthDetails, updateJsonBody, "PATCH")
  }

  def doSfCompositeRequest(sfAuthDetails: SfAuthDetails, jsonBody: String, requestType: String): String = {
    Http(s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects")
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .header("Content-Type", "application/json")
      .put(jsonBody)
      .method(requestType)
      .asString
      .body
  }
}
