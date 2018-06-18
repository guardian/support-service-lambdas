package com.gu.zuora.retention

import java.io.InputStream

import com.amazonaws.services.s3.model.GetObjectRequest

import scala.io.Source
import scala.util.Try

object S3Iterator {
  def apply(fetchContent: GetObjectRequest => Try[InputStream])(uri: String) = {
    val parsedUri = new java.net.URI(uri)
    val path = parsedUri.getPath.stripPrefix("/")
    val request = new GetObjectRequest(parsedUri.getHost, path)
    fetchContent(request).map(Source.fromInputStream(_).getLines)
  }
}
