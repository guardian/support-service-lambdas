package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SalesforceConfig, SfAuthDetails, SoftOptInError}
import io.circe.Error
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.util.Try
import scalaj.http.{Http, HttpOptions}

class SalesforceConnector(sfAuthDetails: SfAuthDetails) {

  def doSfGetWithQuery(query: String): Either[SoftOptInError, String] = {
    Try(Http(s"${sfAuthDetails.instance_url}/services/data/v20.0/query/")
      .param("q", query)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body
    )
      .toEither
      .left
      .map(i => SoftOptInError("SalesforceConnector", s"Salesforce query request failed: $i"))
  }

  def doSfCompositeRequest(jsonBody: String, requestType: String): Either[SoftOptInError, String] = {
    Try(Http(s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects")
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .header("Content-Type", "application/json")
      .put(jsonBody)
      .method(requestType)
      .asString
      .body
    )
      .toEither
      .left
      .map(i => SoftOptInError("SalesforceConnector", s"Salesforce composite request failed: $i"))
  }

  def getSfSubs(): Either[SoftOptInError, SFSubscription.Response] = {
    doSfGetWithQuery(SfQueries.getAllSubsQuery)
      .flatMap(result =>
        decode[SFSubscription.Response](result)
          .left
          .map(i => SoftOptInError("SalesforceConnector", s"Could not decode SFSubscription.Response: $i. String to decode: $result"))
      )
  }

  def getActiveSubs(IdentityIds: Seq[String]): Either[SoftOptInError, AssociatedSFSubscription.Response] = {
    doSfGetWithQuery(SfQueries.getActiveSubsQuery(IdentityIds))
      .flatMap(result =>
        decode[AssociatedSFSubscription.Response](result)
          .left
          .map(i => SoftOptInError("SalesforceConnector", s"Could not decode AssociatedSFSubscription.Response: $i. String to decode: $result")))
  }

  def updateSubsInSf(updateJsonBody: String): Either[SoftOptInError, Unit] = {
    // TODO Do we not want to check the response?
    doSfCompositeRequest(updateJsonBody, "PATCH").map(_ => ())
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
      .body
    )
      .toEither
      .left
      .map(i => SoftOptInError("SalesforceConnector", s"Salesforce authentication failed: $i")))

    authResult
      .flatMap(result =>
        decode[SfAuthDetails](result)
          .left
          .map(i => SoftOptInError("SalesforceConnector", s"Could not decode SfAuthDetails: $i. String to decode: $result"))
      )
  }
}
