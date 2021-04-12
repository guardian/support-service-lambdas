package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SalesforceConfig, SfAuthDetails, SfCompositeResponse, SfResponse, SoftOptInError}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser.decode
import scalaj.http.{Http, HttpOptions, HttpRequest, HttpResponse}

class SalesforceConnector(sfAuthDetails: SfAuthDetails, runRequest: HttpRequest => Either[Throwable, HttpResponse[String]]) extends LazyLogging {

  def doSfGetWithQuery(query: String): Either[SoftOptInError, String] = {
    runRequest(
      Http(s"${sfAuthDetails.instance_url}/services/data/v20.0/query/")
        .option(HttpOptions.readTimeout(30000))
        .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .header("Content-Type", "application/json")
        .param("q", query)
        .method("GET")
    )
      .map(_.body)
      .left.map(i => SoftOptInError("SalesforceConnector", s"Salesforce query request failed: $i"))
  }

  def getSfSubs(): Either[SoftOptInError, SFSubscription.Response] = {
    doSfGetWithQuery(SfQueries.getAllSubsQuery)
      .flatMap { result =>
        decode[SFSubscription.Response](result)
          .left
          .map(i => SoftOptInError("SalesforceConnector", s"Could not decode SFSubscription.Response: $i. String to decode: $result"))
      }
  }

  def getActiveSubs(identityIds: Seq[String]): Either[SoftOptInError, AssociatedSFSubscription.Response] = {
    if (identityIds.nonEmpty)
      doSfGetWithQuery(SfQueries.getActiveSubsQuery(identityIds))
        .flatMap { result =>
          decode[AssociatedSFSubscription.Response](result)
            .left
            .map(i => SoftOptInError("SalesforceConnector", s"Could not decode AssociatedSFSubscription.Response: $i. String to decode: $result"))
        }
    else
      Right(AssociatedSFSubscription.Response(0, true, Seq[AssociatedSFSubscription.Record]()))
  }

  def doSfCompositeRequest(jsonBody: String): Either[SoftOptInError, String] = {
    runRequest(
      Http(s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects")
        .option(HttpOptions.readTimeout(30000))
        .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .header("Content-Type", "application/json")
        .postData(jsonBody)
        .method("PATCH")
    )
      .map(_.body)
      .left.map(i => SoftOptInError("SalesforceConnector", s"Salesforce composite request failed: $i"))
  }

  def updateSubsInSf(updateJsonBody: String): Either[SoftOptInError, Unit] = {
    doSfCompositeRequest(updateJsonBody)
      .flatMap { result =>
        decode[List[SfResponse]](result) match {
          case Right(compositeResponse) =>
            SfCompositeResponse(compositeResponse).errorAsString
              .foreach(logger.warn(_))

            Right(())
          case Left(error) =>
            Left(SoftOptInError("SalesforceConnector", s"Could not decode SfCompositeRequest.Response: $error. String to decode: $result"))
        }
      }
  }

}

object SalesforceConnector {
  def auth(sfConfig: SalesforceConfig, runRequest: HttpRequest => Either[Throwable, HttpResponse[String]]): Either[SoftOptInError, SfAuthDetails] = {

    runRequest(
      Http(s"${sfConfig.sfAuthUrl}/services/oauth2/token")
        .postForm(
          Seq(
            "grant_type" -> "password",
            "client_id" -> sfConfig.sfClientId,
            "client_secret" -> sfConfig.sfClientSecret,
            "username" -> sfConfig.sfUsername,
            "password" -> s"${sfConfig.sfPassword}${sfConfig.sfToken}"
          )
        )
    )
      .left.map(i => SoftOptInError("SalesforceConnector", s"Salesforce authentication failed: $i"))
      .flatMap { result =>
        decode[SfAuthDetails](result.body)
          .left
          .map(i => SoftOptInError("SalesforceConnector", s"Could not decode SfAuthDetails: $i. String to decode: ${result.body}"))
      }
  }
}
