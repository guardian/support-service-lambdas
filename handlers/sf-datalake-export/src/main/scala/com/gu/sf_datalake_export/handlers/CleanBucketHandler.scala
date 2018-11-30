package com.gu.sf_datalake_export.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects._
import com.gu.sf_datalake_export.handlers.CleanBucketHandler.cleanBucket
import com.gu.sf_datalake_export.handlers.DownloadBatchHandler.WireState
import com.gu.sf_datalake_export.handlers.StartJobHandler.ShouldUploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.ObjectName
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.JobName
import com.gu.sf_datalake_export.util.ExportS3Path
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Stage
import com.gu.util.handlers.JsonHandler

import scala.util.{Success, Try}

object CleanBucketHandler extends Logging {

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    def wiredOperation(state: WireState): Try[WireState] = {
      val objectName = ObjectName(state.objectName)
      val jobName = JobName(state.jobName)
      val shouldUploadToDataLake = ShouldUploadToDataLake(state.uploadToDataLake)
      val wiredS3PathFor = ExportS3Path(RawEffects.stage) _
      val wiredCleanBucket = cleanBucket(
        wiredS3PathFor,
        ListS3Objects.listObjectsWithPrefix,
        DeleteS3Objects.deleteObjects
      ) _
      handleCleanBucket(wiredCleanBucket)(state)
    }

    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = wiredOperation
    )
  }

  def handleCleanBucket(
    cleanBucketOp: (ObjectName, JobName, ShouldUploadToDataLake) => Try[Unit]
  )(state: WireState): Try[WireState] = {
    val objectName = ObjectName(state.objectName)
    val jobName = JobName(state.jobName)
    val shouldUploadToDataLake = ShouldUploadToDataLake(state.uploadToDataLake)
    val wiredS3PathFor = ExportS3Path(RawEffects.stage) _
    cleanBucketOp(
      objectName,
      jobName,
      shouldUploadToDataLake
    ) map (_ => state)
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
        case nonEmptyKeyList =>
          logger.info(s"deleting $nonEmptyKeyList")
          deleteObjects(prefixPath.bucketName, nonEmptyKeyList)
      }
    } yield ()
  }

}
