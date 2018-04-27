package com.gu.catalogService

import java.io.{File, FileWriter}
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.effects.UploadToS3
import com.gu.util.Stage
import play.api.libs.json.JsValue
import scala.util.Try
import com.gu.util.Logging

object S3UploadCatalog extends Logging {

  def apply(stage: Stage, catalog: JsValue): Try[PutObjectResult] = {

    def jsonFile(catalog: JsValue): Try[File] = for {
      file <- Try(new File("/tmp/catalog.json")) //Must use /tmp when running in a lambda
      writer <- Try(new FileWriter(file))
      _ <- Try(writer.write(catalog.toString()))
      _ <- Try(writer.close())
    } yield file

    logger.info("Uploading catalog to S3...")

    for {
      catalogDotJson <- jsonFile(catalog)
      putRequest = new PutObjectRequest(s"gu-zuora-catalog/${stage.value}", "catalog.json", catalogDotJson)
      result <- UploadToS3.putObject(putRequest)
    } yield {
      logger.info(s"Successfully uploaded file to S3: $result")
      result
    }

  }

}
