package com.gu.paymentIntentIssues

object StripeAuthorizerLambda extends LazyLogging{
  def handler(event: APIGatewayProxyRequestEvent): APIGatewayProxyResponseEvent = {
    val identity = AppIdentity.whoAmI(defaultAppName = "payment-intent-issues")

    val program = loadConfig(identity).subflatMap(config =>
      for {
        payload <- getPayload(event, config.endpointSecret)
        _ <- processEvent(payload, config)
      } yield (),
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
        // TODO: alarm
        logger.error(error.message)
        response.setStatusCode(200)
      case Right(_) =>
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
      _ <- Try(Webhook.Signature.verifyHeader(payload, sigHeader, endpointSecret, 300)).toEither.left.map(e =>
        InvalidRequestError(e.getMessage()),
      )
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
      case SepaPaymentIntent(paymentNumber, paymentIntentObject) =>
        refundZuoraPayment(paymentNumber, paymentIntentObject, config)
      case OtherPaymentIntent() =>
        logger.info(s"Ignoring non-SEPA event")
        Right(())
    }

}
