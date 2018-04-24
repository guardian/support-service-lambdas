package com.gu.catalogService

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.Logging
import java.io.{InputStream, OutputStream}

object Handler extends Logging {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    logger.info(s"Starting point for Catalog Service lambda")
  }

}
