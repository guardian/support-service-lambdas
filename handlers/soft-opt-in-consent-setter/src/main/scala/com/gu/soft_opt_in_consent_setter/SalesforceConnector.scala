package com.gu.soft_opt_in_consent_setter

import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import com.gu.soft_opt_in_consent_setter.models.{
  SFAssociatedSubRecord,
  SFAssociatedSubResponse,
  SFCompositeResponse,
  SFResponse,
  SFSubRecordResponse,
  SoftOptInError,
}
import com.typesafe.scalalogging.LazyLogging
import io.circe.Decoder
import io.circe.generic.semiauto._
import io.circe.parser.decode

class SalesforceConnector(sfAuthDetails: SalesforceAuth, sfApiVersion: String) extends LazyLogging {

  def getSubsToProcess(): Either[SoftOptInError, SFSubRecordResponse] = {
    handleQueryResp[SFSubRecordResponse](
      sendQueryReq(SfQueries.getSubsToProcessQuery),
      errorDesc = "SalesforceConnector: Could not decode SFSubscription.Response",
    )
  }

  def getActiveSubs(identityIds: Seq[String]): Either[SoftOptInError, SFAssociatedSubResponse] = {
    if (identityIds.nonEmpty)
      handleQueryResp[SFAssociatedSubResponse](
        sendQueryReq(SfQueries.getActiveSubsQuery(identityIds)),
        errorDesc = "Could not decode AssociatedSFSubscription.Response",
      )
    else
      Right(SFAssociatedSubResponse(0, done = true, Seq[SFAssociatedSubRecord]()))
  }

  def updateSubs(body: String): Either[SoftOptInError, Unit] = {
    logger.info(s"Making update request to Salesforce: $body")
    val result = handleCompositeUpdateResp(
      sendCompositeUpdateReq(body),
      Metrics.put,
    )
    result match {
      case Left(e) => logger.error(s"Update request failed: $body: cause $e")
      case Right(_) => logger.info(s"Update request successful: $body")
    }
    result
  }

  private def sfHeaders = Seq(
    "Authorization" -> s"Bearer ${sfAuthDetails.access_token}",
    "Content-Type" -> "application/json",
  )

  def sendQueryReq(query: String): Either[Throwable, HttpResponse] =
    HttpClient.get(
      url = s"${sfAuthDetails.instance_url}/services/data/$sfApiVersion/query/",
      headers = sfHeaders,
      queryParameters = Seq("q" -> query),
      timeoutProfile = HttpClient.SalesforceTimeout,
    )

  def sendCompositeUpdateReq(body: String): Either[Throwable, HttpResponse] =
    HttpClient.patch(
      url = s"${sfAuthDetails.instance_url}/services/data/$sfApiVersion/composite/sobjects",
      body,
      headers = sfHeaders,
      timeoutProfile = HttpClient.SalesforceTimeout,
    )

  def handleQueryResp[T: Decoder](
      response: Either[Throwable, HttpResponse],
      errorDesc: String = "Decode error",
  ): Either[SoftOptInError, T] = {
    response.left
      .map(error => SoftOptInError(s"SalesforceConnector: Salesforce query request failed: $error", error))
      .flatMap { result =>
        decode[T](result.body).left.map(decodeError =>
          SoftOptInError(s"SalesforceConnector: $errorDesc:$decodeError. String to decode ${result.body}"),
        )
      }
  }

  def handleCompositeUpdateResp(
      response: Either[Throwable, HttpResponse],
      putMetric: (String, Double) => Unit,
  ): Either[SoftOptInError, Unit] = {
    response.left
      .map(i => SoftOptInError(s"SalesforceConnector: Salesforce composite request failed: $i", i))
      .flatMap { result =>
        decode[List[SFResponse]](result.body) match {
          case Right(compositeResponse) =>
            SFCompositeResponse(compositeResponse).errorsAsString
              .foreach(logger.warn(_))

            // Output metrics before returning
            putMetric("successful_salesforce_update", compositeResponse.filter(_.success).size)
            putMetric("failed_salesforce_update", compositeResponse.filter(!_.success).size)

            Right(())
          case Left(decodeError) =>
            Left(
              SoftOptInError(
                s"SalesforceConnector: Could not decode SfCompositeRequest.Response: $decodeError. String to decode: ${result.body}",
              ),
            )
        }
      }
  }

}

object SalesforceConnector {
  def apply(sfConfig: SFAuthConfig, sfApiVersion: String): Either[SoftOptInError, SalesforceConnector] = {
    auth(sfConfig)
      .map(new SalesforceConnector(_, sfApiVersion))
  }

  def auth(sfConfig: SFAuthConfig): Either[SoftOptInError, SalesforceAuth] = {
    handleAuthResp(
      sendAuthReq(sfConfig),
    )
  }

  def sendAuthReq(sfConfig: SFAuthConfig): Either[Throwable, HttpResponse] =
    HttpClient.postForm(
      s"${sfConfig.url}/services/oauth2/token",
      Seq(
        "grant_type" -> "password",
        "client_id" -> sfConfig.client_id,
        "client_secret" -> sfConfig.client_secret,
        "username" -> sfConfig.username,
        "password" -> s"${sfConfig.password}${sfConfig.token}",
      ),
    )

  def handleAuthResp(response: Either[Throwable, HttpResponse]): Either[SoftOptInError, SalesforceAuth] = {
    response.left
      .map(i => SoftOptInError(s"SalesforceConnector: Salesforce authentication failed: $i", i))
      .flatMap { result =>
        decode[SalesforceAuth](result.body)(deriveDecoder[SalesforceAuth]).left
          .map(i =>
            SoftOptInError(
              s"SalesforceConnector: Could not decode SfAuthDetails: $i. String to decode: ${result.body}",
            ),
          )
      }
  }

}
