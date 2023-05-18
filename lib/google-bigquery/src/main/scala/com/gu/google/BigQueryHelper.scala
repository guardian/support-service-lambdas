package com.gu.google

import com.google.cloud.RetryOption
import com.google.cloud.bigquery.{BigQuery, BigQueryError, JobInfo, QueryJobConfiguration, TableResult}
import com.typesafe.scalalogging.LazyLogging

class BigQueryHelper(bigQuery: BigQuery) extends LazyLogging {

  def runQuery(queryString: String): Either[BigQueryError, TableResult] = {

    val queryConfig = QueryJobConfiguration
      .newBuilder(queryString)
      .build()

    var queryJob = bigQuery.create(JobInfo.of(queryConfig))

    queryJob = queryJob.waitFor(RetryOption.maxAttempts(0))

    Option(queryJob) match {
      case None =>
        val error = new BigQueryError("Job no longer exists", "BigQueryHelper", "Cannot retrieve results")
        logger.error(s"query failure: $error")
        Left(error)
      case Some(job) =>
        Option(job.getStatus.getError) match {
          case None =>
            logger.debug("query success")
            Right(job.getQueryResults())
          case Some(error) =>
            logger.error(s"query failure: $error")
            Left(error)
        }
    }
  }
}

object BigQueryHelper {
  def apply(bigQueryConfig: BigQueryConfig): BigQueryHelper = {
    val credentials = ServiceAccount.credentialsFromConfig(bigQueryConfig)
    val projectId = (bigQueryConfig.bigQueryCredentials \ "project_id").as[String]
    val bigQuery = ServiceAccount.bigQuery(credentials, projectId)
    new BigQueryHelper(bigQuery)
  }
}
