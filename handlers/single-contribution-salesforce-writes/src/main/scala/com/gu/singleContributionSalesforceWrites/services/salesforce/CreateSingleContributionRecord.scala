package com.gu.singleContributionSalesforceWrites.services.salesforce

import com.gu.singleContributionSalesforceWrites.models.{HandlerError, HttpRequestError}
import com.gu.singleContributionSalesforceWrites.handlers.PaymentApiMessageDetail
import com.gu.singleContributionSalesforceWrites.services.jsonDecoder.DecodeJson
import com.gu.util.Logging
import io.circe.Decoder
import io.circe.generic.auto.exportEncoder
import io.circe.generic.semiauto.deriveDecoder
import io.circe.syntax.EncoderOps
import scalaj.http.Http
import scala.util.{Try, Success, Failure}

case class CreateSingleContributionRecordRequestData(
    Amount__c: Double,
    Country_Code__c: String,
    Country_Subdivision_Code__c: Option[String],
    Currency__c: String,
    Email__c: String,
    Identity_ID__c: String,
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
    errors: List[String]
)

object CreateSingleContributionRecord extends Logging {

  implicit val createSingleContributionRecordResponseDataDecoder: Decoder[CreateSingleContributionRecordResponseData] =
    deriveDecoder[CreateSingleContributionRecordResponseData]

  def apply(
      stage: String,
      accessToken: String,
      messageBodyDetail: PaymentApiMessageDetail,
  ): Either[HandlerError, Unit] = {
    val endpoint = getEndpoint(stage, messageBodyDetail.contributionId)
    val contribution = getContribution(messageBodyDetail)

    makeHttpRequest(endpoint, accessToken, contribution).map(_ => ())
  }

  private def getEndpoint(stage: String, contributionId: String): String = {
    val domain = GetApiDomain(stage)
    val path =  s"/services/data/v57.0/sobjects/Single_Contribution__c/Contribution_ID__c/${contributionId}"
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
        DecodeJson[CreateSingleContributionRecordResponseData](httpResponse.body)
      }
      case Success(httpResponse) => Left(HttpRequestError(httpResponse.body))
      case Failure(exception) => Left(HttpRequestError(exception.getMessage))
    }
  }
}
