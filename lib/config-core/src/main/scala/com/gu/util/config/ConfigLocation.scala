package com.gu.util.config

case class ConfigLocation[CONFIG](path: String, version: Int) {
  def toPath(stage: Stage): String = {
    val basePath = s"membership/support-service-lambdas/${stage.value}"

    val versionString = s".v${version}"
    val relativePath = s"${path}-${stage.value}$versionString.json"
    s"$basePath/$relativePath"
  }
}
