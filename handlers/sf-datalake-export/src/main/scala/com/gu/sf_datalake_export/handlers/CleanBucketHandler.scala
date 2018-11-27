package com.gu.sf_datalake_export.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects._
import com.gu.sf_datalake_export.handlers.DownloadBatchHandler.WireState
import com.gu.sf_datalake_export.handlers.StartJobHandler.ShouldUploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.ObjectName
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.JobName
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Stage
import com.gu.util.handlers.JsonHandler

import scala.util.{Success, Try}

object CleanBucketHandler extends Logging{


  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    def wiredOperation(state: WireState): Try[WireState] = {
      val objectName = ObjectName(state.objectName)
      val jobName = JobName(state.jobName)
      val shouldUploadToDataLake = ShouldUploadToDataLake(state.uploadToDataLake)
      val wiredS3PathFor = s3PathFor(RawEffects.stage) _

      cleanBucket(
        wiredS3PathFor,
        ListS3Objects.listObjectsWithPrefix,
        DeleteS3Objects.deleteObjects)(
        objectName,
        jobName,
        shouldUploadToDataLake) map (_ => state)
    }

    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = wiredOperation
    )
  }

  def cleanBucket(
    basePathFor: (ObjectName, ShouldUploadToDataLake) => S3Path,
    listObjectsWithPrefix: S3Path => Try[List[Key]],
    deleteObjects: (BucketName, List[Key]) => Try[Unit]
  )(
    objectName: ObjectName,
    jobName: JobName,
    shouldUploadToDataLake: ShouldUploadToDataLake
  ): Try[Unit] = {
    val basePath = basePathFor(objectName, shouldUploadToDataLake)
    logger.info(s"cleaning ${basePath}")
    val prefixPath = S3Path.appendToPrefix(basePath, jobName.value)
    for {
      keysWithPrefix <- listObjectsWithPrefix(prefixPath)
            _ <- keysWithPrefix match {
        case Nil =>
          logger.info("nothing to delete")
          Success(())
        case nonEmptyKeyList  =>
          logger.info(s"deleting $nonEmptyKeyList")
          deleteObjects(prefixPath.bucketName, nonEmptyKeyList)
      }
    } yield ()
  }


  def s3PathFor(stage: Stage)(objectName: ObjectName, uploadToDataLake: ShouldUploadToDataLake): S3Path = stage match {
    case Stage("PROD") if uploadToDataLake.value => S3Path(BucketName(s"ophan-raw-salesforce-customer-data-${objectName.value.toLowerCase}"), None)
    case Stage(stageName) => S3Path(BucketName("gu-salesforce-export-test"), Some(Key(s"$stageName/raw/")))
  }


}
