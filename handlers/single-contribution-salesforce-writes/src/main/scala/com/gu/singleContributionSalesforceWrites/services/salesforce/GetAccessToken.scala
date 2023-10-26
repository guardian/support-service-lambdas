package com.gu.singleContributionSalesforceWrites.services.salesforce

import com.gu.singleContributionSalesforceWrites.models.{HttpRequestError, HandlerError}
import com.gu.singleContributionSalesforceWrites.services.awsSecretsManager.GetSecretValue
import com.gu.singleContributionSalesforceWrites.services.jsonDecoder.DecodeJson
import com.gu.util.Logging
import io.circe.Decoder
import io.circe.generic.semiauto.deriveDecoder
import scalaj.http.Http
import scala.util.{Try, Success, Failure}

case class GetAccessTokenRequestData(
    grant_type: String,
    client_id: String,
    client_secret: String,
    username: String,
    password: String,
)

case class GetAccessTokenResponseData(
    access_token: String,
    instance_url: String,
    id: String,
    token_type: String,
    issued_at: String,
    signature: String,
)

case class SalesforceUser(
  username: String,
  password: String
)

case class SalesforceConnectedApp(
  client_id: String,
  client_secret: String
)

object GetAccessToken extends Logging {

  implicit val salesforceUserDecoder: Decoder[SalesforceUser] = deriveDecoder[SalesforceUser]
  implicit val salesforceConnectedAppDecoder: Decoder[SalesforceConnectedApp] = deriveDecoder[SalesforceConnectedApp]
  implicit val getAccessTokenResponseDataDecoder: Decoder[GetAccessTokenResponseData] = deriveDecoder[GetAccessTokenResponseData]

  def apply(stage: String): Either[HandlerError, String] = {
    for {
      authCredentials <- getAuthCredentials(stage)
      endpoint = getEndpoint(stage)
      response <- makeHttpRequest(endpoint, authCredentials)
    } yield response.access_token
  }

  private def getAuthCredentials(stage: String): Either[HandlerError, GetAccessTokenRequestData] = {
    for {
      user <- GetSecretValue[SalesforceUser](s"${stage}/Salesforce/User/SingleContributionSalesforceWrites")
      connectedApp <- GetSecretValue[SalesforceConnectedApp](s"${stage}/Salesforce/ConnectedApp/SingleContributionSalesforceWrites")
    } yield GetAccessTokenRequestData(
      grant_type = "password",
      client_id = connectedApp.client_id,
      client_secret = connectedApp.client_secret,
      username = user.username,
      password = user.password
    )
  }

  private def getEndpoint(stage: String): String = {
    stage match {
      case "PROD" => "https://login.salesforce.com/services/oauth2/token"
      case _ => "https://test.salesforce.com/services/oauth2/token"
    }
  }

  private def makeHttpRequest(
      endpoint: String,
      authCredentials: GetAccessTokenRequestData,
  ): Either[HandlerError, GetAccessTokenResponseData] = {
    val postForm = Seq(
      "grant_type" -> "password",
      "client_id" -> authCredentials.client_id,
      "client_secret" -> authCredentials.client_secret,
      "username" -> authCredentials.username,
      "password" -> authCredentials.password,
    )

    Try {
      Http(endpoint)
        .postForm(postForm)
        .asString
    } match {
      case Success(httpResponse) if httpResponse.is2xx => {
        logger.info("Auth access token successfully retrieved from Salesforce")
        DecodeJson[GetAccessTokenResponseData](httpResponse.body)
      }
      case Success(httpResponse) => Left(HttpRequestError(httpResponse.body))
      case Failure(exception) => Left(HttpRequestError(exception.getMessage))
    }
  }
}
