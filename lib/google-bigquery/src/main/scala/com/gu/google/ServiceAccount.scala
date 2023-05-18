package com.gu.google

import java.io.{ByteArrayInputStream, FileInputStream, InputStream}

import com.google.auth.oauth2.ServiceAccountCredentials
import com.google.cloud.bigquery.{BigQuery, BigQueryOptions}

object ServiceAccount {

  def bigQuery(credentials: ServiceAccountCredentials, projectId: String): BigQuery =
    BigQueryOptions
      .newBuilder()
      .setCredentials(credentials)
      .setProjectId(projectId)
      .build()
      .getService

  def credentialsFromString(jsonString: String): ServiceAccountCredentials =
    credentialsFromStream(new ByteArrayInputStream(jsonString.getBytes()))

  def credentialsFromFile(credentialsFile: String): ServiceAccountCredentials =
    credentialsFromStream(new FileInputStream(credentialsFile))

  def credentialsFromStream(credentialsStream: InputStream): ServiceAccountCredentials = {
    import scala.jdk.CollectionConverters._
    val bigQueryScope = "https://www.googleapis.com/auth/bigquery"
    ServiceAccountCredentials
      .fromStream(credentialsStream)
      .toBuilder
      .setScopes(List(bigQueryScope).asJavaCollection)
      .build()
  }
}
