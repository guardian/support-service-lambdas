package com.gu.catalogService

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.{Config, Logging}
import java.io._
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.effects.{AwsS3, RawEffects}
import com.gu.util.apigateway.LoadConfig
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.zuora.{ZuoraReadCatalog, ZuoraRestConfig, ZuoraRestRequestMaker}
import play.api.libs.json.{JsValue, Json, Reads}
import scala.util.Try
import scalaz.{-\/, \/-}

object Handler extends Logging {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    logger.info(s"Starting point for Catalog Service lambda")
    runWithEffects(RawEffects.createDefault, LambdaIO(inputStream, outputStream, context))
  }

  def runWithEffects(rawEffects: RawEffects, lambdaIO: LambdaIO): Unit = {

    def operation(config: Config[StepsConfig]) = {
      logger.info("Running catalog load operation")
      val zuoraRequests = ZuoraRestRequestMaker(rawEffects.response, config.stepsConfig.zuoraRestConfig)
      val catalog = ZuoraReadCatalog(zuoraRequests)
      catalog match {
        case -\/(clientFail) => logger.error(s"Failure when loading the catalog: ${clientFail.message}")
        case \/-(catalog) =>
          logger.info(s"Successfully loaded the catalog")
          uploadCatalogToS3(catalog)
      }
    }

    def uploadCatalogToS3(catalog: JsValue): Try[PutObjectResult] = {

      def jsonFile(catalog: JsValue): Try[File] = for {
        file <- Try(new File("catalog.json"))
        writer <- Try(new FileWriter(file))
        _ <- Try(writer.write(catalog.as[String]))
        _ <- Try(writer.close())
      } yield file

      for {
        catalogDotJson <- jsonFile(catalog)
        putRequest = new PutObjectRequest(s"gu-zuora-catalog/${rawEffects.stage}", "catalog.json", catalogDotJson)
        result <- AwsS3.putObject(putRequest)
      } yield {
        logger.info(s"Successfully uploaded file to S3: $result")
        result
      }

    }

    LoadConfig.default[StepsConfig].map {
      failableConfig =>
        failableConfig.map {
          config => operation(config)
        }
    }.run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }

}
