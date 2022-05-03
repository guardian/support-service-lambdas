package com.gu.productmove

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.{APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse}
import com.gu.productmove
import com.gu.productmove.AwsS3Live.S3
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
import zio.ZIO.attemptBlocking
import zio.json.*

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
        .provide(AwsS3Live.layer, AwsCredentialsLive.layer, HttpClientZioBackend.layer())
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

  def run(input: APIGatewayV2HTTPEvent): ZIO[S3 with Any with SttpClient, Nothing, APIGatewayV2HTTPResponse] = {
    (for {
      stage <- ZIO.attempt(sys.env.getOrElse("Stage", "DEV")).mapError(_.toString)
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
      _ <- ZIO.log("PostData: " + postData.toString)
      _ <- ZIO.log("ZuoraConfig: " + zuoraConfig.toString)
      _ <- ZIO.log("Sub: " + sub.toString)
    } yield APIGatewayV2HTTPResponse.builder().withStatusCode(200).build())
      .catchAll { message =>
        for {
          _ <- ZIO.log(message)
        } yield APIGatewayV2HTTPResponse.builder().withStatusCode(500).build()

      }
  }

  private def getConfig(stage: String): ZIO[Any with S3, String, ZuoraRestConfig] =
  for {
    fileContent <- AwsS3Live.getObject(bucket, key(stage)).mapError(_.toString)
    zuoraRestConfig <- ZIO.fromEither(summon[JsonDecoder[ZuoraRestConfig]].decodeJson(fileContent))
  } yield zuoraRestConfig

}

object AwsCredentialsLive {

  private val ProfileName = "membership"

  class InvalidCredentials(message: String) extends Exception

  private val membershipProfile: Layer[InvalidCredentials, ProfileCredentialsProvider] =
    ZLayer.scoped {
      ZIO.fromAutoCloseable(IO.attempt(ProfileCredentialsProvider.create(ProfileName)))
        .tap(c => attemptBlocking(c.resolveCredentials()))
        .mapError(err => InvalidCredentials(err.getMessage))
    }

  private val lambdaCreds: Layer[InvalidCredentials, EnvironmentVariableCredentialsProvider] =
    ZLayer.fromZIO {
      IO.attempt(EnvironmentVariableCredentialsProvider.create())
        .tap(c => attemptBlocking(c.resolveCredentials()))
        .mapError(err => InvalidCredentials(err.getMessage))
    }

  val layer: Layer[InvalidCredentials, AwsCredentialsProvider] = lambdaCreds <> membershipProfile

}

object AwsS3Live {

  val layer: ZLayer[AwsCredentialsProvider, Throwable, productmove.AwsS3Live.S3] =
    ZLayer.scoped {
      ZIO.fromAutoCloseable(
        ZIO.serviceWithZIO[AwsCredentialsProvider](creds =>
          IO.attempt(
            S3Client.builder()
              .region(Region.EU_WEST_1)
              .credentialsProvider(creds)
              .build()
          )
        )
      ).map(Service(_))
    }

  type S3 = Service

  class Service(s3Client: S3Client) {


    def getObject(bucket: String, key: String): Task[String] = {

      ZIO.attempt {
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

  def getObject(bucket: String, key: String): RIO[S3, String] = ZIO.environmentWithZIO[S3](_.get.getObject(bucket, key))

}

//object LoggingLayer {
//  val live =
//    Logging.console(
//      logLevel = LogLevel.Info,
//      format = LogFormat.ColoredLogFormat()
//    ) >>> Logging.withRootLoggerName("my-component")//TODO
//}
