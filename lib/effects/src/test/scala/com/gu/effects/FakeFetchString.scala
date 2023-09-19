package com.gu.effects

import java.time.{DayOfWeek, LocalDate}
import java.time.temporal.TemporalAdjusters._

import scala.util.{Failure, Success, Try}

object FakeFetchString {

  val zuoraRestTestConfig =
    """
       {
       | "stage" : "CODE",
       | "baseUrl": "https://ddd",
       | "username": "e@f.com",
       | "password": "ggg",
       | "holidayStopProcessor": {
       |  "oauth": {
       |   "clientId": "hsrclientid",
       |   "clientSecret": "hsrclientsecret"
       |  }
       | }
       |}
      """.stripMargin

  val identityTestConfig =
    """
       {
        | "stage" : "CODE",
        | "baseUrl": "https://ididbaseurl",
        | "apiToken": "tokentokentokenidentity"
       |}
      """.stripMargin

  val sfTestConfig =
    """
       {
         |"stage" : "CODE",
         |"url": "https://sfurl.haha",
         |"client_id": "clientsfclient",
         |"client_secret": "clientsecretsfsecret",
         |"username": "usernamesf",
         |"password": "passSFpassword",
         |"token": "tokentokenSFtoken"
       }
      """.stripMargin

  val trustedApiconfig =
    """
       {
         |"stage" : "CODE",
         |"apiClientId": "a",
         |"apiToken": "b",
         |"tenantId": "c"
       |}
      """.stripMargin

  val exactTargetConfig =
    """
      |{
      | "stage" : "CODE",
      | "etSendIDs":
      |   {
      |     "pf1": "111",
      |     "pf2": "222",
      |     "pf3": "333",
      |     "pf4": "444",
      |     "cancelled": "ccc"
      |   },
      |   "clientId": "jjj",
      |   "clientSecret": "kkk"
      | }
    """.stripMargin
  val stripeConfig =
    """
      |{
      | "stage" : "CODE",
      | "customerSourceUpdatedWebhook": {
      | "api.key.secret": "abc",
      | "au-membership.key.secret": "def"
      |}
    """.stripMargin

  def guardianWeeklyFulfilmentDatesFile(today: LocalDate) = {
    val issueDate = today `with` next(DayOfWeek.FRIDAY) `with` next(DayOfWeek.FRIDAY)

    s"""
      |{
      |  "Friday" : {
      |    "today" : "$today",
      |    "deliveryAddressChangeEffectiveDate" : "${issueDate.minusDays(2)}",
      |    "holidayStopFirstAvailableDate" : "${issueDate.minusDays(3)}",
      |    "finalFulfilmentFileGenerationDate" : "${issueDate.minusDays(1)}",
      |    "nextAffectablePublicationDateOnFrontCover" : "${issueDate}",
      |    "newSubscriptionEarliestStartDate": "${issueDate.minusDays(2)}"
      |  }
      |}
      |""".stripMargin
  }

  val configFiles = Map(
    "membership/support-service-lambdas/CODE/identity-CODE.v1.json" -> identityTestConfig,
    "membership/support-service-lambdas/CODE/sfAuth-CODE.v1.json" -> sfTestConfig,
    "membership/support-service-lambdas/CODE/trustedApi-CODE.v1.json" -> trustedApiconfig,
    "membership/support-service-lambdas/CODE/zuoraRest-CODE.v1.json" -> zuoraRestTestConfig,
    "membership/support-service-lambdas/CODE/exactTarget-CODE.v1.json" -> exactTargetConfig,
    "membership/support-service-lambdas/CODE/stripe-CODE.v1.json" -> stripeConfig,
  )

  def fetchString(location: S3Location): Try[String] = {
    fetchString(LocalDate.now(), location)
  }

  def fetchString(today: LocalDate, location: S3Location): Try[String] = {
    location match {
      case S3Location("gu-reader-revenue-private", s3Key) =>
        configFiles
          .get(s3Key)
          .map(contents => Success(contents))
          .getOrElse(Failure(new RuntimeException(s"test failure unexpected config s3 key ${location.key}")))
      case S3Location("fulfilment-date-calculator-code", s3Key) if s3Key.contains("Guardian Weekly") =>
        Success(guardianWeeklyFulfilmentDatesFile(today))
      case _ => Failure(new RuntimeException(s"test failure unexpected config s3 $location"))
    }
  }

}
