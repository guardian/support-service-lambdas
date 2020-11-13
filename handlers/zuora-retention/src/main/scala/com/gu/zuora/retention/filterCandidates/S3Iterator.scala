package com.gu.zuora.retention.filterCandidates

import java.io.InputStream

import software.amazon.awssdk.services.s3.model.GetObjectRequest

import scala.io.Source
import scala.util.Try

object S3Iterator {
  def apply(fetchContent: GetObjectRequest => Try[InputStream])(uri: String): Try[Iterator[String]] = {
    val parsedUri = new java.net.URI(uri)
    val path = parsedUri.getPath.stripPrefix("/")
    val request = GetObjectRequest.builder.bucket(parsedUri.getHost).key(path).build()
    fetchContent(request).map(Source.fromInputStream(_).getLines())
  }
}
