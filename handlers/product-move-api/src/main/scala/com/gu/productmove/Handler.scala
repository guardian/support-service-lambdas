package com.gu.productmove

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.{APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse}
import com.gu.productmove.AwsS3.S3
import software.amazon.awssdk.auth.credentials.*
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, S3Exception}
import software.amazon.awssdk.utils.SdkAutoCloseable
import sttp.capabilities.WebSockets
import sttp.capabilities.zio.ZioStreams
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.model.*
import zio.*
import zio.blocking.*
import zio.json.*
import zio.logging.*
import zio.stream.ZTransducer

object Handler extends RequestHandler[APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse] {

  val testInput: String = """{ "dummy": false }"""

  // for testing
  def main(args: Array[String]): Unit = {
    val input = new APIGatewayV2HTTPEvent(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      testInput,
      false,
      null
    )
    val context = new Context {
      override def getAwsRequestId: String = ???

      override def getLogGroupName: String = ???

      override def getLogStreamName: String = ???

      override def getFunctionName: String = ???

      override def getFunctionVersion: String = ???

      override def getInvokedFunctionArn: String = ???

      override def getIdentity: CognitoIdentity = ???

      override def getClientContext: ClientContext = ???

      override def getRemainingTimeInMillis: Int = ???

      override def getMemoryLimitInMB: Int = ???

      override def getLogger: LambdaLogger = ???
    }
    val response = handleRequest(input, context)
    println("response: " + response)
  }

  // this is the main lambda entry point.  It is referenced in the cloudformation.
  override def handleRequest(input: APIGatewayV2HTTPEvent, context: Context): APIGatewayV2HTTPResponse =
    Runtime.default.unsafeRun(
      run(input)
        .provideCustomLayer(AwsS3.live ++ SttpLayer.live ++ LoggingLayer.live)
    )

  case class ExpectedInput(dummy: Boolean)

  object ExpectedInput {
    implicit val decoder: JsonDecoder[ExpectedInput] =
      DeriveJsonDecoder.gen[ExpectedInput]
  }

  case class ZuoraRestConfig(
    baseUrl: String,
    username: String,
    password: String,
  )
  object ZuoraRestConfig {
    implicit val decoder: JsonDecoder[ZuoraRestConfig] = DeriveJsonDecoder.gen[ZuoraRestConfig]
  }

  val bucket = "gu-reader-revenue-private"

  def key(stage: String, version: Int = 1) = {
    val basePath = s"membership/support-service-lambdas/$stage"

    val versionString = if (stage == "DEV") "" else s".v${version}"
    val relativePath = s"zuoraRest-$stage$versionString.json"
    s"$basePath/$relativePath"
  }

  def run(input: APIGatewayV2HTTPEvent): ZIO[Logging with S3 with Blocking with SttpClient, Nothing, APIGatewayV2HTTPResponse] = {
    (for {
      stage <- ZIO.effect(sys.env.getOrElse("Stage", "DEV")).mapError(_.toString)
      postData <- ZIO.fromEither(input.getBody.fromJson[ExpectedInput])
      zuoraConfig <- getConfig(stage)
      subscriptionNumber = "A-S00339056"//DEV - for testing locally
      sub <- send(
        basicRequest
          .get(uri"${zuoraConfig.baseUrl}/subscriptions/$subscriptionNumber")
          .headers(Map(
            "apiSecretAccessKey" -> zuoraConfig.password,
            "apiAccessKeyId" -> zuoraConfig.username
          ))
      ).mapError(_.toString)
      _ <- log.info("PostData: " + postData.toString)
      _ <- log.info("ZuoraConfig: " + zuoraConfig.toString)
      _ <- log.info("Sub: " + sub.toString)
    } yield APIGatewayV2HTTPResponse.builder().withStatusCode(200).build())
      .catchAll { message =>
        for {
          _ <- log.info(message)
        } yield APIGatewayV2HTTPResponse.builder().withStatusCode(500).build()

      }
  }

  private def getConfig(stage: String): ZIO[Blocking with S3 with Logging, String, ZuoraRestConfig] =
  for {
    fileContent <- AwsS3.getObject(bucket, key(stage)).mapError(_.toString)
    zuoraRestConfig <- ZIO.fromEither(summon[JsonDecoder[ZuoraRestConfig]].decodeJson(fileContent))
  } yield zuoraRestConfig

}

object AwsS3 {

  private val ProfileName = "membership"

  class InvalidCredentials(message: String) extends Exception

  private val membershipProfile: ZManaged[Blocking, InvalidCredentials, ProfileCredentialsProvider] =
    ZManaged
      .fromAutoCloseable(IO.succeed(ProfileCredentialsProvider.create(ProfileName)))
      .tapM(c =>
        effectBlocking(c.resolveCredentials())
          .mapError(err => InvalidCredentials(err.getMessage)))

  private val instanceProfile: ZManaged[Blocking, InvalidCredentials, InstanceProfileCredentialsProvider] =
    ZManaged
      .fromAutoCloseable(IO.succeed(InstanceProfileCredentialsProvider.create()))
      .tapM(c =>
        effectBlocking(c.resolveCredentials())
          .mapError(err => InvalidCredentials(err.getMessage)))

  private val managedCredentials: RManaged[Blocking, AwsCredentialsProvider] = membershipProfile <> instanceProfile
  val live: RLayer[Blocking, S3] = ZLayer.fromManaged({
    managedCredentials.flatMap({creds =>
      ZManaged.fromAutoCloseable(
        IO.succeed(
          S3Client.builder()
          .region(Region.EU_WEST_1)
          .credentialsProvider(creds)
          .build()
        )
      ).map(Service(_))
    })
  })

  type S3 = Has[Service]

  class Service(s3Client: S3Client) {


    def getObject(bucket: String, key: String): Task[String] = {

      ZIO.effect {
        val objectRequest: GetObjectRequest = GetObjectRequest
          .builder()
          .key(key)
          .bucket(bucket)
          .build();
        val response = s3Client.getObjectAsBytes(objectRequest)
        response.asUtf8String()
      }

    }

  }

  def getObject(bucket: String, key: String): RIO[S3, String] = ZIO.accessM[S3](_.get.getObject(bucket, key))

}

object SttpLayer {

  val live: ZLayer[Any, Throwable, SttpClient] = HttpClientZioBackend.managed().toLayer

}

object LoggingLayer {
  val live =
    Logging.console(
      logLevel = LogLevel.Info,
      format = LogFormat.ColoredLogFormat()
    ) >>> Logging.withRootLoggerName("my-component")//TODO
}
