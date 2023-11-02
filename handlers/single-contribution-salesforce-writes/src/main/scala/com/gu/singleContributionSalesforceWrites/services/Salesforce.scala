package com.gu.singleContributionSalesforceWrites.services

import com.gu.singleContributionSalesforceWrites.models._
import com.gu.util.Logging
import io.circe.Decoder
import io.circe.generic.semiauto.deriveDecoder
import io.circe.syntax.EncoderOps
import scalaj.http.Http
import com.gu.singleContributionSalesforceWrites.handlers.PaymentApiMessageDetail
import io.circe.generic.auto.exportEncoder

import scala.util.{Failure, Success, Try}

case class CreateSingleContributionRecordRequestData(
    Amount__c: Double,
    Country_Code__c: String,
    Country_Subdivision_Code__c: Option[String],
    Currency__c: String,
    Email__c: String,
    Identity_ID__c: Option[String],
    Payment_Date__c: String,
    Payment_ID__c: String,
    Payment_Provider__c: String,
    Payment_Status__c: String,
    Postal_Code__c: Option[String],
)

case class CreateSingleContributionRecordResponseData(
    id: String,
    success: Boolean,
    created: Boolean,
    errors: List[String],
)

object Salesforce extends Logging {
  def getServiceUrl(stage: String): String = {
    stage match {
      case "PROD" => "https://gnmtouchpoint.my.salesforce.com"
      case _ => "https://gnmtouchpoint--dev1.sandbox.my.salesforce.com"
    }
  }

  implicit val createSingleContributionRecordResponseDataDecoder: Decoder[CreateSingleContributionRecordResponseData] =
    deriveDecoder[CreateSingleContributionRecordResponseData]

  def createSingleContributionRecord(
      stage: String,
      accessToken: String,
      messageBodyDetail: PaymentApiMessageDetail,
  ): Either[HandlerError, Unit] = {
    val endpoint = getEndpoint(stage, messageBodyDetail.contributionId)
    val contribution = getContribution(messageBodyDetail)
    makeHttpRequest(endpoint, accessToken, contribution).map(_ => ())
  }

  private def getEndpoint(stage: String, contributionId: String): String = {
    val domain = Salesforce.getServiceUrl(stage)
    val path = s"/services/data/v57.0/sobjects/Single_Contribution__c/Contribution_ID__c/${contributionId}"
    s"$domain$path"
  }

  private def getContribution(
      messageBodyDetail: PaymentApiMessageDetail,
  ): CreateSingleContributionRecordRequestData = {
    CreateSingleContributionRecordRequestData(
      Amount__c = messageBodyDetail.amount,
      Country_Code__c = messageBodyDetail.country,
      Country_Subdivision_Code__c = messageBodyDetail.state,
      Currency__c = messageBodyDetail.currency,
      Email__c = messageBodyDetail.email,
      Identity_ID__c = messageBodyDetail.identityId,
      Payment_Date__c = messageBodyDetail.eventTimeStamp,
      Payment_ID__c = messageBodyDetail.paymentId,
      Payment_Provider__c = messageBodyDetail.paymentProvider,
      Payment_Status__c = "Paid",
      Postal_Code__c = messageBodyDetail.postalCode,
    )
  }

  private def makeHttpRequest(
      endpoint: String,
      accessToken: String,
      contribution: CreateSingleContributionRecordRequestData,
  ): Either[HandlerError, CreateSingleContributionRecordResponseData] = {
    val postData = contribution.asJson.noSpaces

    Try {
      Http(endpoint)
        .header("Content-Type", "application/json")
        .header("Authorization", s"Bearer ${accessToken}")
        .postData(postData)
        .method("PATCH")
        .asString
    } match {
      case Success(httpResponse) if httpResponse.is2xx => {
        logger.info(s"Record successfully created / updated in Salesforce: ${httpResponse.body}")
        JsonDecoder.decodeJson[CreateSingleContributionRecordResponseData](httpResponse.body)
      }
      case Success(httpResponse) => Left(HttpRequestError(httpResponse.body))
      case Failure(exception) => Left(HttpRequestError(exception.getMessage))
    }
  }
}

object SalesforceCredentials extends Logging {

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
      password: String,
  )

  case class SalesforceConnectedApp(
      client_id: String,
      client_secret: String,
  )

  implicit val salesforceUserDecoder: Decoder[SalesforceUser] = deriveDecoder[SalesforceUser]
  implicit val salesforceConnectedAppDecoder: Decoder[SalesforceConnectedApp] = deriveDecoder[SalesforceConnectedApp]
  implicit val getAccessTokenResponseDataDecoder: Decoder[GetAccessTokenResponseData] =
    deriveDecoder[GetAccessTokenResponseData]

  def getAccessToken(stage: String): Either[HandlerError, String] = {
    for {
      authCredentials <- getAuthCredentials(stage)
      endpoint = getEndpoint(stage)
      response <- makeHttpRequest(endpoint, authCredentials)
    } yield response.access_token
  }

  private def getAuthCredentials(stage: String): Either[HandlerError, GetAccessTokenRequestData] = {
    for {
      user <- SecretsManager.getSecretValue[SalesforceUser](
        s"${stage}/Salesforce/User/SingleContributionSalesforceWrites",
      )
      connectedApp <- SecretsManager.getSecretValue[SalesforceConnectedApp](
        s"${stage}/Salesforce/ConnectedApp/SingleContributionSalesforceWrites",
      )
    } yield GetAccessTokenRequestData(
      grant_type = "password",
      client_id = connectedApp.client_id,
      client_secret = connectedApp.client_secret,
      username = user.username,
      password = user.password,
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
        JsonDecoder.decodeJson[GetAccessTokenResponseData](httpResponse.body)
      }
      case Success(httpResponse) => Left(HttpRequestError(httpResponse.body))
      case Failure(exception) => Left(HttpRequestError(exception.getMessage))
    }
  }
}
