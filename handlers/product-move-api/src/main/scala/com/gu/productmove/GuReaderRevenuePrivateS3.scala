package com.gu.productmove

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.GuStageLive.Stage.{CODE, DEV}

object GuReaderRevenuePrivateS3 {
  val bucket = "gu-reader-revenue-private"

  def key(configFileName: String, stage: Stage, version: Int = 1) = {

    // We always want product-move-api to fetch config from DEV not CODE
    val stageUsingDevForCode = if (stage == CODE) DEV else stage
    val basePath = s"membership/support-service-lambdas/$stageUsingDevForCode"

    val versionString = if (stage == Stage.DEV) "" else s".v$version"
    val relativePath = s"$configFileName-$stage$versionString.json"
    s"$basePath/$relativePath"
  }

}
