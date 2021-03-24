package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SalesforceConfig, SfAuthDetails, SfCompositeResponse, SfResponse, SoftOptInError}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser.decode
import scalaj.http.{Http, HttpOptions}

import scala.util.Try

class SalesforceConnector(sfAuthDetails: SfAuthDetails) extends LazyLogging{

  def doSfGetWithQuery(query: String): Either[SoftOptInError, String] = {
    Try(Http(s"${sfAuthDetails.instance_url}/services/data/v20.0/query/")
      .param("q", query)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body)
      .toEither
      .left
      .map(i => SoftOptInError("SalesforceConnector", s"Salesforce query request failed: $i"))
  }

  def getSfSubs(): Either[SoftOptInError, SFSubscription.Response] = {
    doSfGetWithQuery(SfQueries.getAllSubsQuery)
      .flatMap(result =>
        decode[SFSubscription.Response](result)
          .left
          .map(i => SoftOptInError("SalesforceConnector", s"Could not decode SFSubscription.Response: $i. String to decode: $result")))
  }

  def getActiveSubs(identityIds: Seq[String]): Either[SoftOptInError, AssociatedSFSubscription.Response] = {
    doSfGetWithQuery(SfQueries.getActiveSubsQuery(identityIds))
      .flatMap(result =>
        decode[AssociatedSFSubscription.Response](result)
          .left
          .map(i => SoftOptInError("SalesforceConnector", s"Could not decode AssociatedSFSubscription.Response: $i. String to decode: $result")))
  }

  def doSfCompositeRequest(jsonBody: String, requestType: String): Either[SoftOptInError, String] = {
    Try(Http(s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects")
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .header("Content-Type", "application/json")
      .put(jsonBody)
      .method(requestType)
      .asString
      .body)
      .toEither
      .left
      .map(i => SoftOptInError("SalesforceConnector", s"Salesforce composite request failed: $i"))
  }

  def updateSubsInSf(updateJsonBody: String): Either[SoftOptInError, Unit] = {
    doSfCompositeRequest(updateJsonBody, "PATCH")
      .flatMap(result =>
        decode[List[SfResponse]](result) match {
          case Right(compositeResponse) => {

            SfCompositeResponse(compositeResponse).errorAsString
              .map(logger.warn(_))

            Right(())
          }
          case Left(error) =>
            Left(SoftOptInError("SalesforceConnector", s"Could not decode SfCompositeRequest.Response: $error. String to decode: $result"))
        })
  }

}

object SalesforceConnector {
  def auth(sfConfig: SalesforceConfig): Either[SoftOptInError, SfAuthDetails] = {

    val authResult = Try(Http(s"${sfConfig.sfAuthUrl}/services/oauth2/token")
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
      .body)
      .toEither
      .left
      .map(i => SoftOptInError("SalesforceConnector", s"Salesforce authentication failed: $i"))

    authResult
      .flatMap(result =>
        decode[SfAuthDetails](result)
          .left
          .map(i => SoftOptInError("SalesforceConnector", s"Could not decode SfAuthDetails: $i. String to decode: $result")))
  }
}
