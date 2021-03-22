package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SalesforceConfig, SfAuthDetails}
import io.circe.Error
import io.circe.generic.auto._
import io.circe.parser.decode
import scalaj.http.{Http, HttpOptions}

class SalesforceConnector(sfAuthDetails: SfAuthDetails) {

  def doSfGetWithQuery(query: String): String = {
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

  def doSfCompositeRequest(jsonBody: String, requestType: String): String = {

    val updateResponseFromSf =
      Http(s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects")
        .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .header("Content-Type", "application/json")
        .put(jsonBody)
        .method(requestType)
        .asString
        .body

    println("updateResponseFromSf:" + updateResponseFromSf)
    updateResponseFromSf
  }

  def getSfSubs(): Either[Error, SFSubscription.Response] = {

    decode[SFSubscription.Response](doSfGetWithQuery(SfQueries.getAllSubsQuery))

  }
  def getActiveSubs(IdentityIds: Seq[String]): Either[Error, AssociatedSFSubscription.RootInterface] = {
    decode[AssociatedSFSubscription.RootInterface](
      doSfGetWithQuery(SfQueries.getActiveSubsQuery(IdentityIds))
    )
  }

  def updateSubsInSf(updateJsonBody: String): Unit = {
    doSfCompositeRequest(updateJsonBody, "PATCH")
  }

}

object SalesforceConnector {
  def auth(sfConfig: SalesforceConfig): Either[Error, SfAuthDetails] = {

    decode[SfAuthDetails](Http(s"${sfConfig.sfAuthUrl}/services/oauth2/token")
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
  }
}
