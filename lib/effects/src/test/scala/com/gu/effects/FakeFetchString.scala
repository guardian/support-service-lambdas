package com.gu.effects

import java.time.{DayOfWeek, LocalDate}
import java.time.temporal.TemporalAdjusters._

import scala.util.{Failure, Success, Try}

object FakeFetchString {

  val zuoraRestTestConfig =
    """
       {
       | "stage" : "DEV",
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
        | "stage" : "DEV",
        | "baseUrl": "https://ididbaseurl",
        | "apiToken": "tokentokentokenidentity"
       |}
      """.stripMargin

  val sfTestConfig =
    """
       {
         |"stage" : "DEV",
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
         |"stage" : "DEV",
         |"apiClientId": "a",
         |"apiToken": "b",
         |"tenantId": "c"
       |}
      """.stripMargin

  val exactTargetConfig =
    """
      |{
      | "stage" : "DEV",
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
      | "stage" : "DEV",
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
      |    "nextAffectablePublicationDateOnFrontCover" : "${issueDate}"
      |  }
      |}
      |""".stripMargin
  }

  val configFiles = Map(
    "membership/support-service-lambdas/DEV/identity-DEV.json" -> identityTestConfig,
    "membership/support-service-lambdas/DEV/sfAuth-DEV.json" -> sfTestConfig,
    "membership/support-service-lambdas/DEV/trustedApi-DEV.json" -> trustedApiconfig,
    "membership/support-service-lambdas/DEV/zuoraRest-DEV.json" -> zuoraRestTestConfig,
    "membership/support-service-lambdas/DEV/exactTarget-DEV.json" -> exactTargetConfig,
    "membership/support-service-lambdas/DEV/stripe-DEV.json" -> stripeConfig,
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
      case S3Location("fulfilment-date-calculator-dev", s3Key) if s3Key.contains("Guardian Weekly") =>
        Success(guardianWeeklyFulfilmentDatesFile(today))
      case _ => Failure(new RuntimeException(s"test failure unexpected config s3 $location"))
    }
  }

}
