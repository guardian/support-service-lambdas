package com.gu.productmove

import com.gu.productmove.GuStageLive.Stage

object GuReaderRevenuePrivateS3 {
  val bucket = "gu-reader-revenue-private"

  def key(configFileName: String, stage: Stage, version: Int = 1) = {
    val basePath = s"membership/support-service-lambdas/$stage"

    val versionString = s".v${version}"
    val relativePath = s"$configFileName-$stage$versionString.json"
    s"$basePath/$relativePath"
  }

}
