package com.gu.paymentIntentIssues

import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent}
import com.typesafe.scalalogging.LazyLogging
import scala.jdk.CollectionConverters._
import com.stripe.net.Webhook
import scala.util.Try
import io.circe.syntax._
import io.circe.generic.auto._
import cats.effect.IO._
import cats.effect.IO
import com.gu.util.config.ConfigLoader
import com.gu.AppIdentity
import cats.data.EitherT
import com.gu.zuora.Zuora.accessTokenGetResponseV2
import com.gu.zuora.ZuoraRestOauthConfig
import com.gu.zuora.Oauth
import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import com.gu.zuora.AccessToken

object Lambda extends LazyLogging {
  def handler(event: APIGatewayProxyRequestEvent): APIGatewayProxyResponseEvent = {
    val identity = AppIdentity.whoAmI(defaultAppName = "payment-intent-issues")

    val program = loadConfig(identity).subflatMap(config => 
      for {
        payload <- getPayload(event, config.endpointSecret)
        _ <- processEvent(payload, config)
      } yield ()
    )

    val result = program.value.unsafeRunSync()

    val response = new APIGatewayProxyResponseEvent()
    result match {
      case Left(ConfigLoadingError(message)) =>
        logger.error(message)
        response.setStatusCode(500)
      case Left(error @ (InvalidRequestError(_) | InvalidJsonError(_))) =>
        logger.error(error.message)
        response.setStatusCode(400)
      case Left(error @ (MissingPaymentNumberError(_) | ZuoraApiError(_))) =>
        // TODO: alamrm
        logger.error(error.message)
        response.setStatusCode(200)
      case Right(_) =>
        logger.info(event.toString)
        response.setStatusCode(200)
    }
    response
  }

  def loadConfig(identity: AppIdentity): EitherT[IO, Error, Config] =
      ConfigLoader.loadConfig[IO, Config](identity).leftMap(e => ConfigLoadingError(e.message))

  def getPayload(event: APIGatewayProxyRequestEvent, endpointSecret: String): Either[Error, String] =
    for {
      payload <- Option(event.getBody()).toRight(InvalidRequestError("Missing body"))
      sigHeader <- event.getHeaders.asScala.get("Stripe-Signature").toRight(InvalidRequestError("Missing sig header"))
      _ <- Try(Webhook.Signature.verifyHeader(payload, sigHeader, endpointSecret, 300)).toEither.left.map(e => InvalidRequestError(e.getMessage()))
    } yield payload

  def processEvent(payload: String, config: Config): Either[Error, Unit] =
    for {
      intent <- parsePaymentIntent(payload)
      _ <- processPaymentIntent(intent, config)
    } yield ()

  def parsePaymentIntent(payload: String): Either[Error, PaymentIntent] =
    for {
      event <- PaymentIntentEvent.fromJson(payload)
      intent <- PaymentIntent.fromEvent(event)
     } yield intent

	def processPaymentIntent(intent: PaymentIntent, config: Config): Either[Error, Unit] = 
    intent match {
      case SepaPaymentIntent(paymentNumber) => refundZuoraPayment(paymentNumber, config)
      case OtherPaymentIntent() => Right(())
    }

  def refundZuoraPayment(paymentNumber: String, config: Config): Either[Error, Unit] = {
    logger.info(s"Zuora payment number: $paymentNumber")

    val backend = HttpURLConnectionBackend()
    val oauthConfig = ZuoraRestOauthConfig(config.zuoraBaseUrl, Oauth(config.zuoraClientId, config.zuoraSecret))

    for {
      token <- getAccessToken(oauthConfig, backend)
      restConfig = ZuoraRestConfig(config.zuoraBaseUrl, token.access_token)
      paymentResponse <- queryPayments(paymentNumber, restConfig, backend)
      payment <- paymentResponse.records.headOption.toRight(ZuoraApiError(s"No payments for for number: $paymentNumber"))
      _ <- rejectPayment(payment.`Id`, restConfig, backend)
    } yield ()
  }

  def getAccessToken(oauthConfig: ZuoraRestOauthConfig, backend: SttpBackend[Id, Nothing]): Either[Error, AccessToken] =
    accessTokenGetResponseV2(oauthConfig, backend).left.map(e => ZuoraApiError(e.reason))

  def queryPayments(paymentNumber: String, config: ZuoraRestConfig, backend: SttpBackend[Id, Nothing]): Either[Error, ZuoraPaymentQueryResponse] = {
    implicit val b = backend

    sttp.post(uri"${config.baseUrl}/action/query")
      .header("Authorization", s"Bearer ${config.accessToken}")
      .body(s"""{"queryString": "select Id from Payment where PaymentNumber = '$paymentNumber'" }""")
      .response(asJson[ZuoraPaymentQueryResponse])
      .mapResponse(_.left.map(e => ZuoraApiError(s"Decode error: ${e.error}, original: ${e.original}")))
      .send()
      .body.left.map(ZuoraApiError)
      .joinRight
  }

  def rejectPayment(paymentId: String, config: ZuoraRestConfig, backend: SttpBackend[Id, Nothing]): Either[Error, ZuoraRejectPaymentResponse] = {
    implicit val b = backend

    // TODO: fill this with real data
    val body = ZuoraRejectPaymentBody(gatewayResponse = "foo", gatewayResponseCode = "foo", referenceId = "foo", secondReferenceId = "foo", settledOn = "2021-08-20 10:00:00")

    sttp.post(uri"${config.baseUrl}/gateway-settlement/payments/$paymentId/reject")
      .header("Authorization", s"Bearer ${config.accessToken}")
      .header("Content-Type", "application/json")
      .body(body.asJson.noSpaces)
      .response(asJson[ZuoraRejectPaymentResponse])
      .mapResponse(_.left.map(e => ZuoraApiError(s"Decode error: ${e.error}, original: ${e.original}")))
      .send()
      .body.left.map(ZuoraApiError)
      .joinRight
  }
}
